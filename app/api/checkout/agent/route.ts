/**
 * POST /api/checkout/agent
 *
 * Agentic checkout: an AI agent (acting on behalf of an authenticated user)
 * pays for an app using a Shared Payment Token (SPT) issued by Stripe Link
 * or another wallet that supports Stripe's Agentic Commerce primitives.
 *
 * Differs from /api/checkout in two ways:
 *   1. Uses PaymentIntents directly instead of hosted Checkout Sessions
 *      (agents want a synchronous API, not a redirect URL).
 *   2. Accepts a `sharedPaymentToken` (spt_…) instead of letting the buyer
 *      pick a payment method on a Stripe-hosted page.
 *
 * The same Connect destination-charge model and 15% platform fee apply.
 *
 * Auth: requires a valid user session — the agent is expected to operate
 * with a session token the user authorized it to use. This is the simplest
 * v1; future iterations can swap in OAuth-scoped agent credentials.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { getSessionFromHeaders } from "@/lib/auth/middleware";
import {
  acceptAgentPayment,
  calculatePlatformFee,
  createStripeClient,
} from "@/lib/stripe";
import { nanoid } from "@/lib/db";
import { getSellerConnectState } from "@/lib/seller-connect-status";
import { recordPurchase } from "@/lib/purchases";

interface AgentCheckoutRequest {
  appId: string;
  /** Shared Payment Token from the buyer's wallet (e.g. spt_xxx). */
  sharedPaymentToken: string;
  /** Buyer-approved price in cents. Must be >= app.min_price_cents post-discount. */
  priceCents: number;
  discountCode?: string;
  /** Optional client-supplied idempotency key; one will be generated otherwise. */
  idempotencyKey?: string;
}

interface App {
  id: string;
  name: string;
  slug: string;
  min_price_cents: number;
  owner_id: string | null;
}

interface AppOwner {
  id: string;
  email: string;
  stripe_account_id: string | null;
  stripe_onboarded: number;
}

interface DiscountCode {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  app_id: string | null;
  max_uses: number | null;
  times_used: number;
  expires_at: string | null;
  is_active: number;
}

export async function POST(request: NextRequest) {
  try {
    const env = getEnv();

    if (!env?.DB || !env?.AUTH_KV) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const { user } = await getSessionFromHeaders(request.headers, env);
    if (!user) {
      return NextResponse.json(
        { error: "Agent must present a valid user session" },
        { status: 401 }
      );
    }

    const body: AgentCheckoutRequest = await request.json();
    const { appId, sharedPaymentToken, priceCents, discountCode, idempotencyKey } = body;

    if (!appId || !sharedPaymentToken) {
      return NextResponse.json(
        { error: "appId and sharedPaymentToken are required" },
        { status: 400 }
      );
    }

    if (!sharedPaymentToken.startsWith("spt_")) {
      return NextResponse.json(
        { error: "sharedPaymentToken must be a Stripe SPT (spt_…)" },
        { status: 400 }
      );
    }

    const app = await env.DB.prepare(
      `SELECT id, name, slug, min_price_cents, owner_id FROM apps WHERE id = ?`
    )
      .bind(appId)
      .first<App>();

    if (!app) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }

    let appOwner: AppOwner | null = null;
    if (app.owner_id) {
      appOwner = await env.DB.prepare(
        `SELECT id, email, stripe_account_id, stripe_onboarded FROM user WHERE id = ?`
      )
        .bind(app.owner_id)
        .first<AppOwner>();

      if (appOwner) {
        const sellerConnectState = await getSellerConnectState(env, appOwner.id);
        if (
          !sellerConnectState.stripeAccountId ||
          !sellerConnectState.effectiveOnboarded
        ) {
          return NextResponse.json(
            { error: "This app's seller has not completed payment setup" },
            { status: 400 }
          );
        }
        appOwner.stripe_account_id = sellerConnectState.stripeAccountId;
      }
    }

    const existingPurchase = await env.DB.prepare(
      `SELECT id FROM purchases WHERE user_id = ? AND app_id = ? AND status = 'completed'`
    )
      .bind(user.id, appId)
      .first<{ id: string }>();

    if (existingPurchase) {
      return NextResponse.json(
        { error: "You already own this app" },
        { status: 400 }
      );
    }

    let finalPriceCents = Math.max(priceCents || 0, app.min_price_cents);
    let usedDiscountCode: DiscountCode | null = null;

    if (discountCode) {
      const code = await env.DB.prepare(
        `SELECT * FROM discount_codes WHERE code = ? AND is_active = 1`
      )
        .bind(discountCode.toUpperCase())
        .first<DiscountCode>();

      if (code) {
        const isValid =
          (!code.app_id || code.app_id === appId) &&
          (!code.max_uses || code.times_used < code.max_uses) &&
          (!code.expires_at || new Date(code.expires_at) > new Date());

        if (isValid) {
          usedDiscountCode = code;
          if (code.discount_type === "percent") {
            const discount = Math.round(
              (finalPriceCents * code.discount_value) / 100
            );
            finalPriceCents = Math.max(0, finalPriceCents - discount);
          } else {
            finalPriceCents = Math.max(
              0,
              finalPriceCents - code.discount_value
            );
          }
        }
      }
    }

    if (finalPriceCents === 0) {
      // Free path mirrors /api/checkout — no Stripe call needed.
      const result = await recordPurchase(env, {
        userId: user.id,
        appId,
        amountCents: 0,
        platformFeeCents: 0,
        sellerAmountCents: 0,
        discountCodeId: usedDiscountCode?.id ?? null,
        sellerId: app.owner_id,
      });
      return NextResponse.json({
        success: true,
        free: true,
        purchaseId: result.purchaseId,
      });
    }

    const stripe = createStripeClient(env);
    if (!stripe) {
      return NextResponse.json(
        { error: "Payment processing not configured" },
        { status: 503 }
      );
    }

    const platformFeeCents = appOwner?.stripe_account_id
      ? calculatePlatformFee(finalPriceCents)
      : 0;
    const sellerAmountCents = finalPriceCents - platformFeeCents;

    const piMetadata: Record<string, string> = {
      app_id: app.id,
      user_id: user.id,
      user_email: user.email,
      user_name: user.name || "",
      discount_code_id: usedDiscountCode?.id || "",
      original_price_cents: String(priceCents ?? 0),
      final_price_cents: String(finalPriceCents),
      platform_fee_cents: String(platformFeeCents),
      seller_amount_cents: String(sellerAmountCents),
      seller_id: app.owner_id || "",
      flow: "agent_spt",
    };

    const pi = await acceptAgentPayment(stripe, {
      amountCents: finalPriceCents,
      sharedPaymentToken,
      idempotencyKey: idempotencyKey ?? `agent_${user.id}_${appId}_${nanoid(12)}`,
      metadata: piMetadata,
      description: `${app.name} — isolated.tech`,
      receiptEmail: user.email,
      connect: appOwner?.stripe_account_id
        ? {
            destinationAccountId: appOwner.stripe_account_id,
            applicationFeeCents: platformFeeCents,
          }
        : undefined,
    });

    // If payment confirmed inline, record purchase synchronously so the agent
    // gets an authoritative response. The webhook is still the source of truth
    // for the async case (3DS / pending), and recordPurchase is idempotent.
    if (pi.status === "succeeded") {
      const result = await recordPurchase(env, {
        userId: user.id,
        appId,
        amountCents: pi.amount_received || pi.amount,
        platformFeeCents,
        sellerAmountCents,
        discountCodeId: usedDiscountCode?.id ?? null,
        sellerId: app.owner_id,
        stripePaymentIntentId: pi.id,
      });

      return NextResponse.json({
        success: true,
        status: pi.status,
        paymentIntentId: pi.id,
        purchaseId: result.purchaseId,
      });
    }

    // Pending / requires_action — agent should poll PI or wait for webhook.
    return NextResponse.json({
      success: false,
      status: pi.status,
      paymentIntentId: pi.id,
      nextAction: pi.next_action ?? null,
    });
  } catch (error) {
    console.error("Agent checkout error:", error);
    const message =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to process agent payment", details: message },
      { status: 500 }
    );
  }
}

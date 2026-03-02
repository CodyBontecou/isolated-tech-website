/**
 * POST /api/checkout
 *
 * Create a Stripe Checkout session for app purchase.
 * Handles both paid and free apps.
 * For seller-owned apps, uses Stripe Connect with 15% platform fee.
 * Users can download purchased apps from their dashboard.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { getSessionFromHeaders } from "@/lib/auth/middleware";
import { createStripeClient, getBaseUrl, calculatePlatformFee, PLATFORM_FEE_PERCENT } from "@/lib/stripe";
import { nanoid } from "@/lib/db";
import { getSellerConnectState } from "@/lib/seller-connect-status";

interface CheckoutRequest {
  appId: string;
  priceCents: number;
  discountCode?: string;
}

interface App {
  id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  icon_url: string | null;
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

    // Authenticate user
    const { user } = await getSessionFromHeaders(request.headers, env);

    if (!user) {
      return NextResponse.json(
        { error: "Please sign in to purchase" },
        { status: 401 }
      );
    }

    // Parse request
    const body: CheckoutRequest = await request.json();
    const { appId, priceCents, discountCode } = body;

    if (!appId) {
      return NextResponse.json({ error: "App ID required" }, { status: 400 });
    }

    // Get app with owner info
    const app = await env.DB.prepare(
      `SELECT id, name, slug, tagline, description, icon_url, min_price_cents, owner_id 
       FROM apps WHERE id = ?`
    )
      .bind(appId)
      .first<App>();

    if (!app) {
      return NextResponse.json({ error: "App not found" }, { status: 404 });
    }

    // Get owner's Stripe account if this is a seller-owned app
    let appOwner: AppOwner | null = null;
    if (app.owner_id) {
      appOwner = await env.DB.prepare(
        `SELECT id, email, stripe_account_id, stripe_onboarded FROM user WHERE id = ?`
      )
        .bind(app.owner_id)
        .first<AppOwner>();

      // Verify seller can receive payments (hybrid live Stripe v2 + DB fallback).
      if (appOwner) {
        const sellerConnectState = await getSellerConnectState(env, appOwner.id);

        if (!sellerConnectState.stripeAccountId || !sellerConnectState.effectiveOnboarded) {
          return NextResponse.json(
            {
              error: "This app's seller has not completed payment setup",
              details: sellerConnectState.liveChecked
                ? `requirements=${sellerConnectState.requirementsStatus ?? "unknown"}, transfers=${sellerConnectState.transfersCapabilityStatus ?? "unknown"}`
                : "Could not verify live Stripe status; using cached onboarding state.",
            },
            { status: 400 }
          );
        }

        // Ensure checkout uses the verified connected account ID.
        appOwner.stripe_account_id = sellerConnectState.stripeAccountId;
      }
    }

    // Check if already purchased
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

    // Calculate final price
    let finalPriceCents = Math.max(priceCents || 0, app.min_price_cents);
    let usedDiscountCode: DiscountCode | null = null;

    // Apply discount code if provided
    if (discountCode) {
      const code = await env.DB.prepare(
        `SELECT * FROM discount_codes WHERE code = ? AND is_active = 1`
      )
        .bind(discountCode.toUpperCase())
        .first<DiscountCode>();

      if (code) {
        // Validate code
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
            finalPriceCents = Math.max(0, finalPriceCents - code.discount_value);
          }
        }
      }
    }

    const baseUrl = getBaseUrl(request);

    // Calculate platform fee for seller-owned apps
    const platformFeeCents = appOwner?.stripe_account_id 
      ? calculatePlatformFee(finalPriceCents) 
      : 0;
    const sellerAmountCents = finalPriceCents - platformFeeCents;

    // Handle free purchase (price = 0)
    if (finalPriceCents === 0) {
      // Create purchase directly
      const purchaseId = nanoid();
      const now = new Date().toISOString();

      await env.DB.prepare(
        `INSERT INTO purchases (id, user_id, app_id, amount_cents, discount_code_id, platform_fee_cents, seller_amount_cents, status, created_at)
         VALUES (?, ?, ?, 0, ?, 0, 0, 'completed', ?)`
      )
        .bind(
          purchaseId,
          user.id,
          appId,
          usedDiscountCode?.id || null,
          now
        )
        .run();

      // Increment discount code usage
      if (usedDiscountCode) {
        await env.DB.prepare(
          `UPDATE discount_codes SET times_used = times_used + 1 WHERE id = ?`
        )
          .bind(usedDiscountCode.id)
          .run();
      }

      // Redirect to dashboard - user can download from there
      return NextResponse.json({
        success: true,
        free: true,
        redirectUrl: `${baseUrl}/dashboard?purchased=${app.slug}`,
      });
    }

    // Create Stripe checkout session
    console.log("Creating Stripe client...");
    const stripe = createStripeClient(env);

    if (!stripe) {
      console.error("Stripe client is null - STRIPE_SECRET_KEY not configured");
      return NextResponse.json(
        { error: "Payment processing not configured" },
        { status: 503 }
      );
    }

    console.log("Stripe client created, creating checkout session...");
    console.log("Session params:", {
      user_email: user.email,
      app_name: app.name,
      finalPriceCents,
      platformFeeCents,
      sellerAmountCents,
      isSellerApp: !!appOwner?.stripe_account_id,
      baseUrl,
    });

    // Build checkout description from tagline and description
    const buildCheckoutDescription = (): string | undefined => {
      const parts: string[] = [];
      
      if (app.tagline) {
        parts.push(app.tagline);
      }
      
      if (app.description) {
        // Strip markdown formatting and get plain text
        const plainText = app.description
          .replace(/#{1,6}\s+/g, '') // Remove headers
          .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
          .replace(/\*([^*]+)\*/g, '$1') // Remove italics
          .replace(/`([^`]+)`/g, '$1') // Remove inline code
          .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
          .replace(/\n+/g, ' ') // Replace newlines with spaces
          .trim();
        
        if (plainText) {
          // Stripe limits description to 500 chars, truncate with ellipsis
          const maxLen = app.tagline ? 400 : 500;
          const truncated = plainText.length > maxLen 
            ? plainText.slice(0, maxLen - 3) + '...'
            : plainText;
          parts.push(truncated);
        }
      }
      
      return parts.length > 0 ? parts.join('\n\n') : undefined;
    };

    // Build checkout session config
    const sessionConfig: Parameters<typeof stripe.checkout.sessions.create>[0] = {
      mode: "payment",
      customer_email: user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: finalPriceCents,
            product_data: {
              name: app.name,
              description: buildCheckoutDescription(),
              images: app.icon_url ? [`${baseUrl}${app.icon_url}`] : undefined,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        app_id: app.id,
        user_id: user.id,
        user_email: user.email,
        user_name: user.name || "",
        discount_code_id: usedDiscountCode?.id || "",
        original_price_cents: priceCents.toString(),
        final_price_cents: finalPriceCents.toString(),
        platform_fee_cents: platformFeeCents.toString(),
        seller_amount_cents: sellerAmountCents.toString(),
        seller_id: app.owner_id || "",
      },
      success_url: `${baseUrl}/dashboard?purchased=${app.slug}`,
      cancel_url: `${baseUrl}/apps/${app.slug}`,
    };

    // Add Stripe Connect payment handling for seller-owned apps
    if (appOwner?.stripe_account_id) {
      sessionConfig.payment_intent_data = {
        application_fee_amount: platformFeeCents,
        transfer_data: {
          destination: appOwner.stripe_account_id,
        },
      };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return NextResponse.json({
      success: true,
      url: session.url,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    // Log full error details for Stripe errors
    if (error && typeof error === 'object') {
      console.error("Error type:", error.constructor?.name);
      console.error("Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    }
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    return NextResponse.json(
      { 
        error: "Failed to create checkout session", 
        details: errorMessage,
        stack: errorStack,
      },
      { status: 500 }
    );
  }
}

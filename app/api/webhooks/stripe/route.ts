/**
 * POST /api/webhooks/stripe
 *
 * Handle Stripe webhook events for payment processing.
 * Records purchases and notifies sellers for both:
 *   - Hosted Checkout Session flows (humans)
 *   - PaymentIntent flows with Shared Payment Tokens (AI agents)
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getEnv } from "@/lib/cloudflare-context";
import type { Env } from "@/lib/env";
import { createStripeClient } from "@/lib/stripe";
import { nanoid, queryOne } from "@/lib/db";
import { recordPurchase } from "@/lib/purchases";

export async function POST(request: NextRequest) {
  const env = getEnv();

  if (!env?.DB) {
    console.error("Webhook: DB not configured");
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  const stripe = createStripeClient(env);
  const webhookSecret = (env as unknown as { STRIPE_WEBHOOK_SECRET?: string })
    .STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    console.error("Webhook: Stripe not configured");
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    console.log(`Webhook received: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutComplete(
          event.data.object as Stripe.Checkout.Session,
          env
        );
        break;

      case "payment_intent.succeeded":
        await handlePaymentIntentSucceeded(
          event.data.object as Stripe.PaymentIntent,
          env
        );
        break;

      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(
          event.data.object as Stripe.PaymentIntent
        );
        break;

      case "charge.refunded":
        await handleChargeRefunded(event.data.object as Stripe.Charge, env);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ received: true, error: "Processing error" });
  }
}

interface PurchaseMetadata {
  app_id?: string;
  user_id?: string;
  discount_code_id?: string;
  platform_fee_cents?: string;
  seller_amount_cents?: string;
  seller_id?: string;
}

function parsePurchaseMetadata(
  metadata: Stripe.Metadata | null | undefined
): PurchaseMetadata {
  return (metadata ?? {}) as PurchaseMetadata;
}

async function handleCheckoutComplete(
  session: Stripe.Checkout.Session,
  env: Env
) {
  const meta = parsePurchaseMetadata(session.metadata);

  if (!meta.app_id || !meta.user_id) {
    console.error("Webhook: Missing metadata on session", session.id);
    return;
  }

  const result = await recordPurchase(env, {
    userId: meta.user_id,
    appId: meta.app_id,
    amountCents: session.amount_total || 0,
    platformFeeCents: parseInt(meta.platform_fee_cents || "0", 10),
    sellerAmountCents: parseInt(meta.seller_amount_cents || "0", 10),
    discountCodeId: meta.discount_code_id || null,
    sellerId: meta.seller_id || null,
    stripePaymentIntentId: (session.payment_intent as string) || null,
    stripeCheckoutSessionId: session.id,
  });

  console.log(
    `Webhook: checkout.session.completed -> purchase ${result.purchaseId} (existed=${result.alreadyExisted})`
  );
}

async function handlePaymentIntentSucceeded(
  pi: Stripe.PaymentIntent,
  env: Env
) {
  const meta = parsePurchaseMetadata(pi.metadata);

  if (!meta.app_id || !meta.user_id) {
    // Not one of ours (could be from a Checkout Session — handled separately
    // via checkout.session.completed). Skip silently.
    return;
  }

  const result = await recordPurchase(env, {
    userId: meta.user_id,
    appId: meta.app_id,
    amountCents: pi.amount_received || pi.amount || 0,
    platformFeeCents: parseInt(meta.platform_fee_cents || "0", 10),
    sellerAmountCents: parseInt(meta.seller_amount_cents || "0", 10),
    discountCodeId: meta.discount_code_id || null,
    sellerId: meta.seller_id || null,
    stripePaymentIntentId: pi.id,
    stripeCheckoutSessionId: null,
  });

  console.log(
    `Webhook: payment_intent.succeeded -> purchase ${result.purchaseId} (existed=${result.alreadyExisted})`
  );
}

async function handlePaymentIntentFailed(pi: Stripe.PaymentIntent) {
  console.log(
    `Webhook: payment_intent.payment_failed pi=${pi.id} reason=${pi.last_payment_error?.message ?? "unknown"}`
  );
}

async function handleChargeRefunded(charge: Stripe.Charge, env: Env) {
  const paymentIntentId = charge.payment_intent as string;

  if (!paymentIntentId) {
    console.error("Webhook: No payment_intent in refund");
    return;
  }

  const purchase = await queryOne<{
    id: string;
    app_id: string;
    amount_cents: number;
  }>(
    `SELECT p.id, p.app_id, p.amount_cents
     FROM purchases p
     WHERE p.stripe_payment_intent_id = ?`,
    [paymentIntentId],
    env
  );

  const result = await env.DB.prepare(
    `UPDATE purchases SET status = 'refunded', refunded_at = datetime('now') WHERE stripe_payment_intent_id = ?`
  )
    .bind(paymentIntentId)
    .run();

  if (result.meta.changes === 0) {
    console.log(`Webhook: No purchase found for refund ${paymentIntentId}`);
    return;
  }

  console.log(`Webhook: Marked purchase as refunded for ${paymentIntentId}`);

  if (!purchase) return;

  const app = await queryOne<{ owner_id: string | null; name: string }>(
    `SELECT owner_id, name FROM apps WHERE id = ?`,
    [purchase.app_id],
    env
  );

  if (!app?.owner_id) return;

  const amountFormatted = `$${(purchase.amount_cents / 100).toFixed(2)}`;
  const message = `Refund processed: ${app.name} for ${amountFormatted}`;

  await env.DB.prepare(
    `INSERT INTO seller_notifications (id, seller_id, type, purchase_id, message, sent_at)
     VALUES (?, ?, 'refund', ?, ?, datetime('now'))`
  )
    .bind(nanoid(), app.owner_id, purchase.id, message)
    .run();
}

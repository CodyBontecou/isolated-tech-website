/**
 * POST /api/webhooks/stripe
 *
 * Handle Stripe webhook events for payment processing.
 * Creates purchase records and notifies sellers for marketplace purchases.
 */

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getEnv } from "@/lib/cloudflare-context";
import { createStripeClient } from "@/lib/stripe";
import { nanoid, queryOne } from "@/lib/db";

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
    // Get raw body and signature
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    console.log(`Webhook received: ${event.type}`);

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutComplete(
          event.data.object as Stripe.Checkout.Session,
          env
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
    // Return 200 to acknowledge receipt (prevent retries for processing errors)
    return NextResponse.json({ received: true, error: "Processing error" });
  }
}

/**
 * Handle successful checkout completion
 */
async function handleCheckoutComplete(
  session: Stripe.Checkout.Session,
  env: Env
) {
  const metadata = session.metadata || {};
  const { 
    app_id, 
    user_id, 
    discount_code_id,
    platform_fee_cents,
    seller_amount_cents,
    seller_id,
  } = metadata;

  if (!app_id || !user_id) {
    console.error("Webhook: Missing metadata", metadata);
    return;
  }

  // Check for duplicate (idempotency)
  const existing = await env.DB.prepare(
    `SELECT id FROM purchases WHERE stripe_checkout_session_id = ?`
  )
    .bind(session.id)
    .first<{ id: string }>();

  if (existing) {
    console.log(`Webhook: Purchase already exists for session ${session.id}`);
    return;
  }

  // Create purchase record
  const purchaseId = nanoid();
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO purchases (id, user_id, app_id, stripe_payment_intent_id, stripe_checkout_session_id, amount_cents, platform_fee_cents, seller_amount_cents, discount_code_id, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)`
  )
    .bind(
      purchaseId,
      user_id,
      app_id,
      session.payment_intent as string,
      session.id,
      session.amount_total || 0,
      parseInt(platform_fee_cents || "0", 10),
      parseInt(seller_amount_cents || "0", 10),
      discount_code_id || null,
      now
    )
    .run();

  console.log(`Webhook: Created purchase ${purchaseId} for user ${user_id}`);

  // Increment discount code usage
  if (discount_code_id) {
    await env.DB.prepare(
      `UPDATE discount_codes SET times_used = times_used + 1 WHERE id = ?`
    )
      .bind(discount_code_id)
      .run();
    console.log(`Webhook: Incremented discount code ${discount_code_id}`);
  }

  // Log purchase
  await env.DB.prepare(
    `INSERT INTO email_log (id, user_id, event_type, subject, sent_at)
     VALUES (?, ?, 'purchase_receipt', ?, ?)`
  )
    .bind(nanoid(), user_id, `Purchase completed`, now)
    .run();

  // Notify seller if this is a marketplace purchase
  if (seller_id) {
    await notifySeller(env, seller_id, purchaseId, app_id, session.amount_total || 0);
  }

  console.log(`Webhook: Purchase ${purchaseId} completed for user ${user_id}`);
}

/**
 * Notify seller of a new sale
 */
async function notifySeller(
  env: Env,
  sellerId: string,
  purchaseId: string,
  appId: string,
  amountCents: number
) {
  try {
    // Get app name
    const app = await queryOne<{ name: string }>(
      `SELECT name FROM apps WHERE id = ?`,
      [appId],
      env
    );

    // Get seller info
    const seller = await queryOne<{ email: string; name: string | null }>(
      `SELECT email, name FROM user WHERE id = ?`,
      [sellerId],
      env
    );

    if (!app || !seller) {
      console.error("Webhook: Could not find app or seller for notification");
      return;
    }

    const amountFormatted = `$${(amountCents / 100).toFixed(2)}`;
    const message = `New sale: ${app.name} for ${amountFormatted}`;

    // Create notification record
    await env.DB.prepare(
      `INSERT INTO seller_notifications (id, seller_id, type, purchase_id, message, sent_at)
       VALUES (?, ?, 'sale', ?, ?, datetime('now'))`
    )
      .bind(nanoid(), sellerId, purchaseId, message)
      .run();

    console.log(`Webhook: Created sale notification for seller ${sellerId}`);

    // TODO: Send email notification to seller
    // For now, just log it - email integration can be added later
    console.log(`Webhook: [EMAIL] Would send to ${seller.email}: ${message}`);
  } catch (error) {
    console.error("Webhook: Failed to notify seller:", error);
    // Don't throw - notification failure shouldn't fail the webhook
  }
}

/**
 * Handle charge refunded
 */
async function handleChargeRefunded(charge: Stripe.Charge, env: Env) {
  const paymentIntentId = charge.payment_intent as string;

  if (!paymentIntentId) {
    console.error("Webhook: No payment_intent in refund");
    return;
  }

  // Get the purchase to find the seller
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

  // Update purchase status
  const result = await env.DB.prepare(
    `UPDATE purchases SET status = 'refunded', refunded_at = datetime('now') WHERE stripe_payment_intent_id = ?`
  )
    .bind(paymentIntentId)
    .run();

  if (result.meta.changes > 0) {
    console.log(`Webhook: Marked purchase as refunded for ${paymentIntentId}`);

    // Notify seller of refund if applicable
    if (purchase) {
      const app = await queryOne<{ owner_id: string | null }>(
        `SELECT owner_id FROM apps WHERE id = ?`,
        [purchase.app_id],
        env
      );

      if (app?.owner_id) {
        const appInfo = await queryOne<{ name: string }>(
          `SELECT name FROM apps WHERE id = ?`,
          [purchase.app_id],
          env
        );

        const amountFormatted = `$${(purchase.amount_cents / 100).toFixed(2)}`;
        const message = `Refund processed: ${appInfo?.name || 'Unknown app'} for ${amountFormatted}`;

        await env.DB.prepare(
          `INSERT INTO seller_notifications (id, seller_id, type, purchase_id, message, sent_at)
           VALUES (?, ?, 'refund', ?, ?, datetime('now'))`
        )
          .bind(nanoid(), app.owner_id, purchase.id, message)
          .run();

        console.log(`Webhook: Created refund notification for seller ${app.owner_id}`);
      }
    }
  } else {
    console.log(`Webhook: No purchase found for ${paymentIntentId}`);
  }
}

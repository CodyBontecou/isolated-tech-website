/**
 * Shared purchase-recording logic.
 *
 * Used by both the Stripe Checkout Session webhook (human flow) and the
 * agent PaymentIntent flow (Shared Payment Tokens / Agentic Commerce).
 *
 * Idempotent on either checkout session id or payment intent id.
 */

import type { Env } from "./env";
import { nanoid, queryOne } from "./db";

export interface RecordPurchaseInput {
  userId: string;
  appId: string;
  amountCents: number;
  platformFeeCents: number;
  sellerAmountCents: number;
  discountCodeId?: string | null;
  sellerId?: string | null;
  stripePaymentIntentId?: string | null;
  stripeCheckoutSessionId?: string | null;
}

export interface RecordPurchaseResult {
  purchaseId: string;
  alreadyExisted: boolean;
}

export async function recordPurchase(
  env: Env,
  input: RecordPurchaseInput
): Promise<RecordPurchaseResult> {
  const {
    userId,
    appId,
    amountCents,
    platformFeeCents,
    sellerAmountCents,
    discountCodeId,
    sellerId,
    stripePaymentIntentId,
    stripeCheckoutSessionId,
  } = input;

  const existing = await findExistingPurchase(env, {
    stripePaymentIntentId,
    stripeCheckoutSessionId,
  });

  if (existing) {
    return { purchaseId: existing.id, alreadyExisted: true };
  }

  const purchaseId = nanoid();
  const now = new Date().toISOString();

  await env.DB.prepare(
    `INSERT INTO purchases (id, user_id, app_id, stripe_payment_intent_id, stripe_checkout_session_id, amount_cents, platform_fee_cents, seller_amount_cents, discount_code_id, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)`
  )
    .bind(
      purchaseId,
      userId,
      appId,
      stripePaymentIntentId ?? null,
      stripeCheckoutSessionId ?? null,
      amountCents,
      platformFeeCents,
      sellerAmountCents,
      discountCodeId ?? null,
      now
    )
    .run();

  if (discountCodeId) {
    await env.DB.prepare(
      `UPDATE discount_codes SET times_used = times_used + 1 WHERE id = ?`
    )
      .bind(discountCodeId)
      .run();
  }

  await env.DB.prepare(
    `INSERT INTO email_log (id, user_id, event_type, subject, sent_at)
     VALUES (?, ?, 'purchase_receipt', ?, ?)`
  )
    .bind(nanoid(), userId, `Purchase completed`, now)
    .run();

  if (sellerId) {
    await notifySeller(env, sellerId, purchaseId, appId, amountCents);
  }

  return { purchaseId, alreadyExisted: false };
}

async function findExistingPurchase(
  env: Env,
  keys: {
    stripePaymentIntentId?: string | null;
    stripeCheckoutSessionId?: string | null;
  }
): Promise<{ id: string } | null> {
  if (keys.stripeCheckoutSessionId) {
    const bySession = await env.DB.prepare(
      `SELECT id FROM purchases WHERE stripe_checkout_session_id = ?`
    )
      .bind(keys.stripeCheckoutSessionId)
      .first<{ id: string }>();
    if (bySession) return bySession;
  }

  if (keys.stripePaymentIntentId) {
    const byPi = await env.DB.prepare(
      `SELECT id FROM purchases WHERE stripe_payment_intent_id = ?`
    )
      .bind(keys.stripePaymentIntentId)
      .first<{ id: string }>();
    if (byPi) return byPi;
  }

  return null;
}

async function notifySeller(
  env: Env,
  sellerId: string,
  purchaseId: string,
  appId: string,
  amountCents: number
) {
  try {
    const app = await queryOne<{ name: string }>(
      `SELECT name FROM apps WHERE id = ?`,
      [appId],
      env
    );

    if (!app) return;

    const amountFormatted = `$${(amountCents / 100).toFixed(2)}`;
    const message = `New sale: ${app.name} for ${amountFormatted}`;

    await env.DB.prepare(
      `INSERT INTO seller_notifications (id, seller_id, type, purchase_id, message, sent_at)
       VALUES (?, ?, 'sale', ?, ?, datetime('now'))`
    )
      .bind(nanoid(), sellerId, purchaseId, message)
      .run();
  } catch (error) {
    console.error("notifySeller failed:", error);
  }
}

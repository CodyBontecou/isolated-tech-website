/**
 * POST /api/admin/refund
 *
 * Process a refund for a purchase via Stripe.
 * Admin only.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { getSessionFromHeaders } from "@/lib/auth/middleware";
import { createStripeClient } from "@/lib/stripe";
import { nanoid } from "@/lib/db";

async function requireAdmin(request: NextRequest, env: Env) {
  const { user } = await getSessionFromHeaders(request.headers, env);
  if (!user || !user.isAdmin) return null;
  return user;
}

interface Purchase {
  id: string;
  user_id: string;
  app_id: string;
  stripe_payment_intent_id: string | null;
  amount_cents: number;
  status: string;
}

export async function POST(request: NextRequest) {
  try {
    const env = getEnv();

    if (!env?.DB) {
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    const admin = await requireAdmin(request, env);
    if (!admin) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    const { purchaseId, keepAccess } = body;

    if (!purchaseId) {
      return NextResponse.json(
        { error: "Purchase ID required" },
        { status: 400 }
      );
    }

    // Get purchase
    const purchase = await env.DB.prepare(
      `SELECT id, user_id, app_id, stripe_payment_intent_id, amount_cents, status 
       FROM purchases WHERE id = ?`
    )
      .bind(purchaseId)
      .first<Purchase>();

    if (!purchase) {
      return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    }

    if (purchase.status === "refunded") {
      return NextResponse.json(
        { error: "Purchase already refunded" },
        { status: 400 }
      );
    }

    // Process Stripe refund if there was a payment
    if (purchase.stripe_payment_intent_id && purchase.amount_cents > 0) {
      const stripe = createStripeClient(env);

      if (!stripe) {
        return NextResponse.json(
          { error: "Stripe not configured" },
          { status: 503 }
        );
      }

      try {
        await stripe.refunds.create({
          payment_intent: purchase.stripe_payment_intent_id,
        });
        console.log(`Refund created for payment intent: ${purchase.stripe_payment_intent_id}`);
      } catch (stripeError) {
        console.error("Stripe refund error:", stripeError);
        return NextResponse.json(
          { error: "Failed to process Stripe refund" },
          { status: 500 }
        );
      }
    }

    // Update purchase status
    // Use 'refunded_with_access' if customer should keep access, otherwise 'refunded'
    const now = new Date().toISOString();
    const newStatus = keepAccess ? "refunded_with_access" : "refunded";
    await env.DB.prepare(
      `UPDATE purchases SET status = ?, refunded_at = ? WHERE id = ?`
    )
      .bind(newStatus, now, purchaseId)
      .run();

    // Get user info for notification (Better Auth 'user' table)
    const user = await env.DB.prepare(`SELECT email FROM user WHERE id = ?`)
      .bind(purchase.user_id)
      .first<{ email: string }>();

    // Log refund notification (actual email sending requires SES)
    if (user) {
      await env.DB.prepare(
        `INSERT INTO email_log (id, user_id, event_type, subject, sent_at)
         VALUES (?, ?, 'refund_notification', ?, ?)`
      )
        .bind(
          nanoid(),
          purchase.user_id,
          `Refund processed`,
          now
        )
        .run();

      console.log(`Refund notification logged for ${user.email}`);
    }

    console.log(`Refund processed by admin ${admin.email} for purchase ${purchaseId}`);

    return NextResponse.json({
      success: true,
      message: "Refund processed successfully",
    });
  } catch (error) {
    console.error("Refund error:", error);
    return NextResponse.json(
      { error: "Failed to process refund" },
      { status: 500 }
    );
  }
}

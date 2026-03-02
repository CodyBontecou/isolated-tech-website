/**
 * GET /api/seller/status
 * 
 * Get the current user's seller status and Stripe Connect account status.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { getSessionFromHeaders } from "@/lib/auth/middleware";
import { createStripeClient, checkAccountStatus, PLATFORM_FEE_PERCENT } from "@/lib/stripe";
import { queryOne, query } from "@/lib/db";

export async function GET(request: NextRequest) {
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
        { error: "Please sign in" },
        { status: 401 }
      );
    }

    // Get user's seller info
    const sellerInfo = await queryOne<{
      stripe_account_id: string | null;
      stripe_onboarded: number;
      is_seller: number;
    }>(
      `SELECT stripe_account_id, stripe_onboarded, is_seller FROM user WHERE id = ?`,
      [user.id],
      env
    );

    if (!sellerInfo?.stripe_account_id) {
      return NextResponse.json({
        isSeller: false,
        isOnboarded: false,
        platformFeePercent: PLATFORM_FEE_PERCENT,
        stripeAccount: null,
        apps: [],
        stats: null,
      });
    }

    // Check Stripe account status directly from Stripe API (source of truth).
    const stripe = createStripeClient(env);
    let stripeStatus = null;

    if (stripe) {
      try {
        stripeStatus = await checkAccountStatus(stripe, sellerInfo.stripe_account_id);

        // Keep DB flag in sync with live Stripe status for downstream checks.
        const nextOnboarded = stripeStatus.chargesEnabled ? 1 : 0;
        if (nextOnboarded !== sellerInfo.stripe_onboarded) {
          await env.DB.prepare(
            `UPDATE user SET stripe_onboarded = ? WHERE id = ?`
          ).bind(nextOnboarded, user.id).run();
        }
      } catch (e) {
        console.error("Failed to check Stripe account status:", e);
      }
    }

    // Get seller's apps
    const apps = await query<{
      id: string;
      name: string;
      slug: string;
      icon_url: string | null;
      is_published: number;
      min_price_cents: number;
    }>(
      `SELECT id, name, slug, icon_url, is_published, min_price_cents FROM apps WHERE owner_id = ?`,
      [user.id],
      env
    );

    // Get seller stats
    const stats = await queryOne<{
      total_sales: number;
      total_revenue_cents: number;
      total_platform_fees_cents: number;
    }>(
      `SELECT 
        COUNT(*) as total_sales,
        COALESCE(SUM(amount_cents), 0) as total_revenue_cents,
        COALESCE(SUM(platform_fee_cents), 0) as total_platform_fees_cents
       FROM purchases p
       JOIN apps a ON p.app_id = a.id
       WHERE a.owner_id = ? AND p.status = 'completed'`,
      [user.id],
      env
    );

    return NextResponse.json({
      isSeller: sellerInfo.is_seller === 1,
      isOnboarded: stripeStatus?.chargesEnabled ?? sellerInfo.stripe_onboarded === 1,
      platformFeePercent: PLATFORM_FEE_PERCENT,
      stripeAccount: stripeStatus ? {
        detailsSubmitted: stripeStatus.detailsSubmitted,
        chargesEnabled: stripeStatus.chargesEnabled,
        payoutsEnabled: stripeStatus.payoutsEnabled,
        requirementsStatus: stripeStatus.requirementsStatus,
        transfersCapabilityStatus: stripeStatus.transfersCapabilityStatus,
      } : null,
      apps,
      stats: stats ? {
        totalSales: stats.total_sales,
        totalRevenueCents: stats.total_revenue_cents,
        netRevenueCents: stats.total_revenue_cents - stats.total_platform_fees_cents,
      } : null,
    });
  } catch (error) {
    console.error("Seller status error:", error);
    return NextResponse.json(
      { error: "Failed to get seller status" },
      { status: 500 }
    );
  }
}

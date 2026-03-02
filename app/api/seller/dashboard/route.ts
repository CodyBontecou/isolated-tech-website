/**
 * POST /api/seller/dashboard
 * 
 * Get a login link to the Stripe Express dashboard for the seller.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { getSessionFromHeaders } from "@/lib/auth/middleware";
import { createStripeClient, createDashboardLink, checkAccountStatus } from "@/lib/stripe";
import { queryOne, execute } from "@/lib/db";

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
        { error: "Please sign in" },
        { status: 401 }
      );
    }

    // Get user's Stripe account
    const sellerInfo = await queryOne<{
      stripe_account_id: string | null;
      stripe_onboarded: number;
    }>(
      `SELECT stripe_account_id, stripe_onboarded FROM user WHERE id = ?`,
      [user.id],
      env
    );

    if (!sellerInfo?.stripe_account_id) {
      return NextResponse.json(
        { error: "No Stripe account found. Please complete seller onboarding first." },
        { status: 400 }
      );
    }

    const stripe = createStripeClient(env);
    if (!stripe) {
      return NextResponse.json(
        { error: "Payment processing not configured" },
        { status: 503 }
      );
    }

    // Verify onboarding status live from Stripe before issuing dashboard link.
    const stripeStatus = await checkAccountStatus(stripe, sellerInfo.stripe_account_id);

    const nextOnboarded = stripeStatus.chargesEnabled ? 1 : 0;
    if (nextOnboarded !== sellerInfo.stripe_onboarded) {
      await execute(
        `UPDATE user SET stripe_onboarded = ? WHERE id = ?`,
        [nextOnboarded, user.id],
        env
      );
    }

    if (!stripeStatus.chargesEnabled) {
      return NextResponse.json(
        {
          error: "Please complete Stripe onboarding first.",
          details: `requirements=${stripeStatus.requirementsStatus ?? "unknown"}, transfers=${stripeStatus.transfersCapabilityStatus ?? "unknown"}`,
        },
        { status: 400 }
      );
    }

    const dashboardUrl = await createDashboardLink(stripe, sellerInfo.stripe_account_id);

    return NextResponse.json({
      success: true,
      url: dashboardUrl,
    });
  } catch (error) {
    console.error("Dashboard link error:", error);
    return NextResponse.json(
      { error: "Failed to create dashboard link" },
      { status: 500 }
    );
  }
}

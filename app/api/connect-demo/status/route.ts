import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { getSessionFromHeaders } from "@/lib/auth/middleware";
import { queryOne } from "@/lib/db";
import {
  createConnectDemoStripeClient,
  summarizeConnectDemoAccount,
} from "@/lib/stripe-connect-demo";

interface UserStripeAccountRow {
  stripe_account_id: string | null;
}

/**
 * GET /api/connect-demo/status
 *
 * Returns onboarding + payout readiness for the signed-in user's connected account.
 *
 * IMPORTANT: As requested, status is always pulled live from Stripe's Accounts API.
 * We do NOT rely on cached onboarding status in the database for this demo.
 */
export async function GET(request: NextRequest) {
  try {
    const env = getEnv();

    if (!env?.DB || !env?.AUTH_KV) {
      return NextResponse.json(
        { error: "Server configuration error: missing DB or AUTH_KV binding." },
        { status: 500 }
      );
    }

    const { user } = await getSessionFromHeaders(request.headers, env);

    if (!user) {
      return NextResponse.json(
        { error: "Please sign in to view Connect onboarding status." },
        { status: 401 }
      );
    }

    const userRow = await queryOne<UserStripeAccountRow>(
      "SELECT stripe_account_id FROM user WHERE id = ?",
      [user.id],
      env
    );

    if (!userRow?.stripe_account_id) {
      return NextResponse.json({
        hasConnectedAccount: false,
        status: null,
      });
    }

    const stripeClient = createConnectDemoStripeClient(env);

    const account = await stripeClient.v2.core.accounts.retrieve(
      userRow.stripe_account_id,
      {
        include: ["configuration.recipient", "requirements"],
      }
    );

    const status = summarizeConnectDemoAccount(account);

    return NextResponse.json({
      hasConnectedAccount: true,
      status,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Connect demo status error:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch Connect status.",
        details: message,
      },
      { status: 500 }
    );
  }
}

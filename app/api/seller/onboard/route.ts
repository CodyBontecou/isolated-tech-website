/**
 * POST /api/seller/onboard
 *
 * Start Stripe Connect onboarding for a user to become a seller.
 * Creates a Connect Express account and returns an onboarding URL.
 */

import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { getSessionFromHeaders } from "@/lib/auth/middleware";
import {
  createStripeClient,
  createConnectAccount,
  createAccountLink,
  getBaseUrl,
  isMissingStripeAccountError,
} from "@/lib/stripe";
import { execute, queryOne } from "@/lib/db";

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
        { error: "Please sign in to become a seller" },
        { status: 401 }
      );
    }

    if (!user.email) {
      return NextResponse.json(
        { error: "A verified email is required to connect Stripe" },
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

    const baseUrl = getBaseUrl(request, env);

    // Check if user already has a Connect account
    const existingUser = await queryOne<{
      stripe_account_id: string | null;
      stripe_onboarded: number;
    }>(
      `SELECT stripe_account_id, stripe_onboarded FROM user WHERE id = ?`,
      [user.id],
      env
    );

    const createAndPersistConnectAccount = async (): Promise<string> => {
      const account = await createConnectAccount(stripe, user.email, {
        user_id: user.id,
        platform: "isolated.tech",
      });

      await execute(
        `UPDATE user SET stripe_account_id = ?, stripe_onboarded = 0, is_seller = 1 WHERE id = ?`,
        [account.id, user.id],
        env
      );

      return account.id;
    };

    let accountId = existingUser?.stripe_account_id || null;

    if (!accountId) {
      accountId = await createAndPersistConnectAccount();
    }

    const refreshUrl = `${baseUrl}/seller/onboard?refresh=true`;
    const returnUrl = `${baseUrl}/seller/onboard/complete`;

    let accountLink;
    try {
      accountLink = await createAccountLink(
        stripe,
        accountId,
        refreshUrl,
        returnUrl
      );
    } catch (error) {
      // Handle stale account IDs (e.g. switched Stripe mode or deleted account)
      if (isMissingStripeAccountError(error)) {
        console.warn(`Stripe account ${accountId} missing for user ${user.id}; recreating`);
        accountId = await createAndPersistConnectAccount();
        accountLink = await createAccountLink(
          stripe,
          accountId,
          refreshUrl,
          returnUrl
        );
      } else {
        throw error;
      }
    }

    return NextResponse.json({
      success: true,
      url: accountLink.url,
    });
  } catch (error) {
    console.error("Seller onboard error:", error);
    const details = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to start onboarding", details },
      { status: 500 }
    );
  }
}

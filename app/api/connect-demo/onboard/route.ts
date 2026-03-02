import { NextRequest, NextResponse } from "next/server";
import { getEnv } from "@/lib/cloudflare-context";
import { getSessionFromHeaders } from "@/lib/auth/middleware";
import { execute, queryOne } from "@/lib/db";
import { getBaseUrl } from "@/lib/stripe";
import { createConnectDemoStripeClient } from "@/lib/stripe-connect-demo";

interface UserStripeAccountRow {
  stripe_account_id: string | null;
}

/**
 * POST /api/connect-demo/onboard
 *
 * Creates (or reuses) a Stripe Connect v2 account for the signed-in user,
 * stores user->account mapping in DB, then creates a hosted onboarding link.
 */
export async function POST(request: NextRequest) {
  try {
    const env = getEnv();

    // We need DB + auth bindings so we can resolve current user and store account mapping.
    if (!env?.DB || !env?.AUTH_KV) {
      return NextResponse.json(
        { error: "Server configuration error: missing DB or AUTH_KV binding." },
        { status: 500 }
      );
    }

    const { user } = await getSessionFromHeaders(request.headers, env);

    if (!user) {
      return NextResponse.json(
        { error: "Please sign in before starting Connect onboarding." },
        { status: 401 }
      );
    }

    if (!user.email) {
      return NextResponse.json(
        {
          error:
            "A verified email is required for Connect onboarding. Please add/verify your email first.",
        },
        { status: 400 }
      );
    }

    // Per requirements, use a single Stripe Client instance for all Stripe requests.
    const stripeClient = createConnectDemoStripeClient(env);

    // Check if this user already has a connected account ID persisted in DB.
    const existing = await queryOne<UserStripeAccountRow>(
      "SELECT stripe_account_id FROM user WHERE id = ?",
      [user.id],
      env
    );

    let accountId = existing?.stripe_account_id ?? null;

    if (!accountId) {
      /**
       * Create a v2 Account using ONLY the fields requested by the integration spec:
       * - display_name, contact_email, identity.country
       * - dashboard
       * - defaults.responsibilities (fees/losses collected by application)
       * - configuration.recipient.capabilities.stripe_balance.stripe_transfers.requested
       */
      const account = await stripeClient.v2.core.accounts.create({
        display_name: user.name ?? user.email.split("@")[0],
        contact_email: user.email,
        identity: {
          country: "us",
        },
        dashboard: "express",
        defaults: {
          responsibilities: {
            fees_collector: "application",
            losses_collector: "application",
          },
        },
        configuration: {
          recipient: {
            capabilities: {
              stripe_balance: {
                stripe_transfers: {
                  requested: true,
                },
              },
            },
          },
        },
      });

      accountId = account.id;

      // Persist user->connected-account mapping in existing user table.
      await execute(
        "UPDATE user SET stripe_account_id = ?, is_seller = 1 WHERE id = ?",
        [accountId, user.id],
        env
      );
    }

    const baseUrl = getBaseUrl(request, env);

    // Create hosted onboarding link (v2 account links API).
    const accountLink = await stripeClient.v2.core.accountLinks.create({
      account: accountId,
      use_case: {
        type: "account_onboarding",
        account_onboarding: {
          configurations: ["recipient"],
          refresh_url: `${baseUrl}/connect-demo?refresh=1`,
          return_url: `${baseUrl}/connect-demo?accountId=${accountId}`,
        },
      },
    });

    return NextResponse.json({
      success: true,
      accountId,
      onboardingUrl: accountLink.url,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Connect demo onboarding error:", error);

    return NextResponse.json(
      {
        error: "Failed to start Connect onboarding.",
        details: message,
      },
      { status: 500 }
    );
  }
}

import Stripe from "stripe";
import type { Env } from "@/lib/env";

/**
 * Sample Connect fee for destination charges.
 *
 * Change this value if you want a different platform take rate in the demo.
 */
export const CONNECT_DEMO_FEE_PERCENT = 15;

/**
 * Build a Stripe client for all sample Connect requests.
 *
 * IMPORTANT PLACEHOLDER:
 * - You must set STRIPE_SECRET_KEY in your environment bindings.
 * - Example test key format: sk_test_********************************
 */
export function createConnectDemoStripeClient(env: Env): Stripe {
  const secretKey = (env as Env & { STRIPE_SECRET_KEY?: string }).STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error(
      "Missing STRIPE_SECRET_KEY. Add it to your env bindings (for local dev, add STRIPE_SECRET_KEY=sk_test_... in .dev.vars)."
    );
  }

  return new Stripe(secretKey, {
    // Keep Stripe requests compatible with Cloudflare Workers by using fetch.
    httpClient: Stripe.createFetchHttpClient(),
    typescript: true,
  });
}

/**
 * Get webhook secret for the sample thin-event endpoint.
 *
 * IMPORTANT PLACEHOLDER:
 * - Set STRIPE_CONNECT_DEMO_WEBHOOK_SECRET from Stripe Dashboard or `stripe listen` output.
 * - Example format: whsec_********************************
 */
export function getConnectDemoWebhookSecret(env: Env): string {
  const webhookSecret = (env as Env & { STRIPE_CONNECT_DEMO_WEBHOOK_SECRET?: string })
    .STRIPE_CONNECT_DEMO_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error(
      "Missing STRIPE_CONNECT_DEMO_WEBHOOK_SECRET. Add it to env bindings before using /api/webhooks/stripe-connect-demo."
    );
  }

  return webhookSecret;
}

export interface ConnectDemoAccountStatus {
  accountId: string;
  readyToReceivePayments: boolean;
  onboardingComplete: boolean;
  requirementsStatus: string | null;
  transfersCapabilityStatus: string | null;
}

/**
 * Convert a v2 Account object into simple UI booleans.
 */
export function summarizeConnectDemoAccount(
  account: Stripe.V2.Core.Account
): ConnectDemoAccountStatus {
  const transfersCapabilityStatus =
    account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status ?? null;

  const requirementsStatus = account.requirements?.summary?.minimum_deadline?.status ?? null;

  const onboardingComplete =
    requirementsStatus !== "currently_due" && requirementsStatus !== "past_due";

  const readyToReceivePayments = transfersCapabilityStatus === "active";

  return {
    accountId: account.id,
    readyToReceivePayments,
    onboardingComplete,
    requirementsStatus,
    transfersCapabilityStatus,
  };
}

/**
 * Calculate application fee in cents from a gross amount.
 */
export function calculateConnectDemoApplicationFee(
  amountCents: number,
  feePercent: number = CONNECT_DEMO_FEE_PERCENT
): number {
  return Math.round((amountCents * feePercent) / 100);
}

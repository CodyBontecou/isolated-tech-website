/**
 * Stripe integration for ISOLATED.TECH App Store
 *
 * Supports:
 * - Direct payments (platform-owned apps)
 * - Stripe Connect (marketplace seller apps with 15% platform fee)
 */

import Stripe from "stripe";
import type { Env } from "./env";

/** Platform fee percentage (15%) */
export const PLATFORM_FEE_PERCENT = 15;

/**
 * Create a Stripe client instance
 * Note: Must be created per-request with the env secret
 * Uses Fetch HTTP client for Cloudflare Workers compatibility
 */
export function createStripeClient(env: Env): Stripe | null {
  const secretKey = (env as unknown as { STRIPE_SECRET_KEY?: string }).STRIPE_SECRET_KEY;

  if (!secretKey) {
    console.warn("STRIPE_SECRET_KEY not configured");
    return null;
  }

  return new Stripe(secretKey, {
    typescript: true,
    // Use fetch-based HTTP client for Cloudflare Workers compatibility
    httpClient: Stripe.createFetchHttpClient(),
  });
}

/**
 * Normalize a configured app URL and strip trailing slash
 */
function normalizeConfiguredUrl(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return null;
  }
}

/**
 * Get the base URL for redirects
 *
 * Preference order:
 * 1) Explicit APP_URL binding (if configured)
 * 2) Forwarded host/proto headers from proxy/CDN
 * 3) Request URL origin
 */
export function getBaseUrl(request: Request, env?: Env): string {
  const configured = normalizeConfiguredUrl((env as { APP_URL?: string } | undefined)?.APP_URL || "");
  if (configured) {
    return configured;
  }

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");

  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return new URL(request.url).origin;
}

/**
 * Check if a Stripe error indicates the account does not exist
 */
export function isMissingStripeAccountError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;

  const err = error as {
    code?: string;
    param?: string;
    message?: string;
    raw?: {
      code?: string;
      param?: string;
      message?: string;
    };
  };

  const code = err.code || err.raw?.code;
  const param = err.param || err.raw?.param;
  const message = (err.message || err.raw?.message || "").toLowerCase();

  return (
    code === "resource_missing" &&
    (param === "account" || param === "id" || message.includes("no such account"))
  );
}

/**
 * Calculate platform fee from a price in cents
 */
export function calculatePlatformFee(priceCents: number): number {
  return Math.round((priceCents * PLATFORM_FEE_PERCENT) / 100);
}

/**
 * Calculate seller amount after platform fee
 */
export function calculateSellerAmount(priceCents: number): number {
  return priceCents - calculatePlatformFee(priceCents);
}

/**
 * Create a Stripe Connect v2 account for a seller.
 *
 * Uses recipient configuration with platform-owned fees/losses,
 * matching our marketplace destination-charge model.
 */
export async function createConnectAccount(
  stripe: Stripe,
  email: string,
  displayName?: string
): Promise<Stripe.V2.Core.Account> {
  return stripe.v2.core.accounts.create({
    display_name: displayName || email.split("@")[0],
    contact_email: email,
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
}

/**
 * Create a v2 account onboarding link for Stripe Connect.
 */
export async function createAccountLink(
  stripe: Stripe,
  accountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<Stripe.V2.Core.AccountLink> {
  return stripe.v2.core.accountLinks.create({
    account: accountId,
    use_case: {
      type: "account_onboarding",
      account_onboarding: {
        configurations: ["recipient"],
        refresh_url: refreshUrl,
        return_url: returnUrl,
      },
    },
  });
}

/**
 * Check v2 account onboarding status and payout readiness.
 */
export async function checkAccountStatus(
  stripe: Stripe,
  accountId: string
): Promise<{
  detailsSubmitted: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  requirementsStatus: string | null;
  transfersCapabilityStatus: string | null;
}> {
  const account = await stripe.v2.core.accounts.retrieve(accountId, {
    include: ["configuration.recipient", "requirements"],
  });

  const transfersCapabilityStatus =
    account.configuration?.recipient?.capabilities?.stripe_balance?.stripe_transfers?.status ?? null;

  const requirementsStatus = account.requirements?.summary?.minimum_deadline?.status ?? null;

  const onboardingComplete =
    requirementsStatus !== "currently_due" && requirementsStatus !== "past_due";

  const readyToReceivePayments = transfersCapabilityStatus === "active";

  return {
    // Keep legacy field names so existing seller code can continue to use this helper.
    detailsSubmitted: onboardingComplete,
    chargesEnabled: onboardingComplete && readyToReceivePayments,
    payoutsEnabled: readyToReceivePayments,
    requirementsStatus,
    transfersCapabilityStatus,
  };
}

/**
 * Accept a payment from an AI agent using a Shared Payment Token (SPT).
 *
 * Per Stripe's Agentic Commerce docs, the merchant creates a PaymentIntent
 * with `payment_method_data[shared_payment_granted_token]` set to the SPT
 * the agent obtained from the buyer's wallet (e.g. Stripe Link). The SPT is
 * scoped to this merchant + amount and expires within minutes, so we confirm
 * inline.
 *
 * For seller-owned apps we apply the same Connect destination-charge model
 * used by hosted Checkout: application_fee_amount + transfer_data.destination.
 */
export interface AgentPaymentInput {
  amountCents: number;
  currency?: string;
  sharedPaymentToken: string;
  /** Used as Stripe-Idempotency-Key so retries don't double-charge. */
  idempotencyKey: string;
  metadata: Record<string, string>;
  /** Connect destination + fee for marketplace (seller-owned) apps. */
  connect?: {
    destinationAccountId: string;
    applicationFeeCents: number;
  };
  description?: string;
  receiptEmail?: string;
}

export async function acceptAgentPayment(
  stripe: Stripe,
  input: AgentPaymentInput
): Promise<Stripe.PaymentIntent> {
  const params: Stripe.PaymentIntentCreateParams = {
    amount: input.amountCents,
    currency: input.currency ?? "usd",
    confirm: true,
    payment_method_data: {
      // SDK type doesn't yet enumerate shared_payment_granted_token; cast.
      ...({ shared_payment_granted_token: input.sharedPaymentToken } as unknown as Stripe.PaymentIntentCreateParams.PaymentMethodData),
    },
    metadata: input.metadata,
    description: input.description,
    receipt_email: input.receiptEmail,
    // Off-session because the agent is acting on behalf of the buyer who
    // already approved the SPT in their wallet.
    off_session: true,
  };

  if (input.connect) {
    params.application_fee_amount = input.connect.applicationFeeCents;
    params.transfer_data = { destination: input.connect.destinationAccountId };
  }

  return stripe.paymentIntents.create(params, {
    idempotencyKey: input.idempotencyKey,
  });
}

/**
 * Create a login link for the Stripe Express dashboard
 */
export async function createDashboardLink(
  stripe: Stripe,
  accountId: string
): Promise<string> {
  const loginLink = await stripe.accounts.createLoginLink(accountId);
  return loginLink.url;
}

import type { Env } from "@/lib/env";
import { execute, queryOne } from "@/lib/db";
import {
  checkAccountStatus,
  createStripeClient,
  isMissingStripeAccountError,
} from "@/lib/stripe";

interface SellerRow {
  is_seller: number;
  stripe_account_id: string | null;
  stripe_onboarded: number;
}

export interface SellerConnectState {
  isSeller: boolean;
  stripeAccountId: string | null;
  dbOnboarded: boolean;
  liveChecked: boolean;
  effectiveOnboarded: boolean;
  requirementsStatus: string | null;
  transfersCapabilityStatus: string | null;
}

/**
 * Hybrid seller onboarding state helper.
 *
 * - Source of truth: live Stripe v2 status when available.
 * - Fallback: database state when Stripe is unavailable.
 * - Side effect: keeps user.stripe_onboarded in sync with live Stripe status.
 */
export async function getSellerConnectState(
  env: Env,
  userId: string
): Promise<SellerConnectState> {
  const seller = await queryOne<SellerRow>(
    `SELECT COALESCE(is_seller, 0) as is_seller, stripe_account_id, COALESCE(stripe_onboarded, 0) as stripe_onboarded
     FROM user
     WHERE id = ?`,
    [userId],
    env
  );

  const isSeller = seller?.is_seller === 1;
  const stripeAccountId = seller?.stripe_account_id || null;
  const dbOnboarded = seller?.stripe_onboarded === 1;

  // Non-sellers or sellers without account mapping are definitely not onboarded.
  if (!isSeller || !stripeAccountId) {
    return {
      isSeller,
      stripeAccountId,
      dbOnboarded,
      liveChecked: false,
      effectiveOnboarded: false,
      requirementsStatus: null,
      transfersCapabilityStatus: null,
    };
  }

  const stripe = createStripeClient(env);

  // If Stripe is temporarily unavailable in runtime, fall back to DB cache.
  if (!stripe) {
    return {
      isSeller,
      stripeAccountId,
      dbOnboarded,
      liveChecked: false,
      effectiveOnboarded: dbOnboarded,
      requirementsStatus: null,
      transfersCapabilityStatus: null,
    };
  }

  try {
    const liveStatus = await checkAccountStatus(stripe, stripeAccountId);
    const liveOnboarded = liveStatus.chargesEnabled;

    // Sync DB cache to live Stripe state.
    if (Number(liveOnboarded) !== seller?.stripe_onboarded) {
      await execute(
        `UPDATE user SET stripe_onboarded = ? WHERE id = ?`,
        [liveOnboarded ? 1 : 0, userId],
        env
      );
    }

    return {
      isSeller,
      stripeAccountId,
      dbOnboarded,
      liveChecked: true,
      effectiveOnboarded: liveOnboarded,
      requirementsStatus: liveStatus.requirementsStatus,
      transfersCapabilityStatus: liveStatus.transfersCapabilityStatus,
    };
  } catch (error) {
    // If the account was deleted or mode switched, force local cache to not-onboarded.
    if (isMissingStripeAccountError(error)) {
      await execute(
        `UPDATE user SET stripe_onboarded = 0 WHERE id = ?`,
        [userId],
        env
      );
    }

    console.error("Failed to fetch live Stripe seller status:", error);

    return {
      isSeller,
      stripeAccountId,
      dbOnboarded,
      liveChecked: false,
      effectiveOnboarded: dbOnboarded,
      requirementsStatus: null,
      transfersCapabilityStatus: null,
    };
  }
}

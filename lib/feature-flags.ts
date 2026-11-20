/**
 * Code-level feature flags. Flip a value here and deploy to turn a feature on.
 *
 * Flags are plain constants so server routes, server components and client
 * components all read the same value.
 */
export const FEATURE_FLAGS = {
  /**
   * Third-party distribution: sellers onboarding with Stripe Connect, the
   * /seller dashboard, /api/seller/*, and seller-owned app creation via the CLI.
   * Platform (superuser) publishing is not affected.
   */
  sellerProgram: false,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag];
}

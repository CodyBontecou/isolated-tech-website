/**
 * Stripe integration for ISOLATED.TECH App Store
 */

import Stripe from "stripe";
import type { Env } from "./env";

/**
 * Create a Stripe client instance
 * Note: Must be created per-request with the env secret
 */
export function createStripeClient(env: Env): Stripe | null {
  const secretKey = (env as unknown as { STRIPE_SECRET_KEY?: string }).STRIPE_SECRET_KEY;
  
  if (!secretKey) {
    console.warn("STRIPE_SECRET_KEY not configured");
    return null;
  }

  return new Stripe(secretKey, {
    apiVersion: "2023-10-16",
    typescript: true,
  });
}

/**
 * Get the base URL for redirects
 */
export function getBaseUrl(request: Request): string {
  const url = new URL(request.url);
  // Use the actual host in production, localhost in dev
  return `${url.protocol}//${url.host}`;
}

/**
 * Cloudflare Worker environment bindings
 */
export interface Env {
  // D1 Database
  DB: D1Database;

  // R2 Bucket (app binaries)
  APPS_BUCKET: R2Bucket;

  // KV Namespace (sessions, magic link tokens)
  AUTH_KV: KVNamespace;

  // Static assets
  ASSETS: Fetcher;

  // Stripe
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;

  // Stripe Connect v2 demo webhook (thin events)
  // PLACEHOLDER: set this to a whsec_... value from Stripe Dashboard / Stripe CLI listen output
  STRIPE_CONNECT_DEMO_WEBHOOK_SECRET?: string;

  // AWS SES
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_SES_REGION?: string;

  // OAuth - Apple
  APPLE_CLIENT_ID: string;
  APPLE_CLIENT_SECRET: string;

  // OAuth - Google
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;

  // OAuth - GitHub
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;

  // App URL
  APP_URL?: string;

  // Admin API Key (for CLI access)
  ADMIN_API_KEY?: string;

  // Better Auth secret
  BETTER_AUTH_SECRET: string;

  // Superuser emails (comma-separated list)
  SUPERUSER_EMAILS?: string;
}

/**
 * Get environment from request context (set by worker)
 */
let _env: Env | null = null;

export function setEnv(env: Env) {
  _env = env;
}

export function getEnv(): Env {
  if (!_env) {
    throw new Error("Environment not initialized. Call setEnv() first.");
  }
  return _env;
}

/**
 * App URL helper
 */
export function getAppUrl(env?: Env): string {
  const e = env || _env;
  return e?.APP_URL || "https://isolated.tech";
}

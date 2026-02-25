/**
 * Cloudflare context utilities for vinext
 *
 * Since vinext's default app-router-entry doesn't pass env to routes,
 * we use AsyncLocalStorage to make it available in route handlers.
 */

import { AsyncLocalStorage } from "node:async_hooks";
import type { Env } from "./env";

interface CloudflareContext {
  env: Env;
  ctx: ExecutionContext;
}

const cloudflareContextStorage = new AsyncLocalStorage<CloudflareContext>();

/**
 * Run a function with Cloudflare context available
 */
export function runWithCloudflareContext<T>(
  context: CloudflareContext,
  fn: () => T
): T {
  return cloudflareContextStorage.run(context, fn);
}

/**
 * Get the current Cloudflare context (env, ctx)
 * Throws if called outside of a request context
 */
export function getCloudflareContext(): CloudflareContext {
  const context = cloudflareContextStorage.getStore();
  if (!context) {
    throw new Error(
      "Cloudflare context not available. Are you calling this outside of a request?"
    );
  }
  return context;
}

/**
 * Get just the env bindings
 */
export function getEnv(): Env {
  return getCloudflareContext().env;
}

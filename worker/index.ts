/**
 * Cloudflare Worker entry point for ISOLATED.TECH App Store
 *
 * This file handles special routes (webhooks, downloads, appcast)
 * and delegates everything else to vinext.
 *
 * NOTE: Currently using vinext/server/app-router-entry directly.
 * Switch to this custom entry when special routes are implemented.
 */

import type { Env } from "../lib/env";

// Will be imported when we switch to custom entry:
// import handler from "vinext/server/app-router-entry";

export interface WorkerEnv extends Env {
  // Add any worker-specific bindings here
}

export default {
  async fetch(
    request: Request,
    env: WorkerEnv,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // ──────────────────────────────────────────────────────────
    // Special routes (handled before vinext)
    // ──────────────────────────────────────────────────────────

    // Stripe webhook (needs raw body)
    if (url.pathname === "/api/webhooks/stripe" && request.method === "POST") {
      return handleStripeWebhook(request, env);
    }

    // Signed download URL
    if (url.pathname.startsWith("/api/download/") && request.method === "GET") {
      return handleDownload(request, env);
    }

    // Sparkle appcast.xml
    if (url.pathname.startsWith("/appcast/") && request.method === "GET") {
      return handleAppcast(request, env);
    }

    // ──────────────────────────────────────────────────────────
    // All other routes: vinext handles them
    // ──────────────────────────────────────────────────────────
    // return handler.fetch(request, { env, ctx });

    // Placeholder until we switch to custom entry
    return new Response("Worker not fully configured", { status: 500 });
  },
};

// ──────────────────────────────────────────────────────────
// Route handlers (to be implemented)
// ──────────────────────────────────────────────────────────

async function handleStripeWebhook(
  _request: Request,
  _env: WorkerEnv
): Promise<Response> {
  // TODO: Implement in Phase 4
  return new Response("Not implemented", { status: 501 });
}

async function handleDownload(
  _request: Request,
  _env: WorkerEnv
): Promise<Response> {
  // TODO: Implement in Phase 5
  return new Response("Not implemented", { status: 501 });
}

async function handleAppcast(
  _request: Request,
  _env: WorkerEnv
): Promise<Response> {
  // TODO: Implement in Phase 7
  return new Response("Not implemented", { status: 501 });
}

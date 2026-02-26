/**
 * Better Auth catch-all API route
 *
 * Handles all auth endpoints:
 * - /api/auth/sign-in/*
 * - /api/auth/sign-up/*
 * - /api/auth/sign-out
 * - /api/auth/session
 * - /api/auth/callback/*
 * - /api/auth/magic-link/*
 * etc.
 */

import { toNextJsHandler } from "better-auth/next-js";
import { createAuth } from "@/lib/auth";
import { getEnv } from "@/lib/cloudflare-context";

// We need to create the auth instance per-request since
// Cloudflare Workers bindings are request-scoped
function getAuthHandler() {
  const env = getEnv();
  const auth = createAuth(env);
  return toNextJsHandler(auth);
}

export async function GET(request: Request) {
  const handler = getAuthHandler();
  return handler.GET(request);
}

export async function POST(request: Request) {
  const handler = getAuthHandler();
  return handler.POST(request);
}

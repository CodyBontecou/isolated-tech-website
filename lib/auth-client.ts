/**
 * Better Auth client for ISOLATED.TECH
 *
 * Client-side auth utilities for React components.
 */

import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: typeof window !== "undefined" ? window.location.origin : undefined,
  plugins: [magicLinkClient()],
});

// Export commonly used methods
export const {
  signIn,
  signUp,
  signOut,
  useSession,
  getSession,
} = authClient;

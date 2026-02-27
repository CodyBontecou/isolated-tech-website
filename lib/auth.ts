/**
 * Better Auth configuration for ISOLATED.TECH
 *
 * Server-side auth instance with:
 * - D1 database via Kysely
 * - Social providers (GitHub, Google, Apple)
 * - Magic Link plugin
 */

import { betterAuth } from "better-auth";
import { magicLink } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { D1Dialect } from "kysely-d1";
import type { Env } from "./env";
import { claimLegacyData } from "./legacy-claims";

/**
 * Create a Better Auth instance with the given environment
 * This must be called per-request since Cloudflare Workers
 * bindings (D1, KV) are request-scoped.
 */
export function createAuth(env: Env) {
  const baseURL = env.APP_URL || "https://isolated.tech";

  return betterAuth({
    baseURL,
    basePath: "/api/auth",
    secret: env.BETTER_AUTH_SECRET,

    // D1 Database via Kysely
    database: {
      dialect: new D1Dialect({ database: env.DB }),
      type: "sqlite",
    },

    // Session configuration
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24, // Update session age daily
      cookieCache: {
        enabled: true,
        maxAge: 60 * 15, // 15 minute cache
      },
    },

    // Cookie configuration
    advanced: {
      cookiePrefix: "isolated",
      useSecureCookies: true,
    },

    // User configuration with additional fields
    user: {
      additionalFields: {
        isAdmin: {
          type: "boolean",
          defaultValue: false,
          input: false,
        },
        newsletterSubscribed: {
          type: "boolean",
          defaultValue: false,
          input: false,
        },
      },
    },

    // Social providers
    socialProviders: {
      github: {
        clientId: env.GITHUB_CLIENT_ID || "",
        clientSecret: env.GITHUB_CLIENT_SECRET || "",
        enabled: !!(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET),
      },
      google: {
        clientId: env.GOOGLE_CLIENT_ID || "",
        clientSecret: env.GOOGLE_CLIENT_SECRET || "",
        enabled: !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
      },
      apple: {
        clientId: env.APPLE_CLIENT_ID || "",
        clientSecret: env.APPLE_CLIENT_SECRET || "",
        enabled: !!(env.APPLE_CLIENT_ID && env.APPLE_CLIENT_SECRET),
      },
    },

    // Hooks for lifecycle events
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            // Auto-claim legacy purchases and link subscriber when user signs up
            if (user.email) {
              await claimLegacyData(user.id, user.email, env);
            }
          },
        },
      },
    },

    // Plugins
    plugins: [
      // Magic link authentication
      magicLink({
        sendMagicLink: async ({ email, url, token }, ctx) => {
          // Log for development
          console.log(`[MAGIC LINK] ${email}: ${url}`);

          // TODO: Implement AWS SES email sending
          // In production, send email via AWS SES
          // await sendMagicLinkEmail(email, url, env);
        },
        expiresIn: 60 * 15, // 15 minutes
      }),

      // Next.js cookie handling (must be last)
      nextCookies(),
    ],
  });
}

// Type exports for use throughout the app
export type Auth = ReturnType<typeof createAuth>;

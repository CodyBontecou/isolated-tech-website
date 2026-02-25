/**
 * Auth module for ISOLATED.TECH App Store
 *
 * Re-exports all auth functionality for easy imports.
 */

// Session management
export {
  type Session,
  type User,
  type SessionValidationResult,
  generateSessionToken,
  createSession,
  validateSession,
  invalidateSession,
  invalidateAllUserSessions,
  SESSION_COOKIE_NAME,
  createSessionCookie,
  createBlankSessionCookie,
  getSessionIdFromCookies,
} from "./session";

// User management
export {
  type CreateUserInput,
  type OAuthAccountInput,
  createUser,
  getUserByEmail,
  getUserById,
  updateUser,
  getOrCreateUserFromOAuth,
  getUserOAuthProviders,
} from "./user";

// Magic link
export {
  createMagicLinkToken,
  verifyMagicLinkToken,
  completeMagicLinkAuth,
  getMagicLinkUrl,
  checkMagicLinkRateLimit,
} from "./magic-link";

// Middleware helpers
export {
  getCurrentUser,
  getCurrentSession,
  requireAuth,
  requireAdmin,
  isAuthenticated,
} from "./middleware";

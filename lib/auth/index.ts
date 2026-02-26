/**
 * Auth module for ISOLATED.TECH App Store
 *
 * Re-exports middleware helpers for checking authentication
 * in Server Components and Route Handlers.
 */

export {
  getCurrentUser,
  getCurrentSession,
  requireAuth,
  requireAdmin,
  isAuthenticated,
  getSessionFromHeaders,
  validateSessionFromRequest,
  type User,
  type Session,
  type SessionResult,
} from "./middleware";

// Redirect utilities
export { sanitizeRedirectPath } from "./redirect";

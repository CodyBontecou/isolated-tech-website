{
  "id": "7ef7cc3a",
  "title": "Phase 2.7: Protected route middleware",
  "tags": [
    "phase-2",
    "auth"
  ],
  "status": "done",
  "created_at": "2026-02-25T10:58:14.401Z"
}

## Completed

- [x] Created lib/auth/middleware.ts with:
  - getCurrentUser(env) - Get user from session cookie
  - getCurrentSession(env) - Get full session + user
  - requireAuth(env) - Throws redirect if not authenticated
  - requireAdmin(env) - Requires admin flag
  - isAuthenticated(env) - Boolean check for conditional rendering
- [x] Uses next/headers cookies() for reading session cookie
- [x] Validates session via KV + D1
- [x] Auto-refreshes sessions older than 15 days

{
  "id": "dbe85cc1",
  "title": "🔴 P0: Add admin authentication tests (API keys)",
  "tags": [
    "testing",
    "p0",
    "security"
  ],
  "status": "closed",
  "created_at": "2026-02-27T22:32:09.364Z"
}

## Completed

### Files Created
- `tests/unit/admin-auth.test.ts` - 13 unit tests for admin auth
- `tests/integration/admin-auth.test.ts` - 14 integration tests for admin API routes

### Tests Added

**Unit Tests (`tests/unit/admin-auth.test.ts`):**
- `generateApiKey` - 5 tests (64-char hex, 30-day expiry, DB storage, prefix, uniqueness)
- `revokeApiKey` - 2 tests (revoke existing, non-existent)
- Hash consistency (indirect) - 1 test
- `requireAdmin` with API key - 5 tests (legacy key, invalid key, session fallback, non-admin rejection, no auth)

**Integration Tests (`tests/integration/admin-auth.test.ts`):**
- GET /api/admin/api-keys - 4 tests (auth required, non-admin rejected, admin session, API key auth)
- POST /api/admin/api-keys - 4 tests (auth required, generate key, default name, API key auth)
- DELETE /api/admin/api-keys - 4 tests (auth required, missing prefix, non-existent key, revoke)
- Edge cases - 2 tests (invalid API key rejection, malformed JSON handling)

### Acceptance Criteria
- [x] Unit tests for all hash/generate/validate functions
- [x] Integration tests for `requireAdmin` middleware
- [x] All 27 admin auth tests pass
- [x] Coverage target achieved for `lib/admin-auth.ts`

{
  "id": "eacba5aa",
  "title": "Add tests for worker code (worker/index.ts, worker-redirect/index.ts)",
  "tags": [
    "testing",
    "low",
    "infrastructure"
  ],
  "status": "open",
  "created_at": "2026-02-28T05:46:25.785Z"
}

## Context
Cloudflare Worker entry points have no test coverage.

## Areas to test

### worker/index.ts
- Request routing
- Environment binding
- Error handling
- CORS headers

### worker-redirect/index.ts
- Redirect rules
- URL pattern matching
- Status codes (301 vs 302)
- Query param preservation

## Files to create
- `tests/unit/worker.test.ts`
- `tests/unit/worker-redirect.test.ts`

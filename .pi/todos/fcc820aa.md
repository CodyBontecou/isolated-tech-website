{
  "id": "fcc820aa",
  "title": "[Error Tracking] Install and configure Sentry SDK",
  "tags": [
    "infrastructure",
    "error-tracking"
  ],
  "status": "open",
  "created_at": "2026-02-28T17:50:26.713Z"
}

Parent: Epic: Error Tracking Integration

## Tasks
1. Create Sentry project at sentry.io
2. Install `@sentry/cloudflare` package
3. Configure Sentry in `lib/sentry.ts`
4. Wrap Workers entry point with Sentry handler
5. Add SENTRY_DSN to wrangler.toml secrets

## Code Example
```typescript
// lib/sentry.ts
import * as Sentry from "@sentry/cloudflare";

export function initSentry(env: Env) {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.ENVIRONMENT || "production",
    tracesSampleRate: 0.1,
  });
}
```

## Secrets to Add
- SENTRY_DSN
- SENTRY_AUTH_TOKEN (for source maps)

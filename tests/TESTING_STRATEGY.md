# Testing Strategy for ISOLATED.TECH

> A comprehensive testing strategy for a production app store handling payments, downloads, and user data.

## Executive Summary

This document outlines a three-tier testing strategy prioritized by business impact:
- **🔴 Critical (P0)**: Payment, Downloads, Authentication - must be 95%+ reliable
- **🟡 Important (P1)**: Admin operations, Email, Rate limiting - must be 85%+ reliable
- **🟢 Standard (P2)**: Feedback, Reviews, CLI - standard coverage

## Current State Assessment

### ✅ Already Covered
| Area | Coverage | Tests |
|------|----------|-------|
| Checkout API | Good | `integration/checkout.test.ts` |
| Stripe Webhooks | Good | `integration/webhook.test.ts` |
| Download (Token) | Good | `integration/download.test.ts` |
| nanoid generation | Unit | `unit/db.test.ts` |
| Stripe utilities | Unit | `unit/stripe.test.ts` |

### ❌ Gaps Identified
| Area | Priority | Impact | Notes |
|------|----------|--------|-------|
| Authenticated Downloads | P0 | High | Purchase verification flow |
| Admin Auth (API Keys) | P0 | High | CLI + admin security |
| Rate Limiting | P1 | Medium | Abuse prevention |
| Email (AWS SES) | P1 | Medium | Customer communication |
| Feedback System | P2 | Low | Feature request voting |
| Reviews | P2 | Low | User ratings |
| App Store Connect sync | P2 | Low | External review import |
| CLI commands | P1 | Medium | Developer experience |
| Admin CRUD operations | P1 | Medium | App management |
| Error boundaries | P1 | Medium | Graceful degradation |

---

## Testing Tiers

### Tier 1: Unit Tests (`tests/unit/`)

Fast, isolated tests for pure functions and utilities.

**Target: <100ms per test, 95% pass rate in CI**

| Module | Test File | Functions to Cover |
|--------|-----------|-------------------|
| `lib/db.ts` | `db.test.ts` | `nanoid`, `query`, `queryOne`, `execute`, `batch` |
| `lib/stripe.ts` | `stripe.test.ts` | `createStripeClient`, `getBaseUrl` ✅ |
| `lib/rate-limit.ts` | `rate-limit.test.ts` | `checkRateLimit`, `recordRateLimitAction`, `cleanupRateLimits` |
| `lib/email.ts` | `email.test.ts` | `generateReceiptEmail`, `generateUpdateEmail`, `generateFeedbackStatusEmail`, `generateCommentNotificationEmail` |
| `lib/admin-auth.ts` | `admin-auth.test.ts` | `hashApiKey`, `generateApiKey`, `validateDatabaseApiKey` |
| `lib/legacy-claims.ts` | `legacy-claims.test.ts` | `claimLegacyData` |
| `lib/app-data.ts` | `app-data.test.ts` | App data transformation functions |

### Tier 2: Integration Tests (`tests/integration/`)

Test API routes with mocked Cloudflare bindings (D1, R2, KV).

**Target: <500ms per test, mock all external services**

#### 🔴 P0 - Critical Path Tests

| Endpoint | Test File | Scenarios |
|----------|-----------|-----------|
| `POST /api/checkout` | `checkout.test.ts` ✅ | Auth, validation, duplicates, free/paid, discounts |
| `POST /api/webhooks/stripe` | `webhook.test.ts` ✅ | Signature, checkout.completed, charge.refunded, idempotency |
| `GET /api/download/[appId]` | `download.test.ts` | Auth, purchase check, admin bypass, R2 streaming |
| `GET /api/download/token/[token]` | `download.test.ts` ✅ | Token validation, expiration, one-time use |
| `POST /api/auth/*` | `auth.test.ts` | Login, logout, session validation, social auth |

#### 🟡 P1 - Important Tests

| Endpoint | Test File | Scenarios |
|----------|-----------|-----------|
| `POST /api/admin/*` | `admin.test.ts` | API key auth, session auth, CRUD operations |
| `GET/POST /api/admin/apps` | `admin-apps.test.ts` | Create, update, delete, publish apps |
| `POST /api/admin/versions` | `admin-versions.test.ts` | Upload, presign, version management |
| `POST /api/admin/api-keys` | `admin-api-keys.test.ts` | Generate, revoke, validate |
| `GET/POST /api/feedback` | `feedback.test.ts` | List, create, vote, comment |
| `POST /api/cli/*` | `cli-api.test.ts` | Auth, app lookup, version upload |

#### 🟢 P2 - Standard Tests

| Endpoint | Test File | Scenarios |
|----------|-----------|-----------|
| `GET/POST /api/reviews` | `reviews.test.ts` | Create, list, stats |
| `GET /api/discount` | `discount.test.ts` | Validate codes |
| `GET /appcast/[slug]` | `appcast.test.ts` | Sparkle XML generation |
| `POST /api/cron/*` | `cron.test.ts` | Review sync, cleanup |

### Tier 3: E2E Tests (`tests/e2e/`)

Full browser tests using Playwright.

**Target: <30s per test, run against local dev server**

| Flow | Test File | Scenarios |
|------|-----------|-----------|
| Purchase Flow | `purchase-flow.spec.ts` | Browse → Login → Buy → Download |
| Admin Flow | `admin-flow.spec.ts` | Login → Create App → Upload Version → Publish |
| Feedback Flow | `feedback-flow.spec.ts` | Submit → Vote → Comment |
| Dashboard Flow | `dashboard-flow.spec.ts` | View purchases → Download → Review |
| Auth Flow | `auth-flow.spec.ts` | Sign up → Verify → Login → Logout |

---

## Mock Infrastructure

### Existing Mocks ✅
- `mocks/cloudflare.ts` - D1, R2, KV mocks with in-memory state
- `mocks/stripe.ts` - Stripe API mocks
- `mocks/auth.ts` - User and session mocks

### New Mocks Needed

#### `mocks/email.ts`
```typescript
export function createMockEmailSender() {
  const sentEmails: EmailOptions[] = [];
  return {
    sendEmail: vi.fn(async (options) => {
      sentEmails.push(options);
      return { messageId: `msg_${Date.now()}` };
    }),
    getSentEmails: () => sentEmails,
    clearEmails: () => sentEmails.length = 0,
  };
}
```

#### `mocks/r2-streaming.ts`
```typescript
export function createMockR2WithStreaming() {
  // R2 mock that properly streams large files
}
```

---

## Test Fixtures (`tests/fixtures/`)

### Current Fixtures ✅
- Users (testUser, adminUser)
- Apps (testApp, freeApp)
- Versions (testVersion)
- Purchases (testPurchase)
- Discount codes (percent, fixed, expired, maxed)
- Download tokens (valid, used, expired)

### New Fixtures Needed

```typescript
// Add to fixtures/index.ts

// API Keys
export const validApiKey = {
  id: "key_test_123",
  name: "Test Key",
  key_hash: "...", // Pre-computed hash
  key_prefix: "abcd1234",
  expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  is_revoked: 0,
};

// Feedback
export const testFeatureRequest = {
  id: "fr_test_123",
  user_id: testUser.id,
  app_id: testApp.id,
  type: "feature",
  title: "Test Feature Request",
  body: "This is a test feature request.",
  status: "open",
  vote_count: 5,
  comment_count: 2,
  created_at: new Date("2024-01-01").toISOString(),
};

// Reviews
export const testReview = {
  id: "review_test_123",
  user_id: testUser.id,
  app_id: testApp.id,
  rating: 5,
  title: "Great app!",
  body: "Really love this app.",
  is_approved: 1,
  created_at: new Date("2024-01-01").toISOString(),
};
```

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit-and-integration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      
      - run: npm ci
      - run: npm run test:run
      - run: npm run test:coverage
      
      - uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

### Pre-deploy Checks

```yaml
# Deploy only if tests pass
deploy:
  needs: [unit-and-integration, e2e]
  runs-on: ubuntu-latest
  if: github.ref == 'refs/heads/main'
  steps:
    - run: npm run deploy
```

---

## Coverage Goals

| Category | Current | Target | Timeline |
|----------|---------|--------|----------|
| **P0 Critical Paths** | ~60% | 95% | Week 1 |
| **P1 Important** | ~20% | 85% | Week 2 |
| **P2 Standard** | ~10% | 70% | Week 3 |
| **Overall** | ~30% | 80% | Week 4 |

---

## Test Data Management

### Database Seeding for E2E
```typescript
// tests/e2e/helpers/seed.ts
export async function seedTestData() {
  // Create test user
  // Create test app
  // Create test purchase
}
```

### Test Isolation
- Each integration test resets mocks in `beforeEach`
- E2E tests use unique email addresses per run
- No shared state between test files

---

## Error Scenarios to Test

### P0 - Must Handle Gracefully
- [ ] Stripe API unavailable
- [ ] D1 database timeout
- [ ] R2 file not found
- [ ] Invalid session token
- [ ] Expired API key

### P1 - Should Handle
- [ ] Email sending fails
- [ ] Rate limit exceeded
- [ ] Malformed request body
- [ ] Missing required fields

### P2 - Nice to Have
- [ ] Large file uploads
- [ ] Concurrent requests
- [ ] Character encoding edge cases

---

## Performance Benchmarks

### API Response Times (P95)
| Endpoint | Target | Threshold |
|----------|--------|-----------|
| `GET /apps/[slug]` | <100ms | <500ms |
| `POST /api/checkout` | <500ms | <2000ms |
| `GET /api/download/*` | <200ms | <1000ms |
| `POST /api/webhooks/stripe` | <500ms | <3000ms |

---

## Manual Testing Checklist

Before each deploy, run through:

1. **Payment Flow**
   - [ ] Can browse apps (logged out)
   - [ ] Can initiate purchase (logged in)
   - [ ] Stripe checkout completes
   - [ ] Purchase appears in dashboard
   - [ ] Can download purchased app

2. **Admin Flow**
   - [ ] Can login as admin
   - [ ] Can create/edit app
   - [ ] Can upload version
   - [ ] Can view purchases

3. **CLI Flow**
   - [ ] `isolated login` works
   - [ ] `isolated publish` works
   - [ ] Sparkle updates work

---

## Next Steps

1. **Week 1**: Complete P0 critical path tests
2. **Week 2**: Add P1 important tests
3. **Week 3**: Add P2 standard tests + E2E
4. **Week 4**: CI integration + coverage enforcement

See individual test TODOs for specific implementation tasks.

# Testing Guide for ISOLATED.TECH Store

This document describes the testing strategy and how to run tests for the isolated.tech app store.

## Overview

We use a three-tier testing approach:

1. **Unit Tests** - Test individual functions in isolation
2. **Integration Tests** - Test API routes with mocked dependencies
3. **E2E Tests** - Test full user flows in a real browser

## Quick Start

```bash
# Run unit and integration tests
npm test

# Run all tests once (CI mode)
npm run test:run

# Run tests with coverage report
npm run test:coverage

# Run E2E tests
npm run test:e2e

# Run everything
npm run test:all
```

## Test Structure

```
tests/
├── setup.ts              # Vitest global setup
├── fixtures/             # Test data and factories
│   └── index.ts
├── mocks/                # Mock implementations
│   ├── cloudflare.ts     # D1, R2, KV mocks
│   ├── stripe.ts         # Stripe API mocks
│   └── auth.ts           # Authentication mocks
├── unit/                 # Unit tests
│   ├── db.test.ts
│   └── stripe.test.ts
├── integration/          # Integration tests
│   ├── checkout.test.ts
│   ├── webhook.test.ts
│   └── download.test.ts
└── e2e/                  # End-to-end tests
    └── purchase-flow.spec.ts
```

## Critical Paths Tested

### 1. Checkout Flow (`tests/integration/checkout.test.ts`)
- ✅ Authentication required
- ✅ App validation
- ✅ Duplicate purchase prevention
- ✅ Free app purchase (direct completion)
- ✅ Paid app purchase (Stripe session creation)
- ✅ Discount code application
- ✅ Error handling (Stripe not configured)

### 2. Stripe Webhooks (`tests/integration/webhook.test.ts`)
- ✅ Signature verification
- ✅ `checkout.session.completed` - Purchase creation
- ✅ `charge.refunded` - Refund handling
- ✅ Idempotency (duplicate event handling)
- ✅ Missing metadata handling
- ✅ Unhandled event types

### 3. Downloads (`tests/integration/download.test.ts`)
- ✅ Authentication required
- ✅ Purchase verification
- ✅ Admin bypass
- ✅ Token-based downloads
- ✅ One-time token consumption
- ✅ Expired token handling
- ✅ Used token handling
- ✅ File streaming from R2

## Writing New Tests

### Integration Test Example

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockEnv } from "../mocks/cloudflare";
import { createMockUser } from "../mocks/auth";
import * as fixtures from "../fixtures";

// Mock dependencies
vi.mock("@/lib/cloudflare-context", () => ({
  getEnv: vi.fn(),
}));

describe("My API Route", () => {
  let mockEnv;

  beforeEach(() => {
    vi.resetModules();
    mockEnv = createMockEnv({
      d1State: fixtures.createTestD1State(),
    });
  });

  it("should do something", async () => {
    const { getEnv } = await import("@/lib/cloudflare-context");
    vi.mocked(getEnv).mockReturnValue(mockEnv);

    const { POST } = await import("@/app/api/my-route/route");
    // ... test implementation
  });
});
```

### Adding Test Fixtures

Add new fixtures to `tests/fixtures/index.ts`:

```typescript
export const newTestData = {
  id: "test_123",
  // ...
};

// Update createTestD1State to include new data
export function createTestD1State() {
  return {
    tables: new Map([
      ["my_table", [newTestData]],
      // ...existing tables
    ]),
  };
}
```

## CI Integration

Add to your GitHub Actions workflow:

```yaml
- name: Run tests
  run: npm run test:run

- name: Run E2E tests
  run: |
    npx playwright install --with-deps
    npm run test:e2e
```

## Coverage Goals

Aim for high coverage on critical paths:

| Area | Target | Why |
|------|--------|-----|
| Checkout | 90%+ | Direct revenue impact |
| Webhooks | 95%+ | Payment reliability |
| Downloads | 90%+ | Customer satisfaction |
| Auth | 80%+ | Security |

Run `npm run test:coverage` to see current coverage.

## Troubleshooting

### "Module not found" errors
Reset modules in `beforeEach`:
```typescript
beforeEach(() => {
  vi.resetModules();
});
```

### Mock not working
Ensure mocks are defined before imports:
```typescript
vi.mock("@/lib/something", () => ({...}));
// Then import
const { myFunction } = await import("@/app/api/route");
```

### E2E tests timing out
Increase timeout in `playwright.config.ts`:
```typescript
timeout: 60 * 1000, // 60 seconds
```

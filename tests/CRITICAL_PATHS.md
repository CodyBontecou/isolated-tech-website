# Critical Path Testing Checklist

This documents the critical user flows that must work for the product to function.
Use this as a manual testing checklist and as a guide for automated tests.

## 🔴 CRITICAL: Payment Flow

### Checkout Flow
- [ ] User can view app pricing
- [ ] Unauthenticated user is prompted to login when clicking buy
- [ ] Authenticated user can initiate checkout
- [ ] Stripe checkout session is created with correct metadata
- [ ] User is redirected to Stripe
- [ ] Free apps create purchase immediately without Stripe

### Stripe Webhooks
- [ ] `checkout.session.completed` creates purchase record
- [ ] Purchase is NOT duplicated if webhook fires twice (idempotency)
- [ ] `charge.refunded` marks purchase as refunded
- [ ] Webhook signature is verified
- [ ] Missing metadata doesn't crash the handler

### Download Flow
- [ ] Authenticated user with purchase can download
- [ ] Unauthenticated user gets 401
- [ ] User without purchase gets 403
- [ ] Admin can download without purchase
- [ ] File is streamed from R2 correctly
- [ ] Download is logged to database

### Token Downloads
- [ ] Valid token allows download
- [ ] Used token returns 410
- [ ] Expired token returns 410
- [ ] Token is marked as used after download

## 🟡 IMPORTANT: Authentication

- [ ] User can sign up with email
- [ ] User can sign in
- [ ] User can sign in with social providers
- [ ] Session is maintained across requests
- [ ] User can sign out

## 🟡 IMPORTANT: Dashboard

- [ ] User can see purchased apps
- [ ] User can download purchased apps
- [ ] User can see download history
- [ ] User can manage account settings

## 🟢 NICE TO HAVE: Other Features

- [ ] Discount codes are applied correctly
- [ ] Reviews can be submitted
- [ ] App updates are displayed
- [ ] Feedback can be submitted

---

## 🔴 CRITICAL: Route Health

All pages must render without 500 errors. This is now covered by automated tests:

### Static Pages
- [x] Homepage (`/`)
- [x] Terms of Service (`/terms`)
- [x] Privacy Policy (`/privacy`)

### Public Dynamic Pages
- [x] Feedback List (`/feedback`)
- [x] Public Roadmap (`/roadmap`)
- [x] Help Center (`/help`)
- [x] Apps Listing (`/apps`)

### Auth Pages
- [x] Login (`/auth/login`)
- [x] Email Verification (`/auth/verify`)

### Protected Pages (handle unauthenticated gracefully)
- [x] Dashboard (`/dashboard`)
- [x] Reviews (`/dashboard/reviews`)
- [x] Settings (`/dashboard/settings`)
- [x] Submit Feedback (`/feedback/submit`)

### Admin Pages (redirect when not admin)
- [x] All admin routes handle auth gracefully

### API Endpoints
- [x] GET `/api/feedback` - returns valid JSON
- [x] POST `/api/feedback/submit` - validates input
- [x] POST `/api/checkout` - requires auth

**Tests:** `tests/e2e/route-health.spec.ts`, `tests/integration/route-health.test.ts`

---

## Manual Smoke Test Script

Run this before every deploy:

1. **Visit homepage** - Apps load correctly
2. **Click an app** - Detail page works
3. **Click Buy** (logged out) - Redirects to login
4. **Sign in** - Authentication works
5. **Click Buy** (logged in) - Stripe checkout opens
6. **Complete test purchase** - Use Stripe test card 4242...
7. **Return to site** - Redirected to dashboard
8. **Download app** - File downloads correctly
9. **Sign out** - Session cleared

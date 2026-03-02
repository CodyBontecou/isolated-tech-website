# Marketplace Multi-Tenant Setup

This document describes the marketplace functionality that allows third-party sellers to distribute their apps on ISOLATED.TECH with a 15% platform fee.

## Overview

- **Platform Fee**: 15% of each sale goes to ISOLATED.TECH
- **Seller Share**: 85% goes directly to the seller via Stripe Connect
- **Stripe Connect**: Uses Express accounts for easy seller onboarding

## Database Changes

Run migrations `0024_marketplace_sellers.sql` and `0025_api_keys_user_scope.sql` to add:

```sql
-- Stripe Connect fields on users
ALTER TABLE user ADD COLUMN stripe_account_id TEXT;
ALTER TABLE user ADD COLUMN stripe_onboarded INTEGER DEFAULT 0;
ALTER TABLE user ADD COLUMN is_seller INTEGER DEFAULT 0;

-- App ownership
ALTER TABLE apps ADD COLUMN owner_id TEXT REFERENCES user(id);

-- Platform fee tracking
ALTER TABLE purchases ADD COLUMN platform_fee_cents INTEGER DEFAULT 0;
ALTER TABLE purchases ADD COLUMN seller_amount_cents INTEGER DEFAULT 0;

-- Plus seller_payouts and seller_notifications tables
```

## New API Routes

### Seller Onboarding
- `POST /api/seller/onboard` - Start Stripe Connect onboarding
- `GET /api/seller/status` - Get seller status and stats
- `POST /api/seller/dashboard` - Get Stripe Express dashboard link

### Seller Notifications
- `GET /api/seller/notifications` - Get notifications (sales, refunds)
- `POST /api/seller/notifications` - Mark notifications as read

## CLI Support for Sellers

Yes — sellers can use the existing `isolated` CLI flow.

- Device auth now issues **user-scoped API keys** (not global superuser keys)
- CLI app/version routes are owner-scoped:
  - sellers can only list/manage their own apps
  - superusers can manage all apps
- Keys are stored with `api_keys.user_id` and enforced in `requireAdmin`

### Seller CLI Onboarding (Quickstart)

```bash
# 1) Install CLI
npm install -g @isolated/cli

# 2) Login (browser device auth)
isolated login

# 3) Register app (creates draft app owned by your user)
isolated init

# 4) Publish a release
isolated publish
```

Useful checks:

```bash
isolated whoami
isolated apps list
isolated publish --dry-run
```

For agent/automation workflows, add `--json` to commands.

## User Flow

### Becoming a Seller
1. User visits `/seller`
2. Clicks "Connect with Stripe"
3. Completes Stripe Express onboarding
4. Returns to `/seller/onboard/complete`
5. Can now create and manage apps

### Seller Dashboard
- `/seller` - Overview with stats
- `/admin/apps` - Manage apps (scoped to seller's apps)
- Stripe Dashboard link for payout management

## Checkout Flow Changes

When a buyer purchases a seller-owned app:

1. Checkout creates session with `payment_intent_data`:
   - `application_fee_amount`: 15% platform fee
   - `transfer_data.destination`: Seller's Stripe account
2. Stripe automatically splits the payment
3. Webhook notifies seller of the sale

## Permission System

### Superusers
- Defined in `SUPERUSER_EMAILS` array in `lib/admin-auth.ts`
- Can manage all apps
- Can see all purchases and stats
- Can set any user as app owner

### Sellers
- Can only manage their own apps
- Can only see their own stats
- Apps they create are automatically owned by them

### API Key Access
- API keys get superuser permissions (for CLI automation)

## Environment Variables

No new environment variables required. Uses existing:
- `STRIPE_SECRET_KEY` - Must support Connect
- `STRIPE_WEBHOOK_SECRET`

## Testing Locally

1. Run migration smoke test:
   ```bash
   npm run test:migrations
   ```

2. Apply migrations:
   ```bash
   npx wrangler d1 execute isolated-tech-db --local --file migrations/0024_marketplace_sellers.sql
   npx wrangler d1 execute isolated-tech-db --local --file migrations/0025_api_keys_user_scope.sql
   ```

2. Start dev server:
   ```bash
   npm run dev
   ```

3. Test seller flow:
   - Sign in with non-superuser account
   - Visit `/seller`
   - Complete Stripe onboarding (use test mode)
   - Create an app
   - Test purchase flow

## Production Deployment

1. Apply migrations to production D1:
   ```bash
   npx wrangler d1 execute isolated-tech-db --file migrations/0024_marketplace_sellers.sql
   npx wrangler d1 execute isolated-tech-db --file migrations/0025_api_keys_user_scope.sql
   ```

2. Deploy:
   ```bash
   npm run deploy
   ```

## Files Changed/Added

### New Files
- `migrations/0024_marketplace_sellers.sql`
- `migrations/0025_api_keys_user_scope.sql`
- `app/seller/page.tsx`
- `app/seller/seller-dashboard-client.tsx`
- `app/seller/onboard/complete/page.tsx`
- `app/api/seller/onboard/route.ts`
- `app/api/seller/status/route.ts`
- `app/api/seller/dashboard/route.ts`
- `app/api/seller/notifications/route.ts`

### Modified Files
- `lib/stripe.ts` - Added Connect helpers and platform fee calculation
- `lib/admin-auth.ts` - Added seller/superuser distinction
- `app/api/checkout/route.ts` - Added Connect payment handling
- `app/api/webhooks/stripe/route.ts` - Added seller notifications
- `app/api/admin/apps/route.ts` - Scoped by owner
- `app/api/admin/versions/route.ts` - Added ownership check
- `app/api/admin/versions/presign/route.ts` - Added ownership check
- `app/api/admin/versions/upload/route.ts` - Added ownership check
- `app/api/admin/updates/route.ts` - Added ownership check
- `app/api/admin/apps/[appId]/icon/route.ts` - Added ownership check
- `components/site-nav.tsx` - Added seller link
- `components/mobile-site-nav.tsx` - Added seller link
- `components/site-footer.tsx` - Added "Sell with us" link

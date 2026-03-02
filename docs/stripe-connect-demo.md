# Stripe Connect v2 sample (in-app onboarding + storefront)

This project now includes a sample integration at:

- **UI page:** `/connect-demo`
- **Webhook endpoint:** `/api/webhooks/stripe-connect-demo`

## Required environment placeholders

Add these values before running the sample:

```bash
# PLACEHOLDER: your platform secret key
STRIPE_SECRET_KEY=sk_test_...

# PLACEHOLDER: thin-event webhook signing secret
STRIPE_CONNECT_DEMO_WEBHOOK_SECRET=whsec_...
```

## Stripe CLI (thin events)

```bash
stripe listen \
  --thin-events 'v2.core.account[requirements].updated,v2.core.account[configuration.recipient].capability_status_updated' \
  --forward-thin-to http://localhost:3000/api/webhooks/stripe-connect-demo
```

Use the printed webhook secret as `STRIPE_CONNECT_DEMO_WEBHOOK_SECRET`.

## What the sample covers

1. Create/reuse Connect v2 recipient account for signed-in user
2. Store user -> connected account ID mapping in `user.stripe_account_id`
3. Generate v2 account onboarding links
4. Read onboarding/requirements status live from Accounts API
5. Create platform products with metadata mapping to connected account
6. Render storefront of products + connected accounts
7. Create hosted Checkout Session with destination charge + application fee
8. Parse thin event notifications and fetch full event via v2 Events API

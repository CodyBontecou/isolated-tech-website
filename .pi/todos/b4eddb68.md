{
  "id": "b4eddb68",
  "title": "Stripe Checkout Route Tests",
  "tags": [
    "testing",
    "stripe",
    "checkout"
  ],
  "status": "closed",
  "created_at": "2026-02-28T01:34:59.294Z"
}

# Test Coverage for `app/api/checkout/route.ts`

## Authentication & Validation
- [x] Returns 401 when user not authenticated
- [x] Returns 400 when appId missing
- [x] Returns 404 when app not found
- [x] Returns 400 when user already owns app

## Discount Code Logic
- [x] Applies percent discount correctly
- [x] Applies fixed discount correctly
- [x] Ignores invalid discount code (wrong app_id)
- [x] Ignores expired discount code
- [x] Ignores maxed out discount code (times_used >= max_uses)
- [x] Increments discount code usage on free purchase (tested via free purchase flow)

## Free Purchase Flow (price = 0)
- [x] Creates purchase record directly in DB
- [x] Returns `free: true` with redirect URL
- [x] Handles discount code that brings price to 0

## Stripe Session Creation
- [x] Creates checkout session with correct metadata
- [x] Builds description from tagline + description
- [x] Strips markdown from description
- [x] Truncates description to 500 chars
- [x] Returns 503 when Stripe not configured

## Error Handling
- [x] Returns 500 with error details on Stripe failure
- [x] Returns 500 on server configuration error

# Security Documentation

## Authentication Security

### Session Management
- **Token Generation**: Uses `crypto.getRandomValues()` with 32 bytes (256 bits) of entropy
- **Storage**: Sessions stored in both KV (fast lookups) and D1 (persistence)
- **Expiration**: 30-day sessions with automatic refresh after 15 days
- **Cookies**: HttpOnly, Secure, SameSite=Lax flags set

### Magic Link Authentication
- **Token**: 32-byte cryptographically random token
- **Expiration**: 15 minutes
- **Single Use**: Token deleted immediately after verification
- **Rate Limiting**: 1 request per email per minute

### OAuth (when configured)
- **State Parameter**: Random state prevents CSRF attacks
- **Nonce**: Used for Apple Sign In
- **PKCE**: Code verifier for enhanced security

## Authorization

### Admin Access
- All `/admin/*` routes check `user.isAdmin`
- All `/api/admin/*` routes verify admin via `requireAdmin()`
- Admin status stored in database, not JWT

### Resource Access
- Download URLs verify purchase ownership
- Reviews require prior purchase
- Users can only modify their own resources

## Input Validation

### SQL Injection Prevention
All database queries use parameterized statements:
```typescript
await env.DB.prepare("SELECT * FROM users WHERE email = ?")
  .bind(email)
  .first();
```

### XSS Prevention
- React automatically escapes output
- User input rendered via `dangerouslySetInnerHTML` only for admin-controlled markdown
- No inline scripts from user data

### CSRF Protection
- SameSite=Lax cookies prevent cross-site requests
- API routes verify session cookie
- OAuth state parameter for login flows

## File Uploads

### Validation
- File type whitelist: `.zip`, `.dmg` only
- Maximum size: 500MB
- Filename sanitization before R2 storage

### Storage
- Files stored in R2 with sanitized keys
- Download requires valid session + purchase verification
- No direct public access to R2 bucket

## Secrets Management

### Environment Variables
All secrets stored as Cloudflare Worker secrets:
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`
- `APPLE_CLIENT_ID` / `APPLE_CLIENT_SECRET`
- `AWS_SES_ACCESS_KEY` / `AWS_SES_SECRET_KEY`

### No Client Exposure
- Secrets never included in client bundles
- Server-side only access via `request.env`
- Public keys (Stripe publishable key) ok in client

## HTTP Security Headers

Set via `public/_headers`:
```
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

API routes include:
```
Cache-Control: no-store, no-cache, must-revalidate
X-Robots-Tag: noindex
```

## Stripe Security

### Webhook Verification
```typescript
const signature = request.headers.get("stripe-signature");
const event = stripe.webhooks.constructEvent(
  body,
  signature,
  env.STRIPE_WEBHOOK_SECRET
);
```

### Idempotency
- Check for existing purchase before creating
- Use Stripe event ID for deduplication

### Price Validation
- Server fetches app price from database
- Client-provided amounts validated against min_price
- Discount codes validated server-side

## Audit Logging

### Logged Events
- User logins (session creation)
- Admin actions (app/version/code changes)
- Purchases and refunds
- File downloads

### Log Storage
- Cloudflare Worker logs (real-time)
- Email log table (persistent)
- Broadcast history (admin UI)

## Security Checklist

- [x] Session tokens cryptographically random
- [x] Sessions expire and refresh correctly
- [x] Magic links single-use and expire
- [x] Admin routes check is_admin
- [x] Users can only access own data
- [x] Downloads verify purchase
- [x] SQL injection prevented (parameterized queries)
- [x] XSS prevented (React escaping)
- [x] Rate limiting on sensitive endpoints
- [x] All secrets in environment variables
- [x] Security headers configured
- [x] Cookies are HttpOnly, Secure, SameSite

# ISOLATED.TECH App Store — Technical Plan (v2)

> Self-hosted macOS/iOS app distribution platform. Full Cloudflare stack with vinext.

---

## Overview

A storefront for distributing macOS apps (primarily) and iOS apps outside the App Store. Single vendor, many products, "name a fair price" payments, user accounts, reviews, and email capture.

---

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| **Framework** | vinext (Next.js API on Vite) | Vite-native, deploys to Workers, same DX as Next.js |
| **Runtime** | Cloudflare Workers | Edge compute, zero cold starts, integrated platform |
| **Database** | Cloudflare D1 (SQLite) | Edge-native, free tier, unified billing |
| **Auth** | Custom (Lucia + Arctic) | Magic links + OAuth (Apple/Google/GitHub) |
| **Payments** | Stripe Checkout + Webhooks | "Name your price", coupons, refunds |
| **File Storage** | Cloudflare R2 | S3-compatible, signed URLs for secure downloads |
| **Email** | AWS SES | $0.10/1k emails, transactional + newsletter |
| **Cache** | Cloudflare KV | Session tokens, magic link tokens |

**All on Cloudflare except:**
- Stripe (payments)
- AWS SES (email)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Cloudflare Workers                        │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                   worker/index.ts                        │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │ │
│  │  │ Auth Routes  │  │ API Routes   │  │ vinext SSR   │   │ │
│  │  │ /auth/*      │  │ /api/*       │  │ everything   │   │ │
│  │  └──────┬───────┘  └──────┬───────┘  │    else      │   │ │
│  │         │                 │          └──────────────┘   │ │
│  └─────────┼─────────────────┼─────────────────────────────┘ │
│            │                 │                               │
│  ┌─────────▼─────────────────▼─────────────────────────────┐ │
│  │                    Bindings (env)                        │ │
│  │  DB: D1Database    R2: R2Bucket    KV: KVNamespace      │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
            ┌─────────────────┼─────────────────┐
            ▼                 ▼                 ▼
       ┌─────────┐      ┌─────────┐       ┌─────────┐
       │ Stripe  │      │ AWS SES │       │ OAuth   │
       │ Checkout│      │  Email  │       │ Apple/  │
       │ Webhooks│      │         │       │ Google/ │
       └─────────┘      └─────────┘       │ GitHub  │
                                          └─────────┘
```

---

## Database Schema (D1 / SQLite)

```sql
-- ============================================================
-- USERS & AUTH
-- ============================================================

CREATE TABLE users (
  id TEXT PRIMARY KEY,                     -- nanoid
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  is_admin INTEGER DEFAULT 0,              -- 1 = admin (you)
  newsletter_subscribed INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- OAuth accounts linked to users
CREATE TABLE oauth_accounts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,                  -- 'apple', 'google', 'github'
  provider_user_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(provider, provider_user_id)
);

-- Sessions (stored in KV for speed, but backed by D1 for persistence)
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,                     -- session token
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Magic link tokens (short-lived, stored in KV)
-- KV key: magic_link:{token} → { email, expires_at }

-- ============================================================
-- APPS & VERSIONS
-- ============================================================

CREATE TABLE apps (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,               -- e.g., 'voxboard'
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,                        -- markdown
  icon_url TEXT,
  screenshots TEXT,                        -- JSON array of URLs
  platforms TEXT DEFAULT '["macos"]',      -- JSON array
  min_price_cents INTEGER DEFAULT 0,       -- 0 = free allowed
  suggested_price_cents INTEGER,
  is_published INTEGER DEFAULT 0,
  custom_page_config TEXT,                 -- JSON for per-app page customization
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE app_versions (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  version TEXT NOT NULL,                   -- e.g., '1.2.0'
  build_number INTEGER,
  release_notes TEXT,                      -- markdown
  r2_key TEXT NOT NULL,                    -- R2 object key for the binary
  file_size_bytes INTEGER,
  min_os_version TEXT,
  sparkle_signature TEXT,                  -- EdDSA signature for Sparkle
  is_latest INTEGER DEFAULT 0,
  released_at TEXT DEFAULT (datetime('now')),
  UNIQUE(app_id, version)
);

CREATE INDEX idx_app_versions_app ON app_versions(app_id);
CREATE INDEX idx_app_versions_latest ON app_versions(app_id, is_latest);

-- ============================================================
-- PURCHASES & PAYMENTS
-- ============================================================

CREATE TABLE purchases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_checkout_session_id TEXT,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT DEFAULT 'completed',         -- completed, refunded
  refunded_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, app_id)
);

CREATE INDEX idx_purchases_user ON purchases(user_id);
CREATE INDEX idx_purchases_app ON purchases(app_id);

-- ============================================================
-- REVIEWS
-- ============================================================

CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  body TEXT,
  is_approved INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, app_id)
);

CREATE INDEX idx_reviews_app ON reviews(app_id);

-- ============================================================
-- DISCOUNT CODES
-- ============================================================

CREATE TABLE discount_codes (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,               -- e.g., 'LAUNCH50'
  discount_type TEXT NOT NULL,             -- 'percent' or 'fixed'
  discount_value INTEGER NOT NULL,         -- 50 = 50% or 50 cents
  app_id TEXT REFERENCES apps(id),         -- null = all apps
  max_uses INTEGER,
  times_used INTEGER DEFAULT 0,
  expires_at TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================
-- EMAIL TRACKING
-- ============================================================

CREATE TABLE email_log (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  email TEXT NOT NULL,
  event_type TEXT NOT NULL,                -- 'receipt', 'magic_link', 'update', 'newsletter'
  subject TEXT,
  ses_message_id TEXT,
  sent_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_email_log_user ON email_log(user_id);
```

---

## Authentication Flow

### Magic Link

```
1. User enters email at /auth/login
2. Server generates token (nanoid), stores in KV with 15min TTL
3. SES sends email with link: /auth/verify?token=xxx
4. User clicks link
5. Server validates token from KV, deletes it
6. Create/update user in D1, create session
7. Set session cookie, redirect to /dashboard
```

### OAuth (Apple/Google/GitHub)

Using **Arctic** library for OAuth flows:

```
1. User clicks "Sign in with Apple" at /auth/login
2. Redirect to /auth/apple → Arctic generates auth URL
3. User authenticates with Apple
4. Apple redirects to /auth/apple/callback
5. Arctic exchanges code for tokens
6. Extract user info (email, name)
7. Create/update user + oauth_account in D1
8. Create session, set cookie, redirect to /dashboard
```

### Session Management

- Sessions stored in KV (fast reads) with D1 backup
- Cookie: `session` (HttpOnly, Secure, SameSite=Lax)
- TTL: 30 days, refreshed on activity

---

## Purchase Flow

```
1. User on /apps/[slug], enters price >= minimum
2. Optional: enters discount code, validates via /api/discount/validate
3. Click "Purchase" → POST /api/checkout
4. Server creates Stripe Checkout session with custom amount
5. Redirect to Stripe Checkout
6. User completes payment
7. Stripe webhook hits /api/webhooks/stripe
8. Server creates purchase record, sends receipt via SES
9. User redirected to /dashboard with new app available
```

### Stripe Checkout Configuration

```typescript
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  customer_email: user.email,
  line_items: [{
    price_data: {
      currency: 'usd',
      unit_amount: amountCents, // User's chosen price
      product_data: {
        name: app.name,
        description: app.tagline,
        images: [app.icon_url],
      },
    },
    quantity: 1,
  }],
  metadata: {
    app_id: app.id,
    user_id: user.id,
    discount_code: discountCode || null,
  },
  success_url: `${APP_URL}/dashboard?purchased=${app.slug}`,
  cancel_url: `${APP_URL}/apps/${app.slug}`,
});
```

---

## File Structure

```
/
├── app/
│   ├── layout.tsx                    # Root layout (brutalist shell)
│   ├── page.tsx                      # Homepage (current site)
│   ├── apps/
│   │   ├── page.tsx                  # App catalog grid
│   │   └── [slug]/
│   │       └── page.tsx              # Individual app page
│   ├── auth/
│   │   ├── login/page.tsx            # Login form (magic link + OAuth)
│   │   ├── verify/page.tsx           # Magic link verification
│   │   ├── [provider]/route.ts       # OAuth initiation
│   │   └── [provider]/callback/route.ts
│   ├── dashboard/
│   │   ├── page.tsx                  # User's purchased apps
│   │   ├── settings/page.tsx         # Account settings
│   │   └── reviews/page.tsx          # User's reviews
│   └── admin/
│       ├── page.tsx                  # Admin dashboard
│       ├── apps/
│       │   ├── page.tsx              # Manage apps
│       │   ├── new/page.tsx          # Create app
│       │   └── [id]/page.tsx         # Edit app
│       ├── versions/
│       │   └── [appId]/new/page.tsx  # Upload new version
│       ├── codes/page.tsx            # Discount codes
│       ├── purchases/page.tsx        # View purchases
│       ├── users/page.tsx            # View users
│       └── broadcast/page.tsx        # Send emails
├── worker/
│   └── index.ts                      # Cloudflare Worker entry
├── lib/
│   ├── auth/
│   │   ├── lucia.ts                  # Session management
│   │   ├── arctic.ts                 # OAuth providers config
│   │   └── magic-link.ts             # Magic link generation/verification
│   ├── db.ts                         # D1 query helpers
│   ├── stripe.ts                     # Stripe client
│   ├── r2.ts                         # R2 signed URL generation
│   ├── email.ts                      # AWS SES sending
│   └── env.ts                        # Type-safe env bindings
├── components/
│   ├── ui/                           # Base UI components
│   ├── app-card.tsx
│   ├── price-input.tsx
│   ├── review-form.tsx
│   └── download-button.tsx
├── migrations/
│   └── 0001_initial.sql              # D1 schema
├── public/
│   └── (static assets)
├── vite.config.ts
├── wrangler.jsonc
└── package.json
```

---

## Worker Entry Point

```typescript
// worker/index.ts
import handler from "vinext/server/app-router-entry";

export interface Env {
  // D1 Database
  DB: D1Database;
  
  // R2 Bucket (app binaries)
  APPS_BUCKET: R2Bucket;
  
  // KV Namespace (sessions, magic links)
  AUTH_KV: KVNamespace;
  
  // Secrets
  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  
  // OAuth secrets
  APPLE_CLIENT_ID: string;
  APPLE_CLIENT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    
    // Stripe webhook (needs raw body, handle before vinext)
    if (url.pathname === "/api/webhooks/stripe" && request.method === "POST") {
      return handleStripeWebhook(request, env);
    }
    
    // Download endpoint (signed R2 URL)
    if (url.pathname.startsWith("/api/download/") && request.method === "GET") {
      return handleDownload(request, env);
    }
    
    // Sparkle appcast
    if (url.pathname.startsWith("/appcast/") && request.method === "GET") {
      return handleAppcast(request, env);
    }
    
    // All other routes: vinext handles it
    // Pass env to vinext via request context
    return handler.fetch(request, { env, ctx });
  },
};
```

---

## wrangler.jsonc

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "isolated-tech-store",
  "compatibility_date": "2026-02-25",
  "compatibility_flags": ["nodejs_compat"],
  "main": "./worker/index.ts",
  "assets": {
    "not_found_handling": "none",
    "binding": "ASSETS"
  },
  
  // D1 Database
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "isolated-tech-store",
      "database_id": "<will be created>"
    }
  ],
  
  // R2 Bucket
  "r2_buckets": [
    {
      "binding": "APPS_BUCKET",
      "bucket_name": "isolated-tech-apps"
    }
  ],
  
  // KV Namespace
  "kv_namespaces": [
    {
      "binding": "AUTH_KV",
      "id": "<will be created>"
    }
  ],
  
  // Secrets (set via wrangler secret put)
  // STRIPE_SECRET_KEY
  // STRIPE_WEBHOOK_SECRET
  // AWS_ACCESS_KEY_ID
  // AWS_SECRET_ACCESS_KEY
  // APPLE_CLIENT_ID, APPLE_CLIENT_SECRET
  // GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
  // GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
}
```

---

## Sparkle Integration

Expose appcast.xml for each app:

```typescript
// GET /appcast/[slug].xml
async function handleAppcast(request: Request, env: Env): Promise<Response> {
  const slug = extractSlug(request.url);
  
  const app = await env.DB.prepare(`
    SELECT a.*, v.* FROM apps a
    JOIN app_versions v ON v.app_id = a.id
    WHERE a.slug = ? AND v.is_latest = 1
  `).bind(slug).first();
  
  if (!app) return new Response("Not found", { status: 404 });
  
  const downloadUrl = await generateSignedUrl(env.APPS_BUCKET, app.r2_key);
  
  const xml = `<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0" xmlns:sparkle="http://www.andymatuschak.org/xml-namespaces/sparkle">
  <channel>
    <title>${app.name}</title>
    <item>
      <title>Version ${app.version}</title>
      <sparkle:version>${app.build_number}</sparkle:version>
      <sparkle:shortVersionString>${app.version}</sparkle:shortVersionString>
      <sparkle:minimumSystemVersion>${app.min_os_version}</sparkle:minimumSystemVersion>
      <pubDate>${new Date(app.released_at).toUTCString()}</pubDate>
      <enclosure 
        url="${downloadUrl}"
        sparkle:edSignature="${app.sparkle_signature}"
        length="${app.file_size_bytes}"
        type="application/octet-stream"
      />
      <sparkle:releaseNotesLink>https://isolated.tech/apps/${slug}/changelog</sparkle:releaseNotesLink>
    </item>
  </channel>
</rss>`;
  
  return new Response(xml, {
    headers: { "Content-Type": "application/xml" },
  });
}
```

---

## Implementation Phases

### Phase 1: Foundation (Days 1-2)
- [ ] Initialize vinext project
- [ ] Create D1 database + run migrations
- [ ] Create R2 bucket + KV namespace
- [ ] Set up wrangler.jsonc with all bindings
- [ ] Migrate current homepage to vinext
- [ ] Deploy to verify everything works

### Phase 2: Auth System (Days 3-4)
- [ ] Magic link flow (KV + SES)
- [ ] GitHub OAuth (easiest to test)
- [ ] Google OAuth
- [ ] Apple OAuth
- [ ] Session middleware
- [ ] Protected route wrapper

### Phase 3: Storefront (Days 5-6)
- [ ] App catalog page
- [ ] Individual app page with custom config support
- [ ] "Name your price" component
- [ ] Discount code validation
- [ ] Seed with existing apps

### Phase 4: Payments (Days 7-8)
- [ ] Stripe checkout integration
- [ ] Webhook handler
- [ ] Purchase recording
- [ ] Receipt email via SES
- [ ] Refund handling (admin)

### Phase 5: User Dashboard (Days 9-10)
- [ ] Purchased apps list
- [ ] R2 signed URL download
- [ ] Review submission
- [ ] Account settings
- [ ] Newsletter toggle

### Phase 6: Admin Panel (Days 11-13)
- [ ] Admin auth guard
- [ ] App CRUD
- [ ] Version upload to R2
- [ ] Discount code management
- [ ] Purchase viewer + refund button
- [ ] User list

### Phase 7: Sparkle + Notifications (Days 14-15)
- [ ] Appcast.xml endpoint
- [ ] Update notification emails
- [ ] Broadcast email UI
- [ ] Newsletter send

### Phase 8: Polish (Days 16+)
- [ ] Error handling
- [ ] Loading states
- [ ] SEO
- [ ] Security audit
- [ ] Documentation

---

## Cost Estimate (Monthly)

| Service | Free Tier | Paid |
|---------|-----------|------|
| Workers | 100k req/day | $5/month for 10M req |
| D1 | 5GB, 5M reads/day | $0.75/GB beyond |
| R2 | 10GB storage | $0.015/GB/month |
| KV | 100k reads/day | $0.50/M reads |
| AWS SES | 62k/month (EC2) | $0.10/1k emails |
| Stripe | — | 2.9% + $0.30/txn |

**Realistic monthly: $0-10** (excluding Stripe fees)

---

## Next Steps

1. **You need to set up:**
   - Stripe account (if not done) → get API keys
   - Apple Developer OAuth app
   - Google Cloud OAuth credentials  
   - GitHub OAuth App
   - Verify your domain with AWS SES

2. **I will:**
   - Initialize the vinext project
   - Create Cloudflare resources (D1, R2, KV)
   - Start Phase 1 implementation

Ready to begin?

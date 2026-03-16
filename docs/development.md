# Development Guide

## Prerequisites

- Node.js 18+
- npm or pnpm
- Wrangler CLI (`npm install -g wrangler`)
- Cloudflare account with Workers, D1, R2, and KV access

## Local Setup

```bash
# Clone the repository
git clone https://github.com/codybontecou/isolated-tech-website
cd isolated-tech-website

# Install dependencies
npm install

# Login to Cloudflare
wrangler login

# Start development server
npm run dev
```

The dev server runs at `http://localhost:5173` with hot reload.

## Environment Variables

### Local Development (wrangler.jsonc)

Bindings are configured in `wrangler.jsonc`:

```jsonc
{
  "d1_databases": [{ "binding": "DB", "database_name": "isolated-tech-store" }],
  "r2_buckets": [{ "binding": "APPS_BUCKET", "bucket_name": "isolated-tech-apps" }],
  "kv_namespaces": [{ "binding": "AUTH_KV", "id": "..." }]
}
```

### Secrets (via wrangler)

Set production secrets with:

```bash
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put GOOGLE_CLIENT_ID
wrangler secret put GOOGLE_CLIENT_SECRET
wrangler secret put APPLE_CLIENT_ID
wrangler secret put APPLE_CLIENT_SECRET
wrangler secret put AWS_SES_ACCESS_KEY
wrangler secret put AWS_SES_SECRET_KEY
```

## Project Structure

```
app/
├── page.tsx              # Homepage
├── layout.tsx            # Root layout
├── globals.css           # Global styles
├── apps/
│   ├── page.tsx          # App catalog
│   └── [slug]/
│       ├── page.tsx      # App detail
│       ├── purchase-card.tsx
│       └── changelog/
├── auth/
│   ├── login/            # Login page
│   └── verify/           # Magic link verification
├── dashboard/            # User dashboard
├── admin/                # Admin panel
├── api/                  # API routes
├── appcast/              # Sparkle feeds
├── sitemap.ts            # Dynamic sitemap
└── robots.ts             # Robots.txt

lib/
├── auth/                 # Authentication utilities
├── db.ts                 # Database helpers
└── env.ts                # Type definitions

migrations/               # D1 migrations
worker/                   # Worker entry point
docs/                     # Documentation
```

## Database Migrations

### Creating a Migration

```bash
# Create new migration file
wrangler d1 migrations create isolated-tech-store "add_feature"

# Edit the migration file in migrations/
```

### Running Migrations

```bash
# Apply to local D1
wrangler d1 migrations apply isolated-tech-store --local

# Apply to production
wrangler d1 migrations apply isolated-tech-store --remote
```

### Seeding Data

```bash
# Run seed script
wrangler d1 execute isolated-tech-store --remote --file=scripts/seed-apps.sql
```

## Building and Deploying

```bash
# Build for production
npm run build

# Deploy to Cloudflare Workers
npm run deploy
```

The deploy command runs `vinext build && vinext deploy`.

## Testing

```bash
# Run tests (when added)
npm test

# Type check
npm run typecheck
```

## Client Work Screenshot Pipeline

Use local screenshot generation for client showcase cards:

```bash
npm run screenshots:client-work
```

See [Client Work Screenshots](./client-work-screenshots.md) for target configuration and update workflow.

## Debugging

### View Worker Logs

```bash
wrangler tail isolated-tech-store
```

### Local D1 Queries

```bash
wrangler d1 execute isolated-tech-store --local --command "SELECT * FROM apps"
```

### Remote D1 Queries

```bash
wrangler d1 execute isolated-tech-store --remote --command "SELECT * FROM users LIMIT 10"
```

## Code Style

- TypeScript strict mode
- Prettier for formatting
- ESLint for linting
- Commit messages: `type: description` (feat, fix, docs, etc.)

## Architecture Notes

### Authentication Flow

1. User enters email → magic link sent
2. User clicks link → token verified, session created
3. Session stored in KV (fast lookup) + D1 (persistence)
4. 30-day expiry with rolling refresh

### Payment Flow

1. User selects price → Stripe Checkout session created
2. Stripe redirects to success URL
3. Webhook confirms payment → purchase recorded
4. User redirected to dashboard with download

### Sparkle Updates

1. App checks `/appcast/[slug].xml` on launch
2. Server returns latest version info
3. App downloads update from `/api/download/[appId]/[versionId]`
4. EdDSA signature verified by Sparkle

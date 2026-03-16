# ISOLATED.TECH App Store

A self-hosted app store for macOS and iOS apps with "name your price" payments.

**Live:** https://isolated.tech

## Features

- 🏪 **App Catalog** — Browse and purchase apps
- 💰 **Name Your Price** — Pay-what-you-want with optional minimums
- 🔐 **Authentication** — Magic link + OAuth (GitHub, Google, Apple)
- 🎟️ **Discount Codes** — Percentage or fixed amount discounts
- ⭐ **Reviews** — Customer reviews with ratings
- 🔄 **Sparkle Updates** — Automatic update feeds for macOS apps
- 📧 **Email Broadcasts** — Newsletter and update notifications
- 👤 **User Dashboard** — Manage purchases and downloads
- ⚙️ **Admin Panel** — Manage apps, codes, users, and content

## Tech Stack

- **Framework:** [vinext](https://github.com/nicholasoxford/vinext) (Vite + Next.js for Cloudflare)
- **Database:** Cloudflare D1 (SQLite)
- **Storage:** Cloudflare R2
- **Cache:** Cloudflare KV
- **Payments:** Stripe Checkout
- **Email:** AWS SES
- **Hosting:** Cloudflare Workers

## Quick Start

```bash
# Install dependencies
npm install

# Login to Cloudflare
wrangler login

# Start dev server
npm run dev
```

## Project Structure

```
app/                  # Next.js app directory
├── apps/            # App catalog and detail pages
├── auth/            # Login and verification
├── dashboard/       # User dashboard
├── admin/           # Admin panel
└── api/             # API routes

lib/                 # Shared utilities
├── auth/           # Authentication logic
└── db.ts           # Database helpers

migrations/          # D1 database migrations
docs/               # Documentation
```

## Documentation

- [Admin Guide](docs/admin-guide.md) — Managing the store
- [Development Guide](docs/development.md) — Local setup and deployment
- [Sparkle Setup](docs/sparkle-setup.md) — Integrating auto-updates
- [Marketplace Setup](docs/marketplace-setup.md) — Multi-tenant sellers + Stripe Connect + CLI onboarding
- [Client Work Screenshots](docs/client-work-screenshots.md) — Generate and maintain local showcase screenshots (no thum.io)

## Environment Setup

See [Development Guide](docs/development.md) for required secrets:

- Stripe API keys
- OAuth credentials (GitHub, Google, Apple)
- AWS SES credentials

## Commands

```bash
npm run dev                    # Start development server
npm run build                  # Build for production
npm run deploy                 # Deploy to Cloudflare Workers
npm run screenshots:client-work # Capture/update client showcase screenshots
```

## Database Migrations

```bash
# Create new migration
wrangler d1 migrations create isolated-tech-store "description"

# Apply migrations
wrangler d1 migrations apply isolated-tech-store --remote
```

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│   Workers   │────▶│     D1      │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    ▼             ▼
              ┌─────────┐   ┌─────────┐
              │   R2    │   │   KV    │
              │ Storage │   │ Sessions│
              └─────────┘   └─────────┘
```

## License

Proprietary — © 2026 Isolated Tech

-- Update imghost app with improved content inspired by imghost.isolated.tech

UPDATE apps SET 
  tagline = 'UPLOAD. SHARE. DONE.',
  description = 'No fluff. No friction. Just brutal efficiency.

Share images from anywhere on iOS and get instant, direct links.

## Everything you need. Nothing you don''t.

- **Share Extension** — Upload from any app with one tap
- **Direct links** — Markdown, HTML, BBCode, or raw URLs
- **Photo gallery** — Organized by date, searchable
- **Bulk export** — Download as ZIP when you need it
- **Custom templates** — Format links exactly how you want

## Three steps. Zero friction.

1. Select an image
2. Tap Share → imghost
3. Link copied. Done.

## Brutally beautiful.

- High contrast UI — Pure black. Pure white. Nothing in between.
- Monospace typography — Technical. Precise. Every character counts.
- Zero decoration — No gradients. No shadows. No rounded corners. Just function.
- Precision-inspired — Built for people who appreciate raw, utilitarian design.

## Built for privacy.

- JWT authentication
- Per-image delete tokens
- No tracking
- No analytics
- No ads

**iOS:** Available on the App Store with Pro subscription for 10GB storage and 500MB file uploads. 7-day free trial.

**macOS:** Download directly from isolated.tech. Name your price.',
  updated_at = datetime('now')
WHERE slug = 'imghost';

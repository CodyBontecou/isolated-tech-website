-- ============================================================
-- SEED DATA: Apps for ISOLATED.TECH Store
-- ============================================================

-- Voxboard - Voice Transcription Keyboard
INSERT OR REPLACE INTO apps (
  id, slug, name, tagline, description, icon_url, screenshots, platforms,
  min_price_cents, suggested_price_cents, is_published, created_at, updated_at
) VALUES (
  'app_voxboard_001',
  'voxboard',
  'Voxboard',
  'Your voice. Your keyboard.',
  'On-device voice transcription that works in any text field. Private. No cloud. No network required.

## Features

- **On-Device Processing** — All transcription happens locally using Apple''s Speech Recognition
- **Works Everywhere** — Use in any app with a text field via the custom keyboard
- **Privacy First** — No data leaves your device. Ever.
- **No Internet Required** — Works completely offline
- **Multiple Languages** — Supports all languages available in iOS Speech Recognition

## How It Works

1. Install Voxboard from the App Store
2. Enable the keyboard in Settings → General → Keyboard → Keyboards
3. Switch to Voxboard in any text field
4. Tap the microphone and speak

Your voice is transcribed instantly, right on your device.',
  '/apps/voxboard/icon.png',
  '["https://voxboard.isolated.tech/screenshots/1.png", "https://voxboard.isolated.tech/screenshots/2.png"]',
  '["ios"]',
  0,
  500,
  1,
  datetime('now'),
  datetime('now')
);

-- sync.md - Git on iPhone
INSERT OR REPLACE INTO apps (
  id, slug, name, tagline, description, icon_url, screenshots, platforms,
  min_price_cents, suggested_price_cents, is_published, created_at, updated_at
) VALUES (
  'app_syncmd_001',
  'syncmd',
  'sync.md',
  'Git on your iPhone.',
  'Real Git on your iPhone. Clone, pull, commit & push any repo. No terminal, no keys layer, no lock-in.

## Features

- **Full Git Support** — Clone, pull, commit, push, branch, merge
- **GitHub & GitLab Integration** — Connect your accounts seamlessly
- **Markdown Editor** — Built-in editor for your notes and docs
- **Offline First** — Work on your repos without internet
- **iCloud Sync** — Your repos are backed up automatically

## Perfect For

- Developers who want to review code on the go
- Writers using Git-based publishing workflows
- Anyone who needs their repos accessible on mobile',
  '/apps/syncmd/icon.png',
  '["https://syncmd.isolated.tech/screenshots/1.png", "https://syncmd.isolated.tech/screenshots/2.png"]',
  '["ios"]',
  0,
  800,
  1,
  datetime('now'),
  datetime('now')
);

-- health.md - Apple Health Export
INSERT OR REPLACE INTO apps (
  id, slug, name, tagline, description, icon_url, screenshots, platforms,
  min_price_cents, suggested_price_cents, is_published, created_at, updated_at
) VALUES (
  'app_healthmd_001',
  'healthmd',
  'health.md',
  'Apple Health → Markdown',
  'Export your Apple Health data directly to Markdown files in your iOS file system. On-device. Private. Automated.

## Features

- **Automated Exports** — Schedule daily, weekly, or monthly exports
- **Markdown Format** — Perfect for Obsidian, Notion, or any markdown app
- **Privacy First** — All processing happens on your device
- **Customizable** — Choose which health metrics to export
- **Files App Integration** — Export directly to iCloud, Dropbox, or local storage

## Supported Data

- Steps & Distance
- Heart Rate & HRV
- Sleep Analysis
- Workouts
- Weight & Body Measurements
- And more...',
  '/apps/healthmd/icon.png',
  '["https://healthmd.isolated.tech/screenshots/1.png", "https://healthmd.isolated.tech/screenshots/2.png"]',
  '["ios"]',
  0,
  500,
  1,
  datetime('now'),
  datetime('now')
);

-- imghost - Image Hosting
INSERT OR REPLACE INTO apps (
  id, slug, name, tagline, description, icon_url, screenshots, platforms,
  min_price_cents, suggested_price_cents, is_published, created_at, updated_at
) VALUES (
  'app_imghost_001',
  'imghost',
  'imghost',
  'Upload. Share. Done.',
  'Brutal image hosting for iOS. No fluff, no friction. Share images and get instant, direct links.

## Features

- **Instant Upload** — Share any image from your camera roll
- **Direct Links** — Get a direct link to your image, not a landing page
- **Share Sheet Integration** — Upload from any app
- **No Account Required** — Just upload and share
- **Fast CDN** — Images served from a global edge network

## How It Works

1. Select an image from your camera roll or capture one
2. Tap upload
3. Get a direct link to share anywhere

No watermarks. No compression. No bullshit.',
  '/apps/imghost/icon.png',
  '["https://imghost.isolated.tech/screenshots/1.png", "https://imghost.isolated.tech/screenshots/2.png"]',
  '["ios"]',
  0,
  0,
  1,
  datetime('now'),
  datetime('now')
);

-- i18n - Translation Tool (web only, not for sale but shown)
INSERT OR REPLACE INTO apps (
  id, slug, name, tagline, description, icon_url, screenshots, platforms,
  min_price_cents, suggested_price_cents, is_published, created_at, updated_at
) VALUES (
  'app_i18n_001',
  'i18n',
  'i18n',
  'Local + Effortless i18n Translation',
  'Translate your application''s content into multiple languages with a local AI-powered translation tool. No cloud. No API keys. Just ship.

## Features

- **Local AI** — Runs on your machine using Ollama
- **JSON Support** — Import/export i18n JSON files
- **Multiple Languages** — Translate to any language
- **Context Aware** — Understands UI context for better translations
- **Review Mode** — Review and edit translations before export

## Workflow

1. Drop your i18n JSON file
2. Select target languages
3. Click translate
4. Review and export

All processing happens locally. Your content never leaves your machine.',
  '/apps/i18n/icon.png',
  '["https://i18n.isolated.tech/screenshots/1.png"]',
  '["web"]',
  0,
  0,
  0,
  datetime('now'),
  datetime('now')
);

-- Create an admin user for testing
INSERT OR IGNORE INTO users (
  id, email, name, is_admin, newsletter_subscribed, created_at, updated_at
) VALUES (
  'user_admin_001',
  'cody@isolated.tech',
  'Cody Bontecou',
  1,
  1,
  datetime('now'),
  datetime('now')
);

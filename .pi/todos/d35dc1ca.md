{
  "id": "d35dc1ca",
  "title": "[Bundle] Create database migration for bundles",
  "tags": [
    "feature",
    "monetization",
    "database"
  ],
  "status": "open",
  "created_at": "2026-02-28T17:54:14.328Z"
}

Parent: Epic: Bundle Pricing

## Tasks
1. Create D1 migration for bundles table
2. Create bundle_apps junction table
3. Add bundle_id to purchases table
4. Apply migration to development and production

## Migration SQL
```sql
-- migrations/XXXX_add_bundles.sql

-- Bundles table
CREATE TABLE IF NOT EXISTS bundles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  includes_future_apps INTEGER DEFAULT 1,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Junction table for explicit bundle contents
CREATE TABLE IF NOT EXISTS bundle_apps (
  bundle_id TEXT NOT NULL,
  app_id TEXT NOT NULL,
  PRIMARY KEY (bundle_id, app_id),
  FOREIGN KEY (bundle_id) REFERENCES bundles(id) ON DELETE CASCADE,
  FOREIGN KEY (app_id) REFERENCES apps(id) ON DELETE CASCADE
);

-- Track bundle purchases
ALTER TABLE purchases ADD COLUMN bundle_id TEXT REFERENCES bundles(id);

-- Index for finding bundle owners
CREATE INDEX idx_purchases_bundle_id ON purchases(bundle_id);
```

## Commands
```bash
wrangler d1 migrations create isolated-tech-store "add_bundles"
wrangler d1 migrations apply isolated-tech-store --local
wrangler d1 migrations apply isolated-tech-store --remote
```

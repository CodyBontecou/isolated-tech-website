-- ============================================================
-- APP STORE REVIEWS — Synced from App Store Connect API
-- ============================================================

CREATE TABLE app_store_reviews (
  id TEXT PRIMARY KEY,                     -- App Store review ID
  app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  body TEXT,
  reviewer_nickname TEXT,
  territory TEXT,                          -- e.g., 'USA', 'GBR'
  app_store_version TEXT,                  -- version being reviewed
  review_created_at TEXT,                  -- when user wrote review
  synced_at TEXT DEFAULT (datetime('now')),
  UNIQUE(id)
);

CREATE INDEX idx_app_store_reviews_app ON app_store_reviews(app_id);
CREATE INDEX idx_app_store_reviews_created ON app_store_reviews(review_created_at);

-- Track last sync time per app for incremental fetches
CREATE TABLE app_store_sync_log (
  app_id TEXT PRIMARY KEY REFERENCES apps(id) ON DELETE CASCADE,
  last_synced_at TEXT DEFAULT (datetime('now')),
  reviews_fetched INTEGER DEFAULT 0,
  error_message TEXT
);

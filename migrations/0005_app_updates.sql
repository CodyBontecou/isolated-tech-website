-- ============================================================
-- APP UPDATES — Track version releases across platforms
-- ============================================================
-- Separate from app_versions (which is binary-distribution-only
-- with a required r2_key). This table tracks lightweight update
-- metadata for both macOS and iOS (including App Store releases).

CREATE TABLE app_updates (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  platform TEXT NOT NULL CHECK (platform IN ('macos', 'ios')),
  version TEXT NOT NULL,
  build_number INTEGER,
  release_notes TEXT,
  released_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(app_id, platform, version)
);

CREATE INDEX idx_app_updates_app_platform ON app_updates(app_id, platform, released_at DESC);
CREATE INDEX idx_app_updates_app_released ON app_updates(app_id, released_at DESC);

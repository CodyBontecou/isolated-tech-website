-- ============================================================
-- APP MEDIA — IMAGES & VIDEOS FOR SHOWCASE
-- ============================================================

CREATE TABLE app_media (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('image', 'youtube')),  -- 'image' or 'youtube'
  url TEXT NOT NULL,                                         -- image URL or YouTube video ID
  title TEXT,                                                -- optional caption/title
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_app_media_app ON app_media(app_id);
CREATE INDEX idx_app_media_order ON app_media(app_id, sort_order);

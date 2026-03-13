-- ============================================================
-- APP BLOG POSTS
-- Blog posts for individual app pages
-- ============================================================

CREATE TABLE app_blog_posts (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,                      -- e.g., 'introducing-health-insights'
  title TEXT NOT NULL,
  excerpt TEXT,                            -- Short description for previews
  body TEXT NOT NULL,                      -- Markdown content
  cover_image_url TEXT,                    -- Optional hero image
  author_name TEXT,                        -- Display name for author
  is_published INTEGER DEFAULT 0,
  published_at TEXT,                       -- When to show as published date
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(app_id, slug)
);

CREATE INDEX idx_app_blog_posts_app ON app_blog_posts(app_id);
CREATE INDEX idx_app_blog_posts_published ON app_blog_posts(app_id, is_published, published_at);
CREATE INDEX idx_app_blog_posts_slug ON app_blog_posts(app_id, slug);

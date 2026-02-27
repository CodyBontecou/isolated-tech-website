-- ============================================================
-- PUBLIC FEATURE REQUESTS / VOTING SYSTEM (Featurebase-style)
-- ============================================================

-- Main feature requests table
CREATE TABLE feature_requests (
  id TEXT PRIMARY KEY,                     -- nanoid
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  app_id TEXT REFERENCES apps(id) ON DELETE SET NULL,  -- optional app association
  type TEXT NOT NULL DEFAULT 'feature',    -- 'feature', 'bug', 'improvement'
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',     -- 'open', 'planned', 'in_progress', 'completed', 'closed'
  priority INTEGER DEFAULT 0,              -- admin can set priority for ordering
  admin_response TEXT,                     -- official response from admin
  vote_count INTEGER DEFAULT 0,            -- denormalized for performance
  comment_count INTEGER DEFAULT 0,         -- denormalized for performance
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_feature_requests_user ON feature_requests(user_id);
CREATE INDEX idx_feature_requests_app ON feature_requests(app_id);
CREATE INDEX idx_feature_requests_status ON feature_requests(status);
CREATE INDEX idx_feature_requests_type ON feature_requests(type);
CREATE INDEX idx_feature_requests_votes ON feature_requests(vote_count DESC);
CREATE INDEX idx_feature_requests_created ON feature_requests(created_at DESC);

-- Votes table (one vote per user per request)
CREATE TABLE feature_votes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, request_id)
);

CREATE INDEX idx_feature_votes_request ON feature_votes(request_id);
CREATE INDEX idx_feature_votes_user ON feature_votes(user_id);

-- Comments table
CREATE TABLE feature_comments (
  id TEXT PRIMARY KEY,
  request_id TEXT NOT NULL REFERENCES feature_requests(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES feature_comments(id) ON DELETE CASCADE,  -- for nested replies
  body TEXT NOT NULL,
  is_admin_reply INTEGER DEFAULT 0,        -- highlight admin responses
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_feature_comments_request ON feature_comments(request_id);
CREATE INDEX idx_feature_comments_user ON feature_comments(user_id);
CREATE INDEX idx_feature_comments_parent ON feature_comments(parent_id);

-- Help articles / FAQ
CREATE TABLE help_articles (
  id TEXT PRIMARY KEY,
  app_id TEXT REFERENCES apps(id) ON DELETE SET NULL,  -- optional app association
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,                      -- markdown content
  category TEXT DEFAULT 'general',         -- 'general', 'getting-started', 'faq', etc.
  sort_order INTEGER DEFAULT 0,
  is_published INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_help_articles_app ON help_articles(app_id);
CREATE INDEX idx_help_articles_category ON help_articles(category);
CREATE INDEX idx_help_articles_published ON help_articles(is_published);

-- ============================================================
-- FEEDBACK / BUG REPORTS
-- ============================================================

CREATE TABLE feedback (
  id TEXT PRIMARY KEY,                     -- nanoid
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  app_version TEXT,                        -- version user was using
  type TEXT NOT NULL DEFAULT 'feedback',   -- 'feedback' or 'bug'
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',     -- 'open', 'in_progress', 'resolved', 'closed'
  admin_notes TEXT,                        -- internal notes from admin
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_feedback_user ON feedback(user_id);
CREATE INDEX idx_feedback_app ON feedback(app_id);
CREATE INDEX idx_feedback_status ON feedback(status);
CREATE INDEX idx_feedback_type ON feedback(type);
CREATE INDEX idx_feedback_created ON feedback(created_at DESC);

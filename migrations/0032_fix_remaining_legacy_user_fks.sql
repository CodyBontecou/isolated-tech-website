-- 0020 removed users, but reviews and email_log still referenced it.
-- Rebuild both tables against Better Auth's canonical user table, preserving data.
CREATE TABLE reviews_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL REFERENCES apps(id) ON DELETE CASCADE,
  purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  body TEXT,
  is_approved INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(user_id, app_id)
);
INSERT INTO reviews_new SELECT * FROM reviews;
DROP TABLE reviews;
ALTER TABLE reviews_new RENAME TO reviews;
CREATE INDEX idx_reviews_app ON reviews(app_id);
CREATE INDEX idx_reviews_approved ON reviews(app_id, is_approved);

CREATE TABLE email_log_new (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES "user"(id),
  email TEXT NOT NULL,
  event_type TEXT NOT NULL,
  subject TEXT,
  ses_message_id TEXT,
  sent_at TEXT DEFAULT (datetime('now'))
);
INSERT INTO email_log_new SELECT * FROM email_log;
DROP TABLE email_log;
ALTER TABLE email_log_new RENAME TO email_log;
CREATE INDEX idx_email_log_user ON email_log(user_id);
CREATE INDEX idx_email_log_type ON email_log(event_type);

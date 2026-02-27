-- ============================================================
-- EXPAND HELP ARTICLES TO SUPPORT DOCS, FAQ, GUIDES
-- ============================================================

-- Add article_type column to distinguish content types
-- 'help' = general help center (default, existing behavior)
-- 'docs' = app documentation
-- 'faq' = app FAQ
-- 'guide' = app tutorials/guides
ALTER TABLE help_articles ADD COLUMN article_type TEXT DEFAULT 'help';

-- Add question field for FAQ items (collapsed state text)
ALTER TABLE help_articles ADD COLUMN question TEXT;

-- Index for efficient lookups by type and app
CREATE INDEX idx_help_articles_type ON help_articles(article_type);
CREATE INDEX idx_help_articles_app_type ON help_articles(app_id, article_type);

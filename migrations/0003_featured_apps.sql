-- ============================================================
-- FEATURED APPS — HOMEPAGE SPOTLIGHT
-- ============================================================

-- Add featured flag and order to apps table
ALTER TABLE apps ADD COLUMN is_featured INTEGER DEFAULT 0;
ALTER TABLE apps ADD COLUMN featured_order INTEGER DEFAULT 0;

CREATE INDEX idx_apps_featured ON apps(is_featured, featured_order);

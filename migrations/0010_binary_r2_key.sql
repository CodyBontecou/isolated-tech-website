-- ============================================================
-- BINARY R2 KEY — SEPARATE COMPILED APP STORAGE
-- ============================================================
-- Allow source_code apps to also provide a compiled binary for download.
-- The r2_key stores the primary distribution (source for source_code apps),
-- while binary_r2_key stores the compiled .app/.dmg when available.

ALTER TABLE app_versions ADD COLUMN binary_r2_key TEXT;
ALTER TABLE app_versions ADD COLUMN binary_file_size_bytes INTEGER;

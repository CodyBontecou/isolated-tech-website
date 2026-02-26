-- ============================================================
-- DOWNLOAD PERMISSIONS — SOURCE AND BINARY DOWNLOAD CONTROLS
-- ============================================================

-- Control whether users can download source code (for source_code distribution type)
ALTER TABLE apps ADD COLUMN allow_source_download INTEGER DEFAULT 1;

-- Control whether users can download compiled binary (.dmg, .zip)
ALTER TABLE apps ADD COLUMN allow_binary_download INTEGER DEFAULT 1;

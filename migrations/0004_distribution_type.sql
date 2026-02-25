-- ============================================================
-- DISTRIBUTION TYPE — SOURCE CODE SUPPORT
-- ============================================================

-- Add distribution type to apps (binary = compiled app, source_code = Xcode project)
ALTER TABLE apps ADD COLUMN distribution_type TEXT DEFAULT 'binary';

-- Build instructions shown on app page for source_code apps (markdown)
ALTER TABLE apps ADD COLUMN build_instructions TEXT;

-- Optional GitHub repo URL
ALTER TABLE apps ADD COLUMN github_url TEXT;

-- Required Xcode version (e.g., "16.0")
ALTER TABLE apps ADD COLUMN required_xcode_version TEXT;

-- Minimum iOS version for source_code apps (e.g., "18.0")
ALTER TABLE apps ADD COLUMN min_ios_version TEXT;

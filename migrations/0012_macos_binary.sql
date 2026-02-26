-- ============================================================
-- MACOS BINARY SUPPORT — SEPARATE IOS AND MACOS BINARIES
-- ============================================================
-- Allow apps to have both iOS and macOS distributions in the same version.
-- r2_key remains the primary/iOS binary, macos_r2_key stores the macOS binary.

ALTER TABLE app_versions ADD COLUMN macos_r2_key TEXT;
ALTER TABLE app_versions ADD COLUMN macos_file_size_bytes INTEGER;
ALTER TABLE app_versions ADD COLUMN macos_min_os_version TEXT;

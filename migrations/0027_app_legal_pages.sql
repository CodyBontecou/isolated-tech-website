-- Add privacy policy and terms of service columns to apps table
-- These store markdown content for per-app legal pages

ALTER TABLE apps ADD COLUMN privacy_policy TEXT;
ALTER TABLE apps ADD COLUMN terms_of_service TEXT;

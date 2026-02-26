-- Add discount_code_id to purchases table for tracking which discount was used
ALTER TABLE purchases ADD COLUMN discount_code_id TEXT REFERENCES discount_codes(id);

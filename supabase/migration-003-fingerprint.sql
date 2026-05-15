-- Add fingerprint column for duplicate detection
-- Run this in Supabase SQL Editor

ALTER TABLE images
ADD COLUMN IF NOT EXISTS fingerprint text;

-- Index for fast duplicate lookups by board
CREATE INDEX IF NOT EXISTS idx_images_board_fingerprint
ON images (board_id, fingerprint)
WHERE fingerprint IS NOT NULL;

-- Backfill: generate fingerprints for existing images from filename + size_bytes
-- This won't include lastModified (not stored historically), but prevents
-- re-uploads of the exact same file going forward.
UPDATE images
SET fingerprint = filename || '::' || COALESCE(size_bytes::text, '0') || '::0'
WHERE fingerprint IS NULL;

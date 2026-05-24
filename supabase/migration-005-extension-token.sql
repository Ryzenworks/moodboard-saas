-- Add extension auth token fields to profiles
-- Run this in Supabase SQL Editor

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS extension_token text;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS extension_token_created_at timestamptz;

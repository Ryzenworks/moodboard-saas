-- Add onboarding_complete flag to profiles
-- Run this in Supabase SQL Editor

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS onboarding_complete boolean DEFAULT false;

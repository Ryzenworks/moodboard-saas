-- Add color column to boards table
ALTER TABLE public.boards ADD COLUMN IF NOT EXISTS color text DEFAULT 'cobalt';

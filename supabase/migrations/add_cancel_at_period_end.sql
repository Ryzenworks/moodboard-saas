-- Razorpay Subscription Integration — Migration
-- Run this in Supabase SQL Editor

-- Add cancel_at_period_end column to track cancellation with end-of-period access
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean DEFAULT false;

-- Verify the column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'subscriptions'
  AND column_name = 'cancel_at_period_end';

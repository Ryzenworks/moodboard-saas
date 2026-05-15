-- 1. Fix sort_order overflow (int → bigint)
ALTER TABLE public.images ALTER COLUMN sort_order TYPE bigint;

-- 2. Subscription INSERT policy
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;
CREATE POLICY "Users can insert own subscription"
  ON public.subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 3. Subscription UPDATE policy
DROP POLICY IF EXISTS "Users can update own subscription" ON public.subscriptions;
CREATE POLICY "Users can update own subscription"
  ON public.subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

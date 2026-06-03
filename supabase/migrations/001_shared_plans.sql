-- Run this in Supabase SQL Editor: https://gqjzrrwcxukpzilkjqke.supabase.co
-- Or run: npx supabase db push (if CLI is set up)

CREATE TABLE IF NOT EXISTS public.shared_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  modules JSONB NOT NULL,
  form_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days')
);

CREATE INDEX IF NOT EXISTS idx_shared_plans_id ON public.shared_plans(id);
CREATE INDEX IF NOT EXISTS idx_shared_plans_user_id ON public.shared_plans(user_id);

ALTER TABLE public.shared_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read by id" ON public.shared_plans;
CREATE POLICY "Public read by id" ON public.shared_plans
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth insert own" ON public.shared_plans;
CREATE POLICY "Auth insert own" ON public.shared_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owner delete" ON public.shared_plans;
CREATE POLICY "Owner delete" ON public.shared_plans
  FOR DELETE USING (auth.uid() = user_id);

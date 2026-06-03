-- Kenshinpro Core Tables — 花名册/赛程/方案历史/诊断历史
-- Run in Supabase SQL Editor

-- 1. Roster Players
CREATE TABLE IF NOT EXISTS public.roster_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position TEXT,
  number TEXT,
  age INT,
  height INT,
  weight INT,
  injury_status TEXT DEFAULT 'healthy',
  injury_note TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_roster_user ON public.roster_players(user_id);
ALTER TABLE public.roster_players ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner access roster" ON public.roster_players;
CREATE POLICY "Owner access roster" ON public.roster_players FOR ALL USING (auth.uid() = user_id);

-- 2. Matches (Schedule)
CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TEXT,
  opponent TEXT NOT NULL,
  location TEXT DEFAULT 'home',
  venue TEXT,
  league TEXT,
  opponent_style TEXT,
  opponent_weakness TEXT,
  our_issues TEXT,
  notes TEXT,
  result TEXT,
  status TEXT DEFAULT 'upcoming',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_matches_user ON public.matches(user_id);
CREATE INDEX IF NOT EXISTS idx_matches_date ON public.matches(date);
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner access matches" ON public.matches;
CREATE POLICY "Owner access matches" ON public.matches FOR ALL USING (auth.uid() = user_id);

-- 3. Training Plans (方案历史)
CREATE TABLE IF NOT EXISTS public.training_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  modules JSONB NOT NULL,
  form_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_plans_user ON public.training_plans(user_id);
ALTER TABLE public.training_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner access plans" ON public.training_plans;
CREATE POLICY "Owner access plans" ON public.training_plans FOR ALL USING (auth.uid() = user_id);

-- 4. Diagnosis History
CREATE TABLE IF NOT EXISTS public.diagnosis_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  problem TEXT NOT NULL,
  diagnosis JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_diagnosis_user ON public.diagnosis_history(user_id);
ALTER TABLE public.diagnosis_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner access diagnosis" ON public.diagnosis_history;
CREATE POLICY "Owner access diagnosis" ON public.diagnosis_history FOR ALL USING (auth.uid() = user_id);

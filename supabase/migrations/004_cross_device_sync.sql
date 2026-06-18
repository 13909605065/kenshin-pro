-- 004_cross_device_sync.sql
-- 跨设备同步基础设施：球队、赛季日历、用户偏好
-- Run in Supabase SQL Editor

-- 1. Teams (球队列表)
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teams_user ON public.teams(user_id);
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner access teams" ON public.teams;
CREATE POLICY "Owner access teams" ON public.teams FOR ALL USING (auth.uid() = user_id);

-- 2. User Preferences (跨设备偏好 — 活跃球队等)
CREATE TABLE IF NOT EXISTS public.user_prefs (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  active_team_id TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.user_prefs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner access prefs" ON public.user_prefs;
CREATE POLICY "Owner access prefs" ON public.user_prefs FOR ALL USING (auth.uid() = user_id);

-- 3. Season Calendar (赛季日历 — 每用户一份)
CREATE TABLE IF NOT EXISTS public.season_calendar (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  calendar_data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.season_calendar ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner access season_calendar" ON public.season_calendar;
CREATE POLICY "Owner access season_calendar" ON public.season_calendar FOR ALL USING (auth.uid() = user_id);

-- 4. Add missing columns to roster_players
ALTER TABLE public.roster_players ADD COLUMN IF NOT EXISTS injury_history TEXT DEFAULT '';
ALTER TABLE public.roster_players ADD COLUMN IF NOT EXISTS disabled_exercises JSONB DEFAULT '[]'::jsonb;

-- 5. User KV — 通用键值同步表（全量数据跨设备同步）
CREATE TABLE IF NOT EXISTS public.user_kv (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, key)
);
ALTER TABLE public.user_kv ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Owner access user_kv" ON public.user_kv;
CREATE POLICY "Owner access user_kv" ON public.user_kv FOR ALL USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════
-- 现场监测数据表 — sRPE / CMJ / 晨间问卷 / 伤病
-- Kenshin Pro S&C Platform | 2026-06-11
-- ═══════════════════════════════════════════════════════════

-- 1. sRPE 训练负荷记录
CREATE TABLE IF NOT EXISTS srpe_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) NOT NULL,
  player_name   TEXT NOT NULL,
  session_date  DATE NOT NULL,
  session_type  TEXT NOT NULL DEFAULT 'training' CHECK (session_type IN ('training', 'match')),
  rpe_score     INTEGER NOT NULL CHECK (rpe_score >= 0 AND rpe_score <= 10),
  duration_min  INTEGER NOT NULL CHECK (duration_min > 0),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_srpe_user_date ON srpe_entries(user_id, session_date);
CREATE INDEX IF NOT EXISTS idx_srpe_player ON srpe_entries(user_id, player_name, session_date);

-- 2. CMJ 反向跳记录
CREATE TABLE IF NOT EXISTS cmj_records (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID REFERENCES auth.users(id) NOT NULL,
  player_name   TEXT NOT NULL,
  test_date     DATE NOT NULL,
  jump_1_cm     NUMERIC(5,1) NOT NULL,
  jump_2_cm     NUMERIC(5,1) NOT NULL,
  jump_3_cm     NUMERIC(5,1) NOT NULL,
  baseline_cm   NUMERIC(5,1),   -- 个人基线（前3次测试均值），手动填入
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cmj_user_date ON cmj_records(user_id, test_date);
CREATE INDEX IF NOT EXISTS idx_cmj_player ON cmj_records(user_id, player_name, test_date);

-- 3. 晨间健康问卷
CREATE TABLE IF NOT EXISTS health_questionnaires (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) NOT NULL,
  player_name     TEXT NOT NULL,
  record_date     DATE NOT NULL,
  sleep_score     INTEGER NOT NULL CHECK (sleep_score >= 1 AND sleep_score <= 5),
  fatigue_score   INTEGER NOT NULL CHECK (fatigue_score >= 1 AND fatigue_score <= 5),
  soreness_score  INTEGER NOT NULL CHECK (soreness_score >= 1 AND soreness_score <= 5),
  stress_score    INTEGER NOT NULL CHECK (stress_score >= 1 AND stress_score <= 5),
  mood_score      INTEGER NOT NULL CHECK (mood_score >= 1 AND mood_score <= 5),
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hq_user_date ON health_questionnaires(user_id, record_date);
CREATE INDEX IF NOT EXISTS idx_hq_player ON health_questionnaires(user_id, player_name, record_date);

-- 4. 伤病记录（FIFA 共识标准）
CREATE TABLE IF NOT EXISTS injuries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) NOT NULL,
  player_name     TEXT NOT NULL,
  body_part       TEXT NOT NULL,
  injury_type     TEXT NOT NULL,
  occurrence_date DATE NOT NULL,
  context         TEXT CHECK (context IN ('training', 'match')),
  mechanism       TEXT CHECK (mechanism IN ('contact', 'non-contact')),
  days_absent     INTEGER DEFAULT 0,
  return_date     DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_injuries_user ON injuries(user_id, player_name);
CREATE INDEX IF NOT EXISTS idx_injuries_date ON injuries(user_id, occurrence_date);

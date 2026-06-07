-- ═══════════════════════════════════════════════════════════
-- Catapult Vector 8 数据背心 — 数据库表结构
-- Kenshin Pro S&C Platform
-- ═══════════════════════════════════════════════════════════

-- 1. 训练课表
CREATE TABLE IF NOT EXISTS training_sessions (
  id            TEXT PRIMARY KEY,                -- session_uuid
  user_id       UUID REFERENCES auth.users(id),
  name          TEXT NOT NULL DEFAULT '场地训练',
  date          DATE NOT NULL,
  start_time    TIMESTAMPTZ,
  end_time      TIMESTAMPTZ,
  location      TEXT,                            -- 场地名称
  weather       TEXT,                            -- sun/cloud/rain
  player_count  INT DEFAULT 0,
  duration_min  INT DEFAULT 0,                   -- 实际时长(分钟)
  total_trimp   INT DEFAULT 0,                   -- 团队总TRIMP
  notes         TEXT,
  catapult_id   TEXT,                            -- Catapult session UUID
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- 2. 运动员档案（扩展花名册，关联GPS数据）
CREATE TABLE IF NOT EXISTS athletes (
  id            TEXT PRIMARY KEY,                -- 关联 roster_players.id
  user_id       UUID REFERENCES auth.users(id),
  name          TEXT NOT NULL,
  position      TEXT,
  number        TEXT,
  catapult_id   TEXT,                            -- Catapult athlete UUID
  hr_max        INT,                             -- 实测最大心率
  hr_rest       INT,                             -- 静息心率
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- 3. GPS 原始数据（10Hz）
CREATE TABLE IF NOT EXISTS gps_raw_data (
  id            BIGSERIAL PRIMARY KEY,
  session_id    TEXT NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  athlete_id    TEXT NOT NULL,
  timestamp     TIMESTAMPTZ NOT NULL,            -- 数据采集时间点
  x             REAL,                            -- 场地X坐标(m)
  y             REAL,                            -- 场地Y坐标(m)
  speed         REAL,                            -- 瞬时速度(m/s)
  acceleration  REAL,                            -- 瞬时加速度(m/s²)
  heart_rate    INT,                             -- 瞬时心率(bpm)
  player_load   REAL,                            -- 瞬时PL
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 索引：按场次+运动员+时间查
CREATE INDEX IF NOT EXISTS idx_gps_raw_session ON gps_raw_data(session_id, athlete_id, timestamp);

-- 4. 训练课汇总（每名运动员每场一条）
CREATE TABLE IF NOT EXISTS gps_session_summary (
  id                TEXT PRIMARY KEY,            -- session_id + athlete_id
  session_id        TEXT NOT NULL REFERENCES training_sessions(id) ON DELETE CASCADE,
  athlete_id        TEXT NOT NULL,
  -- 距离指标
  total_distance    REAL DEFAULT 0,              -- 总距离(m)
  hsr_distance      REAL DEFAULT 0,              -- 高速跑距离(>19.8km/h)(m)
  sprint_distance   REAL DEFAULT 0,              -- 冲刺距离(>25.2km/h)(m)
  -- 速度指标
  max_speed         REAL DEFAULT 0,              -- 最大速度(km/h)
  avg_speed         REAL DEFAULT 0,              -- 平均速度(km/h)
  -- 负荷指标
  player_load       REAL DEFAULT 0,              -- 累计PL
  player_load_per_min REAL DEFAULT 0,            -- 每分钟PL
  -- 心率
  hr_avg            INT,                         -- 平均心率
  hr_max            INT,                         -- 最大心率
  hr_zone_1_pct     REAL DEFAULT 0,              -- 心率区间1占比(<60%)
  hr_zone_2_pct     REAL DEFAULT 0,              -- 心率区间2(60-70%)
  hr_zone_3_pct     REAL DEFAULT 0,              -- 心率区间3(70-80%)
  hr_zone_4_pct     REAL DEFAULT 0,              -- 心率区间4(80-90%)
  hr_zone_5_pct     REAL DEFAULT 0,              -- 心率区间5(>90%)
  -- 爆发力指标
  accelerations     INT DEFAULT 0,               -- 加速次数(>2m/s²)
  decelerations     INT DEFAULT 0,               -- 减速次数(<-2m/s²)
  -- 算出的负荷指标
  trimp             INT DEFAULT 0,               -- Banister TRIMP
  acwr              REAL,                        -- 急慢性负荷比
  intensity         TEXT,                        -- low/moderate/high/very_high
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gps_summary_session ON gps_session_summary(session_id);
CREATE INDEX IF NOT EXISTS idx_gps_summary_athlete ON gps_session_summary(athlete_id);

-- 5. Catapult 导入记录（追踪每次数据导入）
CREATE TABLE IF NOT EXISTS catapult_imports (
  id            TEXT PRIMARY KEY,
  user_id       UUID REFERENCES auth.users(id),
  file_name     TEXT NOT NULL,
  file_type     TEXT NOT NULL,                   -- csv_replay / csv_ctr / webhook / api
  session_id    TEXT REFERENCES training_sessions(id),
  records_count INT DEFAULT 0,
  status        TEXT DEFAULT 'completed',        -- pending/processing/completed/error
  error_message TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 6. RLS 策略（每个用户只看自己的数据）
ALTER TABLE training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE gps_raw_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE gps_session_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE catapult_imports ENABLE ROW LEVEL SECURITY;

-- 策略：通过 training_sessions.user_id 关联
CREATE POLICY "Users can view own sessions" ON training_sessions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own athletes" ON athletes
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own imports" ON catapult_imports
  FOR ALL USING (auth.uid() = user_id);

-- gps 表通过 session 关联 user_id
CREATE POLICY "Users can view own GPS data" ON gps_raw_data
  FOR ALL USING (
    EXISTS (SELECT 1 FROM training_sessions WHERE id = gps_raw_data.session_id AND user_id = auth.uid())
  );

CREATE POLICY "Users can view own GPS summaries" ON gps_session_summary
  FOR ALL USING (
    EXISTS (SELECT 1 FROM training_sessions WHERE id = gps_session_summary.session_id AND user_id = auth.uid())
  );

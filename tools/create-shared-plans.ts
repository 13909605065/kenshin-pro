/**
 * One-shot script: create shared_plans table in Supabase
 * Run: npx ts-node --compiler-options '{"module":"commonjs"}' tools/create-shared-plans.ts
 */
const { Pool } = require("pg");

const pool = new Pool({
  host: "db.gqjzrrwcxukpzilkjqke.supabase.co",
  port: 5432,
  database: "postgres",
  user: "postgres",
  password: process.env.SUPABASE_DB_PASS || process.env.SUPABASE_SERVICE_ROLE_KEY,
  ssl: { rejectUnauthorized: false },
});

const SQL = `
CREATE TABLE IF NOT EXISTS public.shared_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  modules JSONB NOT NULL,
  form_data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '30 days')
);

-- Index for lookup
CREATE INDEX IF NOT EXISTS idx_shared_plans_id ON public.shared_plans(id);
CREATE INDEX IF NOT EXISTS idx_shared_plans_user_id ON public.shared_plans(user_id);

-- Enable RLS but allow public read by id
ALTER TABLE public.shared_plans ENABLE ROW LEVEL SECURITY;

-- Anyone can read by id (no auth needed for share links)
DROP POLICY IF EXISTS "Public read by id" ON public.shared_plans;
CREATE POLICY "Public read by id" ON public.shared_plans
  FOR SELECT USING (true);

-- Only authenticated users can insert their own
DROP POLICY IF EXISTS "Auth insert own" ON public.shared_plans;
CREATE POLICY "Auth insert own" ON public.shared_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Only owner can delete
DROP POLICY IF EXISTS "Owner delete" ON public.shared_plans;
CREATE POLICY "Owner delete" ON public.shared_plans
  FOR DELETE USING (auth.uid() = user_id);
`;

async function main() {
  try {
    console.log("Creating shared_plans table...");
    await pool.query(SQL);
    console.log("✅ shared_plans table created successfully!");
  } catch (err: any) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

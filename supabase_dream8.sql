-- Dream 8 Team Builder - Supabase Schema
-- Run this in Supabase SQL Editor

-- 1. Create dream8_teams table (references custom users table, not auth.users)
CREATE TABLE IF NOT EXISTS dream8_teams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  player_ids UUID[] NOT NULL,
  total_cost INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_user_dream8 UNIQUE (user_id),
  CONSTRAINT valid_team_size CHECK (array_length(player_ids, 1) = 8),
  CONSTRAINT valid_budget CHECK (total_cost <= 2500)
);

-- 2. Enable RLS
ALTER TABLE dream8_teams ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies (public read/write since app uses custom auth, not Supabase Auth)
CREATE POLICY "Public read/write dream8"
  ON dream8_teams FOR ALL
  USING (true) WITH CHECK (true);

-- 4. Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_dream8_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER dream8_updated_at_trigger
  BEFORE UPDATE ON dream8_teams
  FOR EACH ROW EXECUTE FUNCTION update_dream8_updated_at();

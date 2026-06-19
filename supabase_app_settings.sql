-- App Settings table — global key-value config
-- Run this in your Supabase SQL editor

CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Seed the dream8_locked flag (default: unlocked)
INSERT INTO app_settings (key, value)
VALUES ('dream8_locked', 'false')
ON CONFLICT (key) DO NOTHING;

-- RLS: allow all (custom auth project)
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on app_settings" ON app_settings FOR ALL USING (true) WITH CHECK (true);

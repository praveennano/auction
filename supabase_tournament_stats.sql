-- Tournament Stats table for Dream 8 points calculation
-- Run this in your Supabase SQL editor before using the CSV upload feature

CREATE TABLE IF NOT EXISTS tournament_player_points (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_name     TEXT NOT NULL DEFAULT 'T14',
  player_name         TEXT NOT NULL,
  cricket_team        TEXT NOT NULL,
  player_id           UUID,                          -- matched to auction_players.id by name
  matches             INTEGER DEFAULT 0,
  runs_scored         INTEGER DEFAULT 0,
  fours               INTEGER DEFAULT 0,
  sixes               INTEGER DEFAULT 0,
  thirties            INTEGER DEFAULT 0,             -- 30s column (proxy for 25-run milestone)
  fifties             INTEGER DEFAULT 0,
  hundreds            INTEGER DEFAULT 0,
  bat_sr              DECIMAL(6,2) DEFAULT 0,
  balls_faced         INTEGER DEFAULT 0,
  wickets             INTEGER DEFAULT 0,
  economy             DECIMAL(6,2) DEFAULT 0,
  balls_bowled        INTEGER DEFAULT 0,
  maiden_overs        INTEGER DEFAULT 0,
  three_wicket_hauls  INTEGER DEFAULT 0,
  five_wicket_hauls   INTEGER DEFAULT 0,
  dots_bowled         INTEGER DEFAULT 0,
  catches             INTEGER DEFAULT 0,
  run_outs            INTEGER DEFAULT 0,
  stumpings           INTEGER DEFAULT 0,
  batting_points      INTEGER DEFAULT 0,
  bowling_points      INTEGER DEFAULT 0,
  fielding_points     INTEGER DEFAULT 0,
  sr_points           INTEGER DEFAULT 0,
  economy_points      INTEGER DEFAULT 0,
  total_points        INTEGER DEFAULT 0,
  uploaded_at         TIMESTAMPTZ DEFAULT now(),
  uploaded_by         UUID
);

-- Enable RLS and allow all operations (custom auth project)
ALTER TABLE tournament_player_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all on tournament_player_points" ON tournament_player_points FOR ALL USING (true) WITH CHECK (true);

-- If you already ran the original migration, run this to add the dots_bowled column:
ALTER TABLE tournament_player_points ADD COLUMN IF NOT EXISTS dots_bowled INTEGER DEFAULT 0;

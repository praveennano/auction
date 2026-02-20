-- ============================================================
-- CWF Prediction Game SQL Setup (Username + Password Auth)
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================================

-- 0. Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. TEAMS TABLE
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_name TEXT NOT NULL UNIQUE,
  team_short_name TEXT NOT NULL,
  team_logo_url TEXT,
  team_color TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO teams (team_name, team_short_name, team_color) VALUES
('Team Keshav',   'TK', '#e74c3c'),
('Team Loki',     'TL', '#3498db'),
('Team Praveen',  'TP', '#2ecc71'),
('Team Kabeer',   'KB', '#f39c12'),
('Team Sowrish',  'TS', '#9b59b6')
ON CONFLICT (team_name) DO NOTHING;

-- 2. AUCTION PLAYERS TABLE
CREATE TABLE IF NOT EXISTS auction_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_name TEXT NOT NULL,
  player_image_url TEXT,
  player_role TEXT CHECK (player_role IN ('Batsman','Bowler','All-Rounder','Wicket-Keeper')),
  base_price DECIMAL(10,2),
  final_team_id UUID REFERENCES teams(id),
  final_price DECIMAL(10,2),
  auction_status TEXT CHECK (auction_status IN ('upcoming','sold','unsold')) DEFAULT 'upcoming',
  auction_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_players_status ON auction_players(auction_status);
CREATE INDEX IF NOT EXISTS idx_players_order  ON auction_players(auction_order);

INSERT INTO auction_players (player_name, player_role, base_price, auction_order) VALUES
('Sharan M',           'All-Rounder', 100,  1),
('Sriram MP',          'All-Rounder', 100,  2),
('Gopal',              'All-Rounder', 100,  3),
('Siddhartha',         'All-Rounder', 100,  4),
('Vetri',              'All-Rounder', 100,  5),
('S N K',              'All-Rounder', 100,  6),
('Nageshwaran',        'All-Rounder', 100,  7),
('Pradeep',            'All-Rounder', 100,  8),
('Saravanan',          'All-Rounder', 100,  9),
('Aravind DG',         'Bowler',      100, 10),
('Sarath Kumar',       'All-Rounder', 100, 11),
('Mahesh',             'Bowler',      100, 12),
('S S Deepak',         'All-Rounder', 100, 13),
('Naveen',             'All-Rounder', 100, 14),
('Dg',                 'All-Rounder', 100, 15),
('Arun S',             'All-Rounder', 100, 16),
('Ravi',               'All-Rounder', 100, 17),
('Ashok',              'All-Rounder', 100, 18),
('Saravanan Shanmugam','All-Rounder', 100, 19),
('Shiva',              'Bowler',      100, 20),
('Ajay',               'All-Rounder', 100, 21),
('Logesh',             'All-Rounder', 100, 22),
('Aravind Ganesh A R', 'All-Rounder', 100, 23),
('Umesh',              'All-Rounder', 100, 24),
('Vignesh S',          'Batsman',     100, 25),
('Muthu',              'All-Rounder', 100, 26),
('Vishnu',             'All-Rounder', 100, 27),
('Karthikeyan',        'All-Rounder', 100, 28),
('Akshay',             'All-Rounder', 100, 29),
('Arumugam',           'All-Rounder', 100, 30),
('Guna',               'All-Rounder', 100, 31),
('Satz',               'All-Rounder', 100, 32),
('Gopi',               'Bowler',      100, 33),
('Venkat',             'All-Rounder', 100, 34),
('Sharan (Sarath)',    'All-Rounder', 100, 35)
ON CONFLICT DO NOTHING;

-- 3. USERS TABLE (username + hashed password — no Supabase Auth)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  phone_number TEXT UNIQUE NOT NULL,
  initial_tokens INTEGER NOT NULL CHECK (initial_tokens >= 20 AND initial_tokens <= 200),
  token_balance INTEGER DEFAULT 0,
  tokens_spent INTEGER DEFAULT 0,
  tokens_won INTEGER DEFAULT 0,
  total_predictions INTEGER DEFAULT 0,
  correct_predictions INTEGER DEFAULT 0,
  accuracy_percentage DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. PREDICTIONS TABLE
CREATE TABLE IF NOT EXISTS predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  player_id UUID REFERENCES auction_players(id) ON DELETE CASCADE,
  predicted_team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  tokens_bet INTEGER DEFAULT 1 CHECK (tokens_bet >= 0 AND tokens_bet <= 5),
  tokens_won INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('active','won','lost')) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT unique_user_player_team UNIQUE (user_id, player_id, predicted_team_id)
);

CREATE INDEX IF NOT EXISTS idx_predictions_player   ON predictions(player_id);
CREATE INDEX IF NOT EXISTS idx_predictions_user     ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_status   ON predictions(status);
CREATE INDEX IF NOT EXISTS idx_predictions_user_player ON predictions(user_id, player_id);

-- 5. AUCTION SETTINGS TABLE
CREATE TABLE IF NOT EXISTS auction_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  betting_closes_at TIMESTAMP NOT NULL,
  auction_starts_at TIMESTAMP NOT NULL,
  is_betting_open BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO auction_settings (betting_closes_at, auction_starts_at, is_betting_open)
VALUES (NOW() + INTERVAL '7 days', NOW() + INTERVAL '7 days', TRUE)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 6. ROW LEVEL SECURITY (public access — no Supabase Auth)
-- ============================================================
ALTER TABLE users            ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams            ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_players  ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_settings ENABLE ROW LEVEL SECURITY;

-- Drop old policies first (safe to re-run)
DROP POLICY IF EXISTS "Public read/write users"      ON users;
DROP POLICY IF EXISTS "Public read teams"            ON teams;
DROP POLICY IF EXISTS "Public read players"          ON auction_players;
DROP POLICY IF EXISTS "Public read/write predictions" ON predictions;
DROP POLICY IF EXISTS "Public read settings"         ON auction_settings;

CREATE POLICY "Public read/write users"       ON users        FOR ALL  USING (true) WITH CHECK (true);
CREATE POLICY "Public read teams"             ON teams        FOR SELECT USING (true);
CREATE POLICY "Public read players"           ON auction_players FOR SELECT USING (true);
CREATE POLICY "Public read/write predictions" ON predictions  FOR ALL  USING (true) WITH CHECK (true);
CREATE POLICY "Public read settings"          ON auction_settings FOR SELECT USING (true);

-- ============================================================
-- 7. AUTH FUNCTIONS (pgcrypto — passwords never stored plain)
-- ============================================================

-- SIGN UP — creates a new user, hashes password with bcrypt
CREATE OR REPLACE FUNCTION pg_sign_up(
  p_username     TEXT,
  p_password     TEXT,
  p_phone        TEXT,
  p_display_name TEXT,
  p_tokens       INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_user users%ROWTYPE;
BEGIN
  -- Validate token range
  IF p_tokens < 20 OR p_tokens > 200 THEN
    RAISE EXCEPTION 'Tokens must be between 20 and 200';
  END IF;

  -- Check username taken
  IF EXISTS (SELECT 1 FROM users WHERE username = LOWER(TRIM(p_username))) THEN
    RAISE EXCEPTION 'Username "%" is already taken. Please choose another.', p_username;
  END IF;

  -- Check phone taken
  IF EXISTS (SELECT 1 FROM users WHERE phone_number = TRIM(p_phone)) THEN
    RAISE EXCEPTION 'This phone number is already registered.';
  END IF;

  -- Insert user with bcrypt-hashed password
  INSERT INTO users (
    username, password_hash, display_name, phone_number,
    initial_tokens, token_balance
  ) VALUES (
    LOWER(TRIM(p_username)),
    crypt(p_password, gen_salt('bf')),   -- bcrypt hash
    TRIM(p_display_name),
    TRIM(p_phone),
    p_tokens,
    p_tokens
  )
  RETURNING * INTO v_user;

  -- Return profile (exclude password_hash)
  RETURN json_build_object(
    'id',                  v_user.id,
    'username',            v_user.username,
    'display_name',        v_user.display_name,
    'phone_number',        v_user.phone_number,
    'initial_tokens',      v_user.initial_tokens,
    'token_balance',       v_user.token_balance,
    'tokens_spent',        v_user.tokens_spent,
    'tokens_won',          v_user.tokens_won,
    'total_predictions',   v_user.total_predictions,
    'correct_predictions', v_user.correct_predictions,
    'accuracy_percentage', v_user.accuracy_percentage,
    'created_at',          v_user.created_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SIGN IN — verifies password, returns profile or raises error
CREATE OR REPLACE FUNCTION pg_sign_in(
  p_username TEXT,
  p_password TEXT
)
RETURNS JSON AS $$
DECLARE
  v_user users%ROWTYPE;
BEGIN
  SELECT * INTO v_user
  FROM users
  WHERE username = LOWER(TRIM(p_username));

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Username not found. Please check your username or sign up.';
  END IF;

  -- Verify bcrypt password
  IF v_user.password_hash <> crypt(p_password, v_user.password_hash) THEN
    RAISE EXCEPTION 'Incorrect password. Please try again.';
  END IF;

  -- Return profile (exclude password_hash)
  RETURN json_build_object(
    'id',                  v_user.id,
    'username',            v_user.username,
    'display_name',        v_user.display_name,
    'phone_number',        v_user.phone_number,
    'initial_tokens',      v_user.initial_tokens,
    'token_balance',       v_user.token_balance,
    'tokens_spent',        v_user.tokens_spent,
    'tokens_won',          v_user.tokens_won,
    'total_predictions',   v_user.total_predictions,
    'correct_predictions', v_user.correct_predictions,
    'accuracy_percentage', v_user.accuracy_percentage,
    'created_at',          v_user.created_at
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 8. TOKEN ALLOCATION FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_token_allocation(
  p_user_id     UUID,
  p_player_id   UUID,
  p_team_id     UUID,
  p_token_amount INTEGER
)
RETURNS JSON AS $$
DECLARE
  v_token_balance         INTEGER;
  v_is_betting_open       BOOLEAN;
  v_existing_tokens       INTEGER;
  v_token_difference      INTEGER;
  v_existing_pred_id      UUID;
  v_total_tokens_on_player INTEGER;
BEGIN
  IF p_token_amount < 0 OR p_token_amount > 5 THEN
    RAISE EXCEPTION 'Token amount must be between 0 and 5';
  END IF;

  SELECT is_betting_open INTO v_is_betting_open FROM auction_settings LIMIT 1;
  IF NOT COALESCE(v_is_betting_open, TRUE) THEN
    RAISE EXCEPTION 'Betting is currently closed';
  END IF;

  SELECT token_balance INTO v_token_balance FROM users WHERE id = p_user_id FOR UPDATE;

  SELECT id, tokens_bet INTO v_existing_pred_id, v_existing_tokens
  FROM predictions
  WHERE user_id = p_user_id AND player_id = p_player_id
    AND predicted_team_id = p_team_id AND status = 'active';

  v_token_difference := p_token_amount - COALESCE(v_existing_tokens, 0);

  IF v_token_difference > v_token_balance THEN
    RAISE EXCEPTION 'Insufficient tokens. You have % available.', v_token_balance;
  END IF;

  SELECT COALESCE(SUM(tokens_bet), 0) INTO v_total_tokens_on_player
  FROM predictions
  WHERE user_id = p_user_id AND player_id = p_player_id
    AND predicted_team_id <> p_team_id AND status = 'active';

  IF v_total_tokens_on_player + p_token_amount > 5 THEN
    RAISE EXCEPTION 'Max 5 tokens per player. Already used % on other teams.', v_total_tokens_on_player;
  END IF;

  IF v_existing_pred_id IS NOT NULL THEN
    IF p_token_amount = 0 THEN
      DELETE FROM predictions WHERE id = v_existing_pred_id;
      UPDATE users SET token_balance = token_balance + v_existing_tokens,
        total_predictions = GREATEST(total_predictions - v_existing_tokens, 0)
        WHERE id = p_user_id;
      RETURN json_build_object('success',true,'action','removed',
        'tokens_remaining', v_token_balance + v_existing_tokens);
    ELSE
      UPDATE predictions SET tokens_bet = p_token_amount, updated_at = NOW()
        WHERE id = v_existing_pred_id;
      UPDATE users SET token_balance = token_balance - v_token_difference,
        total_predictions = total_predictions + v_token_difference WHERE id = p_user_id;
      RETURN json_build_object('success',true,'action','updated',
        'tokens_remaining', v_token_balance - v_token_difference);
    END IF;
  ELSE
    IF p_token_amount = 0 THEN
      RETURN json_build_object('success',true,'action','no_change','tokens_remaining',v_token_balance);
    END IF;
    UPDATE users SET token_balance = token_balance - p_token_amount,
      total_predictions = total_predictions + p_token_amount WHERE id = p_user_id;
    INSERT INTO predictions (user_id, player_id, predicted_team_id, tokens_bet)
      VALUES (p_user_id, p_player_id, p_team_id, p_token_amount);
    RETURN json_build_object('success',true,'action','created',
      'tokens_remaining', v_token_balance - p_token_amount);
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 9. PROCESS AUCTION RESULT
-- ============================================================
CREATE OR REPLACE FUNCTION process_player_auction(
  p_player_id      UUID,
  p_winning_team_id UUID,
  p_final_price    DECIMAL
)
RETURNS JSON AS $$
DECLARE
  v_total_pool   INTEGER;
  v_winning_pool INTEGER;
  v_payout_ratio DECIMAL;
  v_prediction   RECORD;
  v_user_payout  INTEGER;
BEGIN
  UPDATE auction_players SET final_team_id = p_winning_team_id,
    final_price = p_final_price, auction_status = 'sold' WHERE id = p_player_id;

  SELECT COALESCE(SUM(tokens_bet),0) INTO v_total_pool
  FROM predictions WHERE player_id = p_player_id AND status = 'active';

  IF v_total_pool = 0 THEN
    RETURN json_build_object('total_pool',0,'winners',0,'message','No predictions for this player');
  END IF;

  SELECT COALESCE(SUM(tokens_bet),0) INTO v_winning_pool
  FROM predictions WHERE player_id = p_player_id
    AND predicted_team_id = p_winning_team_id AND status = 'active';

  IF v_winning_pool = 0 THEN
    FOR v_prediction IN SELECT * FROM predictions WHERE player_id = p_player_id AND status = 'active' LOOP
      UPDATE predictions SET status = 'lost', tokens_won = 0 WHERE id = v_prediction.id;
      UPDATE users SET token_balance = token_balance + v_prediction.tokens_bet WHERE id = v_prediction.user_id;
    END LOOP;
    RETURN json_build_object('total_pool',v_total_pool,'message','No winners — all tokens refunded');
  ELSE
    v_payout_ratio := v_total_pool::DECIMAL / v_winning_pool::DECIMAL;
    FOR v_prediction IN SELECT * FROM predictions WHERE player_id = p_player_id AND status = 'active' LOOP
      IF v_prediction.predicted_team_id = p_winning_team_id THEN
        v_user_payout := FLOOR(v_prediction.tokens_bet * v_payout_ratio);
        UPDATE predictions SET status = 'won', tokens_won = v_user_payout WHERE id = v_prediction.id;
        UPDATE users SET token_balance = token_balance + v_user_payout,
          tokens_won = tokens_won + v_user_payout,
          correct_predictions = correct_predictions + v_prediction.tokens_bet WHERE id = v_prediction.user_id;
      ELSE
        UPDATE predictions SET status = 'lost' WHERE id = v_prediction.id;
      END IF;
    END LOOP;
    UPDATE users SET
      accuracy_percentage = (correct_predictions::DECIMAL / GREATEST(total_predictions,1) * 100)
    WHERE id IN (SELECT DISTINCT user_id FROM predictions WHERE player_id = p_player_id);
    RETURN json_build_object('total_pool',v_total_pool,'winning_pool',v_winning_pool,
      'payout_ratio',v_payout_ratio,'message','Payout processed successfully');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

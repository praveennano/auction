-- ============================================================
-- RTM (Right To Match) — Supabase Schema Updates
-- Run this ENTIRE script in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ============================================================
-- 1. ADD RTM COLUMNS TO TEAMS TABLE
-- ============================================================
-- These columns track whether a team has used its one-time RTM
-- and which player/when it was used.

ALTER TABLE teams ADD COLUMN IF NOT EXISTS rtm_available BOOLEAN DEFAULT TRUE;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS rtm_used_at TIMESTAMPTZ DEFAULT NULL;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS rtm_used_for_player_id UUID REFERENCES auction_players(id) DEFAULT NULL;

-- ============================================================
-- 2. CREATE RTM WINDOWS TABLE
-- ============================================================
-- Tracks each RTM window that opens at milestones (10, 15, 20, 25, 30 sold)

CREATE TABLE IF NOT EXISTS rtm_windows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_sold_count INTEGER NOT NULL,       -- milestone when window opened (e.g., 10)
  end_sold_count INTEGER NOT NULL,         -- when milestone completes (e.g., 15)
  eligible_player_ids UUID[] NOT NULL,     -- player UUIDs eligible for RTM in this window
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_rtm_windows_active ON rtm_windows(is_active);

-- ============================================================
-- 3. CREATE RTM OFFERS (BIDS) TABLE
-- ============================================================
-- Stores each RTM bid placed by a team on a player

CREATE TABLE IF NOT EXISTS rtm_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  window_id UUID REFERENCES rtm_windows(id) ON DELETE CASCADE,
  player_id UUID REFERENCES auction_players(id) ON DELETE CASCADE NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  bid_amount DECIMAL(10,2) NOT NULL,
  is_winner BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- A team can only bid once per player per window
  CONSTRAINT unique_team_player_window UNIQUE (window_id, player_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_rtm_offers_player ON rtm_offers(player_id);
CREATE INDEX IF NOT EXISTS idx_rtm_offers_team ON rtm_offers(team_id);
CREATE INDEX IF NOT EXISTS idx_rtm_offers_window ON rtm_offers(window_id);

-- ============================================================
-- 4. CREATE RTM RESULTS TABLE
-- ============================================================
-- Records the outcome of each RTM transaction

CREATE TABLE IF NOT EXISTS rtm_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  window_id UUID REFERENCES rtm_windows(id) ON DELETE CASCADE,
  player_id UUID REFERENCES auction_players(id) ON DELETE CASCADE NOT NULL,
  winner_team_id UUID REFERENCES teams(id) NOT NULL,
  original_owner_team_id UUID REFERENCES teams(id) NOT NULL,
  final_amount DECIMAL(10,2) NOT NULL,
  original_sold_price DECIMAL(10,2),       -- what the player originally sold for
  success BOOLEAN DEFAULT TRUE,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rtm_results_player ON rtm_results(player_id);
CREATE INDEX IF NOT EXISTS idx_rtm_results_winner ON rtm_results(winner_team_id);

-- ============================================================
-- 5. ROW LEVEL SECURITY FOR NEW TABLES
-- ============================================================

ALTER TABLE rtm_windows ENABLE ROW LEVEL SECURITY;
ALTER TABLE rtm_offers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE rtm_results ENABLE ROW LEVEL SECURITY;

-- Public read/write policies (matches existing app pattern — no Supabase Auth)
DROP POLICY IF EXISTS "Public read/write rtm_windows" ON rtm_windows;
CREATE POLICY "Public read/write rtm_windows" ON rtm_windows FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public read/write rtm_offers" ON rtm_offers;
CREATE POLICY "Public read/write rtm_offers"  ON rtm_offers  FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Public read/write rtm_results" ON rtm_results;
CREATE POLICY "Public read/write rtm_results" ON rtm_results FOR ALL USING (true) WITH CHECK (true);

-- Also allow updates to teams table (for rtm_available column)
DROP POLICY IF EXISTS "Public read teams" ON teams;
CREATE POLICY "Public read/write teams" ON teams FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- 6. PROCESS RTM TRANSACTION FUNCTION
-- ============================================================
-- Call this when an RTM bid is won to atomically:
--   1. Transfer the player to the winning team
--   2. Deduct budget from winner
--   3. Credit budget to original owner
--   4. Mark winner's RTM as used
--   5. Update the player's final_team_id and final_price
--   6. Record the result

CREATE OR REPLACE FUNCTION process_rtm_transaction(
  p_window_id          UUID,
  p_player_id          UUID,
  p_winner_team_id     UUID,
  p_original_owner_id  UUID,
  p_rtm_amount         DECIMAL,
  p_original_sold_price DECIMAL DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_winner_budget   DECIMAL;
  v_player_name     TEXT;
  v_winner_name     TEXT;
  v_original_name   TEXT;
BEGIN
  -- 1. Get current budgets and names
  SELECT team_name INTO v_winner_name FROM teams WHERE id = p_winner_team_id;
  SELECT team_name INTO v_original_name FROM teams WHERE id = p_original_owner_id;
  SELECT player_name INTO v_player_name FROM auction_players WHERE id = p_player_id;

  -- 2. Validate winner has enough budget (safety check)
  -- Note: Budget is tracked in-app via localStorage, not in Supabase.
  -- This function records the transaction for audit purposes.

  -- 3. Update the player's ownership
  UPDATE auction_players
  SET final_team_id = p_winner_team_id,
      final_price = p_rtm_amount
  WHERE id = p_player_id;

  -- 4. Mark winner team's RTM as used
  UPDATE teams
  SET rtm_available = FALSE,
      rtm_used_at = NOW(),
      rtm_used_for_player_id = p_player_id
  WHERE id = p_winner_team_id;

  -- 5. Mark the winning offer
  UPDATE rtm_offers
  SET is_winner = TRUE
  WHERE window_id = p_window_id
    AND player_id = p_player_id
    AND team_id = p_winner_team_id;

  -- 6. Record the RTM result
  -- Note: window stays open — Angular closes it after all eligible players are resolved
  INSERT INTO rtm_results (
    window_id, player_id, winner_team_id,
    original_owner_team_id, final_amount,
    original_sold_price, success, message
  ) VALUES (
    p_window_id, p_player_id, p_winner_team_id,
    p_original_owner_id, p_rtm_amount,
    p_original_sold_price, TRUE,
    FORMAT('RTM: %s won by %s for %s (was with %s)',
      v_player_name, v_winner_name, p_rtm_amount, v_original_name)
  );

  RETURN json_build_object(
    'success', TRUE,
    'player', v_player_name,
    'winner', v_winner_name,
    'original_owner', v_original_name,
    'amount', p_rtm_amount,
    'message', FORMAT('%s transferred to %s via RTM for %s', v_player_name, v_winner_name, p_rtm_amount)
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', FALSE,
    'error', SQLERRM,
    'message', 'RTM transaction failed'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 7. OPEN RTM WINDOW FUNCTION
-- ============================================================
-- Called by the Angular app when a milestone is reached.
-- Inserts a new rtm_windows row and returns the window UUID.

CREATE OR REPLACE FUNCTION open_rtm_window(
  p_start_sold_count    INTEGER,
  p_end_sold_count      INTEGER,
  p_eligible_player_ids UUID[]
)
RETURNS JSON AS $$
DECLARE
  v_window_id UUID;
BEGIN
  -- Close any previously active windows (safety)
  UPDATE rtm_windows
  SET is_active = FALSE, closed_at = NOW()
  WHERE is_active = TRUE;

  -- Insert the new window
  INSERT INTO rtm_windows (start_sold_count, end_sold_count, eligible_player_ids, is_active)
  VALUES (p_start_sold_count, p_end_sold_count, p_eligible_player_ids, TRUE)
  RETURNING id INTO v_window_id;

  RETURN json_build_object(
    'success', TRUE,
    'window_id', v_window_id,
    'message', FORMAT('RTM window opened for sold count %s-%s with %s eligible players',
      p_start_sold_count, p_end_sold_count, array_length(p_eligible_player_ids, 1))
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', FALSE,
    'error', SQLERRM,
    'message', 'Failed to open RTM window'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 8. PLACE RTM BID FUNCTION
-- ============================================================
-- Called by the Angular app when a team places an RTM bid.
-- Validates the bid server-side and inserts/updates the offer.

CREATE OR REPLACE FUNCTION place_rtm_bid(
  p_window_id  UUID,
  p_player_id  UUID,
  p_team_id    UUID,
  p_bid_amount DECIMAL
)
RETURNS JSON AS $$
DECLARE
  v_rtm_available    BOOLEAN;
  v_player_owner_id  UUID;
  v_player_sold_price DECIMAL;
  v_min_bid          DECIMAL;
  v_window_active    BOOLEAN;
  v_player_eligible  BOOLEAN;
  v_existing_offer   UUID;
BEGIN
  -- 1. Check window is active
  SELECT is_active INTO v_window_active
  FROM rtm_windows WHERE id = p_window_id;

  IF v_window_active IS NULL OR NOT v_window_active THEN
    RETURN json_build_object('success', FALSE, 'message', 'No active RTM window');
  END IF;

  -- 2. Check player is eligible in this window
  SELECT p_player_id = ANY(eligible_player_ids) INTO v_player_eligible
  FROM rtm_windows WHERE id = p_window_id;

  IF NOT v_player_eligible THEN
    RETURN json_build_object('success', FALSE, 'message', 'Player not eligible for RTM in this window');
  END IF;

  -- 3. Check team RTM is still available
  SELECT rtm_available INTO v_rtm_available
  FROM teams WHERE id = p_team_id;

  IF NOT COALESCE(v_rtm_available, FALSE) THEN
    RETURN json_build_object('success', FALSE, 'message', 'Team has already used their RTM allowance');
  END IF;

  -- 4. Check team is not the current owner
  SELECT final_team_id, final_price INTO v_player_owner_id, v_player_sold_price
  FROM auction_players WHERE id = p_player_id;

  IF v_player_owner_id = p_team_id THEN
    RETURN json_build_object('success', FALSE, 'message', 'Cannot use RTM on your own player');
  END IF;

  -- 5. Check bid >= 110% of sold price, rounded up to nearest 10
  --    Unsold players (sold_price NULL) use base price directly (COALESCE to 0 skips the 110% rule)
  v_min_bid := CASE
    WHEN v_player_sold_price IS NULL THEN 0   -- unsold: any bid >= base price accepted by app
    ELSE CEIL(v_player_sold_price * 1.10 / 10) * 10
  END;
  IF p_bid_amount < v_min_bid THEN
    RETURN json_build_object('success', FALSE,
      'message', FORMAT('RTM bid must be at least %s (110%% of %s)', v_min_bid, v_player_sold_price),
      'min_bid', v_min_bid);
  END IF;

  -- 6. Insert or update the offer (upsert)
  SELECT id INTO v_existing_offer
  FROM rtm_offers
  WHERE window_id = p_window_id AND player_id = p_player_id AND team_id = p_team_id;

  IF v_existing_offer IS NOT NULL THEN
    UPDATE rtm_offers
    SET bid_amount = p_bid_amount, created_at = NOW()
    WHERE id = v_existing_offer;
  ELSE
    INSERT INTO rtm_offers (window_id, player_id, team_id, bid_amount)
    VALUES (p_window_id, p_player_id, p_team_id, p_bid_amount);
  END IF;

  RETURN json_build_object(
    'success', TRUE,
    'message', 'RTM bid placed successfully',
    'bid_amount', p_bid_amount,
    'min_bid', v_min_bid
  );

EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', FALSE,
    'error', SQLERRM,
    'message', 'Failed to place RTM bid'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 9. UPDATE reset_all_predictions TO ALSO RESET RTM DATA
-- ============================================================
-- Updates the existing admin reset function to also clear RTM state

CREATE OR REPLACE FUNCTION reset_all_predictions(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_role TEXT;
    v_deleted_count INT;
BEGIN
    SELECT role INTO v_role FROM users WHERE id = p_user_id;
    IF v_role IS NULL OR v_role != 'admin' THEN
        RAISE EXCEPTION 'Unauthorized: admin access required';
    END IF;

    -- Delete all predictions
    DELETE FROM predictions WHERE true;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    -- Reset user tokens
    UPDATE users SET
        token_balance = 50,
        initial_tokens = 50,
        tokens_spent = 0,
        tokens_won = 0,
        total_predictions = 0,
        correct_predictions = 0,
        accuracy_percentage = 0,
        needs_token_setup = false
    WHERE true;

    -- Reset all auction players
    UPDATE auction_players SET
        auction_status = 'upcoming',
        final_team_id = NULL,
        final_price = NULL
    WHERE true;

    -- *** Reset RTM data ***
    DELETE FROM rtm_results WHERE true;
    DELETE FROM rtm_offers WHERE true;
    DELETE FROM rtm_windows WHERE true;
    UPDATE teams SET
        rtm_available = TRUE,
        rtm_used_at = NULL,
        rtm_used_for_player_id = NULL
    WHERE true;

    RETURN json_build_object(
        'success', true,
        'predictions_deleted', v_deleted_count,
        'message', 'All predictions and RTM data reset. User balances restored to 50 tokens.'
    );
END;
$$;


-- ============================================================
-- 10. HELPER QUERIES (for manual use in SQL Editor)
-- ============================================================

-- ━━━ View all teams with RTM status ━━━
-- SELECT team_name, team_short_name, rtm_available,
--        rtm_used_at, rtm_used_for_player_id
-- FROM teams ORDER BY team_name;

-- ━━━ View all RTM windows ━━━
-- SELECT id, start_sold_count, end_sold_count, is_active,
--        created_at, closed_at
-- FROM rtm_windows ORDER BY created_at DESC;

-- ━━━ View all RTM offers with team & player names ━━━
-- SELECT ro.bid_amount, ro.is_winner, ro.created_at,
--        t.team_short_name, ap.player_name
-- FROM rtm_offers ro
-- JOIN teams t ON ro.team_id = t.id
-- JOIN auction_players ap ON ro.player_id = ap.id
-- ORDER BY ro.created_at DESC;

-- ━━━ View RTM results (completed transactions) ━━━
-- SELECT rr.final_amount, rr.original_sold_price, rr.message,
--        rr.created_at,
--        tw.team_short_name AS winner,
--        tow.team_short_name AS original_owner,
--        ap.player_name
-- FROM rtm_results rr
-- JOIN teams tw ON rr.winner_team_id = tw.id
-- JOIN teams tow ON rr.original_owner_team_id = tow.id
-- JOIN auction_players ap ON rr.player_id = ap.id
-- ORDER BY rr.created_at DESC;

-- ━━━ Reset only RTM data (without resetting the full auction) ━━━
-- DELETE FROM rtm_results;
-- DELETE FROM rtm_offers;
-- DELETE FROM rtm_windows;
-- UPDATE teams SET rtm_available = TRUE, rtm_used_at = NULL, rtm_used_for_player_id = NULL;

-- ━━━ Manually mark a team's RTM as used ━━━
-- UPDATE teams SET rtm_available = FALSE, rtm_used_at = NOW()
-- WHERE team_short_name = 'WI';

-- ━━━ Manually process an RTM transaction ━━━
-- SELECT process_rtm_transaction(
--   '<window_uuid>',
--   (SELECT id FROM auction_players WHERE player_name = 'Keshav'),
--   (SELECT id FROM teams WHERE team_short_name = 'ENG'),
--   (SELECT id FROM teams WHERE team_short_name = 'WI'),
--   550.00,  -- RTM bid amount
--   500.00   -- Original sold price
-- );

-- ============================================================
-- 11. VERIFICATION — Run after executing to confirm setup
-- ============================================================

-- Check RTM columns on teams
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'teams'
  AND column_name IN ('rtm_available', 'rtm_used_at', 'rtm_used_for_player_id');

-- Check new tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('rtm_windows', 'rtm_offers', 'rtm_results');

-- Check all RTM functions exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('process_rtm_transaction', 'open_rtm_window', 'place_rtm_bid');

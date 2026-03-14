-- ============================================================
-- Token Re-pick: Run in Supabase SQL Editor
-- ============================================================

-- 1. Add needs_token_setup flag
ALTER TABLE users ADD COLUMN IF NOT EXISTS needs_token_setup BOOLEAN DEFAULT false;

-- 2. Update reset function to set the flag
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

    DELETE FROM predictions WHERE true;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

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

    UPDATE auction_players SET
        auction_status = 'upcoming',
        final_team_id = NULL,
        final_price = NULL
    WHERE true;

    RETURN json_build_object(
        'success', true,
        'predictions_deleted', v_deleted_count,
        'message', 'All predictions reset. User balances restored to 50 tokens.'
    );
END;
$$;

-- 3. Create set_user_tokens function (called when user picks 5 or 10)
CREATE OR REPLACE FUNCTION set_user_tokens(p_user_id UUID, p_tokens INT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF p_tokens < 5 OR p_tokens > 200 OR (p_tokens % 5) != 0 THEN
        RAISE EXCEPTION 'Tokens must be between 5 and 200, in steps of 5';
    END IF;

    UPDATE users SET
        initial_tokens = p_tokens,
        token_balance = p_tokens,
        needs_token_setup = false
    WHERE id = p_user_id;

    RETURN json_build_object(
        'success', true,
        'token_balance', p_tokens
    );
END;
$$;

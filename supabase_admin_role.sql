-- ============================================================
-- CWF Auction: Admin Role System — Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add role column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));

-- 2. Set admin user(s) — CHANGE the username below to your admin username
UPDATE users SET role = 'admin' WHERE username = 'praveen';
-- You can add more admins:
-- UPDATE users SET role = 'admin' WHERE username = 'another_admin';

-- 3. Update pg_sign_in to return role
CREATE OR REPLACE FUNCTION pg_sign_in(p_username TEXT, p_password TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user RECORD;
BEGIN
    SELECT * INTO v_user FROM users
    WHERE username = lower(trim(p_username));

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid username or password';
    END IF;

    IF v_user.password_hash != crypt(p_password, v_user.password_hash) THEN
        RAISE EXCEPTION 'Invalid username or password';
    END IF;

    RETURN json_build_object(
        'id', v_user.id,
        'username', v_user.username,
        'display_name', v_user.display_name,
        'phone_number', v_user.phone_number,
        'initial_tokens', v_user.initial_tokens,
        'token_balance', v_user.token_balance,
        'tokens_spent', v_user.tokens_spent,
        'tokens_won', v_user.tokens_won,
        'total_predictions', v_user.total_predictions,
        'correct_predictions', v_user.correct_predictions,
        'accuracy_percentage', v_user.accuracy_percentage,
        'role', COALESCE(v_user.role, 'user'),
        'created_at', v_user.created_at
    );
END;
$$;

-- 4. Create reset_all_predictions function (admin only)
CREATE OR REPLACE FUNCTION reset_all_predictions(p_user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_role TEXT;
    v_deleted_count INT;
BEGIN
    -- Check if user is admin
    SELECT role INTO v_role FROM users WHERE id = p_user_id;
    IF v_role IS NULL OR v_role != 'admin' THEN
        RAISE EXCEPTION 'Unauthorized: admin access required';
    END IF;

    -- Delete all predictions
    DELETE FROM predictions;
    GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

    -- Reset all user token balances to their initial tokens
    UPDATE users SET
        token_balance = initial_tokens,
        tokens_spent = 0,
        tokens_won = 0,
        total_predictions = 0,
        correct_predictions = 0,
        accuracy_percentage = 0;

    -- Reset all auction player statuses to upcoming
    UPDATE auction_players SET
        auction_status = 'upcoming',
        final_team_id = NULL,
        final_price = NULL;

    RETURN json_build_object(
        'success', true,
        'predictions_deleted', v_deleted_count,
        'message', 'All predictions reset successfully'
    );
END;
$$;

-- 5. Verify: check which users are admins
SELECT username, display_name, role FROM users ORDER BY role DESC, username;

# CWF Auction — Supabase SQL Query Reference

> Run these in: **Supabase Dashboard → SQL Editor → New Query**

---

## 👥 Users

```sql
-- All users (newest first)
SELECT id, display_name, phone_number, token_balance, initial_tokens, created_at
FROM users
ORDER BY created_at DESC;

-- Find a specific user by phone
SELECT * FROM users WHERE phone_number = '9876543210';

-- Leaderboard (richest first)
SELECT display_name, phone_number, token_balance, correct_predictions, total_predictions, accuracy_percentage
FROM users
ORDER BY token_balance DESC;

-- Reset a user's token balance
UPDATE users SET token_balance = 100 WHERE phone_number = '9876543210';

-- Delete a user (also deletes their predictions via CASCADE)
DELETE FROM users WHERE phone_number = '9876543210';
```

---

## 🎯 Predictions / Bets

```sql
-- All active bets with player & team names
SELECT
  u.display_name,
  u.phone_number,
  ap.player_name,
  t.team_short_name AS predicted_team,
  pr.tokens_bet,
  pr.status,
  pr.created_at
FROM predictions pr
JOIN users u ON pr.user_id = u.id
JOIN auction_players ap ON pr.player_id = ap.id
JOIN teams t ON pr.predicted_team_id = t.id
WHERE pr.status = 'active'
ORDER BY pr.created_at DESC;

-- Bets for a specific player
SELECT u.display_name, t.team_short_name, pr.tokens_bet, pr.status
FROM predictions pr
JOIN users u ON pr.user_id = u.id
JOIN teams t ON pr.predicted_team_id = t.id
WHERE pr.player_id = (SELECT id FROM auction_players WHERE player_name = 'Sharan M');

-- Token pool per team for a player (who bet what)
SELECT t.team_short_name, SUM(pr.tokens_bet) AS total_tokens
FROM predictions pr
JOIN teams t ON pr.predicted_team_id = t.id
WHERE pr.player_id = (SELECT id FROM auction_players WHERE player_name = 'Sharan M')
  AND pr.status = 'active'
GROUP BY t.team_short_name
ORDER BY total_tokens DESC;

-- All bets by a specific user
SELECT ap.player_name, t.team_short_name, pr.tokens_bet, pr.status, pr.tokens_won
FROM predictions pr
JOIN auction_players ap ON pr.player_id = ap.id
JOIN teams t ON pr.predicted_team_id = t.id
WHERE pr.user_id = (SELECT id FROM users WHERE phone_number = '9876543210')
ORDER BY pr.created_at DESC;
```

---

## 🏏 Players

```sql
-- All players with their auction status
SELECT player_name, player_role, auction_status, final_price,
       (SELECT team_short_name FROM teams WHERE id = final_team_id) AS sold_to
FROM auction_players
ORDER BY auction_order;

-- Only upcoming (not yet auctioned) players
SELECT player_name, player_role, auction_order
FROM auction_players
WHERE auction_status = 'upcoming'
ORDER BY auction_order;

-- Mark a player as sold (use the actual UUIDs)
UPDATE auction_players
SET auction_status = 'sold',
    final_team_id = (SELECT id FROM teams WHERE team_short_name = 'TK'),
    final_price = 500
WHERE player_name = 'Sharan M';

-- Mark a player as unsold
UPDATE auction_players
SET auction_status = 'unsold'
WHERE player_name = 'Sharan M';
```

---

## 🏆 Teams

```sql
-- All teams
SELECT * FROM teams ORDER BY team_short_name;

-- Players sold to each team
SELECT t.team_short_name, ap.player_name, ap.final_price
FROM auction_players ap
JOIN teams t ON ap.final_team_id = t.id
WHERE ap.auction_status = 'sold'
ORDER BY t.team_short_name, ap.final_price DESC;
```

---

## 💰 Process Auction Result (Payout)

```sql
-- After a player is sold, run this to pay out winners
-- Replace the UUIDs with actual values from your tables
SELECT process_player_auction(
  (SELECT id FROM auction_players WHERE player_name = 'Sharan M'),
  (SELECT id FROM teams WHERE team_short_name = 'TK'),
  500.00
);
```

---

## 🔧 Admin / Maintenance

```sql
-- Open or close betting
UPDATE auction_settings SET is_betting_open = TRUE;   -- open
UPDATE auction_settings SET is_betting_open = FALSE;  -- close

-- Check current betting status
SELECT is_betting_open, betting_closes_at FROM auction_settings;

-- Total tokens in circulation
SELECT SUM(token_balance) AS total_balance, COUNT(*) AS total_users FROM users;

-- Clear ALL predictions (reset game - careful!)
DELETE FROM predictions;
UPDATE users SET token_balance = initial_tokens, tokens_spent = 0, tokens_won = 0,
  total_predictions = 0, correct_predictions = 0, accuracy_percentage = 0;

-- Reset all players to upcoming status
UPDATE auction_players SET auction_status = 'upcoming', final_team_id = NULL, final_price = NULL;
```

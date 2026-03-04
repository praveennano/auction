# 🏏 CWF Auction — Configuration Guide

Quick reference for updating captains, pools, players, and teams.

---

## 1. 🏆 Change Team Captains

**File:** `src/app/service/auction.service.ts` → `teamCaptains` array (~line 39)

Each captain entry has:
- `id` — Use 101+ to avoid conflicts with regular player IDs
- `name` — Captain's display name
- `basePrice` — Their price (deducted from team budget)
- `teamId` — Which team (1–5)
- Stats: `battingStats`, `bowlingStats`

### Example: Replace Keshav with "Rajan" as Team 1 captain

```typescript
// BEFORE
{
  id: 101,
  name: 'Keshav',
  role: PlayerRole.ALL_ROUNDER,
  basePrice: 150,
  mvpRanking: 1,
  battingStats: { runs: 750, strikeRate: 155.0 },
  bowlingStats: { wickets: 28, economy: 7.8 },
  teamId: 1,
  isSold: true,
  soldPrice: 150
},

// AFTER
{
  id: 101,
  name: 'Rajan',            // ← Changed
  role: PlayerRole.BATSMAN,  // ← Changed role
  basePrice: 200,            // ← Changed price
  mvpRanking: 1,
  battingStats: { runs: 500, strikeRate: 140.0 },
  bowlingStats: { wickets: 5, economy: 10.0 },
  teamId: 1,
  isSold: true,
  soldPrice: 200             // ← Must match basePrice
},
```

> **Also update** `createInitialTeams()` (~line 808) — change the team `name`, `shortName`, and `budget`:
> - `budget` = **2500 − captain's basePrice**  
>   (e.g., captain costs 200 → budget = 2300)

```typescript
{
  id: 1,
  name: 'Rajan',        // ← Match captain name
  shortName: 'Rajan',
  color: '#F39C12',
  budget: 2300,          // ← 2500 - 200 (captain price)
  players: [this.teamCaptains[0]]
},
```

---

## 2. ⭐ Change Premium Pool Players

**Where:** Supabase → `auction_players` table → `auction_order` column

Players with `auction_order` **1–5** go to Premium Pool.  
Players with `auction_order` **> 5** (e.g., 99) go to Pool A.

### SQL: View current pool assignments

```sql
-- See which players are in which pool
SELECT player_name, auction_order,
  CASE
    WHEN auction_order BETWEEN 1 AND 5 THEN 'Premium Pool'
    ELSE 'Pool A'
  END AS pool
FROM auction_players
ORDER BY auction_order, player_name;
```

### SQL: Move a player TO Premium Pool

```sql
-- Make "Sarath Kumar" a premium player (order = 3)
UPDATE auction_players
SET auction_order = 3
WHERE player_name = 'Sarath Kumar';
```

### SQL: Move a player OUT of Premium Pool

```sql
-- Move "Ashok" to normal pool
UPDATE auction_players
SET auction_order = 99
WHERE player_name = 'Ashok';
```

### SQL: Swap two players between pools

```sql
-- Swap Ashok (currently premium, order=3) with Umesh (currently normal, order=99)
UPDATE auction_players SET auction_order = 99 WHERE player_name = 'Ashok';
UPDATE auction_players SET auction_order = 3  WHERE player_name = 'Umesh';
```

### SQL: Set all 5 premium players at once

```sql
-- First, reset everyone to Pool A
UPDATE auction_players SET auction_order = 99;

-- Then set the 5 premium players
UPDATE auction_players SET auction_order = 1 WHERE player_name = 'Sharan M';
UPDATE auction_players SET auction_order = 2 WHERE player_name = 'Karthikeyan';
UPDATE auction_players SET auction_order = 3 WHERE player_name = 'Sarath Kumar';
UPDATE auction_players SET auction_order = 4 WHERE player_name = 'Umesh';
UPDATE auction_players SET auction_order = 5 WHERE player_name = 'Ashok';
```

---

## 3. 🎱 Add / Remove Auction Players

**Where:** Supabase → `auction_players` table

### SQL: Add a new player

```sql
INSERT INTO auction_players (player_name, player_role, base_price, auction_order, auction_status)
VALUES ('New Player', 'All-Rounder', 100, 99, 'upcoming');
```

### SQL: Remove a player

```sql
DELETE FROM auction_players WHERE player_name = 'Player Name';
```

### SQL: View all players with status

```sql
SELECT id, player_name, player_role, base_price, auction_order, auction_status
FROM auction_players
ORDER BY auction_order, player_name;
```

### SQL: Reset all players to "upcoming" (before a new auction)

```sql
UPDATE auction_players
SET auction_status = 'upcoming',
    final_team_id = NULL,
    final_price = NULL;
```

---

## 4. 📊 Update Player Stats

**File:** `src/app/service/auction.service.ts` → `initialPlayers` array (~line 103)

Stats are matched to DB players **by name** (case-insensitive). So the `name` field must exactly match the `player_name` in Supabase.

### Example: Update Sharan M's stats

```typescript
{
  id: 1,
  name: 'Sharan M',   // ← Must match DB player_name exactly
  role: PlayerRole.ALL_ROUNDER,
  basePrice: 100,
  mvpRanking: 1,
  battingStats: {
    Cup: 3,            // ← Updated
    pomAwards: 5,      // ← Updated
    runs: 550,         // ← Updated
    battingAvg: 35.0,  // ← Updated
    strikeRate: 170.0  // ← Updated
  },
  bowlingStats: {
    wickets: 15,       // ← Updated
    economy: 7.5,      // ← Updated
    catches: 15        // ← Updated
  }
},
```

---

## 5. 🎨 Change Team Colors

**File:** `src/app/service/auction.service.ts` → `createInitialTeams()` (~line 808)

```typescript
{
  id: 1,
  name: 'Keshav',
  shortName: 'Keshav',
  color: '#FF5733',    // ← Change hex color here
  budget: 2350,
  players: [this.teamCaptains[0]]
},
```

Also update in **Supabase** → `teams` table → `team_color` column:

```sql
UPDATE teams SET team_color = '#FF5733' WHERE team_name = 'Keshav';
```

---

## 6. 🔄 Full Season Reset Checklist

When starting a new auction season:

### Supabase (run these SQL queries)

```sql
-- 1. Reset all player statuses
UPDATE auction_players
SET auction_status = 'upcoming',
    final_team_id = NULL,
    final_price = NULL;

-- 2. Set premium pool players (update names as needed)
UPDATE auction_players SET auction_order = 99;  -- Reset all
UPDATE auction_players SET auction_order = 1 WHERE player_name = 'Player A';
UPDATE auction_players SET auction_order = 2 WHERE player_name = 'Player B';
UPDATE auction_players SET auction_order = 3 WHERE player_name = 'Player C';
UPDATE auction_players SET auction_order = 4 WHERE player_name = 'Player D';
UPDATE auction_players SET auction_order = 5 WHERE player_name = 'Player E';

-- 3. Reset predictions (if using prediction game)
DELETE FROM predictions;
UPDATE users SET token_balance = initial_tokens,
                 tokens_spent = 0,
                 tokens_won = 0,
                 total_predictions = 0,
                 correct_predictions = 0,
                 accuracy_percentage = 0;
```

### Angular (update code if needed)

1. Update `teamCaptains` array with new captain names/prices
2. Update `createInitialTeams()` with matching team names and budgets
3. Update `initialPlayers` stats if any stats changed

### Browser

1. Clear localStorage: DevTools → Application → Local Storage → delete `cwf_auction_data`
2. Hard refresh the page (`Ctrl + Shift + R`)

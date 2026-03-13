-- Run this script in the Supabase SQL Editor to update the teams and assign the captains

-- 1. Clear existing teams (Warning: this will delete any existing predictions due to CASCADE)
DELETE FROM teams;

-- 2. Insert the new Captains and their team names with corresponding colors
INSERT INTO teams (team_name, team_short_name, team_color) VALUES
('Team Sharan M', 'WI', '#7B0041'),        -- Maroon (West Indies)
('Team Nageshwaran', 'ENG', '#00247D'),    -- Blue (England)
('Team Sriram', 'SA', '#007A4D'),          -- Green (South Africa)
('Team S N K', 'AUS', '#FFCD00'),          -- Yellow (Australia)
('Team Aravind Ganesh', 'NZ', '#000000');  -- Black (New Zealand)

-- 3. Remove the new captains from the player auction list
DELETE FROM auction_players WHERE player_name ILIKE 'Sharan M%';
DELETE FROM auction_players WHERE player_name ILIKE 'Nageshwaran%';
DELETE FROM auction_players WHERE player_name ILIKE 'Sriram%';
DELETE FROM auction_players WHERE player_name ILIKE 'S N K%';
DELETE FROM auction_players WHERE player_name ILIKE 'Aravind Ganesh A R%';

-- 4. Add the previous captains to the player auction list
INSERT INTO auction_players (player_name, player_role, base_price, auction_order) VALUES
('Keshav', 'All-Rounder', 100, (SELECT COALESCE(MAX(auction_order), 0) + 1 FROM auction_players)),
('Loki', 'All-Rounder', 100, (SELECT COALESCE(MAX(auction_order), 0) + 2 FROM auction_players)),
('Praveen', 'All-Rounder', 100, (SELECT COALESCE(MAX(auction_order), 0) + 3 FROM auction_players)),
('Kabeer', 'All-Rounder', 100, (SELECT COALESCE(MAX(auction_order), 0) + 4 FROM auction_players)),
('Sowrish', 'All-Rounder', 100, (SELECT COALESCE(MAX(auction_order), 0) + 5 FROM auction_players));

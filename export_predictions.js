const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://qnbrkllqeubwynwulvrx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnJrbGxxZXVid3lud3VsdnJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzczMjksImV4cCI6MjA4NzAxMzMyOX0.53vSOm_1XQPLtiwMSEWcNK0q5I_oO1QvmaOdhzfq51w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function exportPredictions() {
    console.log("Fetching data from Supabase...");

    // 1. Fetch all users
    const { data: users, error: usersError } = await supabase.from('users').select('id, email, raw_user_meta_data');
    if (usersError) return console.error("Error fetching users:", usersError);

    const userMap = {};
    users.forEach(u => {
        let name = u.email;
        if (u.raw_user_meta_data && u.raw_user_meta_data.full_name) {
            name = u.raw_user_meta_data.full_name;
        } else if (u.raw_user_meta_data && u.raw_user_meta_data.name) {
            name = u.raw_user_meta_data.name;
        }
        userMap[u.id] = name;
    });

    // 2. Fetch all auction players
    const { data: players, error: playersError } = await supabase.from('auction_players').select('id, player_name');
    if (playersError) return console.error("Error fetching players:", playersError);

    const playerMap = {};
    players.forEach(p => playerMap[p.id] = p.player_name);

    // 3. Fetch all predictions
    const { data: predictions, error: predsError } = await supabase.from('predictions').select('*');
    if (predsError) return console.error("Error fetching predictions:", predsError);

    // Teams map (Hardcoded typically 1-10 depending on user's db)
    const teamMap = {
        1: "CSK", 2: "MI", 3: "RCB", 4: "KKR",
        5: "DC", 6: "PBKS", 7: "RR", 8: "SRH",
        9: "GT", 10: "LSG"
    };

    if (!predictions || predictions.length === 0) {
        console.log("No predictions found in the database.");
        return;
    }

    console.log(`Found ${predictions.length} predictions. Generating CSV...`);

    // 4. Generate CSV content
    let csvContent = "User Name,Player Name,Predicted Team ID,Tokens Bet,Status\n";

    predictions.forEach(p => {
        const userName = userMap[p.user_id] || p.user_id;
        const playerName = playerMap[p.predicted_player_id] || `Unknown Player (ID: ${p.predicted_player_id})`;
        const teamName = teamMap[p.predicted_team_id] || `Team ${p.predicted_team_id}`;

        // Escape quotes and commas
        const safeUser = `"${String(userName).replace(/"/g, '""')}"`;
        const safePlayer = `"${String(playerName).replace(/"/g, '""')}"`;
        const safeTeam = `"${String(teamName).replace(/"/g, '""')}"`;
        const tokens = p.tokens_bet;
        const status = p.status || 'unknown';

        csvContent += `${safeUser},${safePlayer},${safeTeam},${tokens},${status}\n`;
    });

    // 5. Write to file
    const filename = 'auction_predictions_report.csv';
    fs.writeFileSync(filename, csvContent);
    console.log(`\n✅ Successfully exported ${predictions.length} predictions to ${filename}`);
}

exportPredictions();

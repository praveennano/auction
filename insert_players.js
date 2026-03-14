const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qnbrkllqeubwynwulvrx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnJrbGxxZXVid3lud3VsdnJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzczMjksImV4cCI6MjA4NzAxMzMyOX0.53vSOm_1XQPLtiwMSEWcNK0q5I_oO1QvmaOdhzfq51w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: sample } = await supabase.from('auction_players').select('*').limit(1);
    console.log("Sample player structure:", JSON.stringify(sample[0], null, 2));

    const newPlayers = [
        { player_name: 'Ashwin', role: 'All-Rounder', base_price: 10, auction_status: 'upcoming' },
        { player_name: 'Musab', role: 'All-Rounder', base_price: 10, auction_status: 'upcoming' },
        { player_name: 'Shivam', role: 'All-Rounder', base_price: 10, auction_status: 'upcoming' },
        { player_name: 'Sriram MP', role: 'All-Rounder', base_price: 10, auction_status: 'upcoming' }
    ];

    for (const p of newPlayers) {
        // Just merge default stats from the sample player
        const newP = {
            ...p,
            batting_style: 'Right-hand bat',
            bowling_style: 'Right-arm medium',
            matches_played: 0,
            mvp_ranking: 999,
            batting_runs: 0,
            batting_strike_rate: 0,
            batting_average: 0,
            bowling_wickets: 0,
            bowling_economy: 0,
            image_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(p.player_name)}&background=random`
        };

        const { error } = await supabase.from('auction_players').insert([newP]);
        if (error) {
            console.error("Error inserting", p.player_name, error);
        } else {
            console.log("Inserted", p.player_name);
        }
    }
}

main();

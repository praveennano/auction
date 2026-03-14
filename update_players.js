const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qnbrkllqeubwynwulvrx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnJrbGxxZXVid3lud3VsdnJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzczMjksImV4cCI6MjA4NzAxMzMyOX0.53vSOm_1XQPLtiwMSEWcNK0q5I_oO1QvmaOdhzfq51w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    // Let's first fetch one player to see the column structure
    const { data: sample, error: err1 } = await supabase.from('auction_players').select('*').limit(1);
    console.log("Sample player:", sample);

    // Players to remove
    const toRemove = ['Gopi', 'Mahesh', 'naveen', 'venkat'];
    for (const name of toRemove) {
        // Find them first to be safe, maybe case-insensitive or partial
        const { data, error } = await supabase.from('auction_players').select('id, player_name').ilike('player_name', `%${name}%`);
        console.log(`Matching for removal ${name}:`, data);
        if (data && data.length > 0) {
            for (const p of data) {
                const { error: delErr } = await supabase.from('auction_players').delete().eq('id', p.id);
                if (delErr) console.error("Error deleting", p.player_name, delErr);
                else console.log(`Deleted ${p.player_name}`);
            }
        }
    }
}

main();

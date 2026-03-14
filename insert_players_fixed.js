const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qnbrkllqeubwynwulvrx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnJrbGxxZXVid3lud3VsdnJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzczMjksImV4cCI6MjA4NzAxMzMyOX0.53vSOm_1XQPLtiwMSEWcNK0q5I_oO1QvmaOdhzfq51w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: maxOrderData } = await supabase.from('auction_players').select('auction_order').order('auction_order', { ascending: false }).limit(1);
    let currentOrder = maxOrderData && maxOrderData.length > 0 ? maxOrderData[0].auction_order : 0;

    const newPlayers = [
        { player_name: 'Ashwin', player_role: 'All-Rounder', base_price: 10, auction_status: 'upcoming' },
        { player_name: 'Musab', player_role: 'All-Rounder', base_price: 10, auction_status: 'upcoming' },
        { player_name: 'Shivam', player_role: 'All-Rounder', base_price: 10, auction_status: 'upcoming' },
        { player_name: 'Sriram MP', player_role: 'All-Rounder', base_price: 10, auction_status: 'upcoming' }
    ];

    for (const p of newPlayers) {
        currentOrder++;
        const newP = {
            ...p,
            player_image_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(p.player_name)}&background=random`,
            auction_order: currentOrder
        };

        const { error } = await supabase.from('auction_players').insert([newP]);
        if (error) {
            console.error("Error inserting", p.player_name, error.message);
        } else {
            console.log("Inserted", p.player_name);
        }
    }
}

main();

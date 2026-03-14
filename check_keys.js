const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://qnbrkllqeubwynwulvrx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFuYnJrbGxxZXVid3lud3VsdnJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE0MzczMjksImV4cCI6MjA4NzAxMzMyOX0.53vSOm_1XQPLtiwMSEWcNK0q5I_oO1QvmaOdhzfq51w';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    const { data: sample } = await supabase.from('auction_players').select('*').limit(1);
    console.log("Keys:", Object.keys(sample[0]).join(', '));
}
main();

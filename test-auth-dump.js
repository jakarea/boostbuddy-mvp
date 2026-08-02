const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) console.error("Error:", error.message);
  else {
    console.log(`Found ${data.users.length} users in auth.users.`);
    const fs = require('fs');
    fs.writeFileSync('supabase-users-backup.json', JSON.stringify(data.users, null, 2));
    console.log("Saved auth.users to supabase-users-backup.json");
  }
}
test();

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in env!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  console.log("Connecting to Supabase at:", supabaseUrl);
  
  // 1. Check all users in public.users
  console.log("\n--- Querying public.users ---");
  const { data: users, error: usersErr } = await supabase
    .from('users')
    .select('*');
    
  if (usersErr) {
    console.error("Error fetching users:", usersErr);
  } else {
    console.log(`Found ${users.length} users in public.users:`);
    console.log(users);
  }

  // 2. Query specific test user
  const testId = 'b26ec1c7-b6e5-4df6-89f3-6e5395f10b1e';
  console.log(`\n--- Fetching user ID: ${testId} ---`);
  const { data: testUser, error: testUserErr } = await supabase
    .from('users')
    .select('*')
    .eq('id', testId)
    .single();

  if (testUserErr) {
    console.error("Error fetching test user:", testUserErr);
  } else {
    console.log("Test user profile found:", testUser);
  }
}

run();

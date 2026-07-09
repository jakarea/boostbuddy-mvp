import { createAdminClient } from '../lib/supabase/admin';

async function main() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('profile_accounts').select('id, profile_name, assigned_client_id, status');
  if (error) {
    console.error('Error fetching profile accounts:', error);
  } else {
    console.log('Profile accounts in DB:', data);
  }
}

main();

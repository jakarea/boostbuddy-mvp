import { createAdminClient } from '../lib/supabase/admin';

async function main() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('users').select('id, email, name, role, status');
  if (error) {
    console.error('Error fetching users:', error);
  } else {
    console.log('Users in DB:', data);
  }
}

main();

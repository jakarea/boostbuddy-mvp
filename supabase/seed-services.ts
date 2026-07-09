import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Seeding packages directly using Supabase client...");

  // 1. Deactivate old services
  const { error: deactivateError } = await supabase
    .from('services')
    .update({ is_active: false })
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Dummy condition to update all

  if (deactivateError) {
    console.error("Failed to deactivate old services:", deactivateError.message);
    process.exit(1);
  }

  // 2. Define the 5 new standard packages
  const packages = [
    {
      id: '11111111-1111-1111-1111-111111111111',
      name: '7 Days Plan',
      description: '7-day access to browser profile with high-speed residential proxies.',
      price: 99.00,
      duration_days: 7,
      is_active: true,
      requires_manual_assignment: true,
      instructions: 'Import profile to IXBrowser and start using.'
    },
    {
      id: '22222222-2222-2222-2222-222222222222',
      name: '30 Days Plan',
      description: '30-day access to browser profile with premium residential proxies.',
      price: 299.00,
      duration_days: 30,
      is_active: true,
      requires_manual_assignment: true,
      instructions: 'Import profile to IXBrowser and start using.'
    },
    {
      id: '33333333-3333-3333-3333-333333333333',
      name: '3 Months Plan',
      description: '90-day access to browser profile with premium residential proxies.',
      price: 799.00,
      duration_days: 90,
      is_active: true,
      requires_manual_assignment: true,
      instructions: 'Import profile to IXBrowser and start using.'
    },
    {
      id: '44444444-4444-4444-4444-444444444444',
      name: '6 Months Plan',
      description: '180-day access to browser profile with premium residential proxies.',
      price: 1499.00,
      duration_days: 180,
      is_active: true,
      requires_manual_assignment: true,
      instructions: 'Import profile to IXBrowser and start using.'
    },
    {
      id: '55555555-5555-5555-5555-555555555555',
      name: '12 Months Plan',
      description: '360-day access to browser profile with premium residential proxies.',
      price: 2990.00,
      duration_days: 360,
      is_active: true,
      requires_manual_assignment: true,
      instructions: 'Import profile to IXBrowser and start using.'
    }
  ];

  // 3. Upsert packages
  const { error: upsertError } = await supabase
    .from('services')
    .upsert(packages, { onConflict: 'id' });

  if (upsertError) {
    console.error("Upserting new services failed:", upsertError.message);
    process.exit(1);
  }

  console.log("Services seeded successfully!");
}

main();

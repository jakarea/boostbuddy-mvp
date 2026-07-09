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
  console.log("Starting Supabase database migration and seeding...");

  const query = `
    -- 1. Add service_id column if not exists
    ALTER TABLE profile_accounts ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services(id) ON DELETE SET NULL;

    -- 2. Deactivate any existing services
    UPDATE services SET is_active = false;

    -- 3. Insert or update the 5 new standard packages
    INSERT INTO services (id, name, description, price, duration_days, is_active, requires_manual_assignment, instructions)
    VALUES
      ('11111111-1111-1111-1111-111111111111', '7 Days Plan', '7-day access to browser profile with high-speed residential proxies.', 99.00, 7, true, true, 'Import profile to IXBrowser and start using.'),
      ('22222222-2222-2222-2222-222222222222', '30 Days Plan', '30-day access to browser profile with premium residential proxies.', 299.00, 30, true, true, 'Import profile to IXBrowser and start using.'),
      ('33333333-3333-3333-3333-333333333333', '3 Months Plan', '90-day access to browser profile with premium residential proxies.', 799.00, 90, true, true, 'Import profile to IXBrowser and start using.'),
      ('44444444-4444-4444-4444-444444444444', '6 Months Plan', '180-day access to browser profile with premium residential proxies.', 1499.00, 180, true, true, 'Import profile to IXBrowser and start using.'),
      ('55555555-5555-5555-5555-555555555555', '12 Months Plan', '360-day access to browser profile with premium residential proxies.', 2990.00, 360, true, true, 'Import profile to IXBrowser and start using.')
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      price = EXCLUDED.price,
      duration_days = EXCLUDED.duration_days,
      is_active = EXCLUDED.is_active,
      instructions = EXCLUDED.instructions;
  `;

  const { error } = await supabase.rpc('exec_sql', { query });

  if (error) {
    console.error("Migration failed:", error.message);
    process.exit(1);
  } else {
    console.log("Migration and seeding completed successfully!");
  }
}

main();

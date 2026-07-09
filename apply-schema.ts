import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { error } = await supabase.rpc('exec_sql', {
    query: `
      CREATE TABLE IF NOT EXISTS email_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        recipient_email TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT,
        type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'SENT',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_email_logs_type ON email_logs(type);
      CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at);
    `
  });

  if (error) {
    console.log("RPC exec_sql failed or not found. Trying raw postgres if applicable, but usually RPC is needed. Error:", error.message);
  } else {
    console.log("Successfully created email_logs table.");
  }
}

main();

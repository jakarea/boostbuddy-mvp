import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST() {
  try {
    const supabase = await createAdminClient();

    // Fix the users_role_check constraint to allow EMPLOYEE role
    const sql = `
      -- Drop old constraint that only allowed ADMIN and CLIENT
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

      -- Add new constraint that allows ADMIN, CLIENT, and EMPLOYEE
      ALTER TABLE users ADD CONSTRAINT users_role_check
        CHECK (role IN ('ADMIN', 'CLIENT', 'EMPLOYEE'));
    `;

    // Execute the SQL using Supabase RPC
    const { data, error } = await supabase.rpc('exec_sql', { sql });

    if (error) {
      console.error('SQL execution failed:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'users_role_check constraint updated to allow EMPLOYEE role'
    });

  } catch (error: any) {
    console.error('Constraint fix failed:', error);
    return NextResponse.json({
      error: error.message
    }, { status: 500 });
  }
}
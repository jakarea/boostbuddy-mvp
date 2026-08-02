// Quick script to fix the employee role constraint using node-postgresql
const { Client } = require('pg');

// Get database URL from environment or construct it
const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';

const client = new Client({
  connectionString: dbUrl,
});

async function fixConstraint() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Drop old constraint
    console.log('Dropping old users_role_check constraint...');
    await client.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;');
    console.log('✅ Old constraint dropped');

    // Add new constraint
    console.log('Adding new users_role_check constraint with EMPLOYEE support...');
    await client.query("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN ('ADMIN', 'CLIENT', 'EMPLOYEE'));");
    console.log('✅ New constraint added');

    // Verify the fix
    console.log('Verifying the fix...');
    const result = await client.query(`
      SELECT 
        constraint_name, 
        check_clause 
      FROM 
        information_schema.table_constraints 
      JOIN 
        information_schema.check_constraints 
      ON 
        table_constraints.constraint_name = check_constraints.constraint_name
      WHERE 
        table_name = 'users' 
        AND constraint_schema = 'public'
    `);
    
    console.log('Current constraints on users table:', result.rows);
    console.log('🎉 Constraint fix completed successfully!');

  } catch (error) {
    console.error('❌ Error fixing constraint:', error.message);
  } finally {
    await client.end();
  }
}

fixConstraint();

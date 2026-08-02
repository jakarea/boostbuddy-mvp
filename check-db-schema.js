// Check database schema
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'prisma', 'dev.db');
const db = new Database(dbPath);

try {
  // Get all tables
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
  console.log('Tables in database:', tables.map(t => t.name));

  // Check if users table exists
  const hasUsers = tables.some(t => t.name === 'users');
  console.log('Has users table:', hasUsers);

  if (!hasUsers) {
    console.log('USERS TABLE MISSING - this is the issue!');
  } else {
    // Get some user data
    const users = db.prepare('SELECT COUNT(*) as count FROM users').get();
    console.log('Total users:', users.count);
  }

} catch (error) {
  console.error('Database error:', error.message);
} finally {
  db.close();
}
// Quick script to check users in database
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'prisma', 'dev.db');
const db = new Database(dbPath);

try {
  // Check total users
  const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get();
  console.log('Total users:', totalUsers.count);

  // Check users by role
  const clientUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'CLIENT'").get();
  console.log('CLIENT users:', clientUsers.count);

  // Get sample users
  const users = db.prepare('SELECT id, name, email, role, credits_balance FROM users LIMIT 5').all();
  console.log('Sample users:', JSON.stringify(users, null, 2));

} catch (error) {
  console.error('Database error:', error.message);
} finally {
  db.close();
}
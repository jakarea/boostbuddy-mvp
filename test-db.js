const sqlite3 = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'prisma', 'dev.db');
const db = new sqlite3(dbPath);

try {
  const users = db.prepare('SELECT id, email, name, role, status FROM users').all();
  console.log('Total users:', users.length);
  if (users.length > 0) {
    console.log('Sample user:', users[0]);
  }
} catch (error) {
  console.error('Error:', error.message);
} finally {
  db.close();
}

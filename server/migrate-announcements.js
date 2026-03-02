import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'notemind.db');

console.log('🔄 Migrating announcements table...');

try {
  const db = new Database(DB_PATH);
  
  // Check current columns
  const columns = db.prepare("PRAGMA table_info(announcements)").all();
  const columnNames = columns.map(c => c.name);
  
  console.log('Current columns:', columnNames.join(', '));
  
  // Add new columns if they don't exist
  const migrations = [
    { name: 'target_audience', sql: "ALTER TABLE announcements ADD COLUMN target_audience TEXT DEFAULT 'registered'" },
    { name: 'dismissible', sql: "ALTER TABLE announcements ADD COLUMN dismissible INTEGER DEFAULT 1" },
    { name: 'auto_dismiss_days', sql: "ALTER TABLE announcements ADD COLUMN auto_dismiss_days INTEGER" },
    { name: 'link_url', sql: "ALTER TABLE announcements ADD COLUMN link_url TEXT" },
    { name: 'link_text', sql: "ALTER TABLE announcements ADD COLUMN link_text TEXT" },
    { name: 'priority', sql: "ALTER TABLE announcements ADD COLUMN priority INTEGER DEFAULT 0" }
  ];
  
  migrations.forEach(({ name, sql }) => {
    if (!columnNames.includes(name)) {
      console.log(`  ➕ Adding column: ${name}`);
      db.exec(sql);
    } else {
      console.log(`  ✓ Column exists: ${name}`);
    }
  });
  
  // Create new indexes
  db.exec("CREATE INDEX IF NOT EXISTS idx_announcements_priority ON announcements(priority DESC, created_at DESC)");
  console.log('  ✓ Created priority index');
  
  db.close();
  console.log('✅ Migration completed successfully!');
  console.log('🔄 Please restart your server for changes to take effect.');
  
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}

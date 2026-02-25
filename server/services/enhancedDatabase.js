import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../data/notemind.db');

/**
 * Initialize enhanced database tables for all features
 * - Chat History
 * - Favorites/Bookmarks
 * - Document Tags
 * - Search Index
 * - Analytics
 * - Shared Documents
 * - Flashcard Metrics (Spaced Repetition)
 * - User Preferences
 */
export function initializeEnhancedTables() {
  try {
    const db = new Database(DB_PATH);

    console.log('[Database] Creating enhanced feature tables...');

    // ── Conversations (Chat History) ─────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        title TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        is_archived BOOLEAN DEFAULT 0,
        FOREIGN KEY(document_id) REFERENCES documents(id),
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE INDEX IF NOT EXISTS idx_conversations_document_user 
      ON conversations(document_id, user_id);
      
      CREATE INDEX IF NOT EXISTS idx_conversations_user 
      ON conversations(user_id, updated_at DESC);
    `);
    console.log('  ✓ Conversations table created');

    // ── Conversation Messages (Chat History Detail) ──────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS conversation_messages (
        id TEXT PRIMARY KEY,
        conversation_id TEXT NOT NULL,
        role TEXT NOT NULL,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_conv_messages_conversation 
      ON conversation_messages(conversation_id, created_at);
    `);
    console.log('  ✓ Conversation messages table created');

    // ── Favorites (Bookmarks) ────────────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS favorites (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        document_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE,
        UNIQUE(user_id, document_id)
      );

      CREATE INDEX IF NOT EXISTS idx_favorites_user 
      ON favorites(user_id, created_at DESC);
    `);
    console.log('  ✓ Favorites table created');

    // ── Tags ─────────────────────────────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        color TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        UNIQUE(user_id, name)
      );

      CREATE INDEX IF NOT EXISTS idx_tags_user 
      ON tags(user_id);
    `);
    console.log('  ✓ Tags table created');

    // ── Document Tags (Junction Table) ───────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS document_tags (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE,
        FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE,
        UNIQUE(document_id, tag_id)
      );

      CREATE INDEX IF NOT EXISTS idx_doc_tags_document 
      ON document_tags(document_id);
      
      CREATE INDEX IF NOT EXISTS idx_doc_tags_tag 
      ON document_tags(tag_id);
    `);
    console.log('  ✓ Document tags junction table created');

    // ── Search Index ─────────────────────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS search_index (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        content_type TEXT,
        searchable_text TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE INDEX IF NOT EXISTS idx_search_user 
      ON search_index(user_id);
      
      CREATE INDEX IF NOT EXISTS idx_search_type 
      ON search_index(content_type);
    `);
    console.log('  ✓ Search index table created');

    // ── Analytics Log ────────────────────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS analytics_logs (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        document_id TEXT,
        action TEXT NOT NULL,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE SET NULL
      );

      CREATE INDEX IF NOT EXISTS idx_analytics_user_date 
      ON analytics_logs(user_id, created_at DESC);
      
      CREATE INDEX IF NOT EXISTS idx_analytics_action 
      ON analytics_logs(action);
    `);
    console.log('  ✓ Analytics logs table created');

    // ── Shared Documents ─────────────────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS shared_documents (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        owner_id INTEGER NOT NULL,
        share_token TEXT UNIQUE,
        share_type TEXT DEFAULT 'view',
        expires_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE,
        FOREIGN KEY(owner_id) REFERENCES users(id)
      );

      CREATE INDEX IF NOT EXISTS idx_shared_owner 
      ON shared_documents(owner_id);
      
      CREATE INDEX IF NOT EXISTS idx_shared_token 
      ON shared_documents(share_token);
    `);
    console.log('  ✓ Shared documents table created');

    // ── Shared Document Access Log ───────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS shared_access_logs (
        id TEXT PRIMARY KEY,
        shared_document_id TEXT NOT NULL,
        accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ip_address TEXT,
        user_agent TEXT,
        FOREIGN KEY(shared_document_id) REFERENCES shared_documents(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_access_logs_shared 
      ON shared_access_logs(shared_document_id);
    `);
    console.log('  ✓ Shared access logs table created');

    // ── Flashcard Metrics (Spaced Repetition) ────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS flashcard_metrics (
        id TEXT PRIMARY KEY,
        flashcard_id TEXT NOT NULL,
        user_id INTEGER NOT NULL,
        document_id TEXT NOT NULL,
        ease_factor REAL DEFAULT 2.5,
        interval INTEGER DEFAULT 1,
        repetitions INTEGER DEFAULT 0,
        next_review_date DATETIME,
        last_review_date DATETIME,
        difficulty_level TEXT DEFAULT 'normal',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(document_id) REFERENCES documents(id) ON DELETE CASCADE,
        UNIQUE(flashcard_id, user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_flashcard_metrics_user 
      ON flashcard_metrics(user_id);
      
      CREATE INDEX IF NOT EXISTS idx_flashcard_metrics_next_review 
      ON flashcard_metrics(user_id, next_review_date);
      
      CREATE INDEX IF NOT EXISTS idx_flashcard_metrics_document 
      ON flashcard_metrics(document_id, next_review_date);
    `);
    console.log('  ✓ Flashcard metrics table created');

    // ── Flashcard Review History ─────────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS flashcard_reviews (
        id TEXT PRIMARY KEY,
        flashcard_metric_id TEXT NOT NULL,
        quality_grade INTEGER,
        time_elapsed_ms INTEGER,
        reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(flashcard_metric_id) REFERENCES flashcard_metrics(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_reviews_metric 
      ON flashcard_reviews(flashcard_metric_id);
      
      CREATE INDEX IF NOT EXISTS idx_reviews_date 
      ON flashcard_reviews(reviewed_at DESC);
    `);
    console.log('  ✓ Flashcard reviews table created');

    // ── User Preferences ─────────────────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS user_preferences (
        id TEXT PRIMARY KEY,
        user_id INTEGER UNIQUE NOT NULL,
        offline_sync_enabled BOOLEAN DEFAULT 1,
        auto_save_enabled BOOLEAN DEFAULT 1,
        notification_enabled BOOLEAN DEFAULT 1,
        theme TEXT DEFAULT 'light',
        language TEXT DEFAULT 'en',
        spaced_repetition_enabled BOOLEAN DEFAULT 1,
        daily_goal_cards INTEGER DEFAULT 20,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE INDEX IF NOT EXISTS idx_preferences_user 
      ON user_preferences(user_id);
    `);
    console.log('  ✓ User preferences table created');

    // ── Sync Queue (for offline sync) ────────────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        action TEXT NOT NULL,
        data TEXT,
        synced_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE INDEX IF NOT EXISTS idx_sync_queue_user_synced 
      ON sync_queue(user_id, synced_at);
    `);
    console.log('  ✓ Sync queue table created');

    // ── Learning Paths (AI Recommendations) ──────────────────
    db.exec(`
      CREATE TABLE IF NOT EXISTS learning_paths (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        document_ids TEXT,
        estimated_hours REAL,
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
      );

      CREATE INDEX IF NOT EXISTS idx_learning_paths_user 
      ON learning_paths(user_id);
    `);
    console.log('  ✓ Learning paths table created');

    console.log('[Database] ✓ All enhanced tables initialized');
    db.close();
    return true;

  } catch (error) {
    console.error('[Database] Error creating enhanced tables:', error.message);
    return false;
  }
}

export default {
  initializeEnhancedTables
};

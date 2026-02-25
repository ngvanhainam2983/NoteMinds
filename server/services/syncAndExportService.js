import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import PDFDocument from 'pdfkit';
import { createCanvas } from 'canvas';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../data/notemind.db');
const EXPORTS_DIR = path.join(__dirname, '../exports');

// Ensure exports directory exists
if (!fs.existsSync(EXPORTS_DIR)) {
  fs.mkdirSync(EXPORTS_DIR, { recursive: true });
}

/**
 * Offline Sync Service - Queue changes for sync when online
 */

export function queueSyncAction(userId, entityType, entityId, action, data) {
  try {
    const db = new Database(DB_PATH);

    db.prepare(`
      INSERT INTO sync_queue (id, user_id, entity_type, entity_id, action, data)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), userId, entityType, entityId, action, JSON.stringify(data) || null);

    db.close();
    return { success: true };
  } catch (error) {
    console.error('[Offline Sync] Error queuing:', error.message);
    return { success: false };
  }
}

export function getPendingSyncActions(userId) {
  try {
    const db = new Database(DB_PATH);

    const pendingActions = db.prepare(`
      SELECT id, entity_type, entity_id, action, data, created_at
      FROM sync_queue
      WHERE user_id = ? AND synced_at IS NULL
      ORDER BY created_at ASC
      LIMIT 100
    `).all(userId);

    db.close();
    return pendingActions;
  } catch (error) {
    console.error('[Offline Sync] Error getting pending:', error.message);
    return [];
  }
}

export function markSynced(syncQueueId) {
  try {
    const db = new Database(DB_PATH);

    db.prepare(`
      UPDATE sync_queue SET synced_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(syncQueueId);

    db.close();
    return { success: true };
  } catch (error) {
    console.error('[Offline Sync] Error marking synced:', error.message);
    return { success: false };
  }
}

// Map frontend preference keys to actual DB column names
const PREFERENCE_KEY_MAP = {
  'notifications': 'notification_enabled',
  'notification_enabled': 'notification_enabled',
  'offlineSync': 'offline_sync_enabled',
  'offlineModeEnabled': 'offline_sync_enabled',
  'offline_sync_enabled': 'offline_sync_enabled',
  'autoSave': 'auto_save_enabled',
  'auto_save_enabled': 'auto_save_enabled',
  'theme': 'theme',
  'language': 'language',
  'spacedRepetition': 'spaced_repetition_enabled',
  'spaced_repetition_enabled': 'spaced_repetition_enabled',
  'dailyGoalCards': 'daily_goal_cards',
  'daily_goal_cards': 'daily_goal_cards',
  'emailUpdates': 'email_updates',
};

const VALID_PREFERENCE_COLUMNS = new Set(Object.values(PREFERENCE_KEY_MAP));

export function setUserPreference(userId, key, value) {
  try {
    const column = PREFERENCE_KEY_MAP[key];
    if (!column) {
      console.error(`[Preferences] Unknown preference key: "${key}"`);
      return { success: false, error: `Unknown preference key: ${key}` };
    }

    const db = new Database(DB_PATH);

    const exists = db.prepare(`
      SELECT id FROM user_preferences WHERE user_id = ?
    `).get(userId);

    if (exists) {
      db.prepare(`
        UPDATE user_preferences SET ${column} = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?
      `).run(value, userId);
    } else {
      db.prepare(`
        INSERT INTO user_preferences (id, user_id, ${column})
        VALUES (?, ?, ?)
      `).run(uuidv4(), userId, value);
    }

    db.close();
    return { success: true };
  } catch (error) {
    console.error('[Preferences] Error setting:', error.message);
    return { success: false };
  }
}

export function getUserPreferences(userId) {
  try {
    const db = new Database(DB_PATH);

    let prefs = db.prepare(`
      SELECT * FROM user_preferences WHERE user_id = ?
    `).get(userId);

    if (!prefs) {
      const prefId = uuidv4();
      db.prepare(`
        INSERT INTO user_preferences (id, user_id)
        VALUES (?, ?)
      `).run(prefId, userId);

      prefs = db.prepare(`
        SELECT * FROM user_preferences WHERE user_id = ?
      `).get(userId);
    }

    db.close();

    // Map DB column names to frontend-friendly keys
    if (prefs) {
      prefs.offlineModeEnabled = !!prefs.offline_sync_enabled;
      prefs.notifications = !!prefs.notification_enabled;
      prefs.emailUpdates = !!prefs.email_updates;
      prefs.autoSave = !!prefs.auto_save_enabled;
      prefs.spacedRepetition = !!prefs.spaced_repetition_enabled;
      prefs.dailyGoalCards = prefs.daily_goal_cards;
    }

    return prefs;
  } catch (error) {
    console.error('[Preferences] Error getting:', error.message);
    return null;
  }
}

/**
 * Export Service - Export mindmaps, flashcards, conversations
 */

export function exportFlashcardsAsCSV(documentId, userId) {
  try {
    const db = new Database(DB_PATH);

    const flashcards = db.prepare(`
      SELECT fc.id, fc.front, fc.back,
             fm.ease_factor, fm.interval, fm.repetitions, fm.next_review_date
      FROM flashcards fc
      LEFT JOIN flashcard_metrics fm ON fc.id = fm.flashcard_id AND fm.user_id = ?
      WHERE fc.document_id = ?
      ORDER BY fc.created_at ASC
    `).all(userId, documentId);

    db.close();

    // Create CSV
    let csv = 'Front,Back,EaseFactor,Interval,Repetitions,NextReview\n';
    for (const card of flashcards) {
      csv += `"${card.front.replace(/"/g, '""')}","${card.back.replace(/"/g, '""')}",${card.ease_factor},${card.interval},${card.repetitions},"${card.next_review_date || ''}"\n`;
    }

    const filename = `flashcards-${documentId}-${Date.now()}.csv`;
    const filepath = path.join(EXPORTS_DIR, filename);

    fs.writeFileSync(filepath, csv);

    return {
      success: true,
      filename,
      filepath
    };
  } catch (error) {
    console.error('[Export] Error exporting CSV:', error.message);
    return { success: false, error: error.message };
  }
}

export function exportConversationAsPDF(conversationId) {
  try {
    const db = new Database(DB_PATH);

    const conversation = db.prepare(`
      SELECT * FROM conversations WHERE id = ?
    `).get(conversationId);

    const messages = db.prepare(`
      SELECT role, message, created_at FROM conversation_messages
      WHERE conversation_id = ?
      ORDER BY created_at ASC
    `).all(conversationId);

    db.close();

    // Create PDF
    const doc = new PDFDocument();
    const filename = `conversation-${conversationId}-${Date.now()}.pdf`;
    const filepath = path.join(EXPORTS_DIR, filename);
    const stream = fs.createWriteStream(filepath);

    doc.pipe(stream);

    doc.fontSize(20).text(conversation.title || 'Conversation', { align: 'center' });
    doc.fontSize(10).text(`Created: ${conversation.created_at}`, { align: 'center' });
    doc.moveDown();

    for (const msg of messages) {
      const isUser = msg.role === 'user';
      doc.fontSize(11).font(isUser ? 'Helvetica-Bold' : 'Helvetica');
      doc.text(`${isUser ? 'You' : 'Assistant'}: ${msg.message}`);
      doc.fontSize(9).fillColor('gray').text(msg.created_at);
      doc.fillColor('black');
      doc.moveDown(0.5);
    }

    doc.end();

    return new Promise((resolve) => {
      stream.on('finish', () => {
        resolve({
          success: true,
          filename,
          filepath
        });
      });
    });
  } catch (error) {
    console.error('[Export] Error exporting PDF:', error.message);
    return { success: false, error: error.message };
  }
}

export function exportMindmapAsImage(mindmapData, documentId) {
  try {
    // Create canvas
    const width = 1200;
    const height = 800;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Draw background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    // Draw mindmap (simplified visualization)
    ctx.fillStyle = '#333333';
    ctx.font = '16px Arial';
    ctx.fillText('Mindmap Export', 50, 50);

    // Save as PNG
    const filename = `mindmap-${documentId}-${Date.now()}.png`;
    const filepath = path.join(EXPORTS_DIR, filename);
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(filepath, buffer);

    return {
      success: true,
      filename,
      filepath
    };
  } catch (error) {
    console.error('[Export] Error exporting image:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * AI Recommendations Service - Suggest learning paths based on usage
 */

export function generateLearningPath(userId) {
  try {
    const db = new Database(DB_PATH);

    // Get user's documents by interaction count
    const recentDocuments = db.prepare(`
      SELECT document_id, COUNT(*) as interactions
      FROM analytics_logs
      WHERE user_id = ? AND document_id IS NOT NULL
        AND created_at >= datetime('now', '-30 days')
      GROUP BY document_id
      ORDER BY interactions DESC
      LIMIT 5
    `).all(userId);

    // Get documents with same tags
    let relatedDocs = [];
    try {
      relatedDocs = db.prepare(`
        SELECT DISTINCT d.id, d.file_path, d.original_name,
               COUNT(DISTINCT dt.tag_id) as shared_tags
        FROM documents d
        JOIN document_tags dt ON d.id = dt.document_id
        JOIN document_tags user_dt ON user_dt.tag_id = dt.tag_id
        JOIN tags t ON t.id = user_dt.tag_id AND t.user_id = ?
        WHERE d.user_id = ? AND d.deleted_at IS NULL
        GROUP BY d.id
        ORDER BY shared_tags DESC
        LIMIT 5
      `).all(userId, userId);
    } catch (e) {
      // tags/document_tags may be empty
    }

    let recommendedDocs = recentDocuments
      .map(d => d.document_id)
      .filter(Boolean)
      .concat(relatedDocs.map(d => d.id));

    // Remove duplicates
    recommendedDocs = [...new Set(recommendedDocs)];

    // Fallback: if no docs found from analytics/tags, include all user documents
    if (recommendedDocs.length === 0) {
      const allDocs = db.prepare(`
        SELECT id, original_name FROM documents
        WHERE user_id = ? AND deleted_at IS NULL
        ORDER BY updated_at DESC
        LIMIT 10
      `).all(userId);
      recommendedDocs = allDocs.map(d => d.id);
    }

    // Get document names for a better path title
    let pathName = 'Lộ trình học tập';
    let pathDescription = 'Lộ trình được AI đề xuất dựa trên hoạt động học tập của bạn';
    if (recommendedDocs.length > 0) {
      const placeholders = recommendedDocs.slice(0, 3).map(() => '?').join(',');
      const docNames = db.prepare(`
        SELECT original_name FROM documents WHERE id IN (${placeholders})
      `).all(...recommendedDocs.slice(0, 3));
      const names = docNames.map(d => d.original_name).filter(Boolean);
      if (names.length > 0) {
        pathName = `Lộ trình: ${names.slice(0, 2).join(', ')}${names.length > 2 ? '...' : ''}`;
      }
      pathDescription = `${recommendedDocs.length} tài liệu được đề xuất dựa trên hoạt động của bạn`;
    }

    // Estimate: ~1 day per 2 documents
    const estimatedDays = Math.max(1, Math.ceil(recommendedDocs.length / 2));
    const estimatedHours = estimatedDays * 2;

    const pathId = uuidv4();
    db.prepare(`
      INSERT INTO learning_paths (id, user_id, name, description, document_ids, estimated_hours)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      pathId,
      userId,
      pathName,
      pathDescription,
      JSON.stringify(recommendedDocs),
      estimatedHours
    );

    db.close();

    return {
      success: true,
      pathId,
      documentCount: recommendedDocs.length,
      estimatedDays
    };
  } catch (error) {
    console.error('[AI] Error generating path:', error.message);
    return { success: false, error: error.message };
  }
}

export function getLearningPaths(userId) {
  try {
    const db = new Database(DB_PATH);

    const paths = db.prepare(`
      SELECT id, name, description, document_ids, estimated_hours, 
             completed_at, created_at, updated_at
      FROM learning_paths
      WHERE user_id = ?
      ORDER BY updated_at DESC
    `).all(userId);

    const result = paths.map(p => {
      const docIds = JSON.parse(p.document_ids || '[]');
      const totalCount = docIds.length;
      const completedCount = db.prepare(`
        SELECT COUNT(*) as cnt FROM learning_path_progress
        WHERE path_id = ? AND completed_at IS NOT NULL
      `).get(p.id)?.cnt || 0;

      return {
        ...p,
        title: p.name,
        completed: !!p.completed_at,
        estimatedDays: p.estimated_hours ? Math.max(1, Math.ceil(p.estimated_hours / 2)) : null,
        documentIds: docIds,
        totalCount,
        completedCount
      };
    });

    db.close();
    return result;
  } catch (error) {
    console.error('[AI] Error getting paths:', error.message);
    return [];
  }
}

export function markPathCompleted(pathId) {
  try {
    const db = new Database(DB_PATH);

    db.prepare(`
      UPDATE learning_paths 
      SET completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(pathId);

    db.close();
    return { success: true };
  } catch (error) {
    console.error('[AI] Error marking completed:', error.message);
    return { success: false };
  }
}

export function getSuggestedDocuments(userId, limit = 5) {
  try {
    const db = new Database(DB_PATH);

    // Suggest documents with similar tags to user's favorites
    const suggestions = db.prepare(`
      SELECT DISTINCT d.id, d.file_path,
             COUNT(DISTINCT shared_tags.tag_id) as relevance_score
      FROM documents d
      LEFT JOIN document_tags shared_tags ON d.id = shared_tags.document_id
      WHERE d.user_id = ? 
        AND d.id NOT IN (
          SELECT document_id FROM favorites WHERE user_id = ?
        )
        AND d.id IN (
          SELECT document_id FROM document_tags
          WHERE tag_id IN (
            SELECT DISTINCT t.id FROM tags t
            JOIN document_tags dt ON t.id = dt.tag_id
            JOIN favorites f ON f.document_id = dt.document_id
            WHERE t.user_id = ?
          )
        )
      GROUP BY d.id
      ORDER BY relevance_score DESC
      LIMIT ?
    `).all(userId, userId, userId, limit);

    db.close();
    return suggestions;
  } catch (error) {
    console.error('[AI] Error getting suggestions:', error.message);
    return [];
  }
}

export function getLearningPathDetails(pathId) {
  try {
    const db = new Database(DB_PATH);

    const path = db.prepare(`
      SELECT id, name, description, document_ids, estimated_hours,
             completed_at, created_at, updated_at
      FROM learning_paths WHERE id = ?
    `).get(pathId);

    if (!path) {
      db.close();
      return null;
    }

    const docIds = JSON.parse(path.document_ids || '[]');

    // Get document details
    let documents = [];
    if (docIds.length > 0) {
      const placeholders = docIds.map(() => '?').join(',');
      const docs = db.prepare(`
        SELECT id, original_name, file_path, status, text_length, deleted_at
        FROM documents WHERE id IN (${placeholders})
      `).all(...docIds);

      // Get completion status for each doc
      const progress = db.prepare(`
        SELECT document_id, completed_at FROM learning_path_progress
        WHERE path_id = ?
      `).all(pathId);
      const progressMap = {};
      progress.forEach(p => { progressMap[p.document_id] = p.completed_at; });

      // Maintain order from document_ids array
      const docMap = {};
      docs.forEach(d => { docMap[d.id] = d; });
      documents = docIds.map(id => {
        const doc = docMap[id];
        if (!doc) return null;
        return {
          id: doc.id,
          name: doc.original_name || doc.file_path || 'Tài liệu không tên',
          status: doc.status,
          textLength: doc.text_length,
          isDeleted: !!doc.deleted_at,
          completed: !!progressMap[doc.id]
        };
      }).filter(Boolean);
    }

    const completedCount = documents.filter(d => d.completed).length;

    db.close();
    return {
      id: path.id,
      title: path.name,
      description: path.description,
      estimatedDays: path.estimated_hours ? Math.max(1, Math.ceil(path.estimated_hours / 2)) : null,
      completed: !!path.completed_at,
      documents,
      totalCount: documents.length,
      completedCount
    };
  } catch (error) {
    console.error('[AI] Error getting path details:', error.message);
    return null;
  }
}

export function togglePathDocumentCompletion(pathId, documentId) {
  try {
    const db = new Database(DB_PATH);

    const existing = db.prepare(`
      SELECT id, completed_at FROM learning_path_progress
      WHERE path_id = ? AND document_id = ?
    `).get(pathId, documentId);

    let completed;
    if (existing) {
      if (existing.completed_at) {
        // Unmark as completed
        db.prepare(`
          UPDATE learning_path_progress SET completed_at = NULL WHERE id = ?
        `).run(existing.id);
        completed = false;
      } else {
        // Mark as completed
        db.prepare(`
          UPDATE learning_path_progress SET completed_at = CURRENT_TIMESTAMP WHERE id = ?
        `).run(existing.id);
        completed = true;
      }
    } else {
      // Create new progress entry as completed
      db.prepare(`
        INSERT INTO learning_path_progress (id, path_id, document_id, completed_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `).run(uuidv4(), pathId, documentId);
      completed = true;
    }

    // Check if all documents are completed
    const path = db.prepare('SELECT document_ids FROM learning_paths WHERE id = ?').get(pathId);
    const docIds = JSON.parse(path?.document_ids || '[]');
    const completedCount = db.prepare(`
      SELECT COUNT(*) as cnt FROM learning_path_progress
      WHERE path_id = ? AND completed_at IS NOT NULL
    `).get(pathId)?.cnt || 0;

    // Auto-mark path as completed if all docs done
    if (completedCount >= docIds.length && docIds.length > 0) {
      db.prepare(`
        UPDATE learning_paths SET completed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND completed_at IS NULL
      `).run(pathId);
    } else {
      db.prepare(`
        UPDATE learning_paths SET completed_at = NULL, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(pathId);
    }

    db.close();
    return { success: true, completed, completedCount, totalCount: docIds.length };
  } catch (error) {
    console.error('[AI] Error toggling document:', error.message);
    return { success: false };
  }
}

export function deleteLearningPath(pathId) {
  try {
    const db = new Database(DB_PATH);
    // Progress entries cascade-delete via FK
    db.prepare('DELETE FROM learning_path_progress WHERE path_id = ?').run(pathId);
    db.prepare('DELETE FROM learning_paths WHERE id = ?').run(pathId);
    db.close();
    return { success: true };
  } catch (error) {
    console.error('[AI] Error deleting path:', error.message);
    return { success: false };
  }
}

export default {
  // Offline Sync
  queueSyncAction,
  getPendingSyncActions,
  markSynced,
  setUserPreference,
  getUserPreferences,
  // Export
  exportFlashcardsAsCSV,
  exportConversationAsPDF,
  exportMindmapAsImage,
  // AI Recommendations
  generateLearningPath,
  getLearningPaths,
  getLearningPathDetails,
  markPathCompleted,
  togglePathDocumentCompletion,
  deleteLearningPath,
  getSuggestedDocuments
};

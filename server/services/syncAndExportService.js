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

export function setUserPreference(userId, key, value) {
  try {
    const db = new Database(DB_PATH);

    const exists = db.prepare(`
      SELECT id FROM user_preferences WHERE user_id = ?
    `).get(userId);

    if (exists) {
      db.prepare(`
        UPDATE user_preferences SET ${key} = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?
      `).run(value, userId);
    } else {
      db.prepare(`
        INSERT INTO user_preferences (id, user_id, ${key})
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
      WHERE user_id = ? AND created_at >= datetime('now', '-30 days')
      GROUP BY document_id
      ORDER BY interactions DESC
      LIMIT 5
    `).all(userId);

    // Get user's tags for topic clustering
    const tags = db.prepare(`
      SELECT name FROM tags WHERE user_id = ?
    `).all(userId);

    // Get documents with same tags
    const relatedDocs = db.prepare(`
      SELECT DISTINCT d.id, d.file_path,
             COUNT(DISTINCT dt.tag_id) as shared_tags
      FROM documents d
      JOIN document_tags dt ON d.id = dt.document_id
      JOIN document_tags user_dt ON user_dt.tag_id = dt.tag_id
      JOIN tags t ON t.id = user_dt.tag_id AND t.user_id = ?
      WHERE d.user_id = ? AND d.id NOT IN (
        SELECT document_id FROM analytics_logs WHERE user_id = ? AND created_at >= datetime('now', '-30 days')
      )
      GROUP BY d.id
      ORDER BY shared_tags DESC
      LIMIT 5
    `).all(userId, userId, userId);

    const pathId = uuidv4();
    const recommendedDocs = recentDocuments.map(d => d.document_id).concat(relatedDocs.map(d => d.id));

    // Estimate hours (simple heuristic: 1 hour per 10KB)
    const totalSize = recommendedDocs.length * 50; // rough estimate
    const estimatedHours = Math.ceil(totalSize / 100);

    db.prepare(`
      INSERT INTO learning_paths (id, user_id, name, description, document_ids, estimated_hours)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      pathId,
      userId,
      'Recommended Learning Path',
      'AI-generated path based on your learning activity',
      JSON.stringify(recommendedDocs),
      estimatedHours
    );

    db.close();

    return {
      success: true,
      pathId,
      documentCount: recommendedDocs.length,
      estimatedHours,
      relatedDocuments: relatedDocs
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

    db.close();

    return paths.map(p => ({
      ...p,
      documentIds: JSON.parse(p.document_ids)
    }));
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
  markPathCompleted,
  getSuggestedDocuments
};

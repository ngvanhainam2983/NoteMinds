import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { requireAuth, requireAdmin } from '../services/authService.js';
import * as featureService from '../services/featureService.js';
import * as advancedFeatureService from '../services/advancedFeatureService.js';
import * as syncExportService from '../services/syncAndExportService.js';
import { logger, logAnalytic } from '../services/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../data/notemind.db');

const router = express.Router();

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// CONVERSATIONS (Chat History)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

router.get('/conversations/:documentId', requireAuth, (req, res) => {
  try {
    const conversations = featureService.getConversations(req.user.id, req.params.documentId);
    logAnalytic(req.user.id, 'get_conversations', req.params.documentId);
    res.json({ conversations });
  } catch (error) {
    logger.error('Error getting conversations:', { error: error.message });
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

router.get('/conversations/:documentId/history', requireAuth, (req, res) => {
  try {
    const conversations = featureService.getConversations(req.user.id, req.params.documentId);

    const conversationsWithMessages = conversations.map(conv => ({
      ...conv,
      messageCount: featureService.getConversationMessages(conv.id).length
    }));

    logAnalytic(req.user.id, 'view_chat_history', req.params.documentId);
    res.json({ conversations: conversationsWithMessages });
  } catch (error) {
    logger.error('Error getting conversation history:', { error: error.message });
    res.status(500).json({ error: 'Failed to load chat history' });
  }
});

router.get('/conversation/:conversationId', requireAuth, (req, res) => {
  try {
    const messages = featureService.getConversationMessages(req.params.conversationId);
    res.json({ messages });
  } catch (error) {
    logger.error('Error getting conversation messages:', { error: error.message });
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

router.post('/conversation/save', requireAuth, (req, res) => {
  try {
    const { documentId, messages, title } = req.body;
    const result = featureService.saveConversation(req.user.id, documentId, messages, title);

    if (result.success) {
      logAnalytic(req.user.id, 'save_conversation', documentId, { messageCount: messages.length });
      res.json({ conversationId: result.conversationId });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    logger.error('Error saving conversation:', { error: error.message });
    res.status(500).json({ error: 'Failed to save conversation' });
  }
});

router.post('/conversation/:conversationId/message', requireAuth, (req, res) => {
  try {
    const { role, message } = req.body;
    const result = featureService.addMessageToConversation(req.params.conversationId, role, message);

    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    logger.error('Error adding message:', { error: error.message });
    res.status(500).json({ error: 'Failed to add message' });
  }
});

router.delete('/conversation/:conversationId', requireAuth, (req, res) => {
  try {
    const result = featureService.deleteConversation(req.params.conversationId);
    logAnalytic(req.user.id, 'delete_conversation');
    res.json(result);
  } catch (error) {
    logger.error('Error deleting conversation:', { error: error.message });
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// FAVORITES
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

router.post('/favorites/:documentId', requireAuth, (req, res) => {
  try {
    const result = featureService.addFavorite(req.user.id, req.params.documentId);
    logAnalytic(req.user.id, 'add_favorite', req.params.documentId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add favorite' });
  }
});

router.delete('/favorites/:documentId', requireAuth, (req, res) => {
  try {
    const result = featureService.removeFavorite(req.user.id, req.params.documentId);
    logAnalytic(req.user.id, 'remove_favorite', req.params.documentId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove favorite' });
  }
});

router.get('/favorites', requireAuth, (req, res) => {
  try {
    const favorites = featureService.getFavorites(req.user.id);
    logAnalytic(req.user.id, 'view_favorites');
    res.json({ favorites });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get favorites' });
  }
});

router.get('/favorites/:documentId/check', requireAuth, (req, res) => {
  try {
    const isFav = featureService.isFavorite(req.user.id, req.params.documentId);
    res.json({ isFavorite: isFav });
  } catch (error) {
    res.status(500).json({ error: 'Failed to check favorite' });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// TAGS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

router.post('/tags', requireAuth, (req, res) => {
  try {
    const { name, color } = req.body;
    const result = featureService.createTag(req.user.id, name, color);
    logAnalytic(req.user.id, 'create_tag', null, { tagName: name });
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create tag' });
  }
});

router.post('/documents/:documentId/tags/:tagId', requireAuth, (req, res) => {
  try {
    const result = featureService.addTagToDocument(req.params.documentId, req.params.tagId);
    logAnalytic(req.user.id, 'add_tag', req.params.documentId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add tag' });
  }
});

router.delete('/documents/:documentId/tags/:tagId', requireAuth, (req, res) => {
  try {
    const result = featureService.removeTagFromDocument(req.params.documentId, req.params.tagId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove tag' });
  }
});

router.get('/documents/:documentId/tags', requireAuth, (req, res) => {
  try {
    const tags = featureService.getDocumentTags(req.params.documentId);
    res.json({ tags });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get tags' });
  }
});

router.get('/tags', requireAuth, (req, res) => {
  try {
    const tags = featureService.getUserTags(req.user.id);
    res.json({ tags });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get tags' });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SEARCH
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

router.get('/search', requireAuth, (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    const query = q || '';
    const results = advancedFeatureService.searchDocuments(req.user.id, query, parseInt(limit));
    const conversations = advancedFeatureService.searchConversations(req.user.id, query, parseInt(limit));

    logAnalytic(req.user.id, 'search', null, { query });
    res.json({ documents: results, conversations });
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// ANALYTICS
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

router.get('/analytics', requireAuth, (req, res) => {
  try {
    const { days = 7 } = req.query;
    const analytics = featureService.getUserAnalytics(req.user.id, parseInt(days));
    res.json(analytics);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SHARING
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

router.post('/share/:documentId', requireAuth, (req, res) => {
  try {
    const { shareType = 'view', expiresIn } = req.body;
    const result = advancedFeatureService.createShareLink(
      req.params.documentId,
      req.user.id,
      shareType,
      expiresIn
    );

    if (result.success) {
      logAnalytic(req.user.id, 'create_share', req.params.documentId);
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create share link' });
  }
});

router.get('/shared/:shareToken', (req, res) => {
  try {
    const share = advancedFeatureService.validateShareToken(req.params.shareToken);
    if (share) {
      res.json({
        valid: true,
        documentId: share.document_id,
        shareType: share.share_type,
        documentName: share.original_name,
        status: share.status,
        textLength: share.text_length,
        expiresAt: share.expires_at
      });
    } else {
      res.status(403).json({ valid: false, error: 'Link chia sáº» khÃ´ng há»£p lá»‡ hoáº·c Ä‘Ã£ háº¿t háº¡n' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to validate share' });
  }
});

router.get('/shares', requireAuth, (req, res) => {
  try {
    const { documentId } = req.query;
    const shares = advancedFeatureService.getSharedDocuments(req.user.id, documentId || null);
    res.json({ shares });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get shares' });
  }
});

router.delete('/shares/:shareId', requireAuth, (req, res) => {
  try {
    const result = advancedFeatureService.deleteShareLink(req.params.shareId);
    logAnalytic(req.user.id, 'delete_share');
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete share' });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// SPACED REPETITION
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

router.get('/flashcards/due', requireAuth, (req, res) => {
  try {
    const { documentId, limit = 20 } = req.query;
    const cards = advancedFeatureService.getDueFlashcards(
      req.user.id,
      documentId,
      parseInt(limit)
    );
    res.json({ dueCards: cards });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get due cards' });
  }
});

router.post('/flashcards/:flashcardId/review', requireAuth, (req, res) => {
  try {
    const { documentId, qualityGrade, timeMs } = req.body;
    const result = advancedFeatureService.updateFlashcardMetrics(
      req.user.id,
      documentId,
      req.params.flashcardId,
      qualityGrade,
      timeMs
    );

    if (result.success) {
      logAnalytic(req.user.id, 'flashcard_review', documentId, { quality: qualityGrade });
    }
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update flashcard' });
  }
});

router.get('/flashcards/stats', requireAuth, (req, res) => {
  try {
    const stats = advancedFeatureService.getFlashcardStats(req.user.id);
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get stats' });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// EXPORT
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

router.post('/export/flashcards/:documentId', requireAuth, (req, res) => {
  try {
    const result = syncExportService.exportFlashcardsAsCSV(req.params.documentId, req.user.id);
    if (result.success) {
      logAnalytic(req.user.id, 'export_flashcards', req.params.documentId);
      res.json(result);
    } else {
      res.status(400).json({ error: result.error });
    }
  } catch (error) {
    res.status(500).json({ error: 'Export failed' });
  }
});

router.post('/export/conversation/:conversationId', requireAuth, (req, res) => {
  try {
    syncExportService.exportConversationAsPDF(req.params.conversationId).then(result => {
      if (result.success) {
        logAnalytic(req.user.id, 'export_conversation');
        res.json(result);
      } else {
        res.status(400).json({ error: result.error });
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Export failed' });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// USER PREFERENCES
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

router.get('/preferences', requireAuth, (req, res) => {
  try {
    const prefs = syncExportService.getUserPreferences(req.user.id);
    res.json(prefs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get preferences' });
  }
});

router.put('/preferences', requireAuth, (req, res) => {
  try {
    const { key, value } = req.body;
    const result = syncExportService.setUserPreference(req.user.id, key, value);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// OFFLINE SYNC
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

router.get('/sync/pending', requireAuth, (req, res) => {
  try {
    const pending = syncExportService.getPendingSyncActions(req.user.id);
    res.json({ pending });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get pending actions' });
  }
});

router.post('/sync/action', requireAuth, (req, res) => {
  try {
    const { entityType, entityId, action, data } = req.body;
    const result = syncExportService.queueSyncAction(req.user.id, entityType, entityId, action, data);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to queue action' });
  }
});

router.post('/sync/mark/:syncId', requireAuth, (req, res) => {
  try {
    const result = syncExportService.markSynced(req.params.syncId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark synced' });
  }
});

// ════════════════════════════════════════════════════════════
// PERSONAL NOTES / ANNOTATIONS
// ════════════════════════════════════════════════════════════

router.get('/documents/:docId/notes', requireAuth, (req, res) => {
  try {
    const db = new Database(DB_PATH);
    const notes = db.prepare('SELECT * FROM document_notes WHERE document_id = ? AND user_id = ? ORDER BY created_at DESC').all(req.params.docId, req.user.id);
    db.close();
    res.json({ notes });
  } catch (error) { res.status(500).json({ error: 'Failed to get notes' }); }
});

router.post('/documents/:docId/notes', requireAuth, (req, res) => {
  try {
    const { content, color } = req.body;
    if (!content) return res.status(400).json({ error: 'Content is required' });
    const id = uuidv4();
    const db = new Database(DB_PATH);
    db.prepare('INSERT INTO document_notes (id, document_id, user_id, content, color) VALUES (?, ?, ?, ?, ?)').run(id, req.params.docId, req.user.id, content, color || '#fbbf24');
    const note = db.prepare('SELECT * FROM document_notes WHERE id = ?').get(id);
    db.close();
    res.json({ note });
  } catch (error) { res.status(500).json({ error: 'Failed to create note' }); }
});

router.put('/notes/:noteId', requireAuth, (req, res) => {
  try {
    const { content, color } = req.body;
    const db = new Database(DB_PATH);
    const existing = db.prepare('SELECT * FROM document_notes WHERE id = ? AND user_id = ?').get(req.params.noteId, req.user.id);
    if (!existing) { db.close(); return res.status(404).json({ error: 'Note not found' }); }
    db.prepare('UPDATE document_notes SET content = COALESCE(?, content), color = COALESCE(?, color), updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(content, color, req.params.noteId);
    const updated = db.prepare('SELECT * FROM document_notes WHERE id = ?').get(req.params.noteId);
    db.close();
    res.json({ note: updated });
  } catch (error) { res.status(500).json({ error: 'Failed to update note' }); }
});

router.delete('/notes/:noteId', requireAuth, (req, res) => {
  try {
    const db = new Database(DB_PATH);
    db.prepare('DELETE FROM document_notes WHERE id = ? AND user_id = ?').run(req.params.noteId, req.user.id);
    db.close();
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Failed to delete note' }); }
});

// ════════════════════════════════════════════════════════════
// COMMUNITY LIKES
// ════════════════════════════════════════════════════════════

router.post('/community/:docId/like', requireAuth, (req, res) => {
  try {
    const db = new Database(DB_PATH);
    try {
      db.prepare('INSERT INTO community_likes (document_id, user_id) VALUES (?, ?)').run(req.params.docId, req.user.id);
    } catch (e) { /* already liked — ignore unique constraint */ }
    const count = db.prepare('SELECT COUNT(*) as count FROM community_likes WHERE document_id = ?').get(req.params.docId);
    db.close();
    res.json({ liked: true, likeCount: count.count });
  } catch (error) { res.status(500).json({ error: 'Failed to like' }); }
});

router.delete('/community/:docId/like', requireAuth, (req, res) => {
  try {
    const db = new Database(DB_PATH);
    db.prepare('DELETE FROM community_likes WHERE document_id = ? AND user_id = ?').run(req.params.docId, req.user.id);
    const count = db.prepare('SELECT COUNT(*) as count FROM community_likes WHERE document_id = ?').get(req.params.docId);
    db.close();
    res.json({ liked: false, likeCount: count.count });
  } catch (error) { res.status(500).json({ error: 'Failed to unlike' }); }
});

router.get('/community/:docId/likes', (req, res) => {
  try {
    const db = new Database(DB_PATH);
    const count = db.prepare('SELECT COUNT(*) as count FROM community_likes WHERE document_id = ?').get(req.params.docId);
    let userLiked = false;
    // Check if user logged in has liked
    if (req.headers.authorization) {
      try {
        // Simple extraction — the actual auth check is in middleware
        const { optionalAuth } = require('../services/authService.js');
      } catch (e) {}
    }
    db.close();
    res.json({ likeCount: count.count });
  } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

// ════════════════════════════════════════════════════════════
// COMMUNITY COMMENTS
// ════════════════════════════════════════════════════════════

router.get('/community/:docId/comments', (req, res) => {
  try {
    const db = new Database(DB_PATH);
    const comments = db.prepare(`
      SELECT c.*, u.display_name as author, u.username, u.avatar_url as author_avatar
      FROM community_comments c
      JOIN users u ON c.user_id = u.id
      WHERE c.document_id = ?
      ORDER BY c.created_at DESC
      LIMIT 50
    `).all(req.params.docId);
    db.close();
    res.json({ comments });
  } catch (error) { res.status(500).json({ error: 'Failed to get comments' }); }
});

router.post('/community/:docId/comments', requireAuth, (req, res) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ error: 'Nội dung không được để trống' });
    const id = uuidv4();
    const db = new Database(DB_PATH);
    db.prepare('INSERT INTO community_comments (id, document_id, user_id, content) VALUES (?, ?, ?, ?)').run(id, req.params.docId, req.user.id, content.trim());
    const comment = db.prepare(`
      SELECT c.*, u.display_name as author, u.username, u.avatar_url as author_avatar
      FROM community_comments c JOIN users u ON c.user_id = u.id WHERE c.id = ?
    `).get(id);
    db.close();
    res.json({ comment });
  } catch (error) { res.status(500).json({ error: 'Failed to post comment' }); }
});

router.delete('/community/comments/:commentId', requireAuth, (req, res) => {
  try {
    const db = new Database(DB_PATH);
    // Allow author or admin to delete
    const comment = db.prepare('SELECT * FROM community_comments WHERE id = ?').get(req.params.commentId);
    if (!comment) { db.close(); return res.status(404).json({ error: 'Comment not found' }); }
    if (comment.user_id !== req.user.id && req.user.role !== 'admin') {
      db.close(); return res.status(403).json({ error: 'Not authorized' });
    }
    db.prepare('DELETE FROM community_comments WHERE id = ?').run(req.params.commentId);
    db.close();
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Failed to delete comment' }); }
});

// ════════════════════════════════════════════════════════════
// LEARNING GOALS + STREAKS
// ════════════════════════════════════════════════════════════

router.get('/goals', requireAuth, (req, res) => {
  try {
    const db = new Database(DB_PATH);
    let goals = db.prepare('SELECT * FROM user_goals WHERE user_id = ?').get(req.user.id);
    if (!goals) {
      db.prepare('INSERT INTO user_goals (user_id) VALUES (?)').run(req.user.id);
      goals = db.prepare('SELECT * FROM user_goals WHERE user_id = ?').get(req.user.id);
    }
    let streak = db.prepare('SELECT * FROM user_streaks WHERE user_id = ?').get(req.user.id);
    if (!streak) {
      db.prepare('INSERT INTO user_streaks (user_id) VALUES (?)').run(req.user.id);
      streak = db.prepare('SELECT * FROM user_streaks WHERE user_id = ?').get(req.user.id);
    }
    const today = new Date().toISOString().split('T')[0];
    let todayActivity = db.prepare('SELECT * FROM daily_activity WHERE user_id = ? AND activity_date = ?').get(req.user.id, today);
    if (!todayActivity) todayActivity = { flashcards_reviewed: 0, quizzes_completed: 0, documents_uploaded: 0, chat_messages: 0, study_minutes: 0 };
    db.close();
    res.json({ goals, streak, todayActivity });
  } catch (error) { res.status(500).json({ error: 'Failed to get goals' }); }
});

router.put('/goals', requireAuth, (req, res) => {
  try {
    const { daily_flashcards, daily_quizzes, daily_documents } = req.body;
    const db = new Database(DB_PATH);
    db.prepare(`INSERT INTO user_goals (user_id, daily_flashcards, daily_quizzes, daily_documents, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET daily_flashcards=excluded.daily_flashcards, daily_quizzes=excluded.daily_quizzes, daily_documents=excluded.daily_documents, updated_at=CURRENT_TIMESTAMP
    `).run(req.user.id, daily_flashcards || 20, daily_quizzes || 3, daily_documents || 2);
    const goals = db.prepare('SELECT * FROM user_goals WHERE user_id = ?').get(req.user.id);
    db.close();
    res.json({ goals });
  } catch (error) { res.status(500).json({ error: 'Failed to update goals' }); }
});

router.post('/activity/track', requireAuth, (req, res) => {
  try {
    const { type } = req.body; // 'flashcard' | 'quiz' | 'document' | 'chat' | 'study_minutes'
    const today = new Date().toISOString().split('T')[0];
    const db = new Database(DB_PATH);

    // Upsert daily activity
    db.prepare(`INSERT INTO daily_activity (user_id, activity_date) VALUES (?, ?)
      ON CONFLICT(user_id, activity_date) DO NOTHING`).run(req.user.id, today);

    const colMap = { flashcard: 'flashcards_reviewed', quiz: 'quizzes_completed', document: 'documents_uploaded', chat: 'chat_messages', study_minutes: 'study_minutes' };
    const col = colMap[type];
    if (col) {
      db.prepare(`UPDATE daily_activity SET ${col} = ${col} + 1 WHERE user_id = ? AND activity_date = ?`).run(req.user.id, today);
    }

    // Update streak
    let streak = db.prepare('SELECT * FROM user_streaks WHERE user_id = ?').get(req.user.id);
    if (!streak) {
      db.prepare('INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_activity_date) VALUES (?, 1, 1, ?)').run(req.user.id, today);
    } else {
      const lastDate = streak.last_activity_date;
      if (lastDate !== today) {
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        let newStreak = lastDate === yesterday ? streak.current_streak + 1 : 1;
        const longest = Math.max(newStreak, streak.longest_streak);
        db.prepare('UPDATE user_streaks SET current_streak = ?, longest_streak = ?, last_activity_date = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?').run(newStreak, longest, today, req.user.id);
      }
    }

    const activity = db.prepare('SELECT * FROM daily_activity WHERE user_id = ? AND activity_date = ?').get(req.user.id, today);
    const updatedStreak = db.prepare('SELECT * FROM user_streaks WHERE user_id = ?').get(req.user.id);
    db.close();
    res.json({ activity, streak: updatedStreak });
  } catch (error) { res.status(500).json({ error: 'Failed to track activity' }); }
});

router.get('/activity/history', requireAuth, (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const db = new Database(DB_PATH);
    const history = db.prepare(`SELECT * FROM daily_activity WHERE user_id = ? AND activity_date >= date('now', ?) ORDER BY activity_date DESC`).all(req.user.id, `-${days} days`);
    db.close();
    res.json({ history });
  } catch (error) { res.status(500).json({ error: 'Failed to get activity history' }); }
});

// ════════════════════════════════════════════════════════════
// LEADERBOARD
// ════════════════════════════════════════════════════════════

router.get('/leaderboard', (req, res) => {
  try {
    const period = req.query.period || 'all'; // 'week' | 'month' | 'all'
    const db = new Database(DB_PATH);

    let dateFilter = '';
    if (period === 'week') dateFilter = "AND da.activity_date >= date('now', '-7 days')";
    else if (period === 'month') dateFilter = "AND da.activity_date >= date('now', '-30 days')";

    const leaderboard = db.prepare(`
      SELECT u.id, u.display_name, u.username, u.avatar_url, u.plan,
        COALESCE(SUM(da.flashcards_reviewed), 0) as total_flashcards,
        COALESCE(SUM(da.quizzes_completed), 0) as total_quizzes,
        COALESCE(SUM(da.documents_uploaded), 0) as total_documents,
        COALESCE(SUM(da.flashcards_reviewed + da.quizzes_completed * 5 + da.documents_uploaded * 10 + da.chat_messages), 0) as total_score,
        COALESCE(s.current_streak, 0) as current_streak,
        COALESCE(s.longest_streak, 0) as longest_streak
      FROM users u
      LEFT JOIN daily_activity da ON u.id = da.user_id ${dateFilter}
      LEFT JOIN user_streaks s ON u.id = s.user_id
      WHERE u.is_banned = 0
      GROUP BY u.id
      HAVING total_score > 0
      ORDER BY total_score DESC
      LIMIT 50
    `).all();
    db.close();
    res.json({ leaderboard });
  } catch (error) { res.status(500).json({ error: 'Failed to get leaderboard' }); }
});

// ════════════════════════════════════════════════════════════
// ANNOUNCEMENTS
// ════════════════════════════════════════════════════════════

router.get('/announcements', (req, res) => {
  try {
    const db = new Database(DB_PATH);
    const announcements = db.prepare(`
      SELECT a.*, u.display_name as author_name
      FROM announcements a
      JOIN users u ON a.created_by = u.id
      WHERE a.is_active = 1 AND (a.expires_at IS NULL OR a.expires_at > datetime('now'))
      ORDER BY a.created_at DESC
      LIMIT 10
    `).all();
    db.close();
    res.json({ announcements });
  } catch (error) { res.status(500).json({ error: 'Failed to get announcements' }); }
});

router.post('/announcements', requireAuth, requireAdmin, (req, res) => {
  try {
    const { title, content, type, expires_at } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content required' });
    const id = uuidv4();
    const db = new Database(DB_PATH);
    db.prepare('INSERT INTO announcements (id, title, content, type, created_by, expires_at) VALUES (?, ?, ?, ?, ?, ?)').run(id, title, content, type || 'info', req.user.id, expires_at || null);
    // Audit log
    db.prepare('INSERT INTO admin_audit_logs (id, admin_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?, ?)').run(uuidv4(), req.user.id, 'create_announcement', 'announcement', id, JSON.stringify({ title }));
    const announcement = db.prepare('SELECT a.*, u.display_name as author_name FROM announcements a JOIN users u ON a.created_by = u.id WHERE a.id = ?').get(id);
    db.close();
    res.json({ announcement });
  } catch (error) { res.status(500).json({ error: 'Failed to create announcement' }); }
});

router.put('/announcements/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const { title, content, type, is_active, expires_at } = req.body;
    const db = new Database(DB_PATH);
    db.prepare('UPDATE announcements SET title=COALESCE(?,title), content=COALESCE(?,content), type=COALESCE(?,type), is_active=COALESCE(?,is_active), expires_at=COALESCE(?,expires_at) WHERE id = ?').run(title, content, type, is_active, expires_at, req.params.id);
    db.prepare('INSERT INTO admin_audit_logs (id, admin_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?, ?)').run(uuidv4(), req.user.id, 'update_announcement', 'announcement', req.params.id, JSON.stringify({ title }));
    const updated = db.prepare('SELECT a.*, u.display_name as author_name FROM announcements a JOIN users u ON a.created_by = u.id WHERE a.id = ?').get(req.params.id);
    db.close();
    res.json({ announcement: updated });
  } catch (error) { res.status(500).json({ error: 'Failed to update announcement' }); }
});

router.delete('/announcements/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const db = new Database(DB_PATH);
    db.prepare('INSERT INTO admin_audit_logs (id, admin_id, action, target_type, target_id) VALUES (?, ?, ?, ?, ?)').run(uuidv4(), req.user.id, 'delete_announcement', 'announcement', req.params.id);
    db.prepare('DELETE FROM announcements WHERE id = ?').run(req.params.id);
    db.close();
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Failed to delete announcement' }); }
});

router.post('/announcements/:id/read', requireAuth, (req, res) => {
  try {
    const db = new Database(DB_PATH);
    db.prepare('INSERT OR IGNORE INTO announcement_reads (user_id, announcement_id) VALUES (?, ?)').run(req.user.id, req.params.id);
    db.close();
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

// ════════════════════════════════════════════════════════════
// ADMIN: STATS DASHBOARD
// ════════════════════════════════════════════════════════════

router.get('/admin/stats', requireAuth, requireAdmin, (req, res) => {
  try {
    const db = new Database(DB_PATH);
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
    const newUsersToday = db.prepare("SELECT COUNT(*) as count FROM users WHERE created_at >= date('now')").get().count;
    const newUsersWeek = db.prepare("SELECT COUNT(*) as count FROM users WHERE created_at >= date('now', '-7 days')").get().count;
    const totalDocuments = db.prepare('SELECT COUNT(*) as count FROM documents').get().count;
    const activeDocuments = db.prepare("SELECT COUNT(*) as count FROM documents WHERE status = 'ready'").get().count;
    const publicDocuments = db.prepare('SELECT COUNT(*) as count FROM documents WHERE is_public = 1').get().count;
    const totalUploadsToday = db.prepare("SELECT COUNT(*) as count FROM upload_logs WHERE uploaded_at >= date('now')").get().count;
    const totalComments = db.prepare('SELECT COUNT(*) as count FROM community_comments').get().count;
    const totalLikes = db.prepare('SELECT COUNT(*) as count FROM community_likes').get().count;

    // Plan distribution
    const planDist = db.prepare("SELECT plan, COUNT(*) as count FROM users GROUP BY plan").all();

    // User registration trend (last 30 days)
    const regTrend = db.prepare(`
      SELECT date(created_at) as day, COUNT(*) as count
      FROM users WHERE created_at >= date('now', '-30 days')
      GROUP BY date(created_at) ORDER BY day ASC
    `).all();

    // Top active users (last 7 days)
    const topUsers = db.prepare(`
      SELECT u.id, u.display_name, u.username, u.plan,
        COALESCE(SUM(da.flashcards_reviewed + da.quizzes_completed + da.documents_uploaded + da.chat_messages), 0) as activity_score
      FROM users u
      LEFT JOIN daily_activity da ON u.id = da.user_id AND da.activity_date >= date('now', '-7 days')
      GROUP BY u.id ORDER BY activity_score DESC LIMIT 10
    `).all();

    db.close();
    res.json({
      totalUsers, newUsersToday, newUsersWeek,
      totalDocuments, activeDocuments, publicDocuments,
      totalUploadsToday, totalComments, totalLikes,
      planDistribution: planDist, registrationTrend: regTrend, topUsers
    });
  } catch (error) { res.status(500).json({ error: 'Failed to get admin stats' }); }
});

// ════════════════════════════════════════════════════════════
// ADMIN: DOCUMENT MANAGEMENT
// ════════════════════════════════════════════════════════════

router.get('/admin/documents', requireAuth, requireAdmin, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const search = req.query.search || '';
    const filter = req.query.filter || 'all'; // 'all' | 'public' | 'deleted'
    const offset = (page - 1) * limit;
    const db = new Database(DB_PATH);

    let where = '1=1';
    const params = [];
    if (search) { where += ' AND d.original_name LIKE ?'; params.push(`%${search}%`); }
    if (filter === 'public') { where += ' AND d.is_public = 1'; }
    if (filter === 'deleted') { where += ' AND d.deleted_at IS NOT NULL'; }

    const total = db.prepare(`SELECT COUNT(*) as count FROM documents d WHERE ${where}`).get(...params).count;
    const docs = db.prepare(`
      SELECT d.*, u.display_name as owner_name, u.username as owner_username,
        (SELECT COUNT(*) FROM community_likes WHERE document_id = d.id) as like_count,
        (SELECT COUNT(*) FROM community_comments WHERE document_id = d.id) as comment_count
      FROM documents d
      LEFT JOIN users u ON d.user_id = u.id
      WHERE ${where}
      ORDER BY d.created_at DESC LIMIT ? OFFSET ?
    `).all(...params, limit, offset);
    db.close();
    res.json({ documents: docs, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) { res.status(500).json({ error: 'Failed to get documents' }); }
});

router.delete('/admin/documents/:docId', requireAuth, requireAdmin, (req, res) => {
  try {
    const db = new Database(DB_PATH);
    db.prepare('INSERT INTO admin_audit_logs (id, admin_id, action, target_type, target_id) VALUES (?, ?, ?, ?, ?)').run(uuidv4(), req.user.id, 'delete_document', 'document', req.params.docId);
    db.prepare("UPDATE documents SET deleted_at = CURRENT_TIMESTAMP, is_public = 0 WHERE id = ?").run(req.params.docId);
    db.close();
    res.json({ success: true });
  } catch (error) { res.status(500).json({ error: 'Failed to delete document' }); }
});

router.put('/admin/documents/:docId/toggle-public', requireAuth, requireAdmin, (req, res) => {
  try {
    const db = new Database(DB_PATH);
    const doc = db.prepare('SELECT is_public FROM documents WHERE id = ?').get(req.params.docId);
    if (!doc) { db.close(); return res.status(404).json({ error: 'Not found' }); }
    const newPublic = doc.is_public ? 0 : 1;
    db.prepare('UPDATE documents SET is_public = ? WHERE id = ?').run(newPublic, req.params.docId);
    db.prepare('INSERT INTO admin_audit_logs (id, admin_id, action, target_type, target_id, details) VALUES (?, ?, ?, ?, ?, ?)').run(uuidv4(), req.user.id, newPublic ? 'make_public' : 'make_private', 'document', req.params.docId, '{}');
    db.close();
    res.json({ success: true, is_public: !!newPublic });
  } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

// ════════════════════════════════════════════════════════════
// ADMIN: AUDIT LOG
// ════════════════════════════════════════════════════════════

router.get('/admin/audit-logs', requireAuth, requireAdmin, (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;
    const db = new Database(DB_PATH);
    const total = db.prepare('SELECT COUNT(*) as count FROM admin_audit_logs').get().count;
    const logs = db.prepare(`
      SELECT a.*, u.display_name as admin_name, u.username as admin_username
      FROM admin_audit_logs a
      JOIN users u ON a.admin_id = u.id
      ORDER BY a.created_at DESC LIMIT ? OFFSET ?
    `).all(limit, offset);
    db.close();
    res.json({ logs, total, page, totalPages: Math.ceil(total / limit) });
  } catch (error) { res.status(500).json({ error: 'Failed to get audit logs' }); }
});

// ════════════════════════════════════════════════════════════
// EXPORT: MARKDOWN / SUMMARY
// ════════════════════════════════════════════════════════════

router.get('/export/markdown/:docId', requireAuth, (req, res) => {
  try {
    const db = new Database(DB_PATH);
    const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.docId);
    if (!doc) { db.close(); return res.status(404).json({ error: 'Document not found' }); }

    // Gather all sessions
    const sessions = {};
    const rows = db.prepare('SELECT session_type, data FROM document_sessions WHERE document_id = ?').all(req.params.docId);
    for (const row of rows) {
      try { sessions[row.session_type] = JSON.parse(row.data); } catch (e) {}
    }

    // Build markdown
    let md = `# ${doc.original_name}\n\n`;
    md += `> Exported from NoteMinds on ${new Date().toLocaleDateString('vi-VN')}\n\n`;

    // Mindmap
    if (sessions.mindmap) {
      md += `## 🗺️ Sơ đồ tư duy\n\n`;
      if (sessions.mindmap.title) md += `**${sessions.mindmap.title}**\n\n`;
      if (sessions.mindmap.data?.nodes) {
        sessions.mindmap.data.nodes.forEach(n => {
          if (n.data?.label) md += `- ${n.data.label}\n`;
        });
        md += '\n';
      }
    }

    // Flashcards
    if (sessions.flashcards?.data) {
      md += `## 📝 Flashcards (${sessions.flashcards.data.length} thẻ)\n\n`;
      sessions.flashcards.data.forEach((card, i) => {
        md += `### Thẻ ${i + 1}\n`;
        md += `**Q:** ${card.front}\n\n`;
        md += `**A:** ${card.back}\n\n---\n\n`;
      });
    }

    // Quiz
    if (sessions.quiz?.data) {
      md += `## 🧠 Quiz (${sessions.quiz.data.length} câu)\n\n`;
      sessions.quiz.data.forEach((q, i) => {
        md += `**${i + 1}. ${q.question}**\n`;
        if (q.options) q.options.forEach((o, j) => {
          const letter = String.fromCharCode(65 + j);
          md += `  ${letter}. ${o}${j === q.correctAnswer ? ' ✓' : ''}\n`;
        });
        if (q.explanation) md += `\n_Giải thích: ${q.explanation}_\n`;
        md += '\n';
      });
    }

    // Notes
    const notes = db.prepare('SELECT * FROM document_notes WHERE document_id = ? ORDER BY created_at').all(req.params.docId);
    if (notes.length > 0) {
      md += `## 📌 Ghi chú cá nhân\n\n`;
      notes.forEach(n => md += `- ${n.content}\n`);
      md += '\n';
    }

    db.close();
    res.json({ markdown: md, filename: `${doc.original_name}.md` });
  } catch (error) { res.status(500).json({ error: 'Export failed' }); }
});

export default router;

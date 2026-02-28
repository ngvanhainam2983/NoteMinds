import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { requireAuth } from '../services/authService.js';
import * as featureService from '../services/featureService.js';
import * as advancedFeatureService from '../services/advancedFeatureService.js';
import * as syncExportService from '../services/syncAndExportService.js';
import { logger, logAnalytic } from '../services/logger.js';

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

export default router;


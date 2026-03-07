import express from 'express';
import {
  getUserNotifications, markNotificationAsRead, markAllNotificationsAsRead,
  deleteNotification, deleteAllNotifications, getUnreadCount,
} from '../services/notificationService.js';
import { requireAuth } from '../services/authService.js';

const router = express.Router();

/**
 * GET /api/notifications
 * Get user's notifications with pagination
 */
router.get('/', requireAuth, (req, res) => {
  try {
    const { limit = 20, offset = 0, unreadOnly } = req.query;
    const userId = req.user.id;

    const result = getUserNotifications(userId, {
      limit: Math.min(parseInt(limit) || 20, 100),
      offset: parseInt(offset) || 0,
      unreadOnly: unreadOnly === 'true',
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get count of unread notifications
 */
router.get('/unread-count', requireAuth, (req, res) => {
  try {
    const userId = req.user.id;
    const count = getUnreadCount(userId);
    res.json({ unread_count: count });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark notification as read
 */
router.put('/:id/read', requireAuth, (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = parseInt(req.params.id);

    const success = markNotificationAsRead(notificationId, userId);
    if (!success) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

/**
 * POST /api/notifications/mark-all-read
 * Mark all notifications as read
 */
router.post('/mark-all-read', requireAuth, (req, res) => {
  try {
    const userId = req.user.id;
    const count = markAllNotificationsAsRead(userId);
    res.json({ success: true, marked_count: count });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete('/:id', requireAuth, (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = parseInt(req.params.id);

    const success = deleteNotification(notificationId, userId);
    if (!success) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

/**
 * DELETE /api/notifications
 * Delete all notifications
 */
router.delete('/', requireAuth, (req, res) => {
  try {
    const userId = req.user.id;
    const count = deleteAllNotifications(userId);
    res.json({ success: true, deleted_count: count });
  } catch (error) {
    console.error('Error deleting all notifications:', error);
    res.status(500).json({ error: 'Failed to delete all notifications' });
  }
});

export default router;

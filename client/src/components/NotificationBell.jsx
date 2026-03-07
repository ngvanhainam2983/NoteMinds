import React, { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';

/**
 * Notification icon mapping
 */
const getNotificationIcon = (icon) => {
  const icons = {
    mindmap: '🗺️',
    flashcard: '🎴',
    quiz: '❓',
    summary: '📄',
    share: '📤',
    globe: '🌐',
    trophy: '🏆',
    flame: '🔥',
    lock: '🔒',
    upgrade: '⬆️',
    alert: '⚠️',
    admin: '👨‍💼',
    default: '🔔',
  };
  return icons[icon] || icons.default;
};

/**
 * Single notification item
 */
export function NotificationItem({ notification, onRead, onDelete }) {
  const handleRead = () => {
    if (!notification.is_read) {
      onRead(notification.id);
    }
  };

  const handleDelete = () => {
    onDelete(notification.id);
  };

  const handleClick = () => {
    handleRead();
    if (notification.action_url) {
      window.location.href = notification.action_url;
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`p-3 border-l-4 cursor-pointer transition-colors ${
        notification.is_read
          ? 'bg-gray-50 border-gray-300'
          : 'bg-blue-50 border-blue-500'
      } hover:bg-gray-100`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <span className="text-lg flex-shrink-0">{getNotificationIcon(notification.icon)}</span>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-gray-900">{notification.title}</h4>
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{notification.message}</p>
            <p className="text-xs text-gray-400 mt-1">
              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
            </p>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDelete();
          }}
          className="text-gray-400 hover:text-red-500 flex-shrink-0"
          title="Delete notification"
        >
          ✕
        </button>
      </div>
      {!notification.is_read && (
        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 ml-7"></div>
      )}
    </div>
  );
}

/**
 * Notification bell with dropdown menu
 */
export function NotificationBell({ userId, className = '' }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all'); // 'all' or 'unread'

  const fetchNotifications = useCallback(async (pageNum = 0) => {
    if (!userId) return;

    try {
      setIsLoading(true);
      const unreadOnly = selectedFilter === 'unread';
      const response = await fetch(
        `/api/notifications?limit=15&offset=${pageNum * 15}&unreadOnly=${unreadOnly}`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) throw new Error('Failed to fetch notifications');
      const data = await response.json();

      if (pageNum === 0) {
        setNotifications(data.notifications);
      } else {
        setNotifications((prev) => [...prev, ...data.notifications]);
      }

      setHasMore(data.notifications.length === 15);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, selectedFilter]);

  const fetchUnreadCount = useCallback(async () => {
    if (!userId) return;

    try {
      const response = await fetch('/api/notifications/unread-count', {
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch unread count');
      const data = await response.json();
      setUnreadCount(data.unread_count);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications(0);
    }
  }, [isOpen, selectedFilter]);

  useEffect(() => {
    const interval = setInterval(fetchUnreadCount, 30000); // Poll every 30 seconds
    fetchUnreadCount(); // Initial fetch
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const handleMarkAsRead = async (notificationId) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to mark as read');

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, is_read: 1, read_at: new Date().toISOString() }
            : n
        )
      );

      fetchUnreadCount();
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const handleDelete = async (notificationId) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to delete notification');

      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      fetchUnreadCount();
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to mark all as read');

      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: 1, read_at: new Date().toISOString() }))
      );

      fetchUnreadCount();
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleLoadMore = () => {
    if (hasMore && !isLoading) {
      fetchNotifications(page + 1);
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {Math.min(unreadCount, 99)}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl z-50 max-h-96 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-blue-600 hover:text-blue-800"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Filter */}
          <div className="px-3 pt-3 border-b border-gray-100">
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedFilter('all')}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  selectedFilter === 'all'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setSelectedFilter('unread')}
                className={`px-3 py-1 text-sm rounded-full transition-colors ${
                  selectedFilter === 'unread'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Unread
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                {isLoading ? 'Loading...' : 'No notifications'}
              </div>
            ) : (
              <>
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onRead={handleMarkAsRead}
                    onDelete={handleDelete}
                  />
                ))}
              </>
            )}
          </div>

          {/* Load More Button */}
          {hasMore && notifications.length > 0 && (
            <button
              onClick={handleLoadMore}
              disabled={isLoading}
              className="w-full p-3 border-t border-gray-200 text-center text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Load more'}
            </button>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

export default NotificationBell;

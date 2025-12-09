import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './NotificationBell.css';
import bellIcon from '../assets/images/bell_Icon.png';
import { useAuth } from '../context/AuthContext';
import { getFriendRequests, getNotifications } from '../services/socialService';

const NotificationBell = () => {
  const { accessToken, isAuthenticated, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const formatTimestamp = (dateString) =>
    new Date(dateString).toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

  const normalizeDate = (value) => {
    if (!value) return null;
    if (value?.toDate) {
      const dt = value.toDate();
      return Number.isNaN(dt?.getTime?.()) ? null : dt;
    }
    const dt = new Date(value);
    return Number.isNaN(dt.getTime()) ? null : dt;
  };

  const storageKey = user?.uid ? `notificationReads_${user.uid}` : null;
  const notificationCacheKey = user?.uid ? `notificationCache_${user.uid}` : null;

  const loadStoredReads = useCallback(() => {
    if (!storageKey) return new Map();
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return new Map();
      const obj = JSON.parse(raw);
      return new Map(Object.entries(obj));
    } catch {
      return new Map();
    }
  }, [storageKey]);

  const persistReads = useCallback(
    (readMap) => {
      if (!storageKey) return;
      const obj = {};
      readMap.forEach((value, key) => {
        obj[key] = value;
      });
      localStorage.setItem(storageKey, JSON.stringify(obj));
    },
    [storageKey]
  );

  const loadStoredNotifications = useCallback(() => {
    if (!notificationCacheKey) return [];
    try {
      const raw = localStorage.getItem(notificationCacheKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.map((n) => ({
        ...n,
        receivedAt: n.receivedAt ? new Date(n.receivedAt) : new Date(),
        read: !!n.read,
      }));
    } catch {
      return [];
    }
  }, [notificationCacheKey]);

  const persistNotifications = useCallback(
    (items) => {
      if (!notificationCacheKey) return;
      const serializable = items.map((n) => ({
        ...n,
        receivedAt: n.receivedAt instanceof Date ? n.receivedAt.toISOString() : n.receivedAt,
      }));
      localStorage.setItem(notificationCacheKey, JSON.stringify(serializable));
    },
    [notificationCacheKey]
  );

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const unreadNotifications = useMemo(
    () => notifications.filter((n) => !n.read),
    [notifications]
  );

  const readNotifications = useMemo(
    () => notifications.filter((n) => n.read),
    [notifications]
  );

  const fetchFriendRequests = useCallback(async () => {
    if (!accessToken || !user?.uid) return;
    setLoading(true);
    setError('');
    try {
      const [requestsData, notificationsData] = await Promise.all([
        getFriendRequests('received', accessToken),
        getNotifications(accessToken),
      ]);
      const apiRequests = requestsData?.requests || [];
      const apiNotifications = notificationsData?.notifications || [];

      setNotifications((prev) => {
        const prevReadMap = new Map(prev.map((n) => [n.id, n.read]));
        const storedReads = loadStoredReads();
        const storedNotifications = loadStoredNotifications();
        const storedById = new Map(storedNotifications.map((n) => [n.id, n]));

        const mappedRequests = apiRequests.map((req) => {
          const receivedAt =
            normalizeDate(req.createdAt) ||
            normalizeDate(req.updatedAt) ||
            new Date();

          return {
            id: `req:${req.id}`,
            type: 'request',
            from:
              req.fromUserName ||
              req.fromUserEmail ||
              req.fromUserId ||
              'New request',
            receivedAt,
            read:
              prevReadMap.get(`req:${req.id}`) ??
              storedReads.get(`req:${req.id}`) ??
              storedById.get(`req:${req.id}`)?.read ??
              false,
          };
        });

        const mappedNotifications = apiNotifications.map((notif) => {
          const receivedAt =
            normalizeDate(notif.createdAt) ||
            normalizeDate(notif.updatedAt) ||
            new Date();

          return {
            id: `notif:${notif.id}`,
            type: notif.type || 'notification',
            from:
              notif.fromUserName ||
              notif.fromUserEmail ||
              notif.fromUserId ||
              'Friend',
            receivedAt,
            read:
              prevReadMap.get(`notif:${notif.id}`) ??
              storedReads.get(`notif:${notif.id}`) ??
              storedById.get(`notif:${notif.id}`)?.read ??
              (notif.read ?? false),
          };
        });

        const merged = [...mappedRequests, ...mappedNotifications].sort(
          (a, b) => b.receivedAt - a.receivedAt
        );

        const mergedReadMap = new Map(storedReads);
        merged.forEach((notif) => {
          mergedReadMap.set(notif.id, notif.read);
        });
        persistReads(mergedReadMap);
        persistNotifications(merged);
        return merged.length ? merged : storedNotifications;
      });
    } catch (err) {
      console.error('Failed to load friend requests', err);
      setError(err.message || 'Failed to load friend requests');
    } finally {
      setLoading(false);
    }
  }, [
    accessToken,
    user?.uid,
    loadStoredReads,
    loadStoredNotifications,
    persistReads,
    persistNotifications,
  ]);

  const toggleOpen = () => {
    if (!isOpen && isAuthenticated) {
      fetchFriendRequests();
    }
    setIsOpen(!isOpen);
  };

  // Prime notifications so the badge shows without needing to open first
  useEffect(() => {
    if (isAuthenticated && accessToken && user?.uid) {
      fetchFriendRequests();
    }
  }, [isAuthenticated, accessToken, user?.uid, fetchFriendRequests]);

  const markAllAsRead = () => {
    setNotifications((prev) => {
      const next = prev.map((notif) => ({ ...notif, read: true }));
      const stored = loadStoredReads();
      next.forEach((notif) => {
        stored.set(notif.id, true);
      });
      persistReads(stored);
      persistNotifications(next);
      return next;
    });
  };

  const setReadStatus = (id, read) => {
    setNotifications((prev) => {
      const next = prev.map((notif) => (notif.id === id ? { ...notif, read } : notif));
      const stored = loadStoredReads();
      stored.set(id, read);
      persistReads(stored);
      persistNotifications(next);
      return next;
    });
  };

  const renderMessage = (notif) => {
    if (notif.type === 'friend_request_accepted') {
      return (
        <div className="notification-text">
          <strong>{notif.from}</strong> accepted your friend request
        </div>
      );
    }
    return (
      <div className="notification-text">
        <strong>{notif.from}</strong> requested to be friends
      </div>
    );
  };

  return (
    <div className="notification-bell">
      <button
        type="button"
        className="notification-bell-button"
        onClick={toggleOpen}
        aria-label="Notifications"
      >
        <img src={bellIcon} alt="Notifications" />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-panel">
          <div className="notification-panel-header">
            <h4>Notifications</h4>
            <span className="notification-panel-subtitle">Friend requests</span>
            {unreadNotifications.length > 0 && (
              <button
                type="button"
                className="notification-mark-read"
                onClick={markAllAsRead}
              >
                Mark all as read
              </button>
            )}
          </div>
          <div className="notification-section">
            <div className="notification-section-title">New</div>
            {error && (
              <div className="notification-empty">Failed to load: {error}</div>
            )}
            {!error && loading && (
              <div className="notification-empty">Loading...</div>
            )}
            {!error && !loading && unreadNotifications.length === 0 ? (
              <div className="notification-empty">
                {isAuthenticated
                  ? 'You have no new notifications.'
                  : 'Sign in to view notifications.'}
              </div>
            ) : null}
            {!error && !loading && unreadNotifications.length > 0 && (
              <ul className="notification-list">
                {unreadNotifications.map((notif) => (
                  <li key={notif.id} className="notification-item">
                    {renderMessage(notif)}
                    <div className="notification-meta-row">
                      <div className="notification-meta">
                        {formatTimestamp(notif.receivedAt)}
                      </div>
                      <button
                        type="button"
                        className="notification-item-action"
                        onClick={() => setReadStatus(notif.id, true)}
                      >
                        Mark as read
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {readNotifications.length > 0 && (
            <div className="notification-section">
              <div className="notification-section-title">Previously read</div>
              <ul className="notification-list">
                {readNotifications.map((notif) => (
                  <li key={notif.id} className="notification-item notification-item-read">
                    {renderMessage(notif)}
                    <div className="notification-meta-row">
                      <div className="notification-meta">
                        {formatTimestamp(notif.receivedAt)}
                      </div>
                      <button
                        type="button"
                        className="notification-item-action"
                        onClick={() => setReadStatus(notif.id, false)}
                      >
                        Mark as unread
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './NotificationBell.css';
import bellIcon from '../assets/images/bell_Icon.png';
import { useAuth } from '../context/AuthContext';
import { getFriendRequests } from '../services/socialService';

const NotificationBell = () => {
  const { accessToken, isAuthenticated } = useAuth();
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
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const data = await getFriendRequests('received', accessToken);
      const apiRequests = data?.requests || [];

      setNotifications((prev) => {
        const prevReadMap = new Map(prev.map((n) => [n.id, n.read]));

        return apiRequests.map((req) => {
          const receivedAt =
            normalizeDate(req.createdAt) ||
            normalizeDate(req.updatedAt) ||
            new Date();

          return {
            id: req.id,
            from:
              req.fromUserName ||
              req.fromUserEmail ||
              req.fromUserId ||
              'New request',
            receivedAt,
            read: prevReadMap.get(req.id) ?? false,
          };
        });
      });
    } catch (err) {
      console.error('Failed to load friend requests', err);
      setError(err.message || 'Failed to load friend requests');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  const toggleOpen = () => {
    if (!isOpen && isAuthenticated) {
      fetchFriendRequests();
    }
    setIsOpen(!isOpen);
  };

  // Prime notifications so the badge shows without needing to open first
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      fetchFriendRequests();
    }
  }, [isAuthenticated, accessToken, fetchFriendRequests]);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((notif) => ({ ...notif, read: true })));
  };

  const setReadStatus = (id, read) => {
    setNotifications((prev) =>
      prev.map((notif) => (notif.id === id ? { ...notif, read } : notif))
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
                    <div className="notification-text">
                      <strong>{notif.from}</strong> requested to be friends
                    </div>
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
                    <div className="notification-text">
                      <strong>{notif.from}</strong> requested to be friends
                    </div>
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

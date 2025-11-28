import React, { useMemo, useState } from 'react';
import './NotificationBell.css';
import bellIcon from '../assets/images/bell_Icon.png';

const seedNotifications = [
  {
    id: 'req-002',
    type: 'friend_request',
    from: 'Priya Patel',
    receivedAt: '2025-11-27T14:10:00Z',
  },
  {
    id: 'req-001',
    type: 'friend_request',
    from: 'Alex Chen',
    receivedAt: '2025-11-26T18:42:00Z',
  },
];

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(seedNotifications);

  const unreadCount = useMemo(() => notifications.length, [notifications]);

  const toggleOpen = () => {
    setIsOpen(!isOpen);
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
          </div>
          {notifications.length === 0 ? (
            <div className="notification-empty">You have no new notifications.</div>
          ) : (
            <ul className="notification-list">
              {notifications.map((notif) => (
                <li key={notif.id} className="notification-item">
                  <div className="notification-text">
                    <strong>{notif.from}</strong> requested to be friends
                  </div>
                  <div className="notification-meta">
                    {new Date(notif.receivedAt).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;

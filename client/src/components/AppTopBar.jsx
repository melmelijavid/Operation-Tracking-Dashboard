import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../auth';
import { fetchMentionNotifications } from '../utils/users';
import DirectMessages from './DirectMessages';

function getNotificationSeenKey(user) {
  return `operation-dashboard-seen-mentions-${user?.id || user?.email || 'guest'}`;
}

function loadSeenNotificationIds(user) {
  try {
    return JSON.parse(localStorage.getItem(getNotificationSeenKey(user)) || '[]');
  } catch (err) {
    return [];
  }
}

function saveSeenNotificationIds(user, ids) {
  localStorage.setItem(getNotificationSeenKey(user), JSON.stringify(ids));
}

function getInitials(user) {
  const name = user?.name || user?.email || 'User';
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

export default function AppTopBar() {
  const { user, role } = useAuth();
  const initials = getInitials(user);
  const [notifications, setNotifications] = useState([]);
  const [notificationError, setNotificationError] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [seenNotificationIds, setSeenNotificationIds] = useState(() => loadSeenNotificationIds(user));

  useEffect(() => {
    setSeenNotificationIds(loadSeenNotificationIds(user));
  }, [user?.id, user?.email]);

  useEffect(() => {
    let isMounted = true;

    async function loadNotifications() {
      try {
        setNotificationError('');
        const mentionNotifications = await fetchMentionNotifications();
        if (isMounted) setNotifications(mentionNotifications);
      } catch (err) {
        if (!isMounted) return;
        setNotificationError('Could not load notifications.');
        setNotifications([]);
      }
    }

    loadNotifications();
    return () => {
      isMounted = false;
    };
  }, []);

  const unseenNotifications = notifications.filter((notification) => (
    !seenNotificationIds.includes(notification.id)
  ));

  function markNotificationsSeen() {
    const nextSeenIds = Array.from(new Set([
      ...seenNotificationIds,
      ...notifications.map((notification) => notification.id),
    ]));
    setSeenNotificationIds(nextSeenIds);
    saveSeenNotificationIds(user, nextSeenIds);
  }

  function closeNotifications() {
    setNotificationsOpen(false);
    setSelectedNotification(null);
  }

  return (
    <>
      <header className="app-topbar">
        <Link to="/welcome" className="app-topbar-brand">
          Operation Dashboard
        </Link>

        {/*<nav className="app-topbar-nav" aria-label="Global navigation">
          <NavLink to="/welcome">Welcome</NavLink>
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/tickets">Tickets</NavLink>
          <NavLink to="/statistics">Analytics</NavLink>
          {role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
        </nav>*/}

        <div className="app-topbar-actions">
          <button
            type="button"
            className="app-topbar-icon app-notification-button"
            aria-label="Notifications"
            onClick={() => {
              markNotificationsSeen();
              setNotificationsOpen(true);
            }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 22a2.5 2.5 0 0 0 2.4-1.8H9.6A2.5 2.5 0 0 0 12 22Zm7-5h-1.2V10a5.8 5.8 0 0 0-4.3-5.6V3a1.5 1.5 0 0 0-3 0v1.4A5.8 5.8 0 0 0 6.2 10v7H5a1 1 0 0 0 0 2h14a1 1 0 1 0 0-2ZM8.2 17v-7a3.8 3.8 0 0 1 7.6 0v7H8.2Z" />
            </svg>
            {unseenNotifications.length > 0 && (
              <span className="app-notification-badge">{unseenNotifications.length}</span>
            )}
          </button>

          <DirectMessages />

          <Link to="/profile" className="app-topbar-icon" aria-label="Settings">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M19.4 13.5c.1-.5.1-1 .1-1.5s0-1-.1-1.5l2-1.5a.8.8 0 0 0 .2-1l-1.9-3.2a.8.8 0 0 0-1-.4l-2.4 1a8.8 8.8 0 0 0-2.6-1.5L13.4 1a.8.8 0 0 0-.8-.7H9.4a.8.8 0 0 0-.8.7l-.4 2.9a8.8 8.8 0 0 0-2.6 1.5l-2.4-1a.8.8 0 0 0-1 .4L.4 8a.8.8 0 0 0 .2 1l2 1.5c-.1.5-.1 1-.1 1.5s0 1 .1 1.5l-2 1.5a.8.8 0 0 0-.2 1l1.9 3.2c.2.4.6.5 1 .4l2.4-1a8.8 8.8 0 0 0 2.6 1.5l.4 2.9c.1.4.4.7.8.7h3.2c.4 0 .7-.3.8-.7l.4-2.9a8.8 8.8 0 0 0 2.6-1.5l2.4 1c.4.2.8 0 1-.4l1.9-3.2a.8.8 0 0 0-.2-1l-2.2-1.5ZM11 15.5A3.5 3.5 0 1 1 11 8a3.5 3.5 0 0 1 0 7.5Z" />
            </svg>
          </Link>

          <Link to="/profile" className="app-topbar-avatar" aria-label="My profile">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt="" />
            ) : (
              <span>{initials}</span>
            )}
          </Link>
        </div>
      </header>

      {(notificationsOpen || selectedNotification) && (
        <div className="app-notification-modal-backdrop" onClick={closeNotifications}>
          <div className="app-notification-modal" onClick={(event) => event.stopPropagation()}>
            <div className="app-notification-modal-header">
              <div>
                <p>Ticket Mentions</p>
                <h2>{selectedNotification ? selectedNotification.ticketId : 'Notifications'}</h2>
              </div>
              <button type="button" onClick={closeNotifications} aria-label="Close notifications">
                x
              </button>
            </div>

            {selectedNotification ? (
              <div className="app-notification-detail">
                <span>From {selectedNotification.authorName}</span>
                <p>{selectedNotification.message}</p>
                <Link to={`/tickets/${encodeURIComponent(selectedNotification.ticketId)}`} onClick={closeNotifications}>
                  Open ticket detail
                </Link>
                <button type="button" onClick={() => setSelectedNotification(null)}>
                  Back to all notifications
                </button>
              </div>
            ) : (
              <div className="app-notification-modal-list">
                {notificationError && <p>{notificationError}</p>}
                {!notificationError && notifications.length === 0 && <p>No ticket mentions yet.</p>}
                {!notificationError && notifications.map((notification) => (
                  <button
                    type="button"
                    key={notification.id}
                    onClick={() => setSelectedNotification(notification)}
                  >
                    <strong>{notification.ticketId}</strong>
                    <span>From {notification.authorName}</span>
                    <p>{notification.message}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

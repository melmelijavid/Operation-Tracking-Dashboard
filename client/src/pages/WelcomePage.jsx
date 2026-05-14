import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import '../styles/welcome.css';
import { fetchMentionNotifications } from '../utils/users';

function QuickCard({ to, icon, label }) {
  const content = (
    <>
      <img src={icon} className="card-icon" alt="" />
      <span>{label}</span>
    </>
  );

  if (to) {
    return <Link to={to} className="card">{content}</Link>;
  }

  return <div className="card">{content}</div>;
}

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

export default function WelcomePage() {
  const { user, role, logout } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [notificationError, setNotificationError] = useState('');
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [seenNotificationIds, setSeenNotificationIds] = useState(() => loadSeenNotificationIds(user));
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });

  useEffect(() => {
    async function loadNotifications() {
      try {
        setNotificationError('');
        const mentionNotifications = await fetchMentionNotifications();
        setNotifications(mentionNotifications);
      } catch (err) {
        setNotificationError('Could not load notifications.');
        setNotifications([]);
      }
    }

    loadNotifications();
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

  return (
    <div className="welcome-page">
      <div className="container">
        <div className="left">
          <img src="/assets/login-welcome/Images/nokia - Copy.svg" className="logo" alt="nokia" />

          <h3>Hello, {user?.name || 'User'}!</h3>
          <p className="subtitle">Role: {role}</p>
          <p className="subtitle">"Welcome back to the Operations Dashboard"</p>

          <div className="menu">
            <p><img src="/assets/login-welcome/Images/tools.png" className="icon" alt="" />Tools</p>
            <p><img src="/assets/login-welcome/Images/project.png" className="icon" alt="" />Projects</p>
            <p><img src="/assets/login-welcome/Images/activiry.png" className="icon" alt="" />Activity</p>
            <p><img src="/assets/login-welcome/Images/insight.png" className="icon" alt="" />Insights</p>
            <p><img src="/assets/login-welcome/Images/statistics.png" className="icon" alt="" />Analytics</p>
            <button
              type="button"
              className="notification-menu-button"
              onClick={() => {
                markNotificationsSeen();
                setNotificationsOpen(true);
              }}
            >
              <img src="/assets/login-welcome/Images/notif.png" className="icon" alt="" />
              Notifications
              {unseenNotifications.length > 0 && <span className="notification-badge">{unseenNotifications.length}</span>}
            </button>
            <div className="theme-mini">
              <img src="/assets/login-welcome/Images/moon.png" alt="moon" />
              <img src="/assets/login-welcome/Images/sun.svg" alt="sun" />
            </div>
            <button type="button" className="logout-btn" onClick={logout}>Logout</button>
          </div>
        </div>

        <div className="center">
          

          <div className="time-pill">
            <span>{time}</span>
            <span>{date}</span>
            <span>14°C</span>
          </div>

          <div className="quick-links">
            <h3>Quick Links</h3>
            <div className="links">
              <QuickCard to="/dashboard" icon="/assets/login-welcome/Images/dashboard.png" label="Dashboard" />
              <QuickCard to="/tickets" icon="/assets/login-welcome/Images/ticket.svg" label="Ticket" />
              <QuickCard icon="/assets/login-welcome/Images/report.svg" label="Reports" />
              <QuickCard to="/statistics" icon="/assets/login-welcome/Images/analytics.svg" label="Analytics" />
              <QuickCard to="/users" icon="/assets/login-welcome/Images/user.svg" label="Users" />
              {role === 'admin' && (
                <QuickCard to="/admin" icon="/assets/login-welcome/Images/setting.svg" label="Admin Panel" />
              )}
              <QuickCard icon="/assets/login-welcome/Images/setting.svg" label="Settings" />
            </div>
          </div>

          <div className="support">
            <h3>24/7 Support</h3>

            <div className="support-row">
              <i className="fa fa-user" aria-hidden="true"></i>
              <span>Melika Javidfar</span>
            </div>

            <div className="support-row">
              <i className="fa fa-envelope" aria-hidden="true"></i>
              <span>melika.javidfar@euvt.com</span>
            </div>

            <div className="support-row">
              <i className="fa fa-phone" aria-hidden="true"></i>
              <span>+40123456789</span>
            </div>

            <div className="chatbot">
              <img src="/assets/login-welcome/Images/chatbot (2).png" className="icon" alt="" />chatbot
            </div>
          </div>
        </div>

        <div className="right">
          <div className="card-box">
            <h3>Upcoming Holidays</h3>
            <p>• Easter Monday</p>
            <p>• Labour Day</p>
          </div>

          <div className="card-box">
            <h3>System Logs</h3>
            <p>- All systems operational</p>
            <p>- No issues detected</p>
            <p>- Performance stable</p>
          </div>

          <div className="card-box">
            <h3>Recent Activity</h3>
            <p>Login from new device (3 hours ago)</p>
            <p>Password updated (2 days ago)</p>
          </div>

          <div className="card-box notification-box">
            <h3>Notifications</h3>

            {notificationError && <p>{notificationError}</p>}

            {!notificationError && notifications.length === 0 && (
              <p>No ticket mentions yet.</p>
            )}

            {!notificationError && notifications.map((notification) => (
              <button
                type="button"
                key={notification.id}
                className="notification-item"
                onClick={() => {
                  markNotificationsSeen();
                  setSelectedNotification(notification);
                }}
              >
                <strong>{notification.ticketId}</strong>
                <p>{notification.message}</p>
                <span>- {notification.authorName}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {(notificationsOpen || selectedNotification) && (
        <div className="notification-modal-backdrop" onClick={() => {
          setNotificationsOpen(false);
          setSelectedNotification(null);
        }}>
          <div className="notification-modal" onClick={(event) => event.stopPropagation()}>
            <div className="notification-modal-header">
              <div>
                <p>Ticket Mentions</p>
                <h2>{selectedNotification ? selectedNotification.ticketId : 'Notifications'}</h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setNotificationsOpen(false);
                  setSelectedNotification(null);
                }}
                aria-label="Close notifications"
              >
                x
              </button>
            </div>

            {selectedNotification ? (
              <div className="notification-detail">
                <span>From {selectedNotification.authorName}</span>
                <p>{selectedNotification.message}</p>
                <Link to={`/tickets/${encodeURIComponent(selectedNotification.ticketId)}`}>
                  Open ticket detail
                </Link>
                <button type="button" onClick={() => setSelectedNotification(null)}>
                  Back to all notifications
                </button>
              </div>
            ) : (
              <div className="notification-modal-list">
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
    </div>
  );
}

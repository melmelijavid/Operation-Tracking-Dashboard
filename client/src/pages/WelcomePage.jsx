import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import '../styles/welcome.css';
import { fetchTickets } from '../utils/tickets';
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
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState('');
  const [holidays, setHolidays] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
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

  useEffect(() => {
  async function loadWeather() {
    try {
      setWeatherError('');

      const response = await fetch(
        'https://api.openweathermap.org/data/2.5/weather?q=Timisoara,RO&units=metric&appid=cb25e7f6307772a63a6088611feeab95'
      );

      const data = await response.json();

      setWeather({
        temp: Math.round(data.main.temp),
        condition: data.weather[0].main,
        icon: data.weather[0].icon,
        city: data.name,
      });
    } catch (err) {
      setWeatherError('Weather unavailable');
    }
  }

  loadWeather();
}, []);
useEffect(() => {
  async function loadRecentActivity() {
    try {
      const tickets = await fetchTickets();

      const userTickets = tickets
        .filter((ticket) =>
          ticket.Owner?.toLowerCase() === user?.name?.toLowerCase()
        )
        .sort(
          (a, b) =>
            new Date(b.lastModifiedDate) - new Date(a.lastModifiedDate)
        )
        .slice(0, 3);

      const activities = userTickets.map((ticket) => ({
        id: ticket.id,
        text: `Created ${ticket.id} (${ticket.priority})`,
      }));

      setRecentActivity([
        {
          id: 'login',
          text: 'Logged in recently',
        },
        ...activities,
      ]);
    } catch (err) {
      setRecentActivity([]);
    }
  }

  if (user) {
    loadRecentActivity();
  }
}, [user]);
useEffect(() => {
  async function loadHolidays() {
    try {
      const response = await fetch(
        'https://date.nager.at/api/v3/NextPublicHolidays/RO'
      );

      const data = await response.json();

      const upcoming = data.slice(0, 3).map((holiday) => {
        const holidayDate = new Date(holiday.date);
        const today = new Date();

        const diffTime = holidayDate - today;
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
          name: holiday.localName,
          daysLeft,
        };
      });

      setHolidays(upcoming);
    } catch (err) {
      console.log('Holiday API failed');
    }
  }

  loadHolidays();
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
            <span className="weather-pill">
  {weather && (
    <>
      <img
        src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
        alt={weather.condition}
      />
      {weather.temp}°C
    </>
  )}</span>
          </div>

          <div className="quick-links">
            <h3>Quick Links</h3>
            <div className="links">
              <QuickCard to="/dashboard" icon="/assets/login-welcome/Images/dashboard.png" label="Dashboard" />
              <QuickCard to="/tickets" icon="/assets/login-welcome/Images/ticket.svg" label="Ticket" />
              <QuickCard icon="/assets/login-welcome/Images/report.svg" label="Reports" />
              <QuickCard to="/statistics" icon="/assets/login-welcome/Images/analytics.svg" label="Analytics" />
              <QuickCard to="/users" icon="/assets/login-welcome/Images/user.svg" label="Users" />
              <QuickCard to="/profile" icon="/assets/login-welcome/Images/user.svg" label="My Profile" />
              {role === 'admin' && (
                <QuickCard to="/admin" icon="/assets/login-welcome/Images/setting.svg" label="Admin Panel" />
              )}
              <QuickCard icon="/assets/login-welcome/Images/setting.svg" label="Settings" />
            </div>
          </div>

          <div className="support">
             <h3>24/7 Support</h3>

            <div className="support-row">
           <i className="support-dot online" aria-hidden="true"></i>
           <span>Online Support Available</span></div>

               <div className="support-row">
                 <i className="support-dot" aria-hidden="true"></i>
                 <span>Melika Javidfar</span></div>

                   <div className="support-row">
                    <i className="support-dot" aria-hidden="true"></i>
                    <span>Operations Support </span></div>

  <div className="support-row">
    <i className="support-dot" aria-hidden="true"></i>
    <span>melika.javidfar@euvt.com</span>
  </div>

  <div className="chatbot">
    <img
      src="/assets/login-welcome/Images/chatbot (2).png"
      className="icon"
      alt=""
    />
        chatbot</div>
       </div>
       </div>
       <div className="right">
          <div className="card-box">
            <h3>Upcoming Holidays</h3>
            {holidays.map((holiday, index) => (
            <li key={index}>
            {holiday.name} in {holiday.daysLeft} days</li>))}
          </div>

          <div className="card-box">
            <h3>System Logs</h3>
            <p>- All systems operational</p>
            <p>- No issues detected</p>
            <p>- Performance stable</p>
          </div>

          <div className="card-box">
            <h3>Recent Activity</h3>
            {recentActivity.map((activity) => (
              <p key={activity.id}>
                • {activity.text}</p>
              ))}
            
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
);}

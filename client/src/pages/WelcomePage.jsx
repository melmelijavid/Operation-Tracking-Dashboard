import {  useEffect, useMemo, useState} from 'react';
import { Link ,useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import '../styles/welcome.css';
import { fetchTickets } from '../utils/tickets';
import {
 FiCheck,
 FiAlertTriangle,
 FiClock,
 FiPlus
} from "react-icons/fi";

function QuickCard({ to, icon, label, className = '' }) {
  const content = (
    <>
      <img src={icon} className="card-icon" alt="" />
      <span>{label}</span>
    </>
  );

  if (to) {
    return <Link to={to} className={`card ${className}`.trim()}>{content}</Link>;
  }

  return <div className={`card ${className}`.trim()}>{content}</div>;
}

export default function WelcomePage() {
  const { user, role, logout } = useAuth();
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState('');
  const [holidays, setHolidays] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [tickets, setTickets] = useState([]);
  const now = new Date();
  const navigate = useNavigate();
  const assigneeAvatars = {
  "Melika Javidfar": "/assets/login-welcome/Images/melika.jpg",
  "Cevher Kemal Sirin":"/assets/login-welcome/Images/cevher.jpg",
  "Vlad Popescu": "/assets/login-welcome/Images/vlad.jpg",
};
  const [displayedMonthDate, setDisplayedMonthDate] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const currentMonth = displayedMonthDate.toLocaleString('default', {
  month: 'long',
});

const currentYear = displayedMonthDate.getFullYear();

const currentDay = (
  currentYear === now.getFullYear() && displayedMonthDate.getMonth() === now.getMonth()
    ? now.getDate()
    : null
);

const firstDayOfMonth = new Date(
  currentYear,
  displayedMonthDate.getMonth(),
  1
).getDay();

const daysInMonth = new Date(
  currentYear,
  displayedMonthDate.getMonth() + 1,
  0
).getDate();

const calendarDays = [];

for (let i = 0; i < firstDayOfMonth; i++) {
  calendarDays.push(null);
}

for (let day = 1; day <= daysInMonth; day++) {
  calendarDays.push(day);
}
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });

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

  humidity: data.main.humidity,

  wind: Math.round(data.wind.speed),

  feelsLike: Math.round(data.main.feels_like),
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
      const ticketData = await fetchTickets();

setTickets(ticketData);

const userTickets = ticketData
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

  time: new Date(ticket.lastModifiedDate)
    .toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),

  title:
ticket.status === "Open"
? `Ticket ${ticket.id} was opened`

: ticket.status === "Pending"
? `Ticket ${ticket.id} is pending`

: ticket.status === "Resolved"
? `Ticket ${ticket.id} was resolved`

: `Ticket ${ticket.id} was updated`,

description:

`Assigned to ${ticket.Assigned_Person}`,

  type: ticket.status.toLowerCase(),

  label: ticket.status.toUpperCase(),
  iconColor:

ticket.status === "Resolved"
? "green"

: ticket.slaUrgency === "overdue"
? "orange"

: ticket.status === "Pending"
? "yellow"

: "blue",

}));

setRecentActivity([

  {

    id: 'login',

    time: time,

    title: 'User logged in',

    description: `${user.name} entered the dashboard`,

    type: 'login',

    label: 'LOGIN',

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

      const upcoming = data.map((holiday) => {
        const holidayDate = new Date(holiday.date);
        const today = new Date();

        const diffTime = holidayDate - today;
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return {
          name: holiday.localName,
          date: holiday.date,
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

  const holidayDayNumbers = new Set(
    holidays
      .map((holiday) => {
        const [holidayYear, holidayMonth, holidayDay] = holiday.date.split('-').map(Number);
        if (holidayYear === currentYear && holidayMonth === displayedMonthDate.getMonth() + 1) {
          return holidayDay;
        }
        return null;
      })
      .filter(Boolean)
  );

  function moveCalendarMonth(direction) {
    setDisplayedMonthDate((current) => (
      new Date(current.getFullYear(), current.getMonth() + direction, 1)
    ));
  }

  function getCalendarDayClass(day) {
    if (!day) return '';

    const classNames = [];
    if (day === currentDay) classNames.push('active-date');
    if (holidayDayNumbers.has(day)) classNames.push('holiday-date');

    return classNames.join(' ');
  }
const topActiveTickets = useMemo(() => {
  function getScore(ticket) {
    let score = 0;

    if (ticket.priority === 'Critical') score += 50;
    else if (ticket.priority === 'High') score += 30;
    else if (ticket.priority === 'Medium') score += 15;

    if (ticket.slaUrgency === 'overdue') score += 50;
    else if (ticket.slaUrgency === 'danger') score += 35;
    else if (ticket.slaUrgency === 'warning') score += 20;

    score += Math.min(ticket.aging || 0, 30);

    return score;
  }

  return [...tickets]
    .filter(
      (ticket) =>
        ticket.status !== 'Resolved' &&
        ticket.status !== 'Closed'
    )
    .sort((a, b) => getScore(b) - getScore(a))
    .slice(0, 3);
}, [tickets]);
  const weatherWidget = (
    <div className="weather-widget">
      <div className="weather-top">
        <div className="weather-time">
          <h2>{time}</h2>
          <p>{date}</p>
        </div>
      </div>

      <div className="weather-divider"></div>

      <div className="weather-bottom">
        <div className="weather-left">
          {weather && (
            <img
              src={`https://openweathermap.org/img/wn/${weather.icon}@2x.png`}
              alt={weather.condition}
            />
          )}
        </div>

        <div className="weather-center">
          <p className="city-name">
            {weather?.city || weatherError || 'Weather'}
          </p>

          <h1>{weather?.temp ?? '--'}°C</h1>

          <span>{weather?.condition || 'Unavailable'}</span>
        </div>

        <div className="weather-right">
          <div>
            <p>Humidity</p>
            <strong>{weather ? `${weather.humidity}%` : '-'}</strong>
          </div>

          <div>
            <p>Wind</p>
            <strong>{weather ? `${weather.wind} km/h` : '-'}</strong>
          </div>

          <div>
            <p>Feels Like</p>
            <strong>{weather ? `${weather.feelsLike}°C` : '-'}</strong>
          </div>
        </div>
      </div>
    </div>
  );

  const calendarWidget = (
    <div className="calendar-widget">
      <div className="calendar-holidays">
        <h4>Upcoming Holidays</h4>

        {holidays.length === 0 ? (
          <p>No upcoming holidays loaded.</p>
        ) : (
          holidays.slice(0, 3).map((holiday, index) => (
            <div className="calendar-holiday" key={`${holiday.date}-${index}`}>
              <span>{holiday.name}</span>
              <strong>{holiday.daysLeft} days</strong>
            </div>
          ))
        )}
      </div>

      <div className="calendar-header">
        <button type="button" onClick={() => moveCalendarMonth(-1)}>{'<'}</button>

        <h3>
          {currentMonth} {currentYear}
        </h3>

        <button type="button" onClick={() => moveCalendarMonth(1)}>{'>'}</button>
      </div>

      <div className="calendar-days">
        <span>Su</span>
        <span>Mo</span>
        <span>Tu</span>
        <span>We</span>
        <span>Th</span>
        <span>Fr</span>
        <span>Sa</span>
      </div>

      <div className="calendar-dates">
        {calendarDays.map((day, index) => (
          <span
            key={index}
            className={getCalendarDayClass(day)}
          >
            {day || ''}
          </span>
        ))}
      </div>
    </div>
  );

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
            <div className="theme-mini">
              <img src="/assets/login-welcome/Images/moon.png" alt="moon" />
              <img src="/assets/login-welcome/Images/sun.svg" alt="sun" />
            </div>
            <button type="button" className="logout-btn" onClick={logout}>Logout</button>
          </div>
        </div>

        <div className="center">
          <div className="quick-links">
            <h3>Quick Links</h3>
            <div className="links">
              <QuickCard to="/dashboard" icon="/assets/login-welcome/Images/dashboard.png" label="Dashboard" />
              <QuickCard to="/tickets" icon="/assets/login-welcome/Images/ticket.svg" label="Ticket" />
              <QuickCard icon="/assets/login-welcome/Images/report.svg" label="Reports" />
              <QuickCard to="/statistics" icon="/assets/login-welcome/Images/analytics.svg" label="Analytics" />
              <QuickCard to="/profile" icon="/assets/login-welcome/Images/user.svg" label="My Profile" className="profile-card" />
              {role === 'admin' && (
                <QuickCard to="/admin" icon="/assets/login-welcome/Images/setting.svg" label="Admin Panel" className="admin-panel-card" />
              )}
              <QuickCard icon="/assets/login-welcome/Images/setting.svg" label="Settings" className="settings-card" />
            </div>
          </div>
          <div className="active-tickets-panel">
  <div className="active-tickets-header">
    <h3>Top Active Tickets</h3>

    <Link to="/tickets">
      View All
    </Link>
  </div>

  <table className="active-tickets-table">
    <thead>
      <tr>
        <th>Ticket ID</th>
        <th>Title</th>
        <th>Priority</th>
        <th>Status</th>
        <th>Assignee</th>
      </tr>
    </thead>

    
      <tbody>
  {topActiveTickets.map((ticket) => (
    <tr
      key={ticket.id}
      onClick={() =>
        navigate(`/tickets/${encodeURIComponent(ticket.id)}`)
      }
      style={{ cursor: "pointer" }}
    >
      <td>{ticket.id}</td>

      <td>
        {ticket.description?.slice(0, 50) || "Incident"}
      </td>

      <td>
        <span
          className={`priority-pill priority-${ticket.priority?.toLowerCase()}`}
        >
          {ticket.priority}
        </span>
      </td>

      <td>
        <span
          className={`status-badge status-${ticket.status?.toLowerCase()}`}
        >
          {ticket.status}
        </span>
      </td>

      <td>
  <div className="assignee-cell">
    <img
      src={assigneeAvatars[ticket.Owner]}
      alt={ticket.Owner}
      className="assignee-avatar"
    />

    <span>{ticket.Owner}</span>
  </div>
</td>
    </tr>
  ))}

    </tbody>
  </table>
</div>
<div className="activity-timeline">

<h3>Recent Activity Timeline</h3>

{recentActivity.map((activity)=>(

<div
key={activity.id}

className="timeline-item"
>

<div className={`timeline-icon ${activity.iconColor}`}>

{activity.type === "resolved"

? <FiCheck/>

: activity.type === "pending"

? <FiClock/>

: activity.iconColor === "orange"

? <FiAlertTriangle/>

: <FiPlus/>}

</div>

<div className="timeline-time">
{activity.time}
</div>

<div className="timeline-content">

<h4>{activity.title}</h4>

<p>{activity.description}</p>

</div>

<span className={`timeline-badge ${activity.type}`}>

{activity.label}

</span>

</div>

))}

<Link
  to="/tickets"
  className="timeline-footer"
>
  View Full Timeline →
</Link>

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
    <span>melika.javidfar11@e-uvt.ro</span>
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
          {weatherWidget}
          {calendarWidget}

          
         

        </div>
      </div>
    </div>
);}

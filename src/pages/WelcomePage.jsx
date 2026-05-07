import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import '../styles/welcome.css';

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

export default function WelcomePage() {
  const { user, role, logout } = useAuth();
  const now = new Date();
  const time = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const date = now.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });

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
            <p><img src="/assets/login-welcome/Images/statistics.png" className="icon" alt="" />Statistics</p>
            <p><img src="/assets/login-welcome/Images/notif.png" className="icon" alt="" />Notifications</p>
            <div className="theme-mini">
              <img src="/assets/login-welcome/Images/moon.png" alt="moon" />
              <img src="/assets/login-welcome/Images/sun.svg" alt="sun" />
            </div>
            <button type="button" className="logout-btn" onClick={logout}>Logout</button>
          </div>
        </div>

        <div className="center">
          <input type="text" placeholder="Search..." className="search" />

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
              <QuickCard icon="/assets/login-welcome/Images/analytics.svg" label="Analytics" />
              <QuickCard to="/users" icon="/assets/login-welcome/Images/user.svg" label="Users" />
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

          <div className="card-box">
            <h3>New Comments</h3>

            <div className="comment">
              <p>“Everything looks smooth”</p>
              <span>- Alex</span>
            </div>

            <div className="comment">
              <p>“UI feels really clean!”</p>
              <span>- Sara</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

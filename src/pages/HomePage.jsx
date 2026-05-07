import { Link } from 'react-router-dom';
import { useAuth } from '../auth';

export default function HomePage() {
  const { isAuthenticated, user, role, logout } = useAuth();

  return (
    <div className="home-page">
      <div className="chart-background">
     <div className="analytics-bg">
  <svg viewBox="0 0 1440 600" preserveAspectRatio="none">

    <defs>
      <marker id="arrow" markerWidth="14" markerHeight="14" refX="12" refY="7" orient="auto">
        <path d="M0,0 L14,7 L0,14 Z" fill="#38bdf8" />
      </marker>
    </defs>

    <line className="axis" x1="0" y1="520" x2="1440" y2="520"  />
   <rect className="bar" x="100"  y="420" width="16" height="100" rx="8" />
    <rect className="bar" x="200"  y="400" width="16" height="120" rx="8" />
   <rect className="bar" x="300"  y="380" width="16" height="140" rx="8"/>
   <rect className="bar" x="400"  y="390" width="16" height="130" rx="8"/>
   <rect className="bar" x="500"  y="360" width="16" height="160" rx="8"/>
   <rect className="bar" x="600"  y="340" width="16" height="180" rx="8"/>
   <rect className="bar" x="700"  y="350" width="16" height="170" rx="8"/>
   <rect className="bar" x="800"  y="320" width="16" height="200" rx="8"/>
   <rect className="bar"x="900"  y="300" width="16" height="220" rx="8"/>
   <rect className="bar"x="1000" y="310" width="16" height="210" rx="8"/>
   <rect className="bar"x="1100" y="270" width="16" height="250" rx="8"/>
   <rect className="bar"x="1200" y="250" width="16" height="270" rx="8"/>
   <rect className="bar"x="1300" y="230" width="16" height="290" rx="8"/>    
    <path
      className="chart-line line1"
      d="M100,500 C300,450 500,480 700,360 C900,260 1100,320 1300,200"
      markerEnd="url(#arrow)"
    />

  </svg>
</div>
    </div>     
    <img
      src="\assets\login-welcome\Images\nokia.svg"
      alt="Nokia Logo"
      className="logo"
    />
      <div className="home-card">
        <h1 className="home-kicker">OPERATIONS DASHBOARD</h1>
        <p>
          Monitor queues, track activity, and manage tickets in one place.
        </p>

        {isAuthenticated ? (
          <p>
            Signed in as <strong>{user?.name}</strong> with <strong>{role}</strong> access.
          </p>
        ) : (
          <p>Sign in or create an account to unlock the protected workspace.</p>
        )}

        <div className="home-links">
          {!isAuthenticated && (
            <Link to="/login" className="home-link">Open WorkSpace</Link>
          )}

          {isAuthenticated && (
            <>
              <Link to="/welcome" className="home-link">Welcome</Link>
              <Link to="/dashboard" className="home-link">Dashboard</Link>
              <Link to="/tickets" className="home-link">Ticket Management</Link>
              <button type="button" className="home-link" onClick={logout}>
                Logout
              </button>
            </>
          )}
        </div>
      </div>

    </div>
  );
}
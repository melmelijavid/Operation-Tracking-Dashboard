import { Link } from 'react-router-dom';
import { useAuth } from '../auth';

export default function HomePage() {
  const { isAuthenticated, user, role, logout } = useAuth();

  return (
    <div className="home-page">
      <div className="home-card">
        <p className="home-kicker">Nokia Panel</p>
        <h1>Enter To Dashboard</h1>
        <p>
          Open the Nokia workspace to monitor live queues, move through the dashboard, and manage owned or assigned tickets in one system.
        </p>
        {isAuthenticated ? (
          <p>
            Signed in as <strong>{user?.name}</strong> with <strong>{role}</strong> access.
          </p>
        ) : (
          <p>Sign in or create an account to unlock the protected workspace.</p>
        )}
        <div className="home-links">
          {!isAuthenticated && <Link to="/login" className="home-link">Login</Link>}
          {isAuthenticated && (
            <>
              <Link to="/welcome" className="home-link">Welcome</Link>
              <Link to="/dashboard" className="home-link">Dashboard</Link>
              <Link to="/tickets" className="home-link">Ticket Management</Link>
              <button type="button" className="home-link" onClick={logout}>Logout</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

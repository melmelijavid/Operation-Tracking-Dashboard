import { NavLink, Outlet } from 'react-router-dom';
import '../../styles/dashboard.css';
import '../../styles/admin.css';

// Shared shell for /admin/* routes. Provides the main app sidebar and an
// inner tab strip that switches between User Management and Team Management.
// Each tab renders into the <Outlet />.
export default function AdminLayout() {
  return (
    <div className="dashboard-page">
      <div className="dashboard-shell">
        <aside className="dashboard-sidebar">
          <div className="brand-block">
            <img src="/assets/login-welcome/Images/nokia - Copy.svg" className="brand-logo" alt="Nokia" />
            <p>Operation Tracking</p>
          </div>

          <nav className="dashboard-nav" aria-label="Admin navigation">
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/welcome">Welcome</NavLink>
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/tickets">Ticket Management</NavLink>
            <NavLink to="/statistics">Analytics</NavLink>
            <NavLink to="/admin">Admin Panel</NavLink>
          </nav>

          <div className="sidebar-status">
            <span className="status-light"></span>
            <div>
              <strong>Admin Panel</strong>
              <p>User &amp; team management</p>
            </div>
          </div>
        </aside>

        <main className="dashboard-main">
          <section className="hero-panel">
            <div className="hero-copy">
              <p className="welcome-sign">Nokia</p>
              <h1 className="welcome-title">Admin Panel</h1>
              <p className="welcome-subtitle">Manage users and teams across the platform.</p>
            </div>
          </section>

          <section className="panel">
            <nav className="admin-tabs" aria-label="Admin sections">
              <NavLink to="/admin/users" className="admin-tab">User Management</NavLink>
              <NavLink to="/admin/teams" className="admin-tab">Team Management</NavLink>
            </nav>

            <div className="admin-content">
              <Outlet />
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import '../styles/dashboard.css';
import '../styles/users.css';
import { AUTH_ROLES, useAuth } from '../auth';
import { fetchUsers, updateUserRole } from '../utils/users';

function formatDate(value) {
  if (!value) return '-';
  const [year, month, day] = String(value).slice(0, 10).split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

export default function UsersPage() {
  const { role } = useAuth();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [savingUserId, setSavingUserId] = useState(null);

  const isAdmin = role === AUTH_ROLES.ADMIN;

  useEffect(() => {
    async function loadUsers() {
      if (!isAdmin) return;

      try {
        setError('');
        const data = await fetchUsers();
        setUsers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load users.');
        setUsers([]);
      }
    }

    loadUsers();
  }, [isAdmin]);

  async function handleRoleChange(userId, nextRole) {
    try {
      setError('');
      setSavingUserId(userId);
      const updatedUser = await updateUserRole(userId, nextRole);
      setUsers((currentUsers) => currentUsers.map((user) => (
        user.id === updatedUser.id ? updatedUser : user
      )));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update user role.');
    } finally {
      setSavingUserId(null);
    }
  }

  return (
    <div className="users-page">
      {!isAdmin && (
        <div className="unauthorized-overlay" role="alertdialog" aria-modal="true" aria-labelledby="unauthorized-title">
          <div className="unauthorized-modal">
            <p className="users-kicker">Access Denied</p>
            <h1 id="unauthorized-title">Not authorized entry</h1>
            <p>Only admin users can open User Management.</p>
            <Link to="/welcome">Back to Welcome</Link>
          </div>
        </div>
      )}

      <div className="users-shell">
        <aside className="dashboard-sidebar">
          <div className="brand-block">
            <img src="/assets/login-welcome/Images/nokia - Copy.svg" className="brand-logo" alt="Nokia" />
            <p>Operation Tracking</p>
          </div>

          <nav className="dashboard-nav" aria-label="Users navigation">
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/welcome">Welcome</NavLink>
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/tickets">Ticket Management</NavLink>
            <NavLink to="/statistics">Statistics</NavLink>
            <NavLink to="/users">Users</NavLink>
          </nav>

          <div className="sidebar-status">
            <span className="status-light"></span>
            <div>
              <strong>Admin Console</strong>
              <p>{users.length} users loaded</p>
            </div>
          </div>
        </aside>

        <main className="users-main">
          <section className="users-hero">
            <div>
              <p className="users-kicker">Nokia Admin</p>
              <h1>User Management</h1>
              <p>Review accounts and control role access for the operation tracking dashboard.</p>
            </div>
          </section>

          <section className="users-panel">
            <div className="users-panel-top">
              <div>
                <h2>Users</h2>
                <p>Only admins can change roles.</p>
              </div>
            </div>

            {error && <div className="users-error">{error}</div>}

            <div className="users-table-wrap">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>
                        <select
                          value={user.role}
                          disabled={savingUserId === user.id}
                          onChange={(event) => handleRoleChange(user.id, event.target.value)}
                        >
                          <option value="admin">Admin</option>
                          <option value="operator">Operator</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      </td>
                      <td>{formatDate(user.created_at || user.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

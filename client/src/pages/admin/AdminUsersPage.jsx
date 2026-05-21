import { useEffect, useMemo, useState } from 'react';
import { fetchAdminUsers } from '../../utils/admin';
import { fetchTeams } from '../../utils/teams';
import CreateUserModal from './CreateUserModal';
import EditUserModal from './EditUserModal';

const ROLE_OPTIONS = ['admin', 'operator', 'viewer'];
const STATUS_OPTIONS = ['active', 'disabled', 'pending'];

function formatLastLogin(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [creatingUser, setCreatingUser] = useState(false);

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    async function load() {
      try {
        setError('');
        setLoading(true);
        const [usersData, teamsData] = await Promise.all([fetchAdminUsers(), fetchTeams()]);
        setUsers(usersData);
        setTeams(teamsData);
      } catch (err) {
        setError(err.message || 'Failed to load users.');
        setUsers([]);
        setTeams([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleUserSaved(updated) {
    setUsers((current) => current.map((u) => (u.id === updated.id ? updated : u)));
    setEditingUser(null);
  }

  function handleUserCreated(created) {
    setUsers((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name)));
    setCreatingUser(false);
  }

  const filteredUsers = useMemo(() => {
    const term = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchesSearch = !term
        || u.name.toLowerCase().includes(term)
        || u.email.toLowerCase().includes(term);
      const matchesRole = roleFilter === 'All' || u.role === roleFilter;
      const matchesStatus = statusFilter === 'All' || u.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, search, roleFilter, statusFilter]);

  return (
    <div className="admin-users">
      <div className="admin-users-toolbar">
        <input
          type="text"
          placeholder="Search by name or email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="admin-search"
        />
        <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="All">All roles</option>
          {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="All">All statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="admin-count">{filteredUsers.length} of {users.length}</span>
        <button type="button" className="btn-primary" onClick={() => setCreatingUser(true)}>
          + Create user
        </button>
      </div>

      {error && <p className="admin-error" role="alert">{error}</p>}

      {loading ? (
        <p className="admin-placeholder-text">Loading users…</p>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table admin-users-table">
            <thead>
              <tr>
                <th>Edit</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Teams</th>
                <th>Activity</th>
                <th>Last login</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={9} className="admin-empty">No users match these filters.</td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <button type="button" className="btn-edit" onClick={() => setEditingUser(u)}>Edit</button>
                    </td>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td><span className={`admin-pill role-${u.role}`}>{u.role}</span></td>
                    <td><span className={`admin-pill status-${u.status}`}>{u.status}</span></td>
                    <td>
                      {u.teams.length === 0 ? (
                        <span className="admin-muted">—</span>
                      ) : (
                        <div className="admin-team-chips">
                          {u.teams.map((t) => (
                            <span key={t.id} className="admin-chip">{t.name}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="admin-activity">
                        <span className="activity-pill assigned" title="Tickets assigned to this user">
                          <span className="activity-label">Assigned</span>
                          <span className="activity-num">{u.activity.assigned}</span>
                        </span>
                        <span className="activity-pill solved" title="Tickets resolved or closed">
                          <span className="activity-label">Solved</span>
                          <span className="activity-num">{u.activity.solved}</span>
                        </span>
                        <span className="activity-pill overdue" title="Open tickets past their SLA deadline">
                          <span className="activity-label">Overdue</span>
                          <span className="activity-num">{u.activity.overdue}</span>
                        </span>
                      </div>
                    </td>
                    <td>{formatLastLogin(u.lastLoginAt)}</td>
                    <td>{u.createdAt}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {editingUser && (
        <EditUserModal
          user={editingUser}
          teams={teams}
          onClose={() => setEditingUser(null)}
          onSaved={handleUserSaved}
        />
      )}

      {creatingUser && (
        <CreateUserModal
          teams={teams}
          onClose={() => setCreatingUser(false)}
          onSaved={handleUserCreated}
        />
      )}
    </div>
  );
}

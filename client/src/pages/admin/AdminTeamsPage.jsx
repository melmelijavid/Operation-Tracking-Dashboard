import { useEffect, useMemo, useState } from 'react';
import { fetchAdminTeams } from '../../utils/admin';
import { fetchUsers } from '../../utils/users';
import TeamFormModal from './TeamFormModal';

const STATUS_OPTIONS = ['active', 'disabled'];

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  // null = no modal; 'create' = create modal; {team object} = edit
  const [modalTarget, setModalTarget] = useState(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  useEffect(() => {
    async function load() {
      try {
        setError('');
        setLoading(true);
        const [teamData, userData] = await Promise.all([fetchAdminTeams(), fetchUsers()]);
        setTeams(teamData);
        setUsers(userData);
      } catch (err) {
        setError(err.message || 'Failed to load teams.');
        setTeams([]);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function handleTeamSaved(saved, { isCreate }) {
    setTeams((current) => {
      if (isCreate) return [...current, saved].sort((a, b) => a.name.localeCompare(b.name));
      return current.map((t) => (t.id === saved.id ? saved : t));
    });
    setModalTarget(null);
  }

  const filteredTeams = useMemo(() => {
    const term = search.trim().toLowerCase();
    return teams.filter((t) => {
      const matchesSearch = !term
        || t.name.toLowerCase().includes(term)
        || (t.description || '').toLowerCase().includes(term)
        || (t.department || '').toLowerCase().includes(term);
      const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [teams, search, statusFilter]);

  return (
    <div className="admin-teams">
      <div className="admin-users-toolbar">
        <input
          type="text"
          placeholder="Search by name, description, or department"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="admin-search"
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="All">All statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="admin-count">{filteredTeams.length} of {teams.length}</span>
        <button type="button" className="btn-primary" onClick={() => setModalTarget('create')}>
          + Create team
        </button>
      </div>

      {error && <p className="admin-error" role="alert">{error}</p>}

      {loading ? (
        <p className="admin-placeholder-text">Loading teams…</p>
      ) : (
        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Department</th>
                <th>Description</th>
                <th>Status</th>
                <th>Members</th>
                <th>Activity</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredTeams.length === 0 ? (
                <tr>
                  <td colSpan={7} className="admin-empty">No teams match these filters.</td>
                </tr>
              ) : (
                filteredTeams.map((team) => (
                  <tr key={team.id}>
                    <td>{team.name}</td>
                    <td>{team.department || <span className="admin-muted">—</span>}</td>
                    <td className="team-description">
                      {team.description || <span className="admin-muted">—</span>}
                    </td>
                    <td><span className={`admin-pill status-${team.status}`}>{team.status}</span></td>
                    <td>
                      {team.members.length === 0 ? (
                        <span className="admin-muted">0</span>
                      ) : (
                        <span className="team-member-count" title={team.members.map((m) => m.name).join(', ')}>
                          {team.memberCount} member{team.memberCount === 1 ? '' : 's'}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="admin-activity">
                        <span className="activity-pill assigned" title="Tickets assigned to this team">
                          <span className="activity-label">Assigned</span>
                          <span className="activity-num">{team.activity.assigned}</span>
                        </span>
                        <span className="activity-pill solved" title="Tickets resolved or closed">
                          <span className="activity-label">Solved</span>
                          <span className="activity-num">{team.activity.solved}</span>
                        </span>
                        <span className="activity-pill overdue" title="Open tickets past their SLA deadline">
                          <span className="activity-label">Overdue</span>
                          <span className="activity-num">{team.activity.overdue}</span>
                        </span>
                      </div>
                    </td>
                    <td>
                      <button type="button" className="btn-edit" onClick={() => setModalTarget(team)}>Edit</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalTarget && (
        <TeamFormModal
          team={modalTarget === 'create' ? null : modalTarget}
          users={users}
          onClose={() => setModalTarget(null)}
          onSaved={handleTeamSaved}
        />
      )}
    </div>
  );
}

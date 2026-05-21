import { useEffect, useState } from 'react';
import { createAdminUser } from '../../utils/admin';

const ROLE_OPTIONS = ['admin', 'operator', 'viewer'];
const STATUS_OPTIONS = ['active', 'disabled'];

export default function CreateUserModal({ teams, onClose, onSaved }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('operator');
  const [status, setStatus] = useState('active');
  const [teamIds, setTeamIds] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function toggleTeam(id) {
    setTeamIds((current) =>
      current.includes(id) ? current.filter((t) => t !== id) : [...current, id]
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!name.trim()) return setError('Name is required.');
    if (!email.trim()) return setError('Email is required.');

    setSubmitting(true);
    try {
      const created = await createAdminUser({
        name: name.trim(),
        email: email.trim(),
        role,
        status,
        teamIds,
      });
      onSaved(created);
    } catch (err) {
      setError(err.message || 'Could not create the user.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create user</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            <span>Name</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </label>

          <label>
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <small className="modal-hint">A temporary password will be emailed here.</small>
          </label>

          <label>
            <span>Role</span>
            <select value={role} onChange={(e) => setRole(e.target.value)}>
              {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>

          <label>
            <span>Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>

          <fieldset className="modal-teams">
            <legend>Teams</legend>
            {teams.length === 0 ? (
              <p className="admin-muted">No teams available.</p>
            ) : (
              <div className="modal-teams-grid">
                {teams.map((team) => (
                  <label key={team.id} className="modal-team-check">
                    <input
                      type="checkbox"
                      checked={teamIds.includes(team.id)}
                      onChange={() => toggleTeam(team.id)}
                    />
                    <span>{team.name}</span>
                  </label>
                ))}
              </div>
            )}
          </fieldset>

          {error && <p className="admin-error" role="alert">{error}</p>}

          <div className="modal-actions">
            <div className="modal-actions-spacer" />
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create user'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

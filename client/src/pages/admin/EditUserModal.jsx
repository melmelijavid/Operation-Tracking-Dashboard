import { useEffect, useState } from 'react';
import { useAuth } from '../../auth';
import { resetAdminUserPassword, updateAdminUser } from '../../utils/admin';

const ROLE_OPTIONS = ['admin', 'operator', 'viewer'];
const STATUS_OPTIONS = ['active', 'disabled'];

export default function EditUserModal({ user, teams, onClose, onSaved }) {
  const { user: currentUser } = useAuth();
  const isSelf = currentUser?.id === user.id;

  const initialStatus = user.status === 'pending' ? 'active' : user.status;

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [role, setRole] = useState(user.role);
  const [status, setStatus] = useState(initialStatus);
  const [teamIds, setTeamIds] = useState(user.teams.map((t) => t.id));
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Close on Escape.
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
    setInfo('');

    if (!name.trim()) return setError('Name is required.');
    if (!email.trim()) return setError('Email is required.');

    setSubmitting(true);
    try {
      const updated = await updateAdminUser(user.id, {
        name: name.trim(),
        email: email.trim(),
        role,
        status,
        teamIds,
      });
      onSaved(updated);
    } catch (err) {
      setError(err.message || 'Could not save changes.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword() {
    setError('');
    setInfo('');

    if (!window.confirm(`Reset password for ${user.email}? They'll receive an email with the new password.`)) {
      return;
    }

    setResetting(true);
    try {
      const response = await resetAdminUserPassword(user.id);
      setInfo(response?.message || 'Password reset email sent.');
    } catch (err) {
      setError(err.message || 'Could not reset password.');
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Edit user</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            <span>Name</span>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>

          <label>
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>

          <label>
            <span>Role</span>
            <select value={role} onChange={(e) => setRole(e.target.value)} disabled={isSelf && user.role === 'admin'}>
              {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            {isSelf && user.role === 'admin' && (
              <small className="modal-hint">You cannot remove your own admin role.</small>
            )}
          </label>

          <label>
            <span>Status</span>
            <select value={status} onChange={(e) => setStatus(e.target.value)} disabled={isSelf}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {isSelf && <small className="modal-hint">You cannot disable your own account.</small>}
            {user.status === 'pending' && status === 'active' && (
              <small className="modal-hint">Setting status to active will mark this email as verified.</small>
            )}
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
          {info && <p className="admin-info" role="status">{info}</p>}

          <div className="modal-actions">
            <button
              type="button"
              className="btn-secondary btn-danger-outline"
              onClick={handleResetPassword}
              disabled={submitting || resetting}
            >
              {resetting ? 'Sending…' : 'Reset password'}
            </button>
            <div className="modal-actions-spacer" />
            <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

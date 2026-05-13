import { useEffect, useState } from 'react';
import { createAdminTeam, updateAdminTeam } from '../../utils/admin';

const STATUS_OPTIONS = ['active', 'disabled'];

// Used in both create and edit modes. If `team` is null/undefined, we're
// creating; status field is hidden (creates default to 'active').
export default function TeamFormModal({ team, users, onClose, onSaved }) {
  const isCreate = !team;

  const [name, setName] = useState(team?.name ?? '');
  const [description, setDescription] = useState(team?.description ?? '');
  const [department, setDepartment] = useState(team?.department ?? '');
  const [status, setStatus] = useState(team?.status ?? 'active');
  const [memberIds, setMemberIds] = useState(team ? team.members.map((m) => m.id) : []);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  function toggleMember(id) {
    setMemberIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (!name.trim()) return setError('Team name is required.');

    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        department: department.trim(),
        memberIds,
      };
      const saved = isCreate
        ? await createAdminTeam(payload)
        : await updateAdminTeam(team.id, { ...payload, status });
      onSaved(saved, { isCreate });
    } catch (err) {
      setError(err.message || 'Could not save the team.');
    } finally {
      setSubmitting(false);
    }
  }

  // Candidate members: everyone EXCEPT viewers. Admins and operators can be
  // on teams; viewers are read-only and don't get assigned tickets.
  const candidates = (users || []).filter((u) => u.role !== 'viewer');

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isCreate ? 'Create team' : 'Edit team'}</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            <span>Name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </label>

          <label>
            <span>Department</span>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. IT Operations"
            />
          </label>

          <label>
            <span>Description</span>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this team do?"
            />
          </label>

          {!isCreate && (
            <label>
              <span>Status</span>
              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <small className="modal-hint">Disabled teams stay in the system but won't appear in ticket dropdowns.</small>
            </label>
          )}

          <fieldset className="modal-teams">
            <legend>Members</legend>
            {candidates.length === 0 ? (
              <p className="admin-muted">No assignable users available.</p>
            ) : (
              <div className="modal-teams-grid">
                {candidates.map((u) => (
                  <label key={u.id} className="modal-team-check">
                    <input
                      type="checkbox"
                      checked={memberIds.includes(u.id)}
                      onChange={() => toggleMember(u.id)}
                    />
                    <span>{u.name} <span className="admin-muted">({u.role})</span></span>
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
              {submitting ? 'Saving…' : (isCreate ? 'Create team' : 'Save changes')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

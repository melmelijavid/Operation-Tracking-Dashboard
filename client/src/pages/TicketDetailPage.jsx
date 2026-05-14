import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useParams } from 'react-router-dom';
import '../styles/dashboard.css';
import '../styles/ticket-detail.css';
import { AUTH_ROLES, useAuth } from '../auth';
import {
  addTicketComment,
  deleteTicketComment,
  fetchTicket,
  fetchTicketComments,
  fetchTicketHistory,
  updateTicket,
} from '../utils/tickets';
import { fetchUsers } from '../utils/users';
import { fetchTeams } from '../utils/teams';

function displayValue(value) {
  return value || '-';
}

function formatDate(value) {
  if (!value) return '-';
  const [year, month, day] = String(value).slice(0, 10).split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function formatDateTime(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function getStatusClass(status) {
  if (status === 'Open') return 'open';
  if (status === 'In Progress') return 'progress';
  if (status === 'Resolved') return 'resolved';
  if (status === 'Closed') return 'closed';
  return 'pending';
}

function getPriorityClass(priority) {
  if (priority === 'Critical') return 'dot-critical';
  if (priority === 'High') return 'dot-high';
  if (priority === 'Medium') return 'dot-medium';
  return 'dot-low';
}

function normalizeValue(value) {
  return String(value || '').trim().toLowerCase();
}

function getUserKeys(user) {
  if (!user) return [];
  const email = normalizeValue(user.email);
  const emailName = email.includes('@') ? email.split('@')[0] : email;

  return Array.from(new Set([
    normalizeValue(user.name),
    email,
    emailName,
    normalizeValue(user.id),
  ].filter(Boolean)));
}

function matchesCurrentUser(value, user) {
  const normalizedValue = normalizeValue(value);
  return getUserKeys(user).some((key) => key === normalizedValue);
}

function calculateAging(submitDate) {
  const submitted = new Date(submitDate);
  if (Number.isNaN(submitted.getTime())) return 0;
  const diffMs = Date.now() - submitted.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function getDefaultSlaForPriority(priority) {
  if (priority === 'Critical') return { slaType: 'normal', slaHours: 4 };
  if (priority === 'High') return { slaType: 'normal', slaHours: 8 };
  if (priority === 'Medium') return { slaType: 'business', slaHours: 24 };
  return { slaType: 'business', slaHours: 72 };
}

function buildEditForm(ticket) {
  const defaultSla = getDefaultSlaForPriority(ticket.priority);

  return {
    description: ticket.description || '',
    status: ticket.status || 'Open',
    priority: ticket.priority || 'Medium',
    assignedGroup: ticket.assignedGroup || '',
    serviceType: ticket.serviceType || '',
    slaType: ticket.slaType || defaultSla.slaType,
    slaHours: String(ticket.slaHours || defaultSla.slaHours),
    company: ticket.company || '',
    productCategorizationTier1: ticket.productCategorizationTier1 || '',
    productCategorizationTier2: ticket.productCategorizationTier2 || '',
    productCategorizationTier3: ticket.productCategorizationTier3 || '',
    categorizationTier1: ticket.categorizationTier1 || '',
    assignedPersonUserId: ticket.assignedPersonUserId ? String(ticket.assignedPersonUserId) : '',
  };
}

function getHistoryText(entry) {
  if (entry.action === 'created') {
    return `Created ticket ${entry.newValue || entry.ticketId}`;
  }

  if (entry.action === 'commented') {
    return 'Added a work note';
  }

  if (entry.action === 'deleted comment') {
    return 'Deleted a work note';
  }

  if (entry.fieldName) {
    return `${entry.fieldName} changed from ${entry.oldValue} to ${entry.newValue}`;
  }

  return entry.action;
}

function getMentionTrigger(value, caretIndex) {
  const textBeforeCaret = value.slice(0, caretIndex);
  return textBeforeCaret.match(/(?:^|\s)@([\w.-]*)$/);
}

function getTextareaPointerPosition(textarea, wrapper, event) {
  const wrapperRect = wrapper.getBoundingClientRect();
  const textareaRect = textarea.getBoundingClientRect();
  const clientX = event?.clientX ?? textareaRect.left + 16;
  const clientY = event?.clientY ?? textareaRect.top + 42;

  return {
    left: Math.min(Math.max(12, clientX - wrapperRect.left), wrapperRect.width - 260),
    top: Math.max(12, clientY - wrapperRect.top + 16),
  };
}

export default function TicketDetailPage() {
  const { id } = useParams();
  const { role, user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [history, setHistory] = useState([]);
  const [comments, setComments] = useState([]);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [mentionedUsers, setMentionedUsers] = useState([]);
  const [mentionSearch, setMentionSearch] = useState(null);
  const [mentionPickerPosition, setMentionPickerPosition] = useState({ left: 12, top: 48 });
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [error, setError] = useState('');
  const [commentError, setCommentError] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState(null);
  const textareaRef = useRef(null);
  const commentInputWrapRef = useRef(null);

  const canComment = role === AUTH_ROLES.ADMIN || role === AUTH_ROLES.OPERATOR;

  useEffect(() => {
    async function loadTicketDetail() {
      try {
        setError('');
        const [ticketData, historyData, commentData] = await Promise.all([
          fetchTicket(id),
          fetchTicketHistory(id),
          fetchTicketComments(id),
        ]);
        setTicket(ticketData);
        setHistory(historyData);
        setComments(commentData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load ticket detail.');
        setTicket(null);
        setHistory([]);
        setComments([]);
      }
    }

    loadTicketDetail();
  }, [id]);

  useEffect(() => {
    async function loadSupportData() {
      try {
        const [userData, teamData] = await Promise.all([fetchUsers(), fetchTeams()]);
        setUsers(userData);
        setTeams(teamData);
      } catch (err) {
        setUsers([]);
        setTeams([]);
      }
    }

    loadSupportData();
  }, []);

  const canEditTicket = ticket && (
    role === AUTH_ROLES.ADMIN ||
    (role === AUTH_ROLES.OPERATOR && matchesCurrentUser(ticket.Owner, user))
  );
  const assignableUsers = users.map((availableUser) => ({
    id: String(availableUser.id),
    name: availableUser.name,
  }));

  const mentionSuggestions = mentionSearch !== null
    ? users
      .filter((candidate) => !mentionedUsers.some((mentioned) => mentioned.id === candidate.id))
      .filter((candidate) => {
        const name = candidate.name.toLowerCase();
        const email = candidate.email.toLowerCase();
        return !mentionSearch || name.includes(mentionSearch) || email.includes(mentionSearch);
      })
      .slice(0, 6)
    : [];

  function updateMentionPicker(textarea, nextValue = textarea.value, event = null) {
    const trigger = getMentionTrigger(nextValue, textarea.selectionStart);

    if (!trigger) {
      setMentionSearch(null);
      return;
    }

    setMentionSearch(trigger[1].trim().toLowerCase());
    if (commentInputWrapRef.current) {
      setMentionPickerPosition(getTextareaPointerPosition(textarea, commentInputWrapRef.current, event));
    }
  }

  function handleCommentTextChange(event) {
    const nextValue = event.target.value;
    setCommentText(nextValue);
    updateMentionPicker(event.target, nextValue, event.nativeEvent);
  }

  function handleCommentCursorMove(event) {
    updateMentionPicker(event.target, event.target.value, event.nativeEvent);
  }

  function addMention(userToMention) {
    const textarea = textareaRef.current;
    const caretIndex = textarea?.selectionStart ?? commentText.length;
    const trigger = getMentionTrigger(commentText, caretIndex);

    setMentionedUsers((current) => (
      current.some((mentioned) => mentioned.id === userToMention.id)
        ? current
        : [...current, userToMention]
    ));

    if (!trigger || !textarea) {
      setCommentText((current) => `${current}@${userToMention.name} `);
      setMentionSearch(null);
      return;
    }

    const triggerStart = caretIndex - trigger[0].length;
    const prefix = trigger[0].startsWith(' ') ? ' ' : '';
    const nextValue = `${commentText.slice(0, triggerStart)}${prefix}@${userToMention.name} ${commentText.slice(caretIndex)}`;
    const nextCaret = triggerStart + prefix.length + userToMention.name.length + 2;

    setCommentText(nextValue);
    setMentionSearch(null);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(nextCaret, nextCaret);
    });
  }

  function removeMention(userId) {
    setMentionedUsers((current) => current.filter((mentioned) => mentioned.id !== userId));
  }

  function openEditTicketModal() {
    setEditForm(buildEditForm(ticket));
    setEditError('');
    setEditOpen(true);
  }

  function closeEditTicketModal() {
    setEditOpen(false);
    setEditForm(null);
    setSavingEdit(false);
    setEditError('');
  }

  function handleEditPriorityChange(priority) {
    const defaultSla = getDefaultSlaForPriority(priority);
    setEditForm((current) => ({
      ...current,
      priority,
      slaType: defaultSla.slaType,
      slaHours: String(defaultSla.slaHours),
    }));
  }

  async function handleEditTicketSubmit(event) {
    event.preventDefault();
    if (!canEditTicket || !editForm || savingEdit) return;

    try {
      setSavingEdit(true);
      setEditError('');
      await updateTicket({
        ...ticket,
        description: editForm.description.trim(),
        status: editForm.status,
        priority: editForm.priority,
        assignedGroup: editForm.assignedGroup.trim(),
        serviceType: editForm.serviceType.trim(),
        slaType: editForm.slaType,
        slaHours: Number(editForm.slaHours),
        company: editForm.company.trim(),
        productCategorizationTier1: editForm.productCategorizationTier1.trim(),
        productCategorizationTier2: editForm.productCategorizationTier2.trim(),
        productCategorizationTier3: editForm.productCategorizationTier3.trim(),
        categorizationTier1: editForm.categorizationTier1.trim(),
        assignedPersonUserId: editForm.assignedPersonUserId ? Number(editForm.assignedPersonUserId) : null,
        aging: calculateAging(ticket.submitDate),
      });
      const [updatedTicket, updatedHistory] = await Promise.all([
        fetchTicket(id),
        fetchTicketHistory(id),
      ]);
      setTicket(updatedTicket);
      setHistory(updatedHistory);
      closeEditTicketModal();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Ticket update failed.');
      setSavingEdit(false);
    }
  }

  async function handleCommentSubmit(event) {
    event.preventDefault();
    const trimmedComment = commentText.trim();
    if (!trimmedComment || submittingComment) return;

    try {
      setSubmittingComment(true);
      setCommentError('');
      const updatedComments = await addTicketComment(
        id,
        trimmedComment,
        mentionedUsers.map((mentioned) => mentioned.id)
      );
      const updatedHistory = await fetchTicketHistory(id);
      setComments(updatedComments);
      setHistory(updatedHistory);
      setCommentText('');
      setMentionedUsers([]);
      setMentionSearch(null);
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : 'Failed to add comment.');
    } finally {
      setSubmittingComment(false);
    }
  }

  async function handleDeleteComment(commentId) {
    if (deletingCommentId) return;

    try {
      setDeletingCommentId(commentId);
      setCommentError('');
      const updatedComments = await deleteTicketComment(id, commentId);
      const updatedHistory = await fetchTicketHistory(id);
      setComments(updatedComments);
      setHistory(updatedHistory);
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : 'Failed to delete work note.');
    } finally {
      setDeletingCommentId(null);
    }
  }

  if (error) {
    return (
      <div className="ticket-detail-page">
        <div className="ticket-detail-empty">
          <h1>Ticket not available</h1>
          <p>{error}</p>
          <Link to="/dashboard">Back to Dashboard</Link>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="ticket-detail-page">
        <div className="ticket-detail-empty">Loading ticket detail...</div>
      </div>
    );
  }

  return (
    <div className="ticket-detail-page">
      <div className="ticket-detail-shell">
        <aside className="dashboard-sidebar">
          <div className="brand-block">
            <img src="/assets/login-welcome/Images/nokia - Copy.svg" className="brand-logo" alt="Nokia" />
            <p>Operation Tracking</p>
          </div>

          <nav className="dashboard-nav" aria-label="Ticket detail navigation">
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/welcome">Welcome</NavLink>
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/tickets">Ticket Management</NavLink>
            <NavLink to="/statistics">Analytics</NavLink>
          </nav>

          <div className="sidebar-status">
            <span className="status-light"></span>
            <div>
              <strong>Ticket Detail</strong>
              <p>{ticket.id}</p>
            </div>
          </div>
        </aside>

        <main className="ticket-detail-main">
         <section className="ticket-detail-hero">

  <div className="ticket-hero-content">

    <p className="ticket-detail-kicker">
      Incident Detail
    </p>

    <h1>{ticket.id}</h1>

    <p className="ticket-hero-description">
      {ticket.description}
    </p>

    <div className="ticket-hero-actions">

      {canEditTicket && (
        <button
          type="button"
          className="detail-edit-button"
          onClick={openEditTicketModal}
        >
          Edit Ticket
        </button>
      )}

      <span className={`status-badge ${getStatusClass(ticket.status)}`}>
        {ticket.status}
      </span>

      <span className={`priority-pill ${getPriorityClass(ticket.priority)}`}>
        <span className={`priority-dot ${getPriorityClass(ticket.priority)}`}></span>
        {ticket.priority}
      </span>

      <Link
        className="detail-back-link hero-back-button"
        to="/dashboard"
      >
        Back to Dashboard
      </Link>

    </div>
  </div>

</section>
          <section className="ticket-detail-grid">
  <div className="ticket-detail-panel ownership-panel">
    <div className="detail-section-heading">
      <h2>Ownership</h2>
    </div>

    <dl className="detail-definition-grid">
      <div><dt>Owner</dt><dd>{displayValue(ticket.Owner)}</dd></div>
      <div><dt>Assigned Person</dt><dd>{displayValue(ticket.Assigned_Person)}</dd></div>
      <div><dt>Assigned Group</dt><dd>{displayValue(ticket.assignedGroup)}</dd></div>
      <div><dt>Company</dt><dd>{displayValue(ticket.company)}</dd></div>
      <div><dt>Service Type</dt><dd>{displayValue(ticket.serviceType)}</dd></div>
      <div><dt>Last Modified</dt><dd>{formatDate(ticket.lastModifiedDate)}</dd></div>
    </dl>
  </div>

  <div className="ticket-detail-panel sla-panel">
    <div className="detail-section-heading">
      <h2>SLA</h2>

      <span className={`sla-badge sla-${ticket.slaUrgency || 'none'}`}>
        {displayValue(ticket.slaRemainingLabel)}
      </span>
    </div>

    <dl className="detail-definition-grid">
      <div>
        <dt>SLA Type</dt>
        <dd>{ticket.slaType === 'business' ? 'Business Hours' : 'Normal Hours'}</dd>
      </div>

      <div>
        <dt>SLA Hours</dt>
        <dd>{displayValue(ticket.slaHours)}</dd>
      </div>

      <div>
        <dt>Deadline</dt>
        <dd>{formatDateTime(ticket.slaDeadline)}</dd>
      </div>
    </dl>
  </div>
</section>

<section className="ticket-detail-notes-row">

  <div className="ticket-detail-panel history-panel">
    <div className="detail-section-heading">
      <h2>History</h2>
    </div>

    <div className="history-list">
      {history.length === 0 ? (
        <p className="detail-muted">
          No history yet. New changes will appear here.
        </p>
      ) : (
        history.map((entry) => (
          <article className="history-item" key={entry.id}>
            <span></span>

            <div>
              <strong>{getHistoryText(entry)}</strong>

              <p>
                {entry.userName} - {formatDateTime(entry.createdAt)}
              </p>
            </div>
          </article>
        ))
      )}
    </div>
  </div>

  <div className="ticket-detail-panel work-notes-panel">
    <div className="detail-section-heading">
      <h2 className="ticket-report-heading">
        Ticket Requests / Reports
      </h2>
    </div>
              {canComment && (
                <form className="comment-form" onSubmit={handleCommentSubmit}>
                  <div className="comment-input-wrap" ref={commentInputWrapRef}>
                    <textarea
                      id="ticket-comment"
                      ref={textareaRef}
                      aria-label="Ticket request or report message"
                      value={commentText}
                      onChange={handleCommentTextChange}
                      onClick={handleCommentCursorMove}
                      onKeyUp={handleCommentCursorMove}
                      onBlur={() => setTimeout(() => setMentionSearch(null), 150)}
                      placeholder="Write a ticket update or request. Type @ to tag a user."
                    />
                    {mentionSuggestions.length > 0 && (
                      <div className="mention-picker" style={{ left: mentionPickerPosition.left, top: mentionPickerPosition.top }}>
                        {mentionSuggestions.map((candidate) => (
                          <button type="button" key={candidate.id} onMouseDown={(event) => event.preventDefault()} onClick={() => addMention(candidate)}>
                            <strong>{candidate.name}</strong>
                            <span>{candidate.email}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {mentionedUsers.length > 0 && (
                    <div className="mention-chip-list" aria-label="Tagged users">
                      {mentionedUsers.map((mentioned) => (
                        <button type="button" key={mentioned.id} onClick={() => removeMention(mentioned.id)}>
                          @{mentioned.name}
                          <span>Remove</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {commentError && <p className="detail-error">{commentError}</p>}
                  <button type="submit" disabled={submittingComment || !commentText.trim()}>
                    {submittingComment ? 'Sending...' : 'Send Report'}
                  </button>
                </form>
              )}

              <div className="comment-list">
                {comments.length === 0 ? (
                  <p className="detail-muted">No work notes yet.</p>
                ) : (
                  comments.map((comment) => (
                    <article className="comment-card" key={comment.id}>
                      <div className="comment-card-header">
                        <div>
                          <strong>{comment.userName}</strong>
                          <span>{formatDateTime(comment.createdAt)}</span>
                        </div>
                        {String(comment.userId) === String(user?.id) && (
                          <button
                            type="button"
                            className="comment-delete-button"
                            disabled={deletingCommentId === comment.id}
                            onClick={() => handleDeleteComment(comment.id)}
                          >
                            {deletingCommentId === comment.id ? 'Deleting...' : 'Delete'}
                          </button>
                        )}
                      </div>
                      {comment.mentions?.length > 0 && (
                        <div className="comment-mentions">
                          {comment.mentions.map((mentioned) => (
                            <span key={mentioned.id}>@{mentioned.name}</span>
                          ))}
                        </div>
                      )}
                      <p>{comment.commentText}</p>
                    </article>
                  ))
                )}
              </div>
            </div>
          </section>
        </main>
      </div>

      {editOpen && editForm && (
        <div className="detail-modal-overlay">
          <div className="detail-edit-modal" role="dialog" aria-modal="true" aria-labelledby="detail-edit-title">
            <h2 id="detail-edit-title">Edit Ticket</h2>
            <form onSubmit={handleEditTicketSubmit}>
              <label htmlFor="detail-edit-description">Description</label>
              <input id="detail-edit-description" type="text" required value={editForm.description} onChange={(event) => setEditForm((current) => ({ ...current, description: event.target.value }))} />

              <label htmlFor="detail-edit-priority">Priority</label>
              <select id="detail-edit-priority" value={editForm.priority} onChange={(event) => handleEditPriorityChange(event.target.value)}>
                <option>Critical</option>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>

              <label htmlFor="detail-edit-status">Status</label>
              <select id="detail-edit-status" value={editForm.status} onChange={(event) => setEditForm((current) => ({ ...current, status: event.target.value }))}>
                <option>Open</option>
                <option>In Progress</option>
                <option>Pending</option>
                <option>Resolved</option>
                <option>Closed</option>
              </select>

              <label htmlFor="detail-edit-team">Assigned Group</label>
              <select id="detail-edit-team" required value={editForm.assignedGroup} onChange={(event) => setEditForm((current) => ({ ...current, assignedGroup: event.target.value }))}>
                <option value="">Select group</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.name}>{team.name}</option>
                ))}
              </select>

              <label htmlFor="detail-edit-service">Service Type</label>
              <input id="detail-edit-service" type="text" required value={editForm.serviceType} onChange={(event) => setEditForm((current) => ({ ...current, serviceType: event.target.value }))} />

              <div className="detail-edit-two-column">
                <label htmlFor="detail-edit-sla-type">
                  <span>SLA Type</span>
                  <select id="detail-edit-sla-type" value={editForm.slaType} onChange={(event) => setEditForm((current) => ({ ...current, slaType: event.target.value }))}>
                    <option value="normal">Normal Hours</option>
                    <option value="business">Business Hours</option>
                  </select>
                </label>

                <label htmlFor="detail-edit-sla-hours">
                  <span>SLA Hours</span>
                  <input id="detail-edit-sla-hours" type="number" min="1" required value={editForm.slaHours} onChange={(event) => setEditForm((current) => ({ ...current, slaHours: event.target.value }))} />
                </label>
              </div>

              <label htmlFor="detail-edit-company">Company</label>
              <input id="detail-edit-company" type="text" value={editForm.company} onChange={(event) => setEditForm((current) => ({ ...current, company: event.target.value }))} />

              <label htmlFor="detail-edit-product-tier1">Product Categorization Tier 1</label>
              <input id="detail-edit-product-tier1" type="text" value={editForm.productCategorizationTier1} onChange={(event) => setEditForm((current) => ({ ...current, productCategorizationTier1: event.target.value }))} />

              <label htmlFor="detail-edit-product-tier2">Product Categorization Tier 2</label>
              <input id="detail-edit-product-tier2" type="text" value={editForm.productCategorizationTier2} onChange={(event) => setEditForm((current) => ({ ...current, productCategorizationTier2: event.target.value }))} />

              <label htmlFor="detail-edit-product-tier3">Product Categorization Tier 3</label>
              <input id="detail-edit-product-tier3" type="text" value={editForm.productCategorizationTier3} onChange={(event) => setEditForm((current) => ({ ...current, productCategorizationTier3: event.target.value }))} />

              <label htmlFor="detail-edit-category-tier1">Categorization Tier 1</label>
              <input id="detail-edit-category-tier1" type="text" value={editForm.categorizationTier1} onChange={(event) => setEditForm((current) => ({ ...current, categorizationTier1: event.target.value }))} />

              <label htmlFor="detail-edit-assigned-user">Assigned User</label>
              <select id="detail-edit-assigned-user" required value={editForm.assignedPersonUserId} onChange={(event) => setEditForm((current) => ({ ...current, assignedPersonUserId: event.target.value }))}>
                <option value="">Select user</option>
                {assignableUsers.map((assignableUser) => (
                  <option key={assignableUser.id} value={assignableUser.id}>{assignableUser.name}</option>
                ))}
              </select>

              <label htmlFor="detail-edit-owner">Owner</label>
              <input id="detail-edit-owner" type="text" value={ticket.Owner || ''} disabled />

              {editError && <p className="detail-error">{editError}</p>}

              <div className="detail-edit-actions">
                <button type="button" className="detail-secondary-button" onClick={closeEditTicketModal} disabled={savingEdit}>Cancel</button>
                <button type="submit" className="detail-primary-button" disabled={savingEdit}>
                  {savingEdit ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from 'react';
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
} from '../utils/tickets';

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

export default function TicketDetailPage() {
  const { id } = useParams();
  const { role, user } = useAuth();
  const [ticket, setTicket] = useState(null);
  const [history, setHistory] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [error, setError] = useState('');
  const [commentError, setCommentError] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState(null);

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

  async function handleCommentSubmit(event) {
    event.preventDefault();
    const trimmedComment = commentText.trim();
    if (!trimmedComment || submittingComment) return;

    try {
      setSubmittingComment(true);
      setCommentError('');
      const updatedComments = await addTicketComment(id, trimmedComment);
      const updatedHistory = await fetchTicketHistory(id);
      setComments(updatedComments);
      setHistory(updatedHistory);
      setCommentText('');
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
            <div>
              <Link className="detail-back-link" to="/dashboard">Back to Dashboard</Link>
              <p className="ticket-detail-kicker">Incident Detail</p>
              <h1>{ticket.id}</h1>
              <p>{ticket.description}</p>
            </div>

            <div className="ticket-detail-badges">
              <span className={`status-badge ${getStatusClass(ticket.status)}`}>{ticket.status}</span>
              <span className={`priority-pill ${getPriorityClass(ticket.priority)}`}>
                <span className={`priority-dot ${getPriorityClass(ticket.priority)}`}></span>
                {ticket.priority}
              </span>
            </div>
          </section>

          <section className="ticket-detail-grid">
            <div className="ticket-detail-panel sla-panel">
              <div className="detail-section-heading">
                <h2>SLA</h2>
                <span className={`sla-badge sla-${ticket.slaUrgency || 'none'}`}>{displayValue(ticket.slaRemainingLabel)}</span>
              </div>
              <dl className="detail-definition-grid">
                <div><dt>SLA Type</dt><dd>{ticket.slaType === 'business' ? 'Business Hours' : 'Normal Hours'}</dd></div>
                <div><dt>SLA Hours</dt><dd>{displayValue(ticket.slaHours)}</dd></div>
                <div><dt>Deadline</dt><dd>{formatDateTime(ticket.slaDeadline)}</dd></div>
              </dl>
            </div>

            <div className="ticket-detail-panel">
              <div className="detail-section-heading">
                <h2>History</h2>
              </div>

              <div className="history-list">
                {history.length === 0 ? (
                  <p className="detail-muted">No history yet. New changes will appear here.</p>
                ) : (
                  history.map((entry) => (
                    <article className="history-item" key={entry.id}>
                      <span></span>
                      <div>
                        <strong>{getHistoryText(entry)}</strong>
                        <p>{entry.userName} - {formatDateTime(entry.createdAt)}</p>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          </section>

          <section className="ticket-detail-notes-row">
            <div className="ticket-detail-panel work-notes-panel">
              <div className="detail-section-heading">
                <h2>Work Notes</h2>
              </div>

              {canComment && (
                <form className="comment-form" onSubmit={handleCommentSubmit}>
                  <label htmlFor="ticket-comment">Add work note</label>
                  <textarea
                    id="ticket-comment"
                    value={commentText}
                    onChange={(event) => setCommentText(event.target.value)}
                    placeholder="Write what happened, what you checked, or what changed."
                  />
                  {commentError && <p className="detail-error">{commentError}</p>}
                  <button type="submit" disabled={submittingComment || !commentText.trim()}>
                    {submittingComment ? 'Adding...' : 'Add Note'}
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
                      <p>{comment.commentText}</p>
                    </article>
                  ))
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

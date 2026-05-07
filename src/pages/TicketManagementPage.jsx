import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import '../styles/ticket-management.css';
import { AUTH_ROLES, useAuth } from '../auth';
import { createTicket, deleteTicket, fetchTickets, updateTicket } from '../utils/tickets';
import { fetchUsers } from '../utils/users';

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

function getPriorityClass(priority) {
  if (priority === 'Critical') return 'critical';
  if (priority === 'High') return 'high';
  if (priority === 'Medium') return 'medium';
  return 'low';
}

function getStatusClass(status) {
  if (status === 'Open') return 'open';
  if (status === 'In Progress') return 'progress';
  if (status === 'Resolved') return 'resolved';
  if (status === 'Closed') return 'closed';
  return 'pending';
}

function getNextTicketId(tickets) {
  const nextNumber = tickets.reduce((current, ticket) => {
    const numericId = Number.parseInt(String(ticket.id).replace(/\D/g, ''), 10);
    return Number.isNaN(numericId) ? current : Math.max(current, numericId);
  }, 1300) + 1;

  return `INC${String(nextNumber).padStart(6, '0')}`;
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function calculateAging(submitDate) {
  const submitted = new Date(submitDate);
  if (Number.isNaN(submitted.getTime())) return 0;
  const diffMs = Date.now() - submitted.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function buildDefaultForm() {
  return {
    description: '',
    status: 'Open',
    priority: 'Medium',
    assignedGroup: 'Service Desk',
    serviceType: 'Application',
    assignedPersonUserId: '',
  };
}

export default function TicketManagementPage() {
  const { role, user, logout } = useAuth();
  const [allTickets, setAllTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('my');
  const [filters, setFilters] = useState({ search: '', status: '', priority: '' });
  const [modalMode, setModalMode] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [formData, setFormData] = useState(buildDefaultForm());
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setError('');
        const [ticketData, userData] = await Promise.all([fetchTickets(), fetchUsers()]);
        setAllTickets(ticketData);
        setUsers(userData);
      } catch (err) {
        setError('Failed to load ticket data from the backend API.');
        setAllTickets([]);
        setUsers([]);
      }
    }

    loadData();
  }, []);

  const canUseManagement = role !== AUTH_ROLES.VIEWER;
  const canCreateTicket = canUseManagement && activeTab === 'my';
  const canEditMyTickets = canUseManagement && activeTab === 'my';
  const canUpdateAssignedTickets = canUseManagement && activeTab === 'assigned';
  const assignableUsers = useMemo(() => {
    return users.map((availableUser) => ({
      id: String(availableUser.id),
      name: availableUser.name,
    }));
  }, [users]);

  const myTickets = useMemo(() => {
    if (!canUseManagement) return [];
    return allTickets.filter((ticket) => matchesCurrentUser(ticket.Owner, user));
  }, [allTickets, canUseManagement, user]);

  const assignedTickets = useMemo(() => {
    if (!canUseManagement) return [];
    return allTickets.filter((ticket) => matchesCurrentUser(ticket.Assigned_Person, user));
  }, [allTickets, canUseManagement, user]);

  const sourceTickets = activeTab === 'my' ? myTickets : assignedTickets;

  const visibleTickets = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase();

    return sourceTickets.filter((ticket) => {
      const matchesSearch =
        !searchTerm ||
        String(ticket.id).toLowerCase().includes(searchTerm) ||
        ticket.description.toLowerCase().includes(searchTerm) ||
        ticket.Owner.toLowerCase().includes(searchTerm) ||
        ticket.Assigned_Person.toLowerCase().includes(searchTerm) ||
        ticket.serviceType.toLowerCase().includes(searchTerm);
      const matchesStatus = !filters.status || ticket.status === filters.status;
      const matchesPriority = !filters.priority || ticket.priority === filters.priority;

      return matchesSearch && matchesStatus && matchesPriority;
    });
  }, [sourceTickets, filters]);

  function openCreateModal() {
    setSelectedTicket(null);
    setFormData(buildDefaultForm());
    setModalMode('create');
  }

  function openEditModal(ticket) {
    setSelectedTicket(ticket);
    setFormData({
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      assignedGroup: ticket.assignedGroup,
      serviceType: ticket.serviceType,
      assignedPersonUserId: ticket.assignedPersonUserId ? String(ticket.assignedPersonUserId) : '',
    });
    setModalMode('edit');
  }

  function openUpdateModal(ticket) {
    setSelectedTicket(ticket);
    setFormData({
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      assignedGroup: ticket.assignedGroup,
      serviceType: ticket.serviceType,
      assignedPersonUserId: ticket.assignedPersonUserId ? String(ticket.assignedPersonUserId) : '',
    });
    setModalMode('update');
  }

  function closeModal() {
    setModalMode(null);
    setSelectedTicket(null);
    setSubmitting(false);
  }

  function openDeleteModal(ticket) {
    setDeleteTarget(ticket);
  }

  function closeDeleteModal() {
    setDeleteTarget(null);
  }

  async function handleDeleteTicket() {
    if (!canEditMyTickets) return;
    if (!deleteTarget) return;

    setError('');

    try {
      const updatedTickets = await deleteTicket(deleteTarget.id);
      setAllTickets(updatedTickets);
      closeDeleteModal();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ticket delete failed.');
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canUseManagement) return;

    setSubmitting(true);
    setError('');

    try {
      if (modalMode === 'create') {
        const submitDate = getTodayDate();
        const newTicket = {
          id: getNextTicketId(allTickets),
          description: formData.description.trim(),
          status: formData.status,
          priority: formData.priority,
          assignedGroup: formData.assignedGroup.trim(),
          serviceType: formData.serviceType.trim(),
          submitDate,
          aging: calculateAging(submitDate),
          assignedPersonUserId: formData.assignedPersonUserId ? Number(formData.assignedPersonUserId) : null,
        };

        const updatedTickets = await createTicket(newTicket);
        setAllTickets(updatedTickets);
      }

      if (modalMode === 'edit' && selectedTicket) {
        const updatedTicket = {
          ...selectedTicket,
          description: formData.description.trim(),
          status: formData.status,
          priority: formData.priority,
          assignedGroup: formData.assignedGroup.trim(),
          serviceType: formData.serviceType.trim(),
          assignedPersonUserId: formData.assignedPersonUserId ? Number(formData.assignedPersonUserId) : null,
          aging: calculateAging(selectedTicket.submitDate),
        };

        const updatedTickets = await updateTicket(updatedTicket);
        setAllTickets(updatedTickets);
      }

      if (modalMode === 'update' && selectedTicket) {
        const updatedTicket = {
          ...selectedTicket,
          status: formData.status,
          aging: calculateAging(selectedTicket.submitDate),
        };

        const updatedTickets = await updateTicket(updatedTicket);
        setAllTickets(updatedTickets);
      }

      closeModal();
    } catch (err) {
      setSubmitting(false);
      setError(err instanceof Error ? err.message : 'Ticket update failed.');
    }
  }

  return (
    <div className="ticket-page">
      <div className="ticket-shell">
        <aside className="ticket-sidebar">
          <div className="brand-block">
            <img src="/assets/login-welcome/Images/nokia - Copy.svg" className="brand-logo" alt="Nokia" />
            <p>Operation Tracking</p>
          </div>

          <nav className="sidebar-links" aria-label="Primary navigation">
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/tickets">Ticket Management</NavLink>
            <NavLink to="/statistics">Statistics</NavLink>
          </nav>

          <div className="sidebar-divider"></div>

          <div className="sidebar-modes" aria-label="Ticket sections">
            <button type="button" className={activeTab === 'my' ? 'mode-button active' : 'mode-button'} onClick={() => setActiveTab('my')}>
              My Tickets
            </button>
            <button type="button" className={activeTab === 'assigned' ? 'mode-button active' : 'mode-button'} onClick={() => setActiveTab('assigned')}>
              Assigned Tickets
            </button>
          </div>

          <button type="button" className="logout-button" onClick={logout}>Log-out</button>
        </aside>

        <main className="ticket-main">
          <section className="ticket-hero">
            <div>
              <p className="hero-kicker">{activeTab === 'my' ? 'My Tickets' : 'Assigned Tickets'}</p>
              <h1>{activeTab === 'my' ? 'Your owned incident queue' : 'Your assigned work queue'}</h1>
              <p>{activeTab === 'my' ? 'Create, review, and edit the tickets you own.' : 'Update the progress of tickets assigned to you.'}</p>
            </div>
          </section>

          {!canUseManagement && (
            <section className="viewer-note">
              Viewer mode cannot access ticket management actions.
            </section>
          )}

          <section className="toolbar-panel">
            <div className="toolbar-copy">
              <h2>{activeTab === 'my' ? 'My Tickets' : 'Assigned Tickets'}</h2>
              <p>{visibleTickets.length} tickets in this view</p>
            </div>

            <div className="toolbar-filters">
              <input value={filters.search} onChange={(e) => setFilters((current) => ({ ...current, search: e.target.value }))} type="text" placeholder="Search tickets" />
              <select value={filters.status} onChange={(e) => setFilters((current) => ({ ...current, status: e.target.value }))}>
                <option value="">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Pending">Pending</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
              <select value={filters.priority} onChange={(e) => setFilters((current) => ({ ...current, priority: e.target.value }))}>
                <option value="">All Priorities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            {canCreateTicket && (
              <button type="button" className="create-ticket-button" onClick={openCreateModal}>
                <span>+</span>
                <strong>Create Ticket</strong>
              </button>
            )}
          </section>

          {(error || visibleTickets.length === 0) ? (
            <section className="empty-grid-state">
              {error || (activeTab === 'my' ? 'No owned tickets match this view.' : 'No assigned tickets match this view.')}
            </section>
          ) : (
            <section className="ticket-grid">
              {visibleTickets.map((ticket) => (
                <article className="ticket-card" key={ticket.id}>
                  <div className="ticket-card-top">
                    <div>
                      <p className="ticket-card-label">{ticket.id}</p>
                      <h3>{ticket.serviceType}</h3>
                    </div>
                    <div className="ticket-badges">
                      <span className={`status-pill ${getStatusClass(ticket.status)}`}>{ticket.status}</span>
                      <span className={`priority-pill ${getPriorityClass(ticket.priority)}`}>{ticket.priority}</span>
                    </div>
                  </div>

                  <p className="ticket-description">{ticket.description}</p>

                  <dl className="ticket-properties">
                    <div><dt>Owner</dt><dd>{ticket.Owner}</dd></div>
                    <div><dt>Assigned</dt><dd>{ticket.Assigned_Person}</dd></div>
                    <div><dt>Queue</dt><dd>{ticket.assignedGroup}</dd></div>
                    <div><dt>Submitted</dt><dd>{ticket.submitDate}</dd></div>
                    <div><dt>Aging</dt><dd>{ticket.aging} days</dd></div>
                  </dl>

                  <div className="ticket-card-footer">
                    {canEditMyTickets && activeTab === 'my' && (
                      <>
                        <button type="button" className="card-action card-action-secondary" onClick={() => openDeleteModal(ticket)}>
                          Delete
                        </button>
                        <button type="button" className="card-action" onClick={() => openEditModal(ticket)}>
                          Edit
                        </button>
                      </>
                    )}
                    {canUpdateAssignedTickets && activeTab === 'assigned' && (
                      <button type="button" className="card-action" onClick={() => openUpdateModal(ticket)}>
                        Update
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </section>
          )}
        </main>
      </div>

      <div className={`modal-overlay ${modalMode ? 'active' : ''}`} aria-hidden={!modalMode}>
        <div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="ticket-modal-title">
          <h2 id="ticket-modal-title">
            {modalMode === 'create' ? 'Create Ticket' : modalMode === 'edit' ? 'Edit Ticket' : 'Update Ticket'}
          </h2>

          <form onSubmit={handleSubmit}>
            {(modalMode === 'create' || modalMode === 'edit') && (
              <>
                <label htmlFor="ticket-description">Description</label>
                <input id="ticket-description" type="text" required value={formData.description} onChange={(e) => setFormData((current) => ({ ...current, description: e.target.value }))} />

                <label htmlFor="ticket-priority">Priority</label>
                <select id="ticket-priority" required value={formData.priority} onChange={(e) => setFormData((current) => ({ ...current, priority: e.target.value }))}>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>

                <label htmlFor="ticket-group">Assigned Group</label>
                <input id="ticket-group" type="text" required value={formData.assignedGroup} onChange={(e) => setFormData((current) => ({ ...current, assignedGroup: e.target.value }))} />

                <label htmlFor="ticket-service">Service Type</label>
                <input id="ticket-service" type="text" required value={formData.serviceType} onChange={(e) => setFormData((current) => ({ ...current, serviceType: e.target.value }))} />

                <label htmlFor="ticket-assigned">Assigned User</label>
                <select id="ticket-assigned" required value={formData.assignedPersonUserId} onChange={(e) => setFormData((current) => ({ ...current, assignedPersonUserId: e.target.value }))}>
                  <option value="">Select user</option>
                  {assignableUsers.map((assignableUser) => (
                    <option key={assignableUser.id} value={assignableUser.id}>{assignableUser.name}</option>
                  ))}
                </select>
              </>
            )}

            <label htmlFor="ticket-status">Status</label>
            <select id="ticket-status" required value={formData.status} onChange={(e) => setFormData((current) => ({ ...current, status: e.target.value }))}>
              <option value="Open">Open</option>
              <option value="In Progress">In Progress</option>
              <option value="Pending">Pending</option>
              <option value="Resolved">Resolved</option>
              <option value="Closed">Closed</option>
            </select>

            {(modalMode === 'create' || modalMode === 'edit') && (
              <>
                <label htmlFor="ticket-owner">Owner</label>
                <input id="ticket-owner" type="text" value={modalMode === 'create' ? (user?.name || '') : (selectedTicket?.Owner || '')} disabled />
              </>
            )}

            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={closeModal} disabled={submitting}>Cancel</button>
              <button type="submit" className="primary-button" disabled={submitting}>
                {modalMode === 'create' ? 'Create' : modalMode === 'edit' ? 'Save' : 'Update'}
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className={`modal-overlay ${deleteTarget ? 'active' : ''}`} aria-hidden={!deleteTarget}>
        <div className="modal-card delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
          <h2 id="delete-modal-title">Delete Ticket</h2>
          <p className="delete-warning">
            Are you sure you want to delete `{deleteTarget?.id}`? This will remove the ticket from the database.
          </p>
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={closeDeleteModal}>Cancel</button>
            <button type="button" className="danger-button" onClick={handleDeleteTicket}>Delete</button>
          </div>
        </div>
      </div>
    </div>
  );
}

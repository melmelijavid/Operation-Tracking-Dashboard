import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import '../styles/ticket-management.css';
import { AUTH_ROLES, useAuth } from '../auth';
import { createTicket, deleteTicket, fetchTickets, updateTicket } from '../utils/tickets';
import { fetchUsers } from '../utils/users';
import { fetchTeams } from '../utils/teams';
import { fetchSites } from '../utils/sites';
import PaginationButtons from '../components/PaginationButtons';

const TICKETS_PER_PAGE = 6;

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

function getTicketCardClass(ticket) {
  if (ticket.status === 'Resolved' || ticket.status === 'Closed') {
    return 'ticket-card completed';
  }

  if (ticket.slaUrgency === 'warning') return 'ticket-card sla-warning';
  if (ticket.slaUrgency === 'danger') return 'ticket-card sla-danger';
  if (ticket.slaUrgency === 'overdue') return 'ticket-card sla-overdue';
  return 'ticket-card';
}

function isCompletedTicket(ticket) {
  return ticket.status === 'Resolved' || ticket.status === 'Closed';
}

function matchesSlaFilter(ticket, slaFilter) {
  if (!slaFilter) return true;
  if (slaFilter === 'completed') return isCompletedTicket(ticket);
  if (isCompletedTicket(ticket)) return false;

  if (slaFilter === 'overdue') return ticket.slaUrgency === 'overdue';
  if (slaFilter === 'urgent') return ticket.slaUrgency === 'danger';
  if (slaFilter === 'warning') return ticket.slaUrgency === 'warning';
  if (slaFilter === 'normal') {
    return ticket.slaUrgency === 'normal' || ticket.slaUrgency === 'none' || !ticket.slaUrgency;
  }

  return true;
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

function getDefaultSlaForPriority(priority) {
  if (priority === 'Critical') return { slaType: 'normal', slaHours: 4 };
  if (priority === 'High') return { slaType: 'normal', slaHours: 8 };
  if (priority === 'Medium') return { slaType: 'business', slaHours: 24 };
  return { slaType: 'business', slaHours: 72 };
}

function formatDate(value) {
  if (!value) return '-';
  const [year, month, day] = String(value).slice(0, 10).split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function calculateAging(submitDate) {
  const submitted = new Date(submitDate);
  if (Number.isNaN(submitted.getTime())) return 0;
  const diffMs = Date.now() - submitted.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function buildDefaultForm() {
  const defaultSla = getDefaultSlaForPriority('Medium');

  return {
    description: '',
    status: 'Open',
    priority: 'Medium',
    assignedGroup: 'Service Desk',
    siteId: '',
    serviceType: 'Application',
    slaType: defaultSla.slaType,
    slaHours: String(defaultSla.slaHours),
    company: '',
    productCategorizationTier1: '',
    productCategorizationTier2: '',
    productCategorizationTier3: '',
    categorizationTier1: '',
    assignedPersonUserId: '',
  };
}

function userBelongsToTeam(availableUser, teamName) {
  if (!teamName) return false;
  return (availableUser.teams || []).some((team) => team.name === teamName);
}

export default function TicketManagementPage() {
  const { role, user, logout } = useAuth();
  const [allTickets, setAllTickets] = useState([]);
  const [users, setUsers] = useState([]);
  const [teams, setTeams] = useState([]);
  const [sites, setSites] = useState([]);
  const [activeTab, setActiveTab] = useState('my');
  const [filters, setFilters] = useState({ search: '', status: '', priority: '', sla: '' });
  const [currentPage, setCurrentPage] = useState(1);
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
        const [ticketData, userData, teamData, siteData] = await Promise.all([
          fetchTickets(),
          fetchUsers(),
          fetchTeams(),
          fetchSites(),
        ]);
        setAllTickets(ticketData);
        setUsers(userData);
        setTeams(teamData);
        setSites(siteData);
      } catch (err) {
        setError('Failed to load ticket data from the backend API.');
        setAllTickets([]);
        setUsers([]);
        setTeams([]);
        setSites([]);
      }
    }

    loadData();
  }, []);

  const canUseManagement = role !== AUTH_ROLES.VIEWER;
  const canCreateTicket = canUseManagement && activeTab === 'my';
  const canEditMyTickets = canUseManagement && activeTab === 'my';
  const canUpdateAssignedTickets = canUseManagement && activeTab === 'assigned';
  const assignableUsers = useMemo(() => {
    return users.filter((availableUser) => userBelongsToTeam(availableUser, formData.assignedGroup)).map((availableUser) => ({
      id: String(availableUser.id),
      name: availableUser.name,
    }));
  }, [formData.assignedGroup, users]);

  useEffect(() => {
    if (!modalMode || !formData.assignedPersonUserId) return;
    const selectedUserIsAssignable = assignableUsers.some((assignableUser) => (
      assignableUser.id === String(formData.assignedPersonUserId)
    ));

    if (!selectedUserIsAssignable) {
      setFormData((current) => ({ ...current, assignedPersonUserId: '' }));
    }
  }, [assignableUsers, formData.assignedPersonUserId, modalMode]);

  const myTickets = useMemo(() => {
    if (!canUseManagement) return [];
    if (role === AUTH_ROLES.ADMIN) return allTickets;
    return allTickets.filter((ticket) => matchesCurrentUser(ticket.Owner, user));
  }, [allTickets, canUseManagement, role, user]);

  const assignedTickets = useMemo(() => {
    if (!canUseManagement) return [];
    return allTickets.filter((ticket) => matchesCurrentUser(ticket.Assigned_Person, user));
  }, [allTickets, canUseManagement, user]);

  const sourceTickets = activeTab === 'my' ? myTickets : assignedTickets;

  const filteredTickets = useMemo(() => {
    const searchTerm = filters.search.trim().toLowerCase();

    return sourceTickets.filter((ticket) => {
      const matchesSearch =
        !searchTerm ||
        String(ticket.id).toLowerCase().includes(searchTerm) ||
        ticket.description.toLowerCase().includes(searchTerm) ||
        ticket.Owner.toLowerCase().includes(searchTerm) ||
        ticket.Assigned_Person.toLowerCase().includes(searchTerm) ||
        String(ticket.siteId || '').toLowerCase().includes(searchTerm) ||
        ticket.serviceType.toLowerCase().includes(searchTerm);
      const matchesStatus = !filters.status || ticket.status === filters.status;
      const matchesPriority = !filters.priority || ticket.priority === filters.priority;
      const matchesSla = matchesSlaFilter(ticket, filters.sla);

      return matchesSearch && matchesStatus && matchesPriority && matchesSla;
    });
  }, [sourceTickets, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / TICKETS_PER_PAGE));
  const pageStart = (currentPage - 1) * TICKETS_PER_PAGE;
  const pageEnd = pageStart + TICKETS_PER_PAGE;
  const visibleTickets = filteredTickets.slice(pageStart, pageEnd);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
    setCurrentPage(1);
  }

  function switchTab(nextTab) {
    setActiveTab(nextTab);
    setCurrentPage(1);
  }

  function openCreateModal() {
    setSelectedTicket(null);
    setFormData({ ...buildDefaultForm(), siteId: sites[0]?.siteId || '' });
    setModalMode('create');
  }

  function openEditModal(ticket) {
    setSelectedTicket(ticket);
    setFormData({
      description: ticket.description,
      status: ticket.status,
      priority: ticket.priority,
      assignedGroup: ticket.assignedGroup,
      siteId: ticket.siteId || '',
      serviceType: ticket.serviceType,
      slaType: ticket.slaType || getDefaultSlaForPriority(ticket.priority).slaType,
      slaHours: String(ticket.slaHours || getDefaultSlaForPriority(ticket.priority).slaHours),
      company: ticket.company || '',
      productCategorizationTier1: ticket.productCategorizationTier1 || '',
      productCategorizationTier2: ticket.productCategorizationTier2 || '',
      productCategorizationTier3: ticket.productCategorizationTier3 || '',
      categorizationTier1: ticket.categorizationTier1 || '',
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
          siteId: formData.siteId,
          serviceType: formData.serviceType.trim(),
          slaType: formData.slaType,
          slaHours: Number(formData.slaHours),
          company: formData.company.trim(),
          productCategorizationTier1: formData.productCategorizationTier1.trim(),
          productCategorizationTier2: formData.productCategorizationTier2.trim(),
          productCategorizationTier3: formData.productCategorizationTier3.trim(),
          categorizationTier1: formData.categorizationTier1.trim(),
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
          siteId: formData.siteId,
          serviceType: formData.serviceType.trim(),
          slaType: formData.slaType,
          slaHours: Number(formData.slaHours),
          company: formData.company.trim(),
          productCategorizationTier1: formData.productCategorizationTier1.trim(),
          productCategorizationTier2: formData.productCategorizationTier2.trim(),
          productCategorizationTier3: formData.productCategorizationTier3.trim(),
          categorizationTier1: formData.categorizationTier1.trim(),
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

  function handlePriorityChange(priority) {
    const defaultSla = getDefaultSlaForPriority(priority);
    setFormData((current) => ({
      ...current,
      priority,
      slaType: defaultSla.slaType,
      slaHours: String(defaultSla.slaHours),
    }));
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
            <NavLink to="/statistics">Analytics</NavLink>
          </nav>

          <div className="sidebar-divider"></div>

          <div className="sidebar-modes" aria-label="Ticket sections">
            <button type="button" className={activeTab === 'my' ? 'mode-button active' : 'mode-button'} onClick={() => switchTab('my')}>
              My Tickets
            </button>
            <button type="button" className={activeTab === 'assigned' ? 'mode-button active' : 'mode-button'} onClick={() => switchTab('assigned')}>
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
              <p>{filteredTickets.length} tickets in this view</p>
            </div>

            <div className="toolbar-filters">
              <input value={filters.search} onChange={(e) => updateFilter('search', e.target.value)} type="text" placeholder="Search tickets" />
              <select value={filters.status} onChange={(e) => updateFilter('status', e.target.value)}>
                <option value="">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Pending">Pending</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
              </select>
              <select value={filters.priority} onChange={(e) => updateFilter('priority', e.target.value)}>
                <option value="">All Priorities</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
              <select value={filters.sla} onChange={(e) => updateFilter('sla', e.target.value)} aria-label="SLA filter">
                <option value="">All SLA</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
                <option value="urgent">Urgent</option>
                <option value="warning">Warning</option>
                <option value="normal">Normal</option>
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
            <>
              <section className="ticket-grid">
                {visibleTickets.map((ticket) => (
                  <article className={getTicketCardClass(ticket)} key={ticket.id}>
                    <div className="ticket-card-top">
                      <div>
                        <p className="ticket-card-label">{ticket.id}</p>
                        <h3><Link to={`/tickets/${encodeURIComponent(ticket.id)}`}>{ticket.serviceType}</Link></h3>
                        <span className={`ticket-sla-pill ${ticket.slaUrgency || 'none'}`}>
                          SLA: {ticket.slaRemainingLabel || '-'}
                        </span>
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
                      <div><dt>Team</dt><dd>{ticket.assignedGroup}</dd></div>
                      <div><dt>Site ID</dt><dd>{ticket.siteId || '-'}</dd></div>
                      <div><dt>Company</dt><dd>{ticket.company || '-'}</dd></div>
                      <div><dt>Submitted</dt><dd>{formatDate(ticket.submitDate)}</dd></div>
                      <div><dt>Last Modified</dt><dd>{formatDate(ticket.lastModifiedDate)}</dd></div>
                      <div><dt>Close Date</dt><dd>{formatDate(ticket.closeDate)}</dd></div>
                      <div><dt>Aging</dt><dd>{ticket.aging} days</dd></div>
                    </dl>

                    <div className="ticket-card-footer">
                      <Link className="card-action card-detail-link" to={`/tickets/${encodeURIComponent(ticket.id)}`}>
                        Details
                      </Link>
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

              <div className="ticket-pagination" aria-label="Ticket pagination">
                <p>
                  Showing {pageStart + 1}-{Math.min(pageEnd, filteredTickets.length)} of {filteredTickets.length} tickets
                </p>
                <div className="ticket-pagination-buttons">
                  <button
                    type="button"
                    className="ticket-page-button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  >
                    Previous
                  </button>
                  <PaginationButtons
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    buttonClassName="ticket-page-button"
                  />
                  <button
                    type="button"
                    className="ticket-page-button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
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
                <select id="ticket-priority" required value={formData.priority} onChange={(e) => handlePriorityChange(e.target.value)}>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>

                <label htmlFor="ticket-group">Team</label>
                <select
                  id="ticket-group"
                  required
                  value={formData.assignedGroup}
                  onChange={(e) => setFormData((current) => ({ ...current, assignedGroup: e.target.value, assignedPersonUserId: '' }))}
                >
                  {!teams.some((t) => t.name === formData.assignedGroup) && formData.assignedGroup && (
                    <option value={formData.assignedGroup}>{formData.assignedGroup} (legacy)</option>
                  )}
                  {teams.map((team) => (
                    <option key={team.id} value={team.name}>{team.name}</option>
                  ))}
                </select>

                <label htmlFor="ticket-site">Site ID</label>
                <select
                  id="ticket-site"
                  required
                  value={formData.siteId}
                  onChange={(e) => setFormData((current) => ({ ...current, siteId: e.target.value }))}
                >
                  <option value="">Select site</option>
                  {sites.map((site) => (
                    <option key={site.siteId} value={site.siteId}>
                      {site.siteId} - {site.city}, {site.country} - {site.infrastructureType}
                    </option>
                  ))}
                </select>

                <label htmlFor="ticket-service">Service Type</label>
                <input id="ticket-service" type="text" required value={formData.serviceType} onChange={(e) => setFormData((current) => ({ ...current, serviceType: e.target.value }))} />

                <label htmlFor="ticket-sla-type">SLA Type</label>
                <select id="ticket-sla-type" required value={formData.slaType} onChange={(e) => setFormData((current) => ({ ...current, slaType: e.target.value }))}>
                  <option value="normal">Normal Hours</option>
                  <option value="business">Business Hours</option>
                </select>

                <label htmlFor="ticket-sla-hours">SLA Hours</label>
                <input id="ticket-sla-hours" type="number" required min="1" value={formData.slaHours} onChange={(e) => setFormData((current) => ({ ...current, slaHours: e.target.value }))} />

                <label htmlFor="ticket-company">Company</label>
                <input id="ticket-company" type="text" required value={formData.company} onChange={(e) => setFormData((current) => ({ ...current, company: e.target.value }))} />

                <label htmlFor="ticket-product-tier-1">Product Categorization Tier 1</label>
                <input id="ticket-product-tier-1" type="text" value={formData.productCategorizationTier1} onChange={(e) => setFormData((current) => ({ ...current, productCategorizationTier1: e.target.value }))} />

                <label htmlFor="ticket-product-tier-2">Product Categorization Tier 2</label>
                <input id="ticket-product-tier-2" type="text" value={formData.productCategorizationTier2} onChange={(e) => setFormData((current) => ({ ...current, productCategorizationTier2: e.target.value }))} />

                <label htmlFor="ticket-product-tier-3">Product Categorization Tier 3</label>
                <input id="ticket-product-tier-3" type="text" value={formData.productCategorizationTier3} onChange={(e) => setFormData((current) => ({ ...current, productCategorizationTier3: e.target.value }))} />

                <label htmlFor="ticket-category-tier-1">Categorization Tier 1</label>
                <input id="ticket-category-tier-1" type="text" value={formData.categorizationTier1} onChange={(e) => setFormData((current) => ({ ...current, categorizationTier1: e.target.value }))} />

                <label htmlFor="ticket-assigned">Assigned User</label>
                <select id="ticket-assigned" required value={formData.assignedPersonUserId} onChange={(e) => setFormData((current) => ({ ...current, assignedPersonUserId: e.target.value }))}>
                  <option value="">{formData.assignedGroup ? 'Select user' : 'Select team first'}</option>
                  {assignableUsers.map((assignableUser) => (
                    <option key={assignableUser.id} value={assignableUser.id}>{assignableUser.name}</option>
                  ))}
                </select>
                {formData.assignedGroup && assignableUsers.length === 0 && (
                  <p className="modal-hint">No users belong to the selected team.</p>
                )}
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

import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import '../styles/dashboard.css';
import { useAuth } from '../auth';
import { fetchTickets, getDashboardTicketsForRole } from '../utils/tickets';
import { fetchTeams } from '../utils/teams';
import PaginationButtons from '../components/PaginationButtons';

const TICKETS_PER_PAGE = 20;
const DEFAULT_FILTERS = {
  search: '',
  status: [],
  priority: [],
  group: [],
  submitStartDate: '',
  submitEndDate: '',
  sla: [],
};

const STATUS_OPTIONS = ['Open', 'In Progress', 'Pending', 'Resolved', 'Closed'];
const PRIORITY_OPTIONS = ['Critical', 'High', 'Medium', 'Low'];
const SLA_OPTIONS = ['Completed', 'Overdue', 'Urgent', 'Warning', 'Normal'];
const FILTER_CHIP_LABELS = {
  status: 'Status',
  priority: 'Priority',
  group: 'Team',
  sla: 'SLA',
};

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

function getTicketRowClass(ticket) {
  if (ticket.status === 'Closed' || ticket.status === 'Resolved') {
    return 'ticket-row-completed';
  }

  return `sla-row sla-row-${ticket.slaUrgency || 'none'}`;
}

function isCompletedTicket(ticket) {
  return ticket.status === 'Resolved' || ticket.status === 'Closed';
}

function matchesSlaFilter(ticket, slaFilter) {
  if (slaFilter === 'Completed') return isCompletedTicket(ticket);
  if (isCompletedTicket(ticket)) return false;

  if (slaFilter === 'Overdue') return ticket.slaUrgency === 'overdue';
  if (slaFilter === 'Urgent') return ticket.slaUrgency === 'danger';
  if (slaFilter === 'Warning') return ticket.slaUrgency === 'warning';
  if (slaFilter === 'Normal') {
    return ticket.slaUrgency === 'normal' || ticket.slaUrgency === 'none' || !ticket.slaUrgency;
  }

  return true;
}

function matchesSelectedValues(value, selectedValues) {
  return selectedValues.length === 0 || selectedValues.includes(value);
}

function matchesDateRange(dateValue, startDate, endDate) {
  if (!startDate && !endDate) return true;
  if (!dateValue) return false;

  if (startDate && dateValue < startDate) return false;
  if (endDate && dateValue > endDate) return false;
  return true;
}

function displayValue(value) {
  return value || '-';
}

function normalizeValue(value) {
  return String(value || '').trim().toLowerCase();
}

function getUserDisplayName(user) {
  if (user?.name) return user.name;
  if (user?.email) return user.email.split('@')[0];
  return 'User';
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 18) return 'Good Afternoon';
  return 'Good Evening';
}

function ticketBelongsToUser(ticket, user) {
  if (!user) return false;

  const userKeys = [
    user.name,
    user.email,
    user.email?.split('@')[0],
    user.id,
  ].map(normalizeValue).filter(Boolean);

  const owner = normalizeValue(ticket.Owner);
  const assignedPerson = normalizeValue(ticket.Assigned_Person);

  return userKeys.some((key) => key === owner || key === assignedPerson);
}

function formatDate(value) {
  if (!value) return '-';
  const [year, month, day] = String(value).slice(0, 10).split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

export default function DashboardPage() {
  const { role, user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [teams, setTeams] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [error, setError] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [urgentWarningDismissed, setUrgentWarningDismissed] = useState(false);

  useEffect(() => {
    async function loadTickets() {
      try {
        setError('');
        const [ticketsData, teamsData] = await Promise.all([fetchTickets(), fetchTeams()]);
        setTickets(getDashboardTicketsForRole(ticketsData, role));
        setTeams(teamsData);
      } catch (err) {
        setError('Failed to load ticket data from the backend API.');
        setTickets([]);
        setTeams([]);
      }
    }
    loadTickets();
  }, [role]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const searchValue = filters.search.toLowerCase().trim();
      const matchesSearch =
        ticket.id.toLowerCase().includes(searchValue) ||
        String(ticket.siteId || '').toLowerCase().includes(searchValue) ||
        ticket.description.toLowerCase().includes(searchValue);
      const matchesStatus = matchesSelectedValues(ticket.status, filters.status);
      const matchesPriority = matchesSelectedValues(ticket.priority, filters.priority);
      const matchesGroup = matchesSelectedValues(ticket.assignedGroup, filters.group);
      const matchesDate = matchesDateRange(ticket.submitDate, filters.submitStartDate, filters.submitEndDate);
      const matchesSla = filters.sla.length === 0 || filters.sla.some((slaFilter) => matchesSlaFilter(ticket, slaFilter));
      return matchesSearch && matchesStatus && matchesPriority && matchesGroup && matchesDate && matchesSla;
    });
  }, [tickets, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / TICKETS_PER_PAGE));
  const pageStart = (currentPage - 1) * TICKETS_PER_PAGE;
  const pageEnd = pageStart + TICKETS_PER_PAGE;
  const visibleTickets = filteredTickets.slice(pageStart, pageEnd);
  const userDisplayName = getUserDisplayName(user);
  const urgentTickets = useMemo(() => {
    return tickets.filter((ticket) => (
      !isCompletedTicket(ticket) &&
      ticket.slaUrgency === 'danger' &&
      ticketBelongsToUser(ticket, user)
    ));
  }, [tickets, user]);
  const urgentTicketCount = urgentTickets.length;
  const shouldShowUrgentWarning = urgentTicketCount > 0 && !urgentWarningDismissed;
  const activeFilterChips = ['status', 'priority', 'group', 'sla'].flatMap((filterName) => (
    filters[filterName].map((value) => ({
      filterName,
      value,
      label: `${FILTER_CHIP_LABELS[filterName]}: ${value}`,
    }))
  ));

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
    setCurrentPage(1);
  }

  function addFilterValue(name, value) {
    if (!value) return;
    setFilters((current) => {
      if (current[name].includes(value)) return current;
      return { ...current, [name]: [...current[name], value] };
    });
    setCurrentPage(1);
  }

  function removeFilterValue(name, value) {
    setFilters((current) => ({
      ...current,
      [name]: current[name].filter((filterValue) => filterValue !== value),
    }));
    setCurrentPage(1);
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
    setCurrentPage(1);
  }

  function showUrgentTicketsFromWarning() {
    setFilters((current) => ({
      ...current,
      sla: current.sla.includes('Urgent') ? current.sla : [...current.sla, 'Urgent'],
    }));
    setCurrentPage(1);
    setUrgentWarningDismissed(true);
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-shell">
        <aside className="dashboard-sidebar">
          <div className="brand-block">
            <img src="/assets/login-welcome/Images/nokia - Copy.svg" className="brand-logo" alt="Nokia" />
            <p>Operation Tracking</p>
          </div>

          <nav className="dashboard-nav" aria-label="Dashboard navigation">
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/welcome">Welcome</NavLink>
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/tickets">Ticket Management</NavLink>
            <NavLink to="/statistics">Analytics</NavLink>
          </nav>

          <div className="sidebar-status">
            <span className="status-light"></span>
            <div>
              <strong>Live Console</strong>
              <p>{tickets.length} tickets loaded</p>
            </div>
          </div>
        </aside>

        <main className="dashboard-main">
          <section className="hero-panel">
            <div className="hero-copy">
              <p className="welcome-header">{getGreeting()}, {userDisplayName}</p>
              <p className="welcome-sign">Nokia</p>
              <h1 className="welcome-title">Incident Management Console</h1>
              <p className="welcome-subtitle">Operational incidents, ownership, and priority pressure in one focused workspace.</p>
            </div>

            <div className="hero-actions">
              <div className="country-box">
                <div className="country-label">Country</div>
                <div className="country-value">Romania</div>
              </div>
            </div>
          </section>

          <section className={`panel collapsible-panel ${filtersOpen ? 'is-open' : ''}`} aria-hidden={!filtersOpen}>
            <div className="section-top">
              <div>
                <h2 className="section-title">Filters</h2>
                <p className="section-note">Filter the ticket list by status, priority, team, text, SLA, and submit date period.</p>
              </div>
              <button className="btn btn-reset" onClick={resetFilters}>Reset</button>
            </div>
            <div className="filters">
              <div className="field"><label htmlFor="statusFilter">Status</label><select id="statusFilter" value="" onChange={(e)=>addFilterValue('status', e.target.value)}><option value="">Add status</option>{STATUS_OPTIONS.map((status) => <option key={status} value={status} disabled={filters.status.includes(status)}>{status}</option>)}</select></div>
              <div className="field"><label htmlFor="priorityFilter">Priority</label><select id="priorityFilter" value="" onChange={(e)=>addFilterValue('priority', e.target.value)}><option value="">Add priority</option>{PRIORITY_OPTIONS.map((priority) => <option key={priority} value={priority} disabled={filters.priority.includes(priority)}>{priority}</option>)}</select></div>
              <div className="field">
                <label htmlFor="groupFilter">Team</label>
                <select id="groupFilter" value="" onChange={(e) => addFilterValue('group', e.target.value)}>
                  <option value="">Add team</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.name} disabled={filters.group.includes(team.name)}>{team.name}</option>
                  ))}
                </select>
              </div>
              <div className="field"><label htmlFor="submitStartDateFilter">Submit From</label><input id="submitStartDateFilter" type="date" value={filters.submitStartDate} onChange={(e)=>updateFilter('submitStartDate', e.target.value)} /></div>
              <div className="field"><label htmlFor="submitEndDateFilter">Submit To</label><input id="submitEndDateFilter" type="date" value={filters.submitEndDate} onChange={(e)=>updateFilter('submitEndDate', e.target.value)} /></div>
              <div className="field"><label htmlFor="slaFilter">SLA</label><select id="slaFilter" value="" onChange={(e)=>addFilterValue('sla', e.target.value)}><option value="">Add SLA</option>{SLA_OPTIONS.map((sla) => <option key={sla} value={sla} disabled={filters.sla.includes(sla)}>{sla}</option>)}</select></div>
            </div>
            {activeFilterChips.length > 0 && (
              <div className="active-filter-chips" aria-label="Active filters">
                {activeFilterChips.map((chip) => (
                  <span className="active-filter-chip" key={`${chip.filterName}-${chip.value}`}>
                    {chip.label}
                    <button type="button" aria-label={`Remove ${chip.label}`} onClick={() => removeFilterValue(chip.filterName, chip.value)}>
                      x
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>

          <section className="panel incidents-panel">
            <div className="section-top incidents-top">
              <div className="incident-title-group">
                <h2 className="section-title">Incidents</h2>
                <p className="section-note">Data loaded from backend API.</p>
                <div className="toolbar-left">
                  <button className="btn btn-toggle" type="button" aria-expanded={filtersOpen} onClick={() => setFiltersOpen((current) => !current)}>
                    Filters
                  </button>
                </div>
              </div>
              <label className="toolbar-search" htmlFor="toolbarSearch">
                
                <input id="toolbarSearch" type="text" placeholder="Search by ID or description" value={filters.search} onChange={(e)=>updateFilter('search', e.target.value)} />
              </label>
              <div className="btn-container"><button className="btn btn-export" type="button">Import</button><button className="btn btn-export" type="button">Export</button></div>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Incident</th>
                    <th>Site ID</th>
                    <th>Description</th>
                    <th>SLA Remaining</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Team</th>
                    <th>Owner</th>
                    <th>Assigned Person</th>
                    <th>Company</th>
                    <th>Product Categorization Tier 1</th>
                    <th>Product Categorization Tier 2</th>
                    <th>Product Categorization Tier 3</th>
                    <th>Categorization Tier 1</th>
                    <th>Service Type</th>
                    <th>Submit Date</th>
                    <th>Last Modified Date</th>
                    <th>Resolved Date</th>
                    <th>Close Date</th>
                    <th>Aging</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTickets.map((ticket) => (
                    <tr className={getTicketRowClass(ticket)} key={ticket.id}>
                      <td className="ticket-id"><Link className="ticket-detail-link" to={`/tickets/${encodeURIComponent(ticket.id)}`}>{ticket.id}</Link></td>
                      <td>{displayValue(ticket.siteId)}</td>
                      <td className="description-cell">{ticket.description}</td>
                      <td><span className={`sla-badge sla-${ticket.slaUrgency || 'none'}`}>{displayValue(ticket.slaRemainingLabel)}</span></td>
                      <td><span className={`status-badge ${getStatusClass(ticket.status)}`}>{ticket.status}</span></td>
                      <td><span className={`priority-pill ${getPriorityClass(ticket.priority)}`}><span className={`priority-dot ${getPriorityClass(ticket.priority)}`}></span>{ticket.priority}</span></td>
                      <td>{ticket.assignedGroup}</td>
                      <td>{ticket.Owner}</td>
                      <td>{ticket.Assigned_Person}</td>
                      <td>{displayValue(ticket.company)}</td>
                      <td>{displayValue(ticket.productCategorizationTier1)}</td>
                      <td>{displayValue(ticket.productCategorizationTier2)}</td>
                      <td>{displayValue(ticket.productCategorizationTier3)}</td>
                      <td>{displayValue(ticket.categorizationTier1)}</td>
                      <td><span className="service-chip">{ticket.serviceType}</span></td>
                      <td>{formatDate(ticket.submitDate)}</td>
                      <td>{formatDate(ticket.lastModifiedDate)}</td>
                      <td>{formatDate(ticket.resolvedDate)}</td>
                      <td>{formatDate(ticket.closeDate)}</td>
                      <td className="aging-cell">{ticket.aging} days</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredTickets.length > 0 && (
              <div className="dashboard-pagination" aria-label="Ticket pagination">
                <p>
                  Showing {pageStart + 1}-{Math.min(pageEnd, filteredTickets.length)} of {filteredTickets.length} tickets
                </p>
                <div className="pagination-buttons">
                  <button
                    type="button"
                    className="pagination-button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  >
                    Previous
                  </button>
                  <PaginationButtons
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    buttonClassName="pagination-button"
                  />
                  <button
                    type="button"
                    className="pagination-button"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
            {(error || filteredTickets.length === 0) && <div className="empty-state">{error || 'No tickets match the selected filters.'}</div>}
          </section>
        </main>
      </div>

      {shouldShowUrgentWarning && (
        <div className="urgent-warning-backdrop" role="presentation">
          <div className="urgent-warning-modal" role="alertdialog" aria-modal="true" aria-labelledby="urgentWarningTitle">
            <p className="urgent-warning-kicker">SLA Alert</p>
            <h2 id="urgentWarningTitle">Urgent tickets need attention</h2>
            <p>
              You have {urgentTicketCount} urgent {urgentTicketCount === 1 ? 'ticket' : 'tickets'} close to breaching SLA.
              Please review and solve {urgentTicketCount === 1 ? 'it' : 'them'} as soon as possible.
            </p>
            <div className="urgent-ticket-links" aria-label="Urgent ticket links">
              {urgentTickets.map((ticket) => (
                <Link
                  key={ticket.id}
                  className="urgent-ticket-link"
                  to={`/tickets/${encodeURIComponent(ticket.id)}`}
                  onClick={() => setUrgentWarningDismissed(true)}
                >
                  {ticket.id}
                </Link>
              ))}
            </div>
            <div className="urgent-warning-actions">
              <button className="btn urgent-warning-button" type="button" onClick={showUrgentTicketsFromWarning}>
                Show urgent tickets
              </button>
              <button className="btn urgent-warning-button secondary" type="button" onClick={() => setUrgentWarningDismissed(true)}>
                I understand
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

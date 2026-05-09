import { useEffect, useMemo, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import '../styles/dashboard.css';
import { useAuth } from '../auth';
import { fetchTickets, getDashboardTicketsForRole } from '../utils/tickets';

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

function displayValue(value) {
  return value || '-';
}

function formatDate(value) {
  if (!value) return '-';
  const [year, month, day] = String(value).slice(0, 10).split('-');
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

export default function DashboardPage() {
  const { role } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [filters, setFilters] = useState({ search: '', status: 'All', priority: 'All', group: 'All', date: '' });
  const [error, setError] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    async function loadTickets() {
      try {
        setError('');
        const data = await fetchTickets();
        setTickets(getDashboardTicketsForRole(data, role));
      } catch (err) {
        setError('Failed to load ticket data from the backend API.');
        setTickets([]);
      }
    }
    loadTickets();
  }, [role]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      const searchValue = filters.search.toLowerCase().trim();
      const matchesSearch =
        ticket.id.toLowerCase().includes(searchValue) ||
        ticket.description.toLowerCase().includes(searchValue);
      const matchesStatus = filters.status === 'All' || ticket.status === filters.status;
      const matchesPriority = filters.priority === 'All' || ticket.priority === filters.priority;
      const matchesGroup = filters.group === 'All' || ticket.assignedGroup === filters.group;
      const matchesDate = !filters.date || ticket.submitDate === filters.date;
      return matchesSearch && matchesStatus && matchesPriority && matchesGroup && matchesDate;
    });
  }, [tickets, filters]);

  function updateFilter(name, value) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function resetFilters() {
    setFilters({ search: '', status: 'All', priority: 'All', group: 'All', date: '' });
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
              <p className="welcome-header">Good Morning, Cevher Kemal Sirin</p>
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
                <p className="section-note">Filter the ticket list by status, priority, group, text, and date.</p>
              </div>
              <button className="btn btn-reset" onClick={resetFilters}>Reset</button>
            </div>
            <div className="filters">
              <div className="field"><label htmlFor="statusFilter">Status</label><select id="statusFilter" value={filters.status} onChange={(e)=>updateFilter('status', e.target.value)}><option value="All">All</option><option value="Open">Open</option><option value="In Progress">In Progress</option><option value="Pending">Pending</option><option value="Resolved">Resolved</option><option value="Closed">Closed</option></select></div>
              <div className="field"><label htmlFor="priorityFilter">Priority</label><select id="priorityFilter" value={filters.priority} onChange={(e)=>updateFilter('priority', e.target.value)}><option value="All">All</option><option value="Critical">Critical</option><option value="High">High</option><option value="Medium">Medium</option><option value="Low">Low</option></select></div>
              <div className="field"><label htmlFor="groupFilter">Assigned Group</label><select id="groupFilter" value={filters.group} onChange={(e)=>updateFilter('group', e.target.value)}><option value="All">All</option><option value="Messaging Support">Messaging Support</option><option value="Network Team">Network Team</option><option value="Desktop Support">Desktop Support</option><option value="Field Support">Field Support</option><option value="Application Support">Application Support</option><option value="Service Desk">Service Desk</option></select></div>
              <div className="field"><label htmlFor="dateFilter">Submit Date</label><input id="dateFilter" type="date" value={filters.date} onChange={(e)=>updateFilter('date', e.target.value)} /></div>
            </div>
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
                <span>Search</span>
                <input id="toolbarSearch" type="text" placeholder="Search by ID or description" value={filters.search} onChange={(e)=>updateFilter('search', e.target.value)} />
              </label>
              <div className="btn-container"><button className="btn btn-export" type="button">Import</button><button className="btn btn-export" type="button">Export</button></div>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Incident</th>
                    <th>Description</th>
                    <th>SLA Remaining</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Assigned Group</th>
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
                    <th>Close Date</th>
                    <th>Aging</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((ticket) => (
                    <tr className={getTicketRowClass(ticket)} key={ticket.id}>
                      <td className="ticket-id"><Link className="ticket-detail-link" to={`/tickets/${encodeURIComponent(ticket.id)}`}>{ticket.id}</Link></td>
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
                      <td>{formatDate(ticket.closeDate)}</td>
                      <td className="aging-cell">{ticket.aging} days</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(error || filteredTickets.length === 0) && <div className="empty-state">{error || 'No tickets match the selected filters.'}</div>}
          </section>
        </main>
      </div>
    </div>
  );
}

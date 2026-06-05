import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import '../styles/dashboard.css';
import '../styles/statistics.css';
import { fetchTickets } from '../utils/tickets';
import { fetchSitesWithTicketSummary } from '../utils/sites';
import { ServiceTypeChart, SLAPerformanceChart, StackedBarTrendChart, TeamPerformanceChart } from '../components/Charts';
import SiteMap from '../components/SiteMap';
import {
  FiHome,
  FiFileText,
  FiGrid,
  FiClipboard,
  FiBarChart2
} from "react-icons/fi";
const MAP_STATUS_OPTIONS = ['Open', 'In Progress', 'Pending', 'Resolved', 'Closed'];
const MAP_SLA_OPTIONS = [
  { value: 'overdue', label: 'Overdue' },
  { value: 'danger', label: 'Urgent' },
  { value: 'warning', label: 'Warning' },
  { value: 'normal', label: 'Normal' },
  { value: 'completed', label: 'Completed' },
  { value: 'none', label: 'No SLA Issue' },
];
const TEAM_SLA_OPTIONS = [
  { value: 'completed', label: 'Completed' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'danger', label: 'Urgent' },
  { value: 'warning', label: 'Warning' },
  { value: 'normal', label: 'Normal' },
];

const CHARTS = [
  {
    id: 'kpi',
    label: 'Incident KPIs & Trends',
    note: 'Weekly ticket volume by priority with overall trend line.',
  },
  {
    id: 'sla',
    label: 'SLA Performance',
    note: 'Real SLA state by week: within SLA, missed SLA, active, and overdue.',
  },
  {
    id: 'service',
    label: 'Service Types',
    note: 'Ticket volume grouped by service type.',
  },
  {
    id: 'team',
    label: 'Team Performance',
    note: 'Weekly ticket count per team for the selected SLA state.',
  },
  {
    id: 'sites',
    label: 'Infrastructure Map',
    note: 'European telecom sites with SLA-colored incident pins.',
  },
];

function getWeekInfo(dateStr) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T12:00:00`);
  if (isNaN(d.getTime())) return null;
  const dow = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - dow);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((d - jan1) / 86400000 + 1) / 7);
  const year = d.getFullYear();
  return {
    label: `W${weekNum}\n${year}`,
    sortKey: year * 100 + weekNum,
  };
}

function getTicketSlaState(ticket) {
  const deadline = ticket.slaDeadline ? new Date(ticket.slaDeadline) : null;
  const hasValidDeadline = deadline && !Number.isNaN(deadline.getTime());
  const isCompleted = ticket.status === 'Resolved' || ticket.status === 'Closed';

  if (!hasValidDeadline) {
    return isCompleted ? 'within' : 'active';
  }

  if (isCompleted) {
    const completionDate = ticket.updatedAt
      ? new Date(ticket.updatedAt)
      : ticket.closeDate
        ? new Date(`${ticket.closeDate}T23:59:59`)
        : null;

    if (!completionDate || Number.isNaN(completionDate.getTime())) return 'within';
    return completionDate <= deadline ? 'within' : 'missed';
  }

  return Date.now() > deadline.getTime() ? 'overdue' : 'active';
}

function isCompletedTicket(ticket) {
  return ticket.status === 'Resolved' || ticket.status === 'Closed' || ticket.slaUrgency === 'completed';
}

function getTicketSlaBucket(ticket) {
  if (isCompletedTicket(ticket)) return 'completed';
  if (ticket.slaUrgency === 'overdue') return 'overdue';
  if (ticket.slaUrgency === 'danger') return 'danger';
  if (ticket.slaUrgency === 'warning') return 'warning';
  return 'normal';
}

export default function StatisticsPage() {
  const [tickets, setTickets] = useState([]);
  const [sites, setSites] = useState([]);
  const [error, setError] = useState('');
  const [activeChart, setActiveChart] = useState('kpi');
  const [mapFilters, setMapFilters] = useState({ status: [], sla: [] });
  const [teamSlaFilter, setTeamSlaFilter] = useState('completed');
  const [teamNameFilter, setTeamNameFilter] = useState('all');
  const [teamWeekRange, setTeamWeekRange] = useState({ start: '', end: '' });

  useEffect(() => {
    async function loadTickets() {
      try {
        setError('');
        const [data, siteData] = await Promise.all([fetchTickets(), fetchSitesWithTicketSummary()]);
        setTickets(data);
        setSites(siteData);
      } catch {
        setError('Failed to load ticket data from the backend API.');
        setTickets([]);
        setSites([]);
      }
    }
    loadTickets();
  }, []);

  const weeklyData = useMemo(() => {
    const weeks = {};
    tickets.forEach((t) => {
      const weekInfo = getWeekInfo(t.submitDate);
      if (!weekInfo) return;
      const key = weekInfo.label;
      if (!weeks[key]) {
        weeks[key] = {
          label: key,
          sortKey: weekInfo.sortKey,
          total: 0,
          values: { Critical: 0, High: 0, Medium: 0, Low: 0 },
          statusValues: { Open: 0, 'In Progress': 0, Pending: 0, Resolved: 0, Closed: 0 },
          slaValues: { within: 0, missed: 0, active: 0, overdue: 0 },
        };
      }
      weeks[key].total++;
      if (weeks[key].values[t.priority] !== undefined) weeks[key].values[t.priority]++;
      if (weeks[key].statusValues[t.status] !== undefined) weeks[key].statusValues[t.status]++;
      weeks[key].slaValues[getTicketSlaState(t)]++;
    });
    return Object.values(weeks).sort((a, b) => a.sortKey - b.sortKey);
  }, [tickets]);

  const serviceData = useMemo(() => {
    const services = {};
    tickets.forEach((ticket) => {
      const serviceType = ticket.serviceType || 'Unknown';
      services[serviceType] = (services[serviceType] || 0) + 1;
    });

    return Object.entries(services)
      .map(([label, total]) => ({ label, total }))
      .sort((a, b) => b.total - a.total || a.label.localeCompare(b.label));
  }, [tickets]);

  const teamWeekOptions = useMemo(() => {
    const weeks = {};

    tickets.forEach((ticket) => {
      const weekInfo = getWeekInfo(ticket.submitDate);
      if (!weekInfo) return;
      weeks[weekInfo.label] = weekInfo;
    });

    return Object.values(weeks).sort((a, b) => a.sortKey - b.sortKey);
  }, [tickets]);

  const teamNameOptions = useMemo(() => {
    return Array.from(new Set(tickets.map((ticket) => ticket.assignedGroup || 'Unknown Team')))
      .sort((a, b) => a.localeCompare(b));
  }, [tickets]);

  useEffect(() => {
    if (teamWeekOptions.length === 0) return;

    setTeamWeekRange((current) => {
      const hasStart = teamWeekOptions.some((week) => week.label === current.start);
      const hasEnd = teamWeekOptions.some((week) => week.label === current.end);

      if (hasStart && hasEnd) return current;

      const defaultStartIndex = Math.max(0, teamWeekOptions.length - 8);
      return {
        start: teamWeekOptions[defaultStartIndex].label,
        end: teamWeekOptions[teamWeekOptions.length - 1].label,
      };
    });
  }, [teamWeekOptions]);

  const teamPerformanceData = useMemo(() => {
    const weeks = {};
    const teamNames = new Set();
    const weekSortByLabel = new Map(teamWeekOptions.map((week) => [week.label, week.sortKey]));
    const firstWeek = teamWeekOptions[0];
    const lastWeek = teamWeekOptions[teamWeekOptions.length - 1];
    const selectedStart = weekSortByLabel.get(teamWeekRange.start) ?? firstWeek?.sortKey;
    const selectedEnd = weekSortByLabel.get(teamWeekRange.end) ?? lastWeek?.sortKey;
    const minSort = Math.min(selectedStart || 0, selectedEnd || 0);
    const maxSort = Math.max(selectedStart || 0, selectedEnd || 0);

    teamWeekOptions
      .filter((week) => week.sortKey >= minSort && week.sortKey <= maxSort)
      .forEach((week) => {
        weeks[week.label] = {
          label: week.label,
          sortKey: week.sortKey,
          values: {},
        };
      });

    tickets.forEach((ticket) => {
      if (getTicketSlaBucket(ticket) !== teamSlaFilter) return;

      const weekInfo = getWeekInfo(ticket.submitDate);
      if (!weekInfo) return;
      if (weekInfo.sortKey < minSort || weekInfo.sortKey > maxSort) return;

      const teamName = ticket.assignedGroup || 'Unknown Team';
      if (teamNameFilter !== 'all' && teamName !== teamNameFilter) return;
      teamNames.add(teamName);

      if (!weeks[weekInfo.label]) {
        weeks[weekInfo.label] = {
          label: weekInfo.label,
          sortKey: weekInfo.sortKey,
          values: {},
        };
      }

      weeks[weekInfo.label].values[teamName] = (weeks[weekInfo.label].values[teamName] || 0) + 1;
    });

    return {
      groups: Object.values(weeks).sort((a, b) => a.sortKey - b.sortKey),
      teams: Array.from(teamNames).sort((a, b) => a.localeCompare(b)),
    };
  }, [tickets, teamNameFilter, teamSlaFilter, teamWeekOptions, teamWeekRange]);

  const activeChartMeta = CHARTS.find((c) => c.id === activeChart);

  function matchesMapSla(ticket, slaFilters) {
    if (slaFilters.length === 0) return true;
    return slaFilters.some((slaFilter) => {
      if (slaFilter === 'normal') {
        return ticket.slaUrgency === 'normal' || ticket.slaUrgency === 'none' || !ticket.slaUrgency;
      }

      return ticket.slaUrgency === slaFilter;
    });
  }

  function getSlaFilterLabel(value) {
    return MAP_SLA_OPTIONS.find((option) => option.value === value)?.label || value;
  }

  function addMapFilter(name, value) {
    if (!value) return;
    setMapFilters((current) => {
      if (current[name].includes(value)) return current;
      return { ...current, [name]: [...current[name], value] };
    });
  }

  function removeMapFilter(name, value) {
    setMapFilters((current) => ({
      ...current,
      [name]: current[name].filter((filterValue) => filterValue !== value),
    }));
  }

  function resetMapFilters() {
    setMapFilters({ status: [], sla: [] });
  }

  function getMapFilterChipLabel(name, value) {
    if (name === 'status') return `Status: ${value}`;
    return `SLA: ${getSlaFilterLabel(value)}`;
  }

  const activeMapFilterChips = [
    ...mapFilters.status.map((value) => ({ name: 'status', value })),
    ...mapFilters.sla.map((value) => ({ name: 'sla', value })),
  ];

  function matchesSelectedStatus(ticket, selectedStatuses) {
    if (selectedStatuses.length === 0) return true;
    return selectedStatuses.includes(ticket.status);
  }

  function matchesSelectedSla(ticket, selectedSlaFilters) {
    if (selectedSlaFilters.length === 0) return true;
    return matchesMapSla(ticket, selectedSlaFilters);
  }

  function isSlaOptionDisabled(value) {
    return mapFilters.sla.includes(value);
  }

  function isStatusOptionDisabled(value) {
    return mapFilters.status.includes(value);
  }

  function getStatusSelectLabel() {
    return mapFilters.status.length === 0 ? 'Add Status' : 'Add Another Status';
  }

  function getSlaSelectLabel() {
    return mapFilters.sla.length === 0 ? 'Add SLA State' : 'Add Another SLA State';
  }

  function getMapFilterButtonLabel() {
    const count = activeMapFilterChips.length;
    return count === 0 ? 'No filters selected' : `${count} active ${count === 1 ? 'filter' : 'filters'}`;
  }

  function getVisibleMapSummary() {
    const siteCount = mapSites.length;
    const ticketCount = mapSites.reduce((sum, site) => sum + (site.ticketCount || 0), 0);
    return `${siteCount} ${siteCount === 1 ? 'site' : 'sites'} / ${ticketCount} ${ticketCount === 1 ? 'ticket' : 'tickets'}`;
  }

  function getMapEmptyText() {
    if (activeMapFilterChips.length === 0) return 'No site incidents available for the current data.';
    return 'No site incidents match the selected filters.';
  }

  function getMapSitesWithFilters() {
    return sites
      .map((site) => {
        const filteredTickets = (site.relatedTickets || []).filter((ticket) => (
          matchesSelectedStatus(ticket, mapFilters.status) &&
          matchesSelectedSla(ticket, mapFilters.sla)
        ));

        return {
          ...site,
          ticketCount: filteredTickets.length,
          relatedTicketIds: filteredTickets.map((ticket) => ticket.id),
          relatedTickets: filteredTickets,
          highestSlaUrgency: getHighestMapUrgency(filteredTickets),
        };
      })
      .filter((site) => site.ticketCount > 0);
  }

  function isMapFilterActive() {
    return activeChart === 'sites';
  }

  function getMapFilterAriaLabel(name, value) {
    return `Remove ${getMapFilterChipLabel(name, value)}`;
  }

  function handleMapStatusChange(event) {
    addMapFilter('status', event.target.value);
  }

  function handleMapSlaChange(event) {
    addMapFilter('sla', event.target.value);
  }

  function canResetMapFilters() {
    return activeMapFilterChips.length > 0;
  }

  function renderMapFilterChips() {
    if (activeMapFilterChips.length === 0) return null;

    return (
      <div className="active-filter-chips statistics-filter-chips" aria-label="Active infrastructure map filters">
        {activeMapFilterChips.map((chip) => (
          <span className="active-filter-chip" key={`${chip.name}-${chip.value}`}>
            {getMapFilterChipLabel(chip.name, chip.value)}
            <button type="button" aria-label={getMapFilterAriaLabel(chip.name, chip.value)} onClick={() => removeMapFilter(chip.name, chip.value)}>
              x
            </button>
          </span>
        ))}
      </div>
    );
  }

  function renderMapFilters() {
    if (!isMapFilterActive()) return null;

    return (
      <>
        <div className="statistics-map-filters" aria-label="Infrastructure map filters">
          <label>
            <span>Status</span>
            <select value="" onChange={handleMapStatusChange}>
              <option value="">{getStatusSelectLabel()}</option>
              {MAP_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status} disabled={isStatusOptionDisabled(status)}>{status}</option>
              ))}
            </select>
          </label>
          <label>
            <span>SLA Remaining</span>
            <select value="" onChange={handleMapSlaChange}>
              <option value="">{getSlaSelectLabel()}</option>
              {MAP_SLA_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} disabled={isSlaOptionDisabled(option.value)}>{option.label}</option>
              ))}
            </select>
          </label>
          <div className="statistics-map-filter-actions">
            <span>{getMapFilterButtonLabel()}</span>
            <button type="button" onClick={resetMapFilters} disabled={!canResetMapFilters()}>
              Reset
            </button>
          </div>
        </div>
        {renderMapFilterChips()}
      </>
    );
  }

  function renderMapBody() {
    if (mapSites.length === 0) {
      return <div className="statistics-empty">{getMapEmptyText()}</div>;
    }

    return (
      <>
        <p className="statistics-map-summary">{getVisibleMapSummary()}</p>
        <SiteMap sites={mapSites} mode="full" />
      </>
    );
  }

  function renderTeamFilters() {
    if (activeChart !== 'team') return null;

    return (
      <div className="statistics-team-filters" aria-label="Team performance SLA filter">
        <label htmlFor="teamSlaFilter">
          <span>SLA</span>
          <select id="teamSlaFilter" value={teamSlaFilter} onChange={(event) => setTeamSlaFilter(event.target.value)}>
            {TEAM_SLA_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label htmlFor="teamNameFilter">
          <span>Team</span>
          <select id="teamNameFilter" value={teamNameFilter} onChange={(event) => setTeamNameFilter(event.target.value)}>
            <option value="all">All Teams</option>
            {teamNameOptions.map((teamName) => (
              <option key={teamName} value={teamName}>{teamName}</option>
            ))}
          </select>
        </label>
        <label htmlFor="teamWeekStart">
          <span>From Week</span>
          <select
            id="teamWeekStart"
            value={teamWeekRange.start}
            onChange={(event) => setTeamWeekRange((current) => ({ ...current, start: event.target.value }))}
          >
            {teamWeekOptions.map((week) => (
              <option key={week.label} value={week.label}>{week.label.replace('\n', ' ')}</option>
            ))}
          </select>
        </label>
        <label htmlFor="teamWeekEnd">
          <span>To Week</span>
          <select
            id="teamWeekEnd"
            value={teamWeekRange.end}
            onChange={(event) => setTeamWeekRange((current) => ({ ...current, end: event.target.value }))}
          >
            {teamWeekOptions.map((week) => (
              <option key={week.label} value={week.label}>{week.label.replace('\n', ' ')}</option>
            ))}
          </select>
        </label>
      </div>
    );
  }

  /*
   * The map filter helpers live close to the map data because they are tightly
   * coupled to the shape returned by /api/sites/with-ticket-summary.
   */

  function getHighestMapUrgency(ticketsForSite) {
    if (ticketsForSite.some((ticket) => ticket.status !== 'Resolved' && ticket.status !== 'Closed' && (ticket.slaUrgency === 'overdue' || ticket.slaUrgency === 'danger'))) {
      return 'danger';
    }

    if (ticketsForSite.some((ticket) => ticket.status !== 'Resolved' && ticket.status !== 'Closed' && ticket.slaUrgency === 'warning')) {
      return 'warning';
    }

    return 'normal';
  }

  const mapSites = useMemo(() => {
    return getMapSitesWithFilters();
  }, [sites, mapFilters]);

  return (
    <div className="statistics-page">
      <div className="statistics-shell">
        <aside className="statistics-sidebar">
          <div className="brand-block">
            <img src="/assets/login-welcome/Images/nokia - Copy.svg" className="brand-logo" alt="Nokia" />
            <p>Operation Tracking</p>
          </div>

          <nav className="statistics-nav" aria-label="Main navigation">
             <NavLink to="/" end>
    <FiHome />
    <span>Home</span>
  </NavLink>

  <NavLink to="/welcome">
    <FiFileText />
    <span>Welcome</span>
  </NavLink>

  <NavLink to="/dashboard">
    <FiGrid />
    <span>Dashboard</span>
  </NavLink>

  <NavLink to="/tickets">
    <FiClipboard />
    <span>Ticket Management</span>
  </NavLink>

  <NavLink to="/statistics">
    <FiBarChart2 />
    <span>Analytics</span>
  </NavLink>
</nav>

          <div className="statistics-sidebar-status">
            <span className="statistics-dot"></span>
            <div>
              <strong>Live Console</strong>
              <p>{tickets.length} tickets / {sites.length} sites loaded</p>
            </div>
          </div>
        </aside>

        <main className="statistics-main">
          <section className="statistics-hero">
            <div className="statistics-hero-copy">
              <p className="statistics-kicker">Nokia - Romania</p>
              <h1 className="statistics-title">Analytics</h1>
              <p className="statistics-subtitle">
                Visual breakdowns of incident volume, priority distribution, SLA performance, and telecom site impact.
              </p>
            </div>
          </section>

          <section className="statistics-chart-panel">
            <div className="statistics-chart-header">
              <div>
                <h2 className="statistics-chart-title">{activeChartMeta.label}</h2>
                <p className="statistics-chart-note">{activeChartMeta.note}</p>
              </div>
              <div className="statistics-tabs" role="tablist" aria-label="Select chart">
                {CHARTS.map((c) => (
                  <button
                    key={c.id}
                    role="tab"
                    type="button"
                    aria-selected={activeChart === c.id}
                    className={`statistics-tab${activeChart === c.id ? ' active' : ''}`}
                    onClick={() => setActiveChart(c.id)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            {error ? (
              <div className="statistics-empty">{error}</div>
            ) : (
              <div className="statistics-chart-body">
                {activeChart === 'kpi' && <StackedBarTrendChart groups={weeklyData} />}
                {activeChart === 'sla' && <SLAPerformanceChart groups={weeklyData} />}
                {activeChart === 'service' && <ServiceTypeChart groups={serviceData} />}
                {activeChart === 'team' && (
                  <>
                    {renderTeamFilters()}
                    <TeamPerformanceChart groups={teamPerformanceData.groups} teams={teamPerformanceData.teams} />
                  </>
                )}
                {activeChart === 'sites' && (
                  <>
                    {renderMapFilters()}
                    {renderMapBody()}
                  </>
                )}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

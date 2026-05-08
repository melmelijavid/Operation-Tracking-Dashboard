import { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import '../styles/dashboard.css';
import '../styles/statistics.css';
import { fetchTickets } from '../utils/tickets';
import { ServiceTypeChart, SLAPerformanceChart, StackedBarTrendChart } from '../components/Charts';

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
];

function getWeekKey(dateStr) {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T12:00:00`);
  if (isNaN(d.getTime())) return null;
  const dow = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - dow);
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((d - jan1) / 86400000 + 1) / 7);
  return `W${weekNum}\n${d.getFullYear()}`;
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

export default function StatisticsPage() {
  const [tickets, setTickets] = useState([]);
  const [error, setError] = useState('');
  const [activeChart, setActiveChart] = useState('kpi');

  useEffect(() => {
    async function loadTickets() {
      try {
        setError('');
        const data = await fetchTickets();
        setTickets(data);
      } catch {
        setError('Failed to load ticket data from the backend API.');
        setTickets([]);
      }
    }
    loadTickets();
  }, []);

  const weeklyData = useMemo(() => {
    const weeks = {};
    tickets.forEach((t) => {
      const key = getWeekKey(t.submitDate);
      if (!key) return;
      if (!weeks[key]) {
        weeks[key] = {
          label: key,
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
    return Object.values(weeks).sort((a, b) => a.label.localeCompare(b.label));
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

  const activeChartMeta = CHARTS.find((c) => c.id === activeChart);

  return (
    <div className="statistics-page">
      <div className="statistics-shell">
        <aside className="statistics-sidebar">
          <div className="brand-block">
            <img src="/assets/login-welcome/Images/nokia - Copy.svg" className="brand-logo" alt="Nokia" />
            <p>Operation Tracking</p>
          </div>

          <nav className="statistics-nav" aria-label="Main navigation">
            <NavLink to="/" end>Home</NavLink>
            <NavLink to="/welcome">Welcome</NavLink>
            <NavLink to="/dashboard">Dashboard</NavLink>
            <NavLink to="/tickets">Ticket Management</NavLink>
            <NavLink to="/statistics">Analytics</NavLink>
          </nav>

          <div className="statistics-sidebar-status">
            <span className="statistics-dot"></span>
            <div>
              <strong>Live Console</strong>
              <p>{tickets.length} tickets loaded</p>
            </div>
          </div>
        </aside>

        <main className="statistics-main">
          <section className="statistics-hero">
            <div className="statistics-hero-copy">
              <p className="statistics-kicker">Nokia - Romania</p>
              <h1 className="statistics-title">Analytics</h1>
              <p className="statistics-subtitle">
                Visual breakdowns of incident volume, priority distribution, and SLA performance over time.
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
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}

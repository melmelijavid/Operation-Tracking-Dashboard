import { useState } from 'react';

function smoothLine(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)} ${cp2x.toFixed(2)} ${cp2y.toFixed(2)} ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

const PRIORITY_COLORS = {
  Critical: '#ef4444',
  High: '#f59e0b',
  Medium: '#22d3ee',
  Low: '#818cf8',
};

const STACK_ORDER = ['Low', 'Medium', 'High', 'Critical'];
const LEGEND_ORDER = ['Critical', 'High', 'Medium', 'Low'];

export function StackedBarTrendChart({ groups }) {
  const [hovered, setHovered] = useState(null);

  if (groups.length === 0) {
    return <div className="nkchart-empty">No weekly data - ensure tickets have submit dates.</div>;
  }

  const W = 820;
  const H = 320;
  const padL = 54;
  const padR = 24;
  const padT = 36;
  const padB = 64;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const maxTotal = Math.max(...groups.map((g) => g.total), 1);
  const yMax = Math.ceil(maxTotal / 10) * 10 || 10;
  const barGroupW = plotW / groups.length;
  const barW = Math.max(6, Math.min(barGroupW * 0.62, 54));
  const barOff = (barGroupW - barW) / 2;
  const toY = (v) => padT + plotH * (1 - v / yMax);
  const bx = (i) => padL + i * barGroupW + barOff;
  const midX = (i) => padL + i * barGroupW + barGroupW / 2;
  const gridLines = Array.from({ length: 6 }, (_, i) => ({
    y: toY((i / 5) * yMax),
    label: Math.round((i / 5) * yMax),
  }));
  const trendPts = groups.map((g, i) => ({ x: midX(i), y: toY(g.total) }));
  const trendPath = smoothLine(trendPts);
  const trendArea = trendPts.length > 1
    ? `${trendPath} L ${trendPts[trendPts.length - 1].x.toFixed(2)} ${(padT + plotH).toFixed(2)} L ${trendPts[0].x.toFixed(2)} ${(padT + plotH).toFixed(2)} Z`
    : '';

  return (
    <div className="nkchart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="nkchart-svg">
        <defs>
          <linearGradient id="nk-trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.1)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
        </defs>

        {gridLines.map((gl, i) => (
          <g key={i}>
            <line x1={padL} y1={gl.y} x2={W - padR} y2={gl.y} stroke="rgba(255,255,255,0.07)" strokeWidth="1" strokeDasharray="3 5" />
            <text x={padL - 8} y={gl.y + 4} textAnchor="end" fill="#5a6a7a" fontSize="10" style={{ userSelect: 'none' }}>{gl.label}</text>
          </g>
        ))}

        {groups.map((g, i) => {
          let cumBottom = padT + plotH;
          const isHov = hovered === i;
          return (
            <g key={g.label} style={{ cursor: 'pointer' }} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
              {isHov && <rect x={padL + i * barGroupW} y={padT} width={barGroupW} height={plotH} fill="rgba(255,255,255,0.04)" />}
              {STACK_ORDER.map((p) => {
                const count = g.values[p] || 0;
                if (count === 0) return null;
                const segH = (count / yMax) * plotH;
                const segY = cumBottom - segH;
                cumBottom = segY;
                return (
                  <g key={p}>
                    <rect x={bx(i)} y={segY} width={barW} height={segH} fill={PRIORITY_COLORS[p]} opacity={hovered !== null && !isHov ? 0.28 : 0.9} />
                    {segH > 14 && <text x={bx(i) + barW / 2} y={segY + segH / 2 + 4} textAnchor="middle" fill="rgba(0,0,0,0.78)" fontSize="9" fontWeight="900" style={{ userSelect: 'none' }}>{count}</text>}
                  </g>
                );
              })}
              <text x={midX(i)} y={toY(g.total) - 6} textAnchor="middle" fill="rgba(255,255,255,0.88)" fontSize="10" fontWeight="800" style={{ userSelect: 'none' }}>{g.total}</text>
            </g>
          );
        })}

        {trendArea && <path d={trendArea} fill="url(#nk-trend-fill)" />}
        {trendPath && <path d={trendPath} fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
        {trendPts.map((pt, i) => <circle key={i} cx={pt.x} cy={pt.y} r="3.5" fill="#fff" stroke="rgba(10,21,41,0.9)" strokeWidth="2" />)}

        {groups.map((g, i) => {
          const [wk, yr] = g.label.split('\n');
          return (
            <g key={g.label}>
              <text x={midX(i)} y={H - padB + 16} textAnchor="middle" fill="#5a6a7a" fontSize="10" style={{ userSelect: 'none' }}>{wk}</text>
              {yr && <text x={midX(i)} y={H - padB + 28} textAnchor="middle" fill="#3d4d5e" fontSize="9" style={{ userSelect: 'none' }}>{yr}</text>}
            </g>
          );
        })}

        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      </svg>

      <div className="nkchart-legend">
        {LEGEND_ORDER.map((p) => (
          <div key={p} className="nk-legend-item">
            <span className="nk-legend-swatch" style={{ background: PRIORITY_COLORS[p] }} />
            <span>{p}</span>
          </div>
        ))}
        <div className="nk-legend-item"><span className="nk-legend-line" /><span>Trend</span></div>
      </div>
    </div>
  );
}

const SLA_COLORS = {
  within: '#22c55e',
  missed: '#ef4444',
  active: '#8fb3ff',
  overdue: '#111827',
};

const SLA_LABELS = {
  within: 'Within SLA',
  missed: 'Missed SLA',
  active: 'Active',
  overdue: 'Overdue',
};

const SLA_ORDER = ['within', 'active', 'missed', 'overdue'];

export function SLAPerformanceChart({ groups }) {
  const [hovered, setHovered] = useState(null);

  if (groups.length === 0) {
    return <div className="nkchart-empty">No weekly data available.</div>;
  }

  const enriched = groups.map((g) => {
    const slaValues = g.slaValues || { within: 0, missed: 0, active: 0, overdue: 0 };
    const completed = slaValues.within + slaValues.missed;
    const slaRate = completed > 0 ? Math.round((slaValues.within / completed) * 100) : 0;
    return { ...g, slaValues, slaRate, completed };
  });

  const W = 820;
  const H = 300;
  const padL = 54;
  const padR = 58;
  const padT = 36;
  const padB = 64;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const maxTotal = Math.max(...enriched.map((g) => g.total), 1);
  const yMax = Math.ceil(maxTotal / 10) * 10 || 10;
  const barGroupW = plotW / enriched.length;
  const barW = Math.max(6, Math.min(barGroupW * 0.62, 54));
  const barOff = (barGroupW - barW) / 2;
  const toY = (v) => padT + plotH * (1 - v / yMax);
  const toYpct = (pct) => padT + plotH * (1 - pct / 100);
  const bx = (i) => padL + i * barGroupW + barOff;
  const midX = (i) => padL + i * barGroupW + barGroupW / 2;
  const gridLines = Array.from({ length: 5 }, (_, i) => ({
    y: toY((i / 4) * yMax),
    count: Math.round((i / 4) * yMax),
    pct: `${Math.round((i / 4) * 100)}%`,
  }));
  const slaLinePts = enriched.map((g, i) => ({ x: midX(i), y: toYpct(g.slaRate) }));
  const slaLinePath = smoothLine(slaLinePts);

  return (
    <div className="nkchart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="nkchart-svg">
        {gridLines.map((gl, i) => (
          <g key={i}>
            <line x1={padL} y1={gl.y} x2={W - padR} y2={gl.y} stroke="rgba(255,255,255,0.07)" strokeWidth="1" strokeDasharray="3 5" />
            <text x={padL - 8} y={gl.y + 4} textAnchor="end" fill="#5a6a7a" fontSize="10" style={{ userSelect: 'none' }}>{gl.count}</text>
            <text x={W - padR + 6} y={gl.y + 4} textAnchor="start" fill="#5a6a7a" fontSize="10" style={{ userSelect: 'none' }}>{gl.pct}</text>
          </g>
        ))}

        {enriched.map((g, i) => {
          let cumBottom = padT + plotH;
          const isHov = hovered === i;
          return (
            <g key={g.label} style={{ cursor: 'pointer' }} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
              {isHov && <rect x={padL + i * barGroupW} y={padT} width={barGroupW} height={plotH} fill="rgba(255,255,255,0.04)" />}
              {SLA_ORDER.map((key) => {
                const count = g.slaValues[key] || 0;
                if (count === 0) return null;
                const segH = (count / yMax) * plotH;
                const segY = cumBottom - segH;
                cumBottom = segY;
                return (
                  <g key={key}>
                    <rect x={bx(i)} y={segY} width={barW} height={segH} fill={SLA_COLORS[key]} stroke={key === 'overdue' ? '#ef4444' : 'none'} opacity={hovered !== null && !isHov ? 0.28 : 0.88} />
                    {segH > 14 && <text x={bx(i) + barW / 2} y={segY + segH / 2 + 4} textAnchor="middle" fill={key === 'overdue' ? '#fff' : 'rgba(0,0,0,0.75)'} fontSize="9" fontWeight="900" style={{ userSelect: 'none' }}>{count}</text>}
                  </g>
                );
              })}
            </g>
          );
        })}

        {slaLinePath && <path d={slaLinePath} fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />}
        {slaLinePts.map((pt, i) => (
          <g key={i}>
            <circle cx={pt.x} cy={pt.y} r="3.5" fill="#fff" stroke="rgba(10,21,41,0.85)" strokeWidth="2" />
            <text x={pt.x} y={pt.y - 7} textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="800" style={{ userSelect: 'none' }}>{enriched[i].slaRate}%</text>
          </g>
        ))}

        {enriched.map((g, i) => {
          const [wk, yr] = g.label.split('\n');
          return (
            <g key={g.label}>
              <text x={midX(i)} y={H - padB + 16} textAnchor="middle" fill="#5a6a7a" fontSize="10" style={{ userSelect: 'none' }}>{wk}</text>
              {yr && <text x={midX(i)} y={H - padB + 28} textAnchor="middle" fill="#3d4d5e" fontSize="9" style={{ userSelect: 'none' }}>{yr}</text>}
            </g>
          );
        })}

        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <line x1={W - padR} y1={padT} x2={W - padR} y2={H - padB} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <text x={W - padR + 28} y={padT - 10} textAnchor="middle" fill="#22c55e" fontSize="10" fontWeight="700" style={{ userSelect: 'none' }}>SLA %</text>
      </svg>

      <div className="nkchart-legend">
        {SLA_ORDER.map((key) => (
          <div key={key} className="nk-legend-item">
            <span className="nk-legend-swatch" style={{ background: SLA_COLORS[key], border: key === 'overdue' ? '1px solid #ef4444' : 'none' }} />
            <span>{SLA_LABELS[key]}</span>
          </div>
        ))}
        <div className="nk-legend-item"><span className="nk-legend-line" /><span>SLA % for completed tickets</span></div>
      </div>
    </div>
  );
}

const SERVICE_COLORS = ['#8fb3ff', '#22d3ee', '#22c55e', '#f59e0b', '#ef4444', '#818cf8', '#e879f9', '#14b8a6'];

export function ServiceTypeChart({ groups }) {
  const [hovered, setHovered] = useState(null);

  if (groups.length === 0) {
    return <div className="nkchart-empty">No service type data available.</div>;
  }

  const maxTotal = Math.max(...groups.map((group) => group.total), 1);
  const W = 820;
  const H = 320;
  const padL = 54;
  const padR = 24;
  const padT = 36;
  const padB = 84;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const yMax = Math.ceil(maxTotal / 10) * 10 || 10;
  const barGroupW = plotW / groups.length;
  const barW = Math.max(8, Math.min(barGroupW * 0.58, 54));
  const barOff = (barGroupW - barW) / 2;
  const toY = (v) => padT + plotH * (1 - v / yMax);
  const bx = (i) => padL + i * barGroupW + barOff;
  const midX = (i) => padL + i * barGroupW + barGroupW / 2;
  const gridLines = Array.from({ length: 6 }, (_, i) => ({
    y: toY((i / 5) * yMax),
    label: Math.round((i / 5) * yMax),
  }));

  return (
    <div className="nkchart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="nkchart-svg" aria-label="Service type ticket volume">
        {gridLines.map((gl, i) => (
          <g key={i}>
            <line x1={padL} y1={gl.y} x2={W - padR} y2={gl.y} stroke="rgba(255,255,255,0.07)" strokeWidth="1" strokeDasharray="3 5" />
            <text x={padL - 8} y={gl.y + 4} textAnchor="end" fill="#5a6a7a" fontSize="10" style={{ userSelect: 'none' }}>{gl.label}</text>
          </g>
        ))}

        {groups.map((group, index) => {
          const isHov = hovered === index;
          const barH = (group.total / yMax) * plotH;
          const barY = padT + plotH - barH;
          const color = SERVICE_COLORS[index % SERVICE_COLORS.length];
          return (
            <g key={group.label} style={{ cursor: 'pointer' }} onMouseEnter={() => setHovered(index)} onMouseLeave={() => setHovered(null)}>
              {isHov && <rect x={padL + index * barGroupW} y={padT} width={barGroupW} height={plotH} fill="rgba(255,255,255,0.04)" />}
              <rect x={bx(index)} y={barY} width={barW} height={barH} fill={color} opacity={hovered !== null && !isHov ? 0.28 : 0.9} rx="4" />
              <text x={midX(index)} y={barY - 7} textAnchor="middle" fill="rgba(255,255,255,0.88)" fontSize="10" fontWeight="800" style={{ userSelect: 'none' }}>{group.total}</text>
              <text x={midX(index)} y={H - padB + 18} textAnchor="middle" fill="#5a6a7a" fontSize="10" fontWeight="700" style={{ userSelect: 'none' }}>
                {group.label.length > 12 ? `${group.label.slice(0, 12)}...` : group.label}
              </text>
            </g>
          );
        })}

        <line x1={padL} y1={padT} x2={padL} y2={H - padB} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      </svg>

      <div className="nkchart-legend">
        {groups.slice(0, 8).map((group, index) => (
          <div key={group.label} className="nk-legend-item">
            <span className="nk-legend-swatch" style={{ background: SERVICE_COLORS[index % SERVICE_COLORS.length] }} />
            <span>{group.label}</span>
          </div>
        ))}
        <div className="nk-legend-item">
          <span className="nk-legend-line" />
          <span>Ticket Count</span>
        </div>
      </div>
    </div>
  );
}

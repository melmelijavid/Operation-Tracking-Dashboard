const BUSINESS_START_HOUR = 9;
const BUSINESS_END_HOUR = 17;
const MS_PER_MINUTE = 60 * 1000;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;

export function getDefaultSlaForPriority(priority) {
  if (priority === 'Critical') return { slaType: 'normal', slaHours: 4 };
  if (priority === 'High') return { slaType: 'normal', slaHours: 8 };
  if (priority === 'Medium') return { slaType: 'business', slaHours: 24 };
  return { slaType: 'business', slaHours: 72 };
}

function isBusinessDay(date) {
  const day = date.getDay();
  return day >= 1 && day <= 5;
}

function atBusinessStart(date) {
  const next = new Date(date);
  next.setHours(BUSINESS_START_HOUR, 0, 0, 0);
  return next;
}

function atBusinessEnd(date) {
  const next = new Date(date);
  next.setHours(BUSINESS_END_HOUR, 0, 0, 0);
  return next;
}

function moveToNextBusinessStart(date) {
  const next = new Date(date);
  next.setDate(next.getDate() + 1);
  next.setHours(BUSINESS_START_HOUR, 0, 0, 0);

  while (!isBusinessDay(next)) {
    next.setDate(next.getDate() + 1);
  }

  return next;
}

function normalizeBusinessStart(date) {
  if (!isBusinessDay(date)) return moveToNextBusinessStart(date);

  const start = atBusinessStart(date);
  const end = atBusinessEnd(date);

  if (date < start) return start;
  if (date >= end) return moveToNextBusinessStart(date);
  return new Date(date);
}

export function calculateSlaDeadline(startValue, slaType, slaHours) {
  const start = new Date(startValue);
  const hours = Number(slaHours);

  if (Number.isNaN(start.getTime()) || Number.isNaN(hours) || hours <= 0) {
    return null;
  }

  if (slaType !== 'business') {
    return new Date(start.getTime() + hours * MS_PER_HOUR);
  }

  let current = normalizeBusinessStart(start);
  let remainingMinutes = hours * 60;

  while (remainingMinutes > 0) {
    current = normalizeBusinessStart(current);
    const end = atBusinessEnd(current);
    const availableMinutes = Math.max(0, Math.floor((end - current) / MS_PER_MINUTE));

    if (remainingMinutes <= availableMinutes) {
      return new Date(current.getTime() + remainingMinutes * MS_PER_MINUTE);
    }

    remainingMinutes -= availableMinutes;
    current = moveToNextBusinessStart(current);
  }

  return current;
}

export function getSlaPresentation(row, nowValue = new Date()) {
  if (row.status === 'Resolved' || row.status === 'Closed') {
    return {
      slaRemainingMinutes: null,
      slaRemainingLabel: 'Completed',
      slaUrgency: 'completed',
    };
  }

  if (!row.sla_deadline) {
    return {
      slaRemainingMinutes: null,
      slaRemainingLabel: '-',
      slaUrgency: 'none',
    };
  }

  const now = new Date(nowValue);
  const deadline = new Date(row.sla_deadline);
  const diffMinutes = Math.ceil((deadline - now) / MS_PER_MINUTE);
  const absMinutes = Math.abs(diffMinutes);
  const hours = Math.floor(absMinutes / 60);
  const minutes = absMinutes % 60;
  const label = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  if (diffMinutes < 0) {
    return {
      slaRemainingMinutes: diffMinutes,
      slaRemainingLabel: `Overdue ${label}`,
      slaUrgency: 'overdue',
    };
  }

  if (diffMinutes <= 8 * 60) {
    return {
      slaRemainingMinutes: diffMinutes,
      slaRemainingLabel: `${label} Left`,
      slaUrgency: 'danger',
    };
  }

  if (diffMinutes <= 24 * 60) {
    return {
      slaRemainingMinutes: diffMinutes,
      slaRemainingLabel: `${label} Left`,
      slaUrgency: 'warning',
    };
  }

  return {
    slaRemainingMinutes: diffMinutes,
    slaRemainingLabel: `${label} Left`,
    slaUrgency: 'normal',
  };
}

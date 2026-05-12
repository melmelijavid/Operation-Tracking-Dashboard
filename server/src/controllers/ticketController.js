import { query } from '../db.js';
import { mapTicketRow } from '../utils/ticketMapper.js';
import { calculateSlaDeadline, getDefaultSlaForPriority } from '../utils/sla.js';

const ticketSelect = `
  SELECT
    t.id,
    t.description,
    t.status,
    t.priority,
    t.assigned_group,
    t.team_id,
    team.name AS team_name,
    t.service_type,
    TO_CHAR(t.submit_date, 'YYYY-MM-DD') AS submit_date,
    TO_CHAR(t.last_modified_date, 'YYYY-MM-DD') AS last_modified_date,
    TO_CHAR(t.close_date, 'YYYY-MM-DD') AS close_date,
    t.updated_at,
    t.company,
    t.product_categorization_tier1,
    t.product_categorization_tier2,
    t.product_categorization_tier3,
    t.categorization_tier1,
    t.sla_type,
    t.sla_hours,
    t.sla_deadline,
    t.created_at,
    t.aging,
    t.owner_user_id,
    owner_user.name AS owner_name,
    t.assigned_person_user_id,
    assigned_user.name AS assigned_person_name
  FROM tickets t
  JOIN users owner_user ON owner_user.id = t.owner_user_id
  LEFT JOIN users assigned_user ON assigned_user.id = t.assigned_person_user_id
  LEFT JOIN teams team ON team.id = t.team_id
`;

// Resolves the team for create/update. Accepts either `teamId` (preferred,
// from the new dropdown UI) or `assignedGroup` (legacy free-text string).
// Returns { teamId, assignedGroup } with both columns kept in sync.
// Throws 400 if a teamId is provided but doesn't exist.
async function resolveTicketTeam({ teamId, assignedGroup }) {
  if (teamId !== undefined && teamId !== null && teamId !== '') {
    const r = await query('SELECT id, name FROM teams WHERE id = $1', [Number(teamId)]);
    if (r.rowCount === 0) {
      const err = new Error('Selected team does not exist.');
      err.status = 400;
      throw err;
    }
    return { teamId: r.rows[0].id, assignedGroup: r.rows[0].name };
  }

  if (assignedGroup) {
    const r = await query('SELECT id FROM teams WHERE name = $1', [assignedGroup]);
    return {
      teamId: r.rowCount > 0 ? r.rows[0].id : null,
      assignedGroup,
    };
  }

  return { teamId: null, assignedGroup: null };
}

async function fetchAllTickets() {
  const result = await query(`${ticketSelect} ORDER BY t.submit_date DESC, t.id DESC`);
  return result.rows.map(mapTicketRow);
}

async function findTicketRow(ticketId) {
  const result = await query(`${ticketSelect} WHERE t.id = $1`, [ticketId]);
  return result.rows[0] || null;
}

function operatorCanAccessTicket(ticket, userId) {
  return ticket.owner_user_id === userId || ticket.assigned_person_user_id === userId;
}

function operatorCanFullyEditTicket(ticket, userId) {
  return ticket.owner_user_id === userId;
}

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getCloseDateForStatus(nextStatus, currentStatus, requestedCloseDate, currentCloseDate) {
  if (nextStatus === 'Closed' && currentStatus !== 'Closed') {
    return getTodayDate();
  }

  if (nextStatus === 'Closed') {
    return requestedCloseDate || currentCloseDate || getTodayDate();
  }

  return null;
}

function stringifyHistoryValue(value) {
  if (value === null || value === undefined || value === '') return '-';
  return String(value);
}

async function addHistoryEntry(ticketId, userId, action, fieldName = null, oldValue = null, newValue = null) {
  await query(
    `INSERT INTO ticket_history (ticket_id, user_id, action, field_name, old_value, new_value)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      ticketId,
      userId,
      action,
      fieldName,
      stringifyHistoryValue(oldValue),
      stringifyHistoryValue(newValue),
    ]
  );
}

async function addChangedFieldHistory(ticketId, userId, changes) {
  for (const change of changes) {
    if (stringifyHistoryValue(change.oldValue) !== stringifyHistoryValue(change.newValue)) {
      await addHistoryEntry(ticketId, userId, 'updated', change.fieldName, change.oldValue, change.newValue);
    }
  }
}

function mapHistoryRow(row) {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    action: row.action,
    fieldName: row.field_name,
    oldValue: row.old_value,
    newValue: row.new_value,
    userName: row.user_name || 'Unknown user',
    createdAt: row.created_at,
  };
}

function mapCommentRow(row) {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    commentText: row.comment_text,
    userId: row.user_id,
    userName: row.user_name || 'Unknown user',
    createdAt: row.created_at,
  };
}

export async function getTickets(req, res) {
  const tickets = await fetchAllTickets();
  return res.json(tickets);
}

export async function getTicket(req, res) {
  const ticket = await findTicketRow(req.params.id);

  if (!ticket) {
    return res.status(404).json({ message: 'Ticket not found.' });
  }

  return res.json(mapTicketRow(ticket));
}

export async function getTicketHistory(req, res) {
  const ticket = await findTicketRow(req.params.id);

  if (!ticket) {
    return res.status(404).json({ message: 'Ticket not found.' });
  }

  const result = await query(
    `SELECT
       h.id,
       h.ticket_id,
       h.action,
       h.field_name,
       h.old_value,
       h.new_value,
       h.created_at,
       u.name AS user_name
     FROM ticket_history h
     LEFT JOIN users u ON u.id = h.user_id
     WHERE h.ticket_id = $1
     ORDER BY h.created_at DESC, h.id DESC`,
    [req.params.id]
  );

  return res.json(result.rows.map(mapHistoryRow));
}

export async function getTicketComments(req, res) {
  const ticket = await findTicketRow(req.params.id);

  if (!ticket) {
    return res.status(404).json({ message: 'Ticket not found.' });
  }

  const result = await query(
    `SELECT
       c.id,
       c.ticket_id,
       c.comment_text,
       c.user_id,
       c.created_at,
       u.name AS user_name
     FROM ticket_comments c
     LEFT JOIN users u ON u.id = c.user_id
     WHERE c.ticket_id = $1
     ORDER BY c.created_at ASC, c.id ASC`,
    [req.params.id]
  );

  return res.json(result.rows.map(mapCommentRow));
}

export async function addTicketComment(req, res) {
  const ticket = await findTicketRow(req.params.id);
  const commentText = req.body.commentText?.trim();

  if (!ticket) {
    return res.status(404).json({ message: 'Ticket not found.' });
  }

  if (!commentText) {
    return res.status(400).json({ message: 'Comment text is required.' });
  }

  await query(
    `INSERT INTO ticket_comments (ticket_id, user_id, comment_text)
     VALUES ($1, $2, $3)`,
    [req.params.id, req.user.id, commentText]
  );

  await addHistoryEntry(req.params.id, req.user.id, 'commented', 'comment', null, commentText);

  return getTicketComments(req, res);
}

export async function deleteTicketComment(req, res) {
  const ticket = await findTicketRow(req.params.id);

  if (!ticket) {
    return res.status(404).json({ message: 'Ticket not found.' });
  }

  const result = await query(
    `SELECT id, user_id, comment_text
     FROM ticket_comments
     WHERE id = $1 AND ticket_id = $2`,
    [req.params.commentId, req.params.id]
  );
  const comment = result.rows[0];

  if (!comment) {
    return res.status(404).json({ message: 'Work note not found.' });
  }

  if (comment.user_id !== req.user.id) {
    return res.status(403).json({ message: 'You can only delete work notes you created.' });
  }

  await query('DELETE FROM ticket_comments WHERE id = $1', [req.params.commentId]);
  await addHistoryEntry(req.params.id, req.user.id, 'deleted comment', 'comment', comment.comment_text, null);

  return getTicketComments(req, res);
}

export async function createTicket(req, res) {
  const {
    id,
    description,
    status,
    priority,
    assignedGroup,
    teamId,
    serviceType,
    submitDate,
    company,
    productCategorizationTier1,
    productCategorizationTier2,
    productCategorizationTier3,
    categorizationTier1,
    slaType,
    slaHours,
    aging,
    assignedPersonUserId,
  } = req.body;

  if (!id || !description || !status || !priority || (!assignedGroup && !teamId) || !serviceType || !submitDate) {
    return res.status(400).json({ message: 'Missing required ticket fields.' });
  }

  const team = await resolveTicketTeam({ teamId, assignedGroup });

  const closeDateValue = status === 'Closed' ? getTodayDate() : null;
  const lastModifiedDateValue = getTodayDate();
  const defaultSla = getDefaultSlaForPriority(priority);
  const slaTypeValue = slaType || defaultSla.slaType;
  const slaHoursValue = Number(slaHours || defaultSla.slaHours);
  const slaDeadline = calculateSlaDeadline(new Date(), slaTypeValue, slaHoursValue);

  const result = await query(
    `INSERT INTO tickets (
      id,
      description,
      status,
      priority,
      assigned_group,
      team_id,
      service_type,
      submit_date,
      last_modified_date,
      close_date,
      company,
      product_categorization_tier1,
      product_categorization_tier2,
      product_categorization_tier3,
      categorization_tier1,
      sla_type,
      sla_hours,
      sla_deadline,
      aging,
      owner_user_id,
      assigned_person_user_id
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)`,
    [
      id,
      description,
      status,
      priority,
      team.assignedGroup,
      team.teamId,
      serviceType,
      submitDate,
      lastModifiedDateValue,
      closeDateValue,
      company || null,
      productCategorizationTier1 || null,
      productCategorizationTier2 || null,
      productCategorizationTier3 || null,
      categorizationTier1 || null,
      slaTypeValue,
      slaHoursValue,
      slaDeadline,
      aging ?? 0,
      req.user.id,
      assignedPersonUserId || null,
    ]
  );

  void result;
  await addHistoryEntry(id, req.user.id, 'created', 'ticket', null, id);
  return res.status(201).json(await fetchAllTickets());
}

export async function updateTicket(req, res) {
  const ticketId = req.params.id;
  const currentTicket = await findTicketRow(ticketId);

  if (!currentTicket) {
    return res.status(404).json({ message: 'Ticket not found.' });
  }

  if (req.user.role === 'operator' && !operatorCanAccessTicket(currentTicket, req.user.id)) {
    return res.status(403).json({ message: 'Operators can only update their own or assigned tickets.' });
  }

  if (req.user.role === 'operator' && !operatorCanFullyEditTicket(currentTicket, req.user.id)) {
    const nextStatus = req.body.status || currentTicket.status;
    const closeDateValue = getCloseDateForStatus(
      nextStatus,
      currentTicket.status,
      req.body.closeDate,
      currentTicket.close_date
    );

    await query(
      `UPDATE tickets
       SET
         status = $1,
         aging = $2,
         last_modified_date = CURRENT_DATE,
         close_date = $3,
         updated_at = NOW()
       WHERE id = $4`,
      [nextStatus, req.body.aging ?? currentTicket.aging, closeDateValue, ticketId]
    );

    await addChangedFieldHistory(ticketId, req.user.id, [
      { fieldName: 'Status', oldValue: currentTicket.status, newValue: nextStatus },
      { fieldName: 'Aging', oldValue: currentTicket.aging, newValue: req.body.aging ?? currentTicket.aging },
      { fieldName: 'Close Date', oldValue: currentTicket.close_date, newValue: closeDateValue },
    ]);

    return res.json(await fetchAllTickets());
  }

  const nextStatus = req.body.status || currentTicket.status;
  const nextPriority = req.body.priority || currentTicket.priority;
  const defaultSla = getDefaultSlaForPriority(nextPriority);
  const slaTypeValue = req.body.slaType || currentTicket.sla_type || defaultSla.slaType;
  const slaHoursValue = Number(req.body.slaHours || currentTicket.sla_hours || defaultSla.slaHours);
  const slaStartValue = currentTicket.created_at || req.body.submitDate || currentTicket.submit_date;
  const slaDeadline = calculateSlaDeadline(slaStartValue, slaTypeValue, slaHoursValue);
  const closeDateValue = getCloseDateForStatus(
    nextStatus,
    currentTicket.status,
    req.body.closeDate,
    currentTicket.close_date
  );

  // Resolve the team for this update. If the request didn't include either
  // teamId or assignedGroup, fall back to what's already on the ticket.
  const team = (req.body.teamId !== undefined || req.body.assignedGroup !== undefined)
    ? await resolveTicketTeam({ teamId: req.body.teamId, assignedGroup: req.body.assignedGroup })
    : { teamId: currentTicket.team_id, assignedGroup: currentTicket.assigned_group };

  await query(
    `UPDATE tickets
     SET
       description = $1,
       status = $2,
       priority = $3,
       assigned_group = $4,
       team_id = $5,
       service_type = $6,
       submit_date = $7,
       last_modified_date = CURRENT_DATE,
       close_date = $8,
       company = $9,
       product_categorization_tier1 = $10,
       product_categorization_tier2 = $11,
       product_categorization_tier3 = $12,
       categorization_tier1 = $13,
       sla_type = $14,
       sla_hours = $15,
       sla_deadline = $16,
       aging = $17,
       assigned_person_user_id = $18,
       updated_at = NOW()
     WHERE id = $19`,
    [
      req.body.description,
      req.body.status,
      req.body.priority,
      team.assignedGroup,
      team.teamId,
      req.body.serviceType,
      req.body.submitDate,
      closeDateValue,
      req.body.company || currentTicket.company,
      req.body.productCategorizationTier1 || currentTicket.product_categorization_tier1,
      req.body.productCategorizationTier2 || currentTicket.product_categorization_tier2,
      req.body.productCategorizationTier3 || currentTicket.product_categorization_tier3,
      req.body.categorizationTier1 || currentTicket.categorization_tier1,
      slaTypeValue,
      slaHoursValue,
      slaDeadline,
      req.body.aging ?? currentTicket.aging,
      req.body.assignedPersonUserId || null,
      ticketId,
    ]
  );

  await addChangedFieldHistory(ticketId, req.user.id, [
    { fieldName: 'Description', oldValue: currentTicket.description, newValue: req.body.description },
    { fieldName: 'Status', oldValue: currentTicket.status, newValue: req.body.status },
    { fieldName: 'Priority', oldValue: currentTicket.priority, newValue: req.body.priority },
    { fieldName: 'Assigned Group', oldValue: currentTicket.assigned_group, newValue: team.assignedGroup },
    { fieldName: 'Team', oldValue: currentTicket.team_id, newValue: team.teamId },
    { fieldName: 'Service Type', oldValue: currentTicket.service_type, newValue: req.body.serviceType },
    { fieldName: 'Submit Date', oldValue: currentTicket.submit_date, newValue: req.body.submitDate },
    { fieldName: 'Close Date', oldValue: currentTicket.close_date, newValue: closeDateValue },
    { fieldName: 'Company', oldValue: currentTicket.company, newValue: req.body.company || currentTicket.company },
    { fieldName: 'Product Categorization Tier 1', oldValue: currentTicket.product_categorization_tier1, newValue: req.body.productCategorizationTier1 || currentTicket.product_categorization_tier1 },
    { fieldName: 'Product Categorization Tier 2', oldValue: currentTicket.product_categorization_tier2, newValue: req.body.productCategorizationTier2 || currentTicket.product_categorization_tier2 },
    { fieldName: 'Product Categorization Tier 3', oldValue: currentTicket.product_categorization_tier3, newValue: req.body.productCategorizationTier3 || currentTicket.product_categorization_tier3 },
    { fieldName: 'Categorization Tier 1', oldValue: currentTicket.categorization_tier1, newValue: req.body.categorizationTier1 || currentTicket.categorization_tier1 },
    { fieldName: 'SLA Type', oldValue: currentTicket.sla_type, newValue: slaTypeValue },
    { fieldName: 'SLA Hours', oldValue: currentTicket.sla_hours, newValue: slaHoursValue },
    { fieldName: 'Assigned Person', oldValue: currentTicket.assigned_person_user_id, newValue: req.body.assignedPersonUserId || null },
    { fieldName: 'Aging', oldValue: currentTicket.aging, newValue: req.body.aging ?? currentTicket.aging },
  ]);

  return res.json(await fetchAllTickets());
}

export async function deleteTicket(req, res) {
  const ticketId = req.params.id;
  const currentTicket = await findTicketRow(ticketId);

  if (!currentTicket) {
    return res.status(404).json({ message: 'Ticket not found.' });
  }

  if (req.user.role === 'operator' && currentTicket.owner_user_id !== req.user.id) {
    return res.status(403).json({ message: 'Operators can only delete tickets they own.' });
  }

  await query('DELETE FROM tickets WHERE id = $1', [ticketId]);
  return res.json(await fetchAllTickets());
}

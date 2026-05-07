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
    t.service_type,
    TO_CHAR(t.submit_date, 'YYYY-MM-DD') AS submit_date,
    TO_CHAR(t.last_modified_date, 'YYYY-MM-DD') AS last_modified_date,
    TO_CHAR(t.close_date, 'YYYY-MM-DD') AS close_date,
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
`;

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

export async function getTickets(req, res) {
  const tickets = await fetchAllTickets();
  return res.json(tickets);
}

export async function createTicket(req, res) {
  const {
    id,
    description,
    status,
    priority,
    assignedGroup,
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

  if (!id || !description || !status || !priority || !assignedGroup || !serviceType || !submitDate) {
    return res.status(400).json({ message: 'Missing required ticket fields.' });
  }

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
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20)`,
    [
      id,
      description,
      status,
      priority,
      assignedGroup,
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

  await query(
    `UPDATE tickets
     SET
       description = $1,
       status = $2,
       priority = $3,
       assigned_group = $4,
       service_type = $5,
       submit_date = $6,
       last_modified_date = CURRENT_DATE,
       close_date = $7,
       company = $8,
       product_categorization_tier1 = $9,
       product_categorization_tier2 = $10,
       product_categorization_tier3 = $11,
       categorization_tier1 = $12,
       sla_type = $13,
       sla_hours = $14,
       sla_deadline = $15,
       aging = $16,
       assigned_person_user_id = $17,
       updated_at = NOW()
     WHERE id = $18`,
    [
      req.body.description,
      req.body.status,
      req.body.priority,
      req.body.assignedGroup,
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

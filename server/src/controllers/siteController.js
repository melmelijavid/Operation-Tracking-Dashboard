import { query } from '../db.js';

function mapSiteRow(row) {
  return {
    siteId: row.site_id,
    country: row.country,
    countryCode: row.country_code,
    city: row.city,
    cityCode: row.city_code,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    infrastructureType: row.infrastructure_type,
    vendor: row.vendor,
    status: row.status,
    description: row.description || '',
    createdAt: row.created_at,
  };
}

export async function getSites(req, res) {
  const result = await query(
    `SELECT *
     FROM infrastructure_sites
     ORDER BY country, city, site_id`
  );

  return res.json(result.rows.map(mapSiteRow));
}

export async function getSite(req, res) {
  const result = await query(
    `SELECT *
     FROM infrastructure_sites
     WHERE site_id = $1`,
    [req.params.siteId]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'Infrastructure site not found.' });
  }

  return res.json(mapSiteRow(result.rows[0]));
}

/*
OLD VERSION:

export async function getSitesWithTicketSummary(req, res) {
  const [siteResult, ticketResult] = await Promise.all([
    query(
      `SELECT *
       FROM infrastructure_sites
       ORDER BY country, city, site_id`
    ),
    query(
      `SELECT id, site_id, status, sla_deadline
       FROM tickets`
    ),
  ]);

  const ticketsBySite = new Map();

  for (const ticket of ticketResult.rows) {
    const slaUrgency = getSlaPresentation(ticket).slaUrgency;

    if (!ticketsBySite.has(ticket.site_id)) ticketsBySite.set(ticket.site_id, []);
    ticketsBySite.get(ticket.site_id).push({ ...ticket, slaUrgency });
  }

  const summary = siteResult.rows.map((siteRow) => {
    const site = mapSiteRow(siteRow);
    const relatedTickets = ticketsBySite.get(site.siteId) || [];

    // Small bug in old version:
    // This only excludes Resolved tickets, but Closed tickets should also be excluded.
    const activeTickets = relatedTickets.filter((ticket) => ticket.status !== 'Resolved');

    return {
      ...site,
      ticketCount: relatedTickets.length,
      relatedTicketIds: relatedTickets.map((ticket) => ticket.id).sort(),
      relatedTickets: relatedTickets
        .map((ticket) => ({
          id: ticket.id,
          status: ticket.status,
          slaUrgency: ticket.slaUrgency,
        }))
        .sort((a, b) => a.id.localeCompare(b.id)),
      highestSlaUrgency: getHighestUrgency(activeTickets),
    };
  });

  return res.json(summary);
}
*/

export async function getSitesWithTicketSummary(req, res) {
  const result = await query(`
    SELECT *
    FROM get_sites_with_ticket_summary()
  `);

  const summary = result.rows.map((row) => ({
    siteId: row.site_id,
    country: row.country,
    countryCode: row.country_code,
    city: row.city,
    cityCode: row.city_code,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    infrastructureType: row.infrastructure_type,
    vendor: row.vendor,
    status: row.status,
    description: row.description || '',
    createdAt: row.created_at,

    ticketCount: row.ticket_count,
    activeTicketCount: row.active_ticket_count,
    relatedTicketIds: row.related_ticket_ids || [],
    relatedTickets: row.related_tickets || [],
    highestSlaUrgency: row.highest_sla_urgency,
  }));

  return res.json(summary);
}

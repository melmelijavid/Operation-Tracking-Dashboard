import { query } from '../db.js';

function mapTeamRow(row) {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    department: row.department || '',
    status: row.status,
  };
}

/**
 * Lightweight list of teams, intended for ticket-form dropdowns.
 * Only active teams appear here. The admin's full Team Management view
 * will use a separate endpoint that includes disabled teams and ticket
 * counts.
 */
export async function getTeams(req, res) {
  const result = await query(
    `SELECT id, name, description, department, status
     FROM teams
     WHERE status = 'active'
     ORDER BY name ASC`
  );
  return res.json(result.rows.map(mapTeamRow));
}

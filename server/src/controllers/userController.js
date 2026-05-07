import { query } from '../db.js';

export async function getUsers(req, res) {
  const result = await query(
    `SELECT id, name, email, role, TO_CHAR(created_at, 'YYYY-MM-DD') AS created_at
     FROM users
     ORDER BY name ASC`
  );

  return res.json(result.rows);
}

export async function updateUserRole(req, res) {
  const userId = Number(req.params.id);
  const { role } = req.body;
  const validRoles = ['admin', 'operator', 'viewer'];

  if (!Number.isInteger(userId)) {
    return res.status(400).json({ message: 'Valid user id is required.' });
  }

  if (!validRoles.includes(role)) {
    return res.status(400).json({ message: 'Role must be admin, operator, or viewer.' });
  }

  const result = await query(
    `UPDATE users
     SET role = $1
     WHERE id = $2
     RETURNING id, name, email, role, TO_CHAR(created_at, 'YYYY-MM-DD') AS created_at`,
    [role, userId]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'User not found.' });
  }

  return res.json(result.rows[0]);
}

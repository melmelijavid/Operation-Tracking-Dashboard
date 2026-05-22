import { query } from '../db.js';

export async function getUsers(req, res) {
  const result = await query(
    `SELECT
       u.id,
       u.name,
       u.email,
       u.role,
       TO_CHAR(u.created_at, 'YYYY-MM-DD') AS created_at,
       COALESCE(
         json_agg(
           json_build_object('id', t.id, 'name', t.name)
           ORDER BY t.name
         ) FILTER (WHERE t.id IS NOT NULL),
         '[]'::json
       ) AS teams
     FROM users u
     LEFT JOIN team_members tm ON tm.user_id = u.id
     LEFT JOIN teams t ON t.id = tm.team_id
     GROUP BY u.id
     ORDER BY u.name ASC`
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

export async function getMentionNotifications(req, res) {
  const result = await query(
    `SELECT
       mention.id,
       mention.read_at,
       mention.created_at,
       c.ticket_id,
       c.comment_text,
       author.name AS author_name,
       author.email AS author_email
     FROM ticket_comment_mentions mention
     JOIN ticket_comments c ON c.id = mention.comment_id
     LEFT JOIN users author ON author.id = c.user_id
     WHERE mention.mentioned_user_id = $1
     ORDER BY mention.created_at DESC
     LIMIT 20`,
    [req.user.id]
  );

  return res.json(result.rows.map((row) => ({
    id: row.id,
    ticketId: row.ticket_id,
    message: row.comment_text,
    authorName: row.author_name || 'Unknown user',
    authorEmail: row.author_email || '',
    createdAt: row.created_at,
    readAt: row.read_at,
  })));
}

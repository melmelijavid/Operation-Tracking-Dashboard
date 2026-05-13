import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { pool, query } from '../db.js';
import { sendEmail } from '../utils/email.js';

const VALID_ROLES = ['admin', 'operator', 'viewer'];
const VALID_STATUSES = ['active', 'disabled'];

// Random base64url string. 9 bytes → 12 chars, no padding, URL-safe alphabet.
function generateTempPassword() {
  return crypto.randomBytes(9).toString('base64url');
}

// "Effective" status surfaced to the admin UI:
//   - 'disabled'  if users.status = 'disabled'
//   - 'pending'   if email_verified = false (account exists, hasn't verified yet)
//   - 'active'    otherwise
// One column on the DB, three states in the UI.
function deriveStatus(row) {
  if (row.status === 'disabled') return 'disabled';
  if (!row.email_verified) return 'pending';
  return 'active';
}

function mapUserRow(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: deriveStatus(row),
    emailVerified: row.email_verified,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
    teams: row.teams || [],
  };
}

const userSelect = `
  SELECT
    u.id,
    u.name,
    u.email,
    u.role,
    u.status,
    u.email_verified,
    TO_CHAR(u.created_at, 'YYYY-MM-DD') AS created_at,
    u.last_login_at,
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
`;

async function fetchUser(userId, executor = { query }) {
  const result = await executor.query(
    `${userSelect} WHERE u.id = $1 GROUP BY u.id`,
    [userId]
  );
  return result.rows[0] ? mapUserRow(result.rows[0]) : null;
}

export async function listUsers(req, res) {
  // One row per user with team memberships aggregated into a JSON array.
  // The FILTER inside json_agg drops the synthetic NULL row produced by
  // LEFT JOIN when the user has no team memberships.
  const result = await query(`${userSelect} GROUP BY u.id ORDER BY u.name ASC`);
  return res.json(result.rows.map(mapUserRow));
}

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

export async function updateUser(req, res) {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId)) {
    throw httpError(400, 'Invalid user id.');
  }

  const { name, email, role, status, emailVerified, teamIds } = req.body;
  const isSelf = req.user.id === userId;

  // Validate every field that was provided.
  if (name !== undefined && !name?.trim()) {
    throw httpError(400, 'Name cannot be empty.');
  }
  if (email !== undefined && !email?.trim()) {
    throw httpError(400, 'Email cannot be empty.');
  }
  if (role !== undefined && !VALID_ROLES.includes(role)) {
    throw httpError(400, `Role must be one of: ${VALID_ROLES.join(', ')}.`);
  }
  if (status !== undefined && !VALID_STATUSES.includes(status)) {
    throw httpError(400, `Status must be one of: ${VALID_STATUSES.join(', ')}.`);
  }
  if (teamIds !== undefined && (!Array.isArray(teamIds) || teamIds.some((id) => !Number.isInteger(Number(id))))) {
    throw httpError(400, 'teamIds must be an array of integers.');
  }

  // Self-protection — an admin must not lock themselves out.
  if (isSelf && status === 'disabled') {
    throw httpError(400, 'You cannot disable your own account.');
  }
  if (isSelf && role !== undefined && role !== 'admin') {
    throw httpError(400, 'You cannot remove your own admin role.');
  }

  // Use a connection-scoped transaction so the user update + team
  // membership replacement land atomically.
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existingResult = await client.query(
      'SELECT id, role, status, email FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );
    if (existingResult.rowCount === 0) {
      throw httpError(404, 'User not found.');
    }
    const existing = existingResult.rows[0];

    // If the email is changing, check uniqueness against everyone else.
    if (email && email.trim().toLowerCase() !== existing.email) {
      const dup = await client.query(
        'SELECT 1 FROM users WHERE email = $1 AND id <> $2',
        [email.trim().toLowerCase(), userId]
      );
      if (dup.rowCount > 0) {
        throw httpError(409, 'Another account already uses this email.');
      }
    }

    // Setting status = 'active' on a pending user is treated as an admin
    // override of the email verification gate.
    const shouldForceVerify = status === 'active' && emailVerified !== false;

    await client.query(
      `UPDATE users
         SET
           name = COALESCE($1, name),
           email = COALESCE($2, email),
           role = COALESCE($3, role),
           status = COALESCE($4, status),
           email_verified = CASE
             WHEN $5::boolean IS NOT NULL THEN $5::boolean
             WHEN $6::boolean THEN true
             ELSE email_verified
           END
         WHERE id = $7`,
      [
        name?.trim() ?? null,
        email ? email.trim().toLowerCase() : null,
        role ?? null,
        status ?? null,
        emailVerified === undefined ? null : Boolean(emailVerified),
        shouldForceVerify,
        userId,
      ]
    );

    // Replace team memberships if the caller sent the field.
    if (teamIds !== undefined) {
      await client.query('DELETE FROM team_members WHERE user_id = $1', [userId]);
      for (const rawId of teamIds) {
        const teamId = Number(rawId);
        // Verify the team exists; raising 400 here gives a useful error
        // instead of a generic FK violation.
        const tr = await client.query('SELECT 1 FROM teams WHERE id = $1', [teamId]);
        if (tr.rowCount === 0) {
          throw httpError(400, `Team ${teamId} does not exist.`);
        }
        await client.query(
          'INSERT INTO team_members (team_id, user_id) VALUES ($1, $2)',
          [teamId, userId]
        );
      }
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  const updated = await fetchUser(userId);
  return res.json(updated);
}

/**
 * Generates a fresh random password for the target user, writes the hash,
 * and emails the plaintext to the user. The admin never sees the password —
 * it leaves the server boundary only via SMTP to the user's inbox.
 */
export async function resetUserPassword(req, res) {
  const userId = Number(req.params.id);
  if (!Number.isInteger(userId)) {
    throw httpError(400, 'Invalid user id.');
  }

  const userResult = await query(
    'SELECT id, name, email FROM users WHERE id = $1',
    [userId]
  );
  if (userResult.rowCount === 0) {
    throw httpError(404, 'User not found.');
  }
  const user = userResult.rows[0];

  const newPassword = generateTempPassword();
  const passwordHash = await bcrypt.hash(newPassword, 10);

  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, userId]);

  await sendEmail({
    to: user.email,
    subject: 'Your Operation Tracking password has been reset',
    text: `Hi ${user.name},\n\nAn administrator reset your password.\n\nNew password: ${newPassword}\n\nLog in at any time. We recommend changing it once you do.`,
    html: `
      <p>Hi ${user.name},</p>
      <p>An administrator reset your password.</p>
      <p>New password: <code style="font-size:16px;background:#f3f4f6;padding:4px 8px;border-radius:4px;">${newPassword}</code></p>
      <p>Log in at any time. We recommend changing it once you do.</p>
    `,
  });

  return res.json({ message: `Password reset email sent to ${user.email}.` });
}

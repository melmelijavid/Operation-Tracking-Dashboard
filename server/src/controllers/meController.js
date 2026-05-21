import bcrypt from 'bcryptjs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import multer from 'multer';
import { query } from '../db.js';
import { httpError } from '../utils/httpError.js';
import { clearSessionCookie, issueVerificationCode } from './authController.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Avatars live under server/uploads/avatars/. The folder is created at
// first upload and gitignored — never commit user content.
export const UPLOADS_ROOT = path.join(__dirname, '..', '..', 'uploads');
const AVATAR_DIR = path.join(UPLOADS_ROOT, 'avatars');
const MAX_AVATAR_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_AVATAR_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);
const AVATAR_EXT_BY_MIME = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const avatarStorage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      await fs.mkdir(AVATAR_DIR, { recursive: true });
      cb(null, AVATAR_DIR);
    } catch (err) {
      cb(err);
    }
  },
  filename: (req, file, cb) => {
    const ext = AVATAR_EXT_BY_MIME[file.mimetype] || 'bin';
    // Filename embeds the user id and a timestamp. The id is the
    // authenticated user (set by authMiddleware before this runs), so
    // a client can't write under another user's namespace.
    cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
  },
});

export const avatarUploadMiddleware = multer({
  storage: avatarStorage,
  limits: { fileSize: MAX_AVATAR_BYTES },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_AVATAR_MIME.has(file.mimetype)) {
      cb(httpError(400, 'Only JPEG, PNG, WEBP, or GIF images are allowed.'));
      return;
    }
    cb(null, true);
  },
}).single('avatar');

async function deletePreviousAvatarFile(currentUrl) {
  if (!currentUrl) return;
  // Only delete files that look like ours; never follow paths outside
  // the avatar directory.
  if (!currentUrl.startsWith('/uploads/avatars/')) return;
  const filename = path.basename(currentUrl);
  const fullPath = path.join(AVATAR_DIR, filename);
  // Best-effort — if the file is already missing or unwritable, log and move on.
  try {
    await fs.unlink(fullPath);
  } catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('[avatar] Failed to remove previous file:', err);
    }
  }
}

// One-row profile select. Same shape used by every endpoint in this file
// after a write — we always return the fresh state so the frontend doesn't
// have to refetch.
const meSelect = `
  SELECT
    u.id,
    u.name,
    u.email,
    u.role,
    u.status,
    u.email_verified,
    u.email_notifications_enabled,
    u.phone,
    u.job_title,
    u.avatar_url,
    TO_CHAR(u.created_at, 'YYYY-MM-DD') AS created_at,
    u.last_login_at,
    COALESCE(
      json_agg(
        json_build_object('id', t.id, 'name', t.name) ORDER BY t.name
      ) FILTER (WHERE t.id IS NOT NULL),
      '[]'::json
    ) AS teams
  FROM users u
  LEFT JOIN team_members tm ON tm.user_id = u.id
  LEFT JOIN teams t ON t.id = tm.team_id
  WHERE u.id = $1
  GROUP BY u.id
`;

function mapMeRow(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    emailVerified: row.email_verified,
    emailNotificationsEnabled: row.email_notifications_enabled,
    phone: row.phone || '',
    jobTitle: row.job_title || '',
    avatarUrl: row.avatar_url || '',
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
    teams: row.teams || [],
  };
}

export async function getMyProfile(req, res) {
  const result = await query(meSelect, [req.user.id]);
  if (result.rowCount === 0) {
    throw httpError(404, 'Profile not found.');
  }
  return res.json(mapMeRow(result.rows[0]));
}

/**
 * Partial update of safely-editable profile fields. Doesn't touch email
 * (use PATCH /api/me/email for that) or password (POST /change-password).
 *
 * COALESCE pattern: fields absent from the body keep their current value.
 * Sending a field with an empty string clears it (becomes NULL). Sending
 * an explicit null behaves the same as omitting.
 */
export async function updateMyProfile(req, res) {
  const { name, phone, jobTitle, emailNotificationsEnabled } = req.body || {};

  if (name !== undefined && !name?.trim()) {
    throw httpError(400, 'Name cannot be empty.');
  }

  await query(
    `UPDATE users SET
       name = COALESCE($1, name),
       phone = CASE WHEN $2::boolean THEN $3 ELSE phone END,
       job_title = CASE WHEN $4::boolean THEN $5 ELSE job_title END,
       email_notifications_enabled = COALESCE($6, email_notifications_enabled)
     WHERE id = $7`,
    [
      name?.trim() ?? null,
      phone !== undefined,
      phone?.trim() || null,
      jobTitle !== undefined,
      jobTitle?.trim() || null,
      emailNotificationsEnabled === undefined ? null : Boolean(emailNotificationsEnabled),
      req.user.id,
    ]
  );

  const result = await query(meSelect, [req.user.id]);
  return res.json(mapMeRow(result.rows[0]));
}

/**
 * Updates the user's email and triggers a verification flow against the
 * new address. The session is cleared so the user has to verify the new
 * email before they can log in again. This is safer than leaving them
 * half-authenticated with a stale claim in their JWT.
 */
export async function changeMyEmail(req, res) {
  const { email } = req.body || {};
  if (!email?.trim()) {
    throw httpError(400, 'Email is required.');
  }

  const normalizedEmail = email.trim().toLowerCase();

  const userResult = await query(
    'SELECT id, name, email FROM users WHERE id = $1',
    [req.user.id]
  );
  if (userResult.rowCount === 0) {
    throw httpError(404, 'User not found.');
  }
  const current = userResult.rows[0];

  if (current.email === normalizedEmail) {
    return res.json({ message: 'Email unchanged.', email: normalizedEmail });
  }

  const dup = await query(
    'SELECT 1 FROM users WHERE email = $1 AND id <> $2',
    [normalizedEmail, req.user.id]
  );
  if (dup.rowCount > 0) {
    throw httpError(409, 'Another account already uses this email.');
  }

  await query(
    'UPDATE users SET email = $1, email_verified = false WHERE id = $2',
    [normalizedEmail, req.user.id]
  );

  await issueVerificationCode({ id: req.user.id, name: current.name, email: normalizedEmail });

  clearSessionCookie(res);

  return res.json({
    message: `A verification code has been sent to ${normalizedEmail}. Verify your new email, then log in.`,
    email: normalizedEmail,
  });
}

export async function uploadMyAvatar(req, res) {
  if (!req.file) {
    throw httpError(400, 'No file uploaded.');
  }

  // If the user already had an avatar, remove the old file from disk.
  // Failure to remove is logged but doesn't block the upload.
  const previous = await query('SELECT avatar_url FROM users WHERE id = $1', [req.user.id]);
  await deletePreviousAvatarFile(previous.rows[0]?.avatar_url);

  const url = `/uploads/avatars/${req.file.filename}`;
  await query('UPDATE users SET avatar_url = $1 WHERE id = $2', [url, req.user.id]);

  const result = await query(meSelect, [req.user.id]);
  return res.json(mapMeRow(result.rows[0]));
}

export async function deleteMyAvatar(req, res) {
  const previous = await query('SELECT avatar_url FROM users WHERE id = $1', [req.user.id]);
  await deletePreviousAvatarFile(previous.rows[0]?.avatar_url);
  await query('UPDATE users SET avatar_url = NULL WHERE id = $1', [req.user.id]);

  const result = await query(meSelect, [req.user.id]);
  return res.json(mapMeRow(result.rows[0]));
}

export async function changeMyPassword(req, res) {
  const { currentPassword, newPassword } = req.body || {};

  if (!currentPassword) {
    throw httpError(400, 'Current password is required.');
  }
  if (!newPassword || newPassword.length < 6) {
    throw httpError(400, 'New password must be at least 6 characters.');
  }

  const result = await query(
    'SELECT password_hash FROM users WHERE id = $1',
    [req.user.id]
  );
  if (result.rowCount === 0) {
    throw httpError(404, 'User not found.');
  }

  const passwordMatches = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
  if (!passwordMatches) {
    throw httpError(401, 'Current password is incorrect.');
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [newHash, req.user.id]);

  return res.json({ message: 'Password updated.' });
}

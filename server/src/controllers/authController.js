import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db.js';
import { sendEmail } from '../utils/email.js';
import {
  CODE_MAX_ATTEMPTS,
  CODE_TTL_MINUTES,
  codeMatches,
  generateCode,
  hashCode,
} from '../utils/verificationCode.js';

// Cookie name for the JWT session. The token never leaves the server boundary
// in the response body — it lives only in this httpOnly cookie.
export const SESSION_COOKIE_NAME = 'otd_session';
const SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days, matching the JWT expiry

function signToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: SESSION_MAX_AGE_MS,
    path: '/',
  };
}

function setSessionCookie(res, token) {
  res.cookie(SESSION_COOKIE_NAME, token, getSessionCookieOptions());
}

export function clearSessionCookie(res) {
  // clearCookie must echo the same path / sameSite / secure flags or the
  // browser will silently keep the original cookie around.
  const { maxAge: _ignored, ...options } = getSessionCookieOptions();
  res.clearCookie(SESSION_COOKIE_NAME, options);
}

function userResponse(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatar_url || '',
  };
}

function getSignupRole(normalizedEmail) {
  return normalizedEmail.endsWith('@nokia.com') ? 'operator' : 'viewer';
}

export async function issueVerificationCode(user) {
  // Invalidate any active codes the user has — a fresh issue supersedes them.
  await query(
    `UPDATE email_verification_codes
       SET consumed_at = NOW()
     WHERE user_id = $1 AND consumed_at IS NULL`,
    [user.id]
  );

  const code = generateCode();
  await query(
    `INSERT INTO email_verification_codes (user_id, code_hash, expires_at)
     VALUES ($1, $2, NOW() + ($3 || ' minutes')::interval)`,
    [user.id, hashCode(code), CODE_TTL_MINUTES]
  );

  // Fire-and-forget the email — but await so transient SMTP errors surface
  // as 500s on signup rather than silently dropping the code.
  await sendEmail({
    to: user.email,
    subject: 'Your Operation Tracking verification code',
    text: `Hi ${user.name},\n\nYour verification code is ${code}.\n\nIt expires in ${CODE_TTL_MINUTES} minutes.\n\nIf you didn't request this, you can ignore this email.`,
    html: `
      <p>Hi ${user.name},</p>
      <p>Your verification code is:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:6px;">${code}</p>
      <p>It expires in ${CODE_TTL_MINUTES} minutes.</p>
      <p style="color:#888;font-size:12px;">If you didn't request this, you can ignore this email.</p>
    `,
  });
}

export async function signup(req, res) {
  const { name, email, password } = req.body;

  if (!name?.trim() || !email?.trim() || !password || password.length < 6) {
    return res.status(400).json({ message: 'Name, email, and a password with at least 6 characters are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
  if (existingUser.rowCount > 0) {
    return res.status(409).json({ message: 'An account with this email already exists.' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const role = getSignupRole(normalizedEmail);

  // Security note:
  // domain-based role assignment combined with required email verification
  // gives us proof that whoever signs up actually controls the @nokia.com
  // mailbox. Still not as good as a real corporate identity check, but
  // meaningfully better than the unverified version.
  const result = await query(
    `INSERT INTO users (name, email, password_hash, role, email_verified)
     VALUES ($1, $2, $3, $4, false)
     RETURNING id, name, email, role`,
    [name.trim(), normalizedEmail, passwordHash, role]
  );

  const user = result.rows[0];
  await issueVerificationCode(user);

  // No session cookie yet — that happens after they verify.
  return res.status(201).json({
    message: 'Account created. Check your email for a 6-digit verification code.',
    email: user.email,
  });
}

export async function login(req, res) {
  const { email, password } = req.body;

  if (!email?.trim() || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const result = await query(
    `SELECT id, name, email, password_hash, role, email_verified, status, avatar_url
     FROM users
     WHERE email = $1`,
    [normalizedEmail]
  );

  if (result.rowCount === 0) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  const user = result.rows[0];
  const passwordMatches = await bcrypt.compare(password, user.password_hash);

  if (!passwordMatches) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  // Disabled accounts can't log in. We check this AFTER the password match
  // so the response doesn't leak whether the disabled email exists.
  if (user.status === 'disabled') {
    return res.status(403).json({
      message: 'Your account has been disabled. Please contact an administrator.',
      code: 'ACCOUNT_DISABLED',
    });
  }

  if (!user.email_verified) {
    return res.status(403).json({
      message: 'Your email address is not verified yet. Check your inbox for the code.',
      code: 'EMAIL_NOT_VERIFIED',
      email: user.email,
    });
  }

  await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

  setSessionCookie(res, signToken(user));
  return res.json({ user: userResponse(user) });
}

export async function logout(req, res) {
  clearSessionCookie(res);
  return res.status(204).end();
}

export async function getCurrentUser(req, res) {
  const result = await query(
    `SELECT id, name, email, role, avatar_url
     FROM users
     WHERE id = $1`,
    [req.user.id]
  );

  if (result.rowCount === 0) {
    return res.status(404).json({ message: 'User not found.' });
  }

  return res.json({ user: userResponse(result.rows[0]) });
}

export async function verifyEmail(req, res) {
  const { email, code } = req.body || {};
  if (!email?.trim() || !code?.toString().trim()) {
    return res.status(400).json({ message: 'Email and verification code are required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const userResult = await query(
    `SELECT id, name, email, role, email_verified
     FROM users
     WHERE email = $1`,
    [normalizedEmail]
  );

  if (userResult.rowCount === 0) {
    return res.status(400).json({ message: 'Invalid verification code.' });
  }
  const user = userResult.rows[0];

  if (user.email_verified) {
    return res.status(400).json({ message: 'This email is already verified. Please log in.' });
  }

  const codeResult = await query(
    `SELECT id, code_hash, expires_at, attempts
     FROM email_verification_codes
     WHERE user_id = $1 AND consumed_at IS NULL
     ORDER BY created_at DESC
     LIMIT 1`,
    [user.id]
  );

  if (codeResult.rowCount === 0) {
    return res.status(400).json({ message: 'No active verification code. Please request a new one.' });
  }

  const codeRow = codeResult.rows[0];

  if (new Date(codeRow.expires_at) < new Date()) {
    return res.status(400).json({ message: 'This verification code has expired. Please request a new one.' });
  }

  if (codeRow.attempts >= CODE_MAX_ATTEMPTS) {
    return res.status(429).json({ message: 'Too many incorrect attempts. Please request a new code.' });
  }

  if (!codeMatches(String(code).trim(), codeRow.code_hash)) {
    await query(
      'UPDATE email_verification_codes SET attempts = attempts + 1 WHERE id = $1',
      [codeRow.id]
    );
    const remaining = CODE_MAX_ATTEMPTS - (codeRow.attempts + 1);
    return res.status(401).json({
      message: remaining > 0
        ? `Invalid code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
        : 'Too many incorrect attempts. Please request a new code.',
    });
  }

  // Success — mark code consumed and flip the user. We deliberately do NOT
  // sign them in here; verifying ownership of the inbox is a separate step
  // from authenticating, so the user goes back to the login page.
  await query(
    'UPDATE email_verification_codes SET consumed_at = NOW() WHERE id = $1',
    [codeRow.id]
  );
  await query('UPDATE users SET email_verified = true WHERE id = $1', [user.id]);

  return res.json({ message: 'Email verified. You can now log in.' });
}

export async function resendVerification(req, res) {
  const { email } = req.body || {};
  if (!email?.trim()) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Constant response regardless of whether the address exists or is already
  // verified — don't leak account state to anonymous callers.
  const userResult = await query(
    `SELECT id, name, email, email_verified
     FROM users
     WHERE email = $1`,
    [normalizedEmail]
  );

  if (userResult.rowCount > 0 && !userResult.rows[0].email_verified) {
    await issueVerificationCode(userResult.rows[0]);
  }

  return res.json({ message: 'If that account exists and is unverified, a new code has been sent.' });
}

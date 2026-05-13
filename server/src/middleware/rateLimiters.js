import rateLimit from 'express-rate-limit';

// Per-IP limiters for authentication endpoints. The two policies target
// different threats:
//   - loginLimiter:  brute-forcing existing accounts. Tight window, low ceiling.
//   - signupLimiter: mass-account creation / spam. Long window, very low ceiling.
//
// Note on deployments behind a reverse proxy (nginx, Heroku, etc.): set
// `app.set('trust proxy', 1)` in app.js so req.ip reflects the real client
// rather than the proxy.

const standardOptions = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
};

export const loginLimiter = rateLimit({
  ...standardOptions,
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10,
  message: { message: 'Too many login attempts. Please wait a few minutes and try again.' },
});

export const signupLimiter = rateLimit({
  ...standardOptions,
  windowMs: 60 * 60 * 1000, // 1 hour
  limit: 5,
  message: { message: 'Too many signup attempts from this address. Please try again later.' },
});

// Brute-force protection on the 6-digit verification code. The DB-side
// per-code attempts cap (5) handles the same threat from a different angle;
// this catches IP-rotating attackers hammering one address.
export const verifyEmailLimiter = rateLimit({
  ...standardOptions,
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: { message: 'Too many verification attempts. Please wait a few minutes and try again.' },
});

// Anti-email-bomb. A new code invalidates the old one, so unbounded resends
// would let an attacker spam an inbox.
export const resendVerificationLimiter = rateLimit({
  ...standardOptions,
  windowMs: 60 * 60 * 1000,
  limit: 3,
  message: { message: 'Too many resend attempts. Please wait an hour before trying again.' },
});

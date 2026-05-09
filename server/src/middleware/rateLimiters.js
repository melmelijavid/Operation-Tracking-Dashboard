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

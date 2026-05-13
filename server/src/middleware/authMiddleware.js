import jwt from 'jsonwebtoken';
import { SESSION_COOKIE_NAME } from '../controllers/authController.js';
import { query } from '../db.js';

export async function authenticateToken(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE_NAME];

  if (!token) {
    return res.status(401).json({ message: 'Authentication token is missing.' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return res.status(401).json({ message: 'Authentication token is invalid or expired.' });
  }

  // One DB lookup per authenticated request to enforce live account state.
  // The cost is a single PK select; the win is that an admin disabling a
  // user takes effect on that user's next request instead of waiting for
  // their JWT to expire.
  const result = await query('SELECT status FROM users WHERE id = $1', [payload.id]);
  if (result.rowCount === 0) {
    return res.status(401).json({ message: 'Account no longer exists.' });
  }
  if (result.rows[0].status === 'disabled') {
    return res.status(403).json({
      message: 'Your account has been disabled. Please contact an administrator.',
      code: 'ACCOUNT_DISABLED',
    });
  }

  req.user = payload;
  return next();
}

export function authorizeRoles(...roles) {
  return function roleMiddleware(req, res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action.' });
    }

    return next();
  };
}

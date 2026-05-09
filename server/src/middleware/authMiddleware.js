import jwt from 'jsonwebtoken';
import { SESSION_COOKIE_NAME } from '../controllers/authController.js';

export function authenticateToken(req, res, next) {
  const token = req.cookies?.[SESSION_COOKIE_NAME];

  if (!token) {
    return res.status(401).json({ message: 'Authentication token is missing.' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    return next();
  } catch (error) {
    return res.status(401).json({ message: 'Authentication token is invalid or expired.' });
  }
}

export function authorizeRoles(...roles) {
  return function roleMiddleware(req, res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to perform this action.' });
    }

    return next();
  };
}

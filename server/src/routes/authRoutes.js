import { Router } from 'express';
import { getCurrentUser, login, logout, signup } from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { loginLimiter, signupLimiter } from '../middleware/rateLimiters.js';

const router = Router();

router.post('/signup', signupLimiter, signup);
router.post('/login', loginLimiter, login);
router.post('/logout', logout);
router.get('/me', authenticateToken, getCurrentUser);

export default router;

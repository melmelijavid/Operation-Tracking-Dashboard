import { Router } from 'express';
import { listUsers, resetUserPassword, updateUser } from '../controllers/adminController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = Router();

// All /api/admin/* routes require an authenticated admin user.
router.use(authenticateToken);
router.use(authorizeRoles('admin'));

router.get('/users', listUsers);
router.patch('/users/:id', updateUser);
router.post('/users/:id/reset-password', resetUserPassword);

export default router;

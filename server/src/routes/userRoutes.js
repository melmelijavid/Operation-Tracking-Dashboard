import { Router } from 'express';
import { getUsers, updateUserRole } from '../controllers/userController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateToken);
router.get('/', getUsers);
router.patch('/:id/role', authorizeRoles('admin'), updateUserRole);

export default router;

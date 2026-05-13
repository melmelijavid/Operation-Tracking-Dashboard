import { Router } from 'express';
import { getTeams } from '../controllers/teamController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateToken);
router.get('/', getTeams);

export default router;

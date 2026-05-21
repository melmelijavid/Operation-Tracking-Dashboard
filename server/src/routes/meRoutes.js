import { Router } from 'express';
import {
  avatarUploadMiddleware,
  changeMyEmail,
  changeMyPassword,
  deleteMyAvatar,
  getMyProfile,
  updateMyProfile,
  uploadMyAvatar,
} from '../controllers/meController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getMyProfile);
router.patch('/', updateMyProfile);
router.patch('/email', changeMyEmail);
router.post('/change-password', changeMyPassword);
router.post('/avatar', avatarUploadMiddleware, uploadMyAvatar);
router.delete('/avatar', deleteMyAvatar);

export default router;

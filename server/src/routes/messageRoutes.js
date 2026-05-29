import { Router } from 'express';
import {
  getConversationMessages,
  getMessageConversations,
  getMessageUsers,
  getUnreadMessageCount,
  markConversationRead,
  sendMessage,
} from '../controllers/messageController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/users', getMessageUsers);
router.get('/conversations', getMessageConversations);
router.get('/unread-count', getUnreadMessageCount);
router.get('/:userId', getConversationMessages);
router.post('/:userId', sendMessage);
router.patch('/:userId/read', markConversationRead);

export default router;

import { Router } from 'express';
import {
  addTicketComment,
  createTicket,
  deleteTicket,
  getTicket,
  getTicketComments,
  getTicketHistory,
  getTickets,
  updateTicket,
} from '../controllers/ticketController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = Router();

router.use(authenticateToken);

router.get('/', getTickets);
router.get('/:id/history', getTicketHistory);
router.get('/:id/comments', getTicketComments);
router.post('/:id/comments', authorizeRoles('admin', 'operator'), addTicketComment);
router.get('/:id', getTicket);
router.post('/', authorizeRoles('admin', 'operator'), createTicket);
router.put('/:id', authorizeRoles('admin', 'operator'), updateTicket);
router.delete('/:id', authorizeRoles('admin', 'operator'), deleteTicket);

export default router;

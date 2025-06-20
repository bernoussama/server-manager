import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware.js';
import { createTicket, getAllTickets, getTicketById, updateTicket, deleteTicket } from '../controllers/ticketController.js';

const router: Router = Router();

router.use(authMiddleware);

router.route('/')
    .post(createTicket)
    .get(getAllTickets);

router.route('/:id')
    .get(getTicketById)
    .put(updateTicket)
    .delete(deleteTicket);

export default router; 
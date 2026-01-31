import express from 'express';
import chatController from '../controllers/chatController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router: express.Router = express.Router();

router.post('/', authMiddleware, chatController.handleChat);

export default router;

import express from 'express';
import { updateHttpConfiguration, getHttpConfiguration } from '../controllers/httpController';
import { isAuthenticated } from '../middlewares/authMiddleware'; // Assuming you have this

const router = express.Router();

router.post('/config', isAuthenticated, updateHttpConfiguration);
router.get('/config', isAuthenticated, getHttpConfiguration);

export default router;

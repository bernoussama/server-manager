import express, { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import {
  getCurrentHttpConfiguration,
  updateHttpConfiguration,
  validateHttpConfiguration,
  getHttpServiceStatus,
  controlHttpService
} from '../controllers/httpController';

const router: Router = express.Router();

// Apply authentication middleware to all routes that modify state
router.use('/config', protect);
router.use('/service/:action', protect);

// HTTP Configuration routes
router.get('/config', getCurrentHttpConfiguration);
router.put('/config', updateHttpConfiguration);
router.post('/validate', validateHttpConfiguration);

// HTTP Service management routes
router.get('/status', getHttpServiceStatus);
router.post('/service/:action', controlHttpService);

export default router; 
import express, { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import httpController from '../controllers/httpController';

const router: Router = express.Router();

// Apply authentication middleware to all routes that modify state
router.use('/config', protect);
router.use('/service/:action', protect);

// HTTP Configuration routes
router.get('/config', httpController.getCurrentHttpConfiguration);
router.put('/config', httpController.updateHttpConfiguration);
router.post('/validate', httpController.validateHttpConfiguration);

// HTTP Service management routes
router.get('/status', httpController.getHttpServiceStatus);
router.post('/service/:action', httpController.controlHttpService);

export default router; 
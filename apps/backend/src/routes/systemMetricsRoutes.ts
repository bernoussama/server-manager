import express from 'express';
import systemMetricsController from '../controllers/systemMetricsController';
import { protect } from '../middlewares/authMiddleware';

const router: express.Router = express.Router();

// GET /api/system-metrics - Retrieves all system metrics (protected)
router.get('/', protect, systemMetricsController.getSystemMetrics);

export default router; 
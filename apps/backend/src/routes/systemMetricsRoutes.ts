import { Router } from 'express';
import type { Router as ExpressRouter } from 'express';
import systemMetricsController from '../controllers/systemMetricsController';
import { protect } from '../middlewares/authMiddleware'; // Assuming you want to protect this route

const router: ExpressRouter = Router();

// GET /api/system-metrics - Retrieves all system metrics
router.get('/', systemMetricsController.getSystemMetrics);

export default router; 
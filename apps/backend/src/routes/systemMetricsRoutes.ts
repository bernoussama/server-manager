import express from 'express';
import systemMetricsController from '../controllers/systemMetricsController';
import { protect } from '../middlewares/authMiddleware'; // Assuming you want to protect this route

const router: express.Router = express.Router();

// GET /api/system-metrics - Retrieves all system metrics
router.get('/', systemMetricsController.getSystemMetrics);

export default router; 
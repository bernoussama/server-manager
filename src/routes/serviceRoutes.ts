import express from 'express';
import servicesController from '../controllers/servicesController';

const router = express.Router();

// Get status of all services
router.get('/', servicesController.getAllServicesStatus);

// Get status of a specific service
router.get('/:service', servicesController.getServiceStatus);

// Start a service
router.post('/:service/start', servicesController.startService);

// Stop a service
router.post('/:service/stop', servicesController.stopService);

// Restart a service
router.post('/:service/restart', servicesController.restartService);

// service status
router.get('/:service/status', servicesController.getServiceStatus);

// service logs
router.get('/:service/logs', servicesController.getServiceLogs);

export default router;


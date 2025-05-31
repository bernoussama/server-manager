import express from 'express';
import { updateDnsConfiguration, getCurrentDnsConfiguration } from '../controllers/dnsController';
import { protect } from '../middlewares/authMiddleware';

const router: express.Router = express.Router();

// Route to get current DNS configuration
router.get('/config', getCurrentDnsConfiguration);

// Route to update DNS configuration - now protected
router.post('/config', protect, updateDnsConfiguration);

// Alternatively, POST could be used if you consider each submission as creating a new version of the config.
// router.post('/config',  updateDnsConfiguration); //! TODO: Protect this route

export default router; 
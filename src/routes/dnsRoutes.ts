import express from 'express';
import { updateDnsConfiguration } from '../controllers/dnsController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

// Route to update DNS configuration
// Assuming a PUT request as we are updating an existing configuration resource (or creating if not present)
// Alternatively, POST could be used if you consider each submission as creating a new version of the config.
router.put('/config', protect, updateDnsConfiguration);

export default router; 
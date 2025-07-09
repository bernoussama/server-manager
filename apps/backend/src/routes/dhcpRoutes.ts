import express, { Router } from 'express';
import { protect } from '../middlewares/authMiddleware';
import {
  getCurrentDhcpConfiguration,
  updateDhcpConfiguration,
  validateDhcpConfiguration,
  getDhcpServiceStatus,
  controlDhcpService,
  getNetworkInterfaces
} from '../controllers/dhcpController';

const router: Router = express.Router();

// Get current DHCP configuration
router.get('/config', getCurrentDhcpConfiguration);

// Update DHCP configuration (protected)
router.put('/config', protect, updateDhcpConfiguration);

// Validate DHCP configuration without saving (protected)
router.post('/validate', protect, validateDhcpConfiguration);

// Get DHCP service status
router.get('/status', getDhcpServiceStatus);

// Control DHCP service (start/stop/restart/reload) (protected)
router.post('/service/:action', protect, controlDhcpService);

// Get network interfaces
router.get('/interfaces', getNetworkInterfaces);

export default router; 
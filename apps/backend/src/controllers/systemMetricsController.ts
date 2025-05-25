import type { Request, Response, NextFunction } from 'express';
import { SystemMetrics, type MemoryUsage, type CpuUsage, type DiskUsage, type ActiveService } from '../lib/systemMetrics';
import { MockSystemMetrics } from '../lib/MockSystemMetrics';
import config from '../config/config';
import logger from '../lib/logger';

// Initialize the appropriate system metrics instance based on configuration
const systemMetrics = config.useMockServices ? new MockSystemMetrics() : new SystemMetrics();

// Log which system metrics implementation is being used
if (config.useMockServices) {
  logger.info('🔧 Using MockSystemMetrics for development mode');
} else {
  logger.info('⚙️ Using real SystemMetrics for production mode');
}

/**
 * @interface SystemMetricsResponse
 * @description Defines the structure of the API response for system metrics.
 * @property {string} uptime - System uptime.
 * @property {MemoryUsage} memory - Memory usage statistics.
 * @property {CpuUsage} cpu - CPU usage statistics.
 * @property {DiskUsage[]} disk - Array of disk usage statistics for mounted filesystems.
 * @property {ActiveService[]} activeServices - Array of active systemd services.
 */
export interface SystemMetricsResponse {
  uptime: string;
  memory: MemoryUsage;
  cpu: CpuUsage;
  disk: DiskUsage[];
  activeServices: ActiveService[];
}

/**
 * @class SystemMetricsController
 * @description Controller to handle requests related to system metrics.
 * It uses the SystemMetrics service to fetch data and aggregates it for API responses.
 */
class SystemMetricsController {
  /**
   * @async
   * @method getSystemMetrics
   * @description Handles GET requests to retrieve all system metrics.
   * Fetches uptime, memory, CPU, disk usage, and active services concurrently.
   * Responds with a JSON object containing all metrics or an error if fetching fails.
   * @param {Request} req - Express request object.
   * @param {Response} res - Express response object.
   * @param {NextFunction} next - Express next middleware function.
   * @returns {Promise<void>}
   */
  async getSystemMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    logger.info(`System metrics request received${config.useMockServices ? ' (mock mode)' : ''}`);
    try {
      const [uptime, memory, cpu, disk, activeServices] = await Promise.all([
        systemMetrics.getUptime(),
        systemMetrics.getMemoryUsage(),
        systemMetrics.getCpuUsage(),
        systemMetrics.getDiskUsage(),
        systemMetrics.getActiveServices(),
      ]);

      const response: SystemMetricsResponse = {
        uptime,
        memory,
        cpu,
        disk,
        activeServices,
      };

      logger.info(`System metrics fetched successfully${config.useMockServices ? ' (mock mode)' : ''}`);
      res.status(200).json(response);
    } catch (error) {
      logger.error(`Error fetching system metrics${config.useMockServices ? ' (mock mode)' : ''}:`, error);
      
      // In development mode, provide more helpful error information
      if (config.useMockServices) {
        // Mock should rarely fail, but if it does, provide a fallback
        const fallbackResponse: SystemMetricsResponse = {
          uptime: '0h 0m 0s (fallback)',
          memory: { total: 8192, free: 4096, used: 4096, unit: 'MB' },
          cpu: { currentLoad: 25, cores: 4 },
          disk: [{ filesystem: '/dev/fallback', size: '50G', used: '25G', available: '25G', usagePercentage: '50%', mountPath: '/' }],
          activeServices: [{ name: 'fallback-service', status: 'active', description: 'Fallback service' }]
        };
        
        logger.warn('Using fallback system metrics due to mock error');
        res.status(200).json(fallbackResponse);
        return;
      }
      
      // Pass the error to the centralized error handler for production
      next(error);
    }
  }
}

export default new SystemMetricsController(); 
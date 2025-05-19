import { Request, Response, NextFunction } from 'express';
import { SystemMetrics, MemoryUsage, CpuUsage, DiskUsage, ActiveService } from '../lib/systemMetrics';
import logger from '../lib/logger';

const systemMetrics = new SystemMetrics();

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
    logger.info('System metrics request received');
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

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error fetching system metrics:', error);
      // Pass the error to the centralized error handler
      next(error);
    }
  }
}

export default new SystemMetricsController(); 
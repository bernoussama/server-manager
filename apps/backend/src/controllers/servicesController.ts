import type { Request, Response } from 'express';
import { ServiceManager } from '../lib/ServiceManager';
import { MockServiceManager } from '../lib/MockServiceManager';
import config from '../config/config';
import type { AllowedService, ServiceStatus, ServiceResponse } from '@server-manager/shared';
import logger from '../lib/logger';

// Initialize the appropriate service manager based on configuration
const serviceManager = config.useMockServices ? new MockServiceManager() : new ServiceManager();

// Log which service manager is being used
if (config.useMockServices) {
  logger.info('🔧 Using MockServiceManager for development mode');
} else {
  logger.info('⚙️ Using real ServiceManager for production mode');
}

// Validate if a service name is allowed
const isAllowedService = (service: string): service is AllowedService => {
  return ['named', 'dhcpd', 'httpd'].includes(service);
};

class ServicesController {
  // Get status of a specific service
  public async getServiceStatus(req: Request, res: Response) {
    logger.info('Request received to get service status');
    const { service } = req.params;

    if (!isAllowedService(service)) {
      logger.warn(`Invalid service name requested: ${service}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid service name. Allowed services are: named, dhcpd, httpd'
      });
    }

    logger.info(`Checking status for service: ${service}`);
    try {
      const status = await serviceManager.status(service);
      logger.info(`Service ${service} status: ${status}`);
      const response: ServiceResponse = {
        service,
        status: status ? 'running' : 'stopped',
        message: `Service ${service} is ${status ? 'running' : 'stopped'}${config.useMockServices ? ' (mock)' : ''}`
      };

      return res.status(200).json({
        success: true,
        data: response
      });
    } catch (error) {
      logger.error(`Failed to get status for service ${service}:`, error);
      
      // In development mode, provide a more helpful error
      const errorMessage = config.useMockServices 
        ? `Mock service error for ${service}` 
        : `Failed to get status for service ${service}`;
      
      return res.status(500).json({
        success: false,
        message: errorMessage,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Start a service
  public async startService(req: Request, res: Response) {
    const { service } = req.params;

    if (!isAllowedService(service)) {
      logger.warn(`Invalid service name requested to start: ${service}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid service name. Allowed services are: named, dhcpd, httpd'
      });
    }

    logger.info(`Request to start service: ${service}`);
    try {
      await serviceManager.start(service);
      logger.info(`Service ${service} start command executed`);
      
      // Check actual status after starting
      const isRunning = await serviceManager.status(service);
      const actualStatus: ServiceStatus = isRunning ? 'running' : 'stopped';
      
      logger.info(`Service ${service} status after start attempt: ${actualStatus}`);
      
      const response: ServiceResponse = {
        service,
        status: actualStatus,
        message: `Service ${service} ${isRunning ? 'started successfully' : 'failed to start'}${config.useMockServices ? ' (mock)' : ''}`
      };

      return res.status(200).json({
        success: true,
        data: response
      });
    } catch (error) {
      logger.error(`Failed to start service ${service}:`, error);
      
      const errorMessage = config.useMockServices 
        ? `Mock service start error for ${service}` 
        : `Failed to start service ${service}`;
      
      return res.status(500).json({
        success: false,
        message: errorMessage,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Stop a service
  public async stopService(req: Request, res: Response) {
    const { service } = req.params;

    if (!isAllowedService(service)) {
      logger.warn(`Invalid service name requested to stop: ${service}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid service name. Allowed services are: named, dhcpd, httpd'
      });
    }

    logger.info(`Request to stop service: ${service}`);
    try {
      await serviceManager.stop(service);
      logger.info(`Service ${service} stop command executed`);
      
      // Check actual status after stopping
      const isRunning = await serviceManager.status(service);
      const actualStatus: ServiceStatus = isRunning ? 'running' : 'stopped';
      
      logger.info(`Service ${service} status after stop attempt: ${actualStatus}`);
      
      const response: ServiceResponse = {
        service,
        status: actualStatus,
        message: `Service ${service} ${!isRunning ? 'stopped successfully' : 'failed to stop'}${config.useMockServices ? ' (mock)' : ''}`
      };

      return res.status(200).json({
        success: true,
        data: response
      });
    } catch (error) {
      logger.error(`Failed to stop service ${service}:`, error);
      
      const errorMessage = config.useMockServices 
        ? `Mock service stop error for ${service}` 
        : `Failed to stop service ${service}`;
      
      return res.status(500).json({
        success: false,
        message: errorMessage,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Restart a service
  public async restartService(req: Request, res: Response) {
    const { service } = req.params;

    if (!isAllowedService(service)) {
      logger.warn(`Invalid service name requested to restart: ${service}`);
      return res.status(400).json({
        success: false,
        message: 'Invalid service name. Allowed services are: named, dhcpd, httpd'
      });
    }

    logger.info(`Request to restart service: ${service}`);
    try {
      await serviceManager.restart(service);
      logger.info(`Service ${service} restart command executed`);
      
      // Check actual status after restarting
      const isRunning = await serviceManager.status(service);
      const actualStatus: ServiceStatus = isRunning ? 'running' : 'stopped';
      
      logger.info(`Service ${service} status after restart attempt: ${actualStatus}`);
      
      const response: ServiceResponse = {
        service,
        status: actualStatus,
        message: `Service ${service} ${isRunning ? 'restarted successfully' : 'failed to restart'}${config.useMockServices ? ' (mock)' : ''}`
      };

      return res.status(200).json({
        success: true,
        data: response
      });
    } catch (error) {
      logger.error(`Failed to restart service ${service}:`, error);
      
      const errorMessage = config.useMockServices 
        ? `Mock service restart error for ${service}` 
        : `Failed to restart service ${service}`;
      
      return res.status(500).json({
        success: false,
        message: errorMessage,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get status of all services
  public async getAllServicesStatus(req: Request, res: Response) {
    logger.info('Request to get status of all services');
    const services: AllowedService[] = ['named', 'dhcpd', 'httpd'];
    const statuses: ServiceResponse[] = [];

    try {
      for (const service of services) {
        logger.debug(`Checking status for service: ${service}`);
        try {
          const status = await serviceManager.status(service);
          statuses.push({
            service,
            status: status ? 'running' : 'stopped',
            message: `Service ${service} is ${status ? 'running' : 'stopped'}${config.useMockServices ? ' (mock)' : ''}`
          });
        } catch (error) {
          // If individual service check fails, mark as unknown
          logger.warn(`Failed to check status for ${service}, marking as unknown:`, error);
          statuses.push({
            service,
            status: 'unknown',
            message: `Unable to determine status for ${service}${config.useMockServices ? ' (mock)' : ''}`
          });
        }
      }

      logger.info(`Successfully retrieved status for all services${config.useMockServices ? ' (mock mode)' : ''}`);
      return res.status(200).json({
        success: true,
        data: statuses
      });
    } catch (error) {
      logger.error('Failed to get status for all services:', error);
      
      const errorMessage = config.useMockServices 
        ? 'Mock services error' 
        : 'Failed to get status for all services';
      
      return res.status(500).json({
        success: false,
        message: errorMessage,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export default new ServicesController();
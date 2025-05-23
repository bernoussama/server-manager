import { Request, Response } from 'express';
import { ServiceManager } from '../lib/ServiceManager';
import type { AllowedService, ServiceStatus, ServiceResponse } from '@server-manager/shared';
import logger from '../lib/logger';

// Initialize service manager
const serviceManager = new ServiceManager();

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
        message: `Service ${service} is ${status ? 'running' : 'stopped'}`
      };

      return res.status(200).json({
        success: true,
        data: response
      });
    } catch (error) {
      logger.error(`Failed to get status for service ${service}:`, error);
      return res.status(500).json({
        success: false,
        message: `Failed to get status for service ${service}`,
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
        message: `Service ${service} ${isRunning ? 'started successfully' : 'failed to start'}`
      };

      return res.status(200).json({
        success: true,
        data: response
      });
    } catch (error) {
      logger.error(`Failed to start service ${service}:`, error);
      return res.status(500).json({
        success: false,
        message: `Failed to start service ${service}`,
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
        message: `Service ${service} ${!isRunning ? 'stopped successfully' : 'failed to stop'}`
      };

      return res.status(200).json({
        success: true,
        data: response
      });
    } catch (error) {
      logger.error(`Failed to stop service ${service}:`, error);
      return res.status(500).json({
        success: false,
        message: `Failed to stop service ${service}`,
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
      await serviceManager.stop(service);
      logger.info(`Service ${service} stop command executed for restart`);
      
      await serviceManager.start(service);
      logger.info(`Service ${service} start command executed for restart`);
      
      // Check actual status after restarting
      const isRunning = await serviceManager.status(service);
      const actualStatus: ServiceStatus = isRunning ? 'running' : 'stopped';
      
      logger.info(`Service ${service} status after restart attempt: ${actualStatus}`);
      
      const response: ServiceResponse = {
        service,
        status: actualStatus,
        message: `Service ${service} ${isRunning ? 'restarted successfully' : 'failed to restart'}`
      };

      return res.status(200).json({
        success: true,
        data: response
      });
    } catch (error) {
      logger.error(`Failed to restart service ${service}:`, error);
      return res.status(500).json({
        success: false,
        message: `Failed to restart service ${service}`,
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
        const status = await serviceManager.status(service);
        statuses.push({
          service,
          status: status ? 'running' : 'stopped',
          message: `Service ${service} is ${status ? 'running' : 'stopped'}`
        });
      }

      logger.info('Successfully retrieved status for all services');
      return res.status(200).json({
        success: true,
        data: statuses
      });
    } catch (error) {
      logger.error('Failed to get status for all services:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get status for all services',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export default new ServicesController();
import { Request, Response } from 'express';
import { ServiceManager } from '../lib/ServiceManager';

// Initialize service manager
const serviceManager = new ServiceManager();

// Define allowed services for type safety and security
type AllowedService = 'bind' | 'dhcpd' | 'httpd';

// Define possible service states
type ServiceStatus = 'running' | 'stopped' | 'failed' | 'unknown';

interface ServiceResponse {
  service: AllowedService;
  status: ServiceStatus;
  message: string;
}

// Validate if a service name is allowed
const isAllowedService = (service: string): service is AllowedService => {
  return ['bind', 'dhcpd', 'httpd'].includes(service);
};

class ServicesController {
  // Get status of a specific service
  public async getServiceStatus(req: Request, res: Response) {
    console.log('Request received to get service status');
    const { service } = req.params;

    if (!isAllowedService(service)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service name. Allowed services are: bind, dhcpd, httpd'
      });
    }

    console.log(`Checking status for service: ${service}`);
    try {
      const status = await serviceManager.status(service);
      console.log(`Service ${service} status: ${status}`);
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
      return res.status(400).json({
        success: false,
        message: 'Invalid service name. Allowed services are: bind, dhcpd, httpd'
      });
    }

    try {
      await serviceManager.start(service);
      const response: ServiceResponse = {
        service,
        status: 'running',
        message: `Service ${service} started successfully`
      };

      return res.status(200).json({
        success: true,
        data: response
      });
    } catch (error) {
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
      return res.status(400).json({
        success: false,
        message: 'Invalid service name. Allowed services are: bind, dhcpd, httpd'
      });
    }

    try {
      await serviceManager.stop(service);
      const response: ServiceResponse = {
        service,
        status: 'stopped',
        message: `Service ${service} stopped successfully`
      };

      return res.status(200).json({
        success: true,
        data: response
      });
    } catch (error) {
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
      return res.status(400).json({
        success: false,
        message: 'Invalid service name. Allowed services are: bind, dhcpd, httpd'
      });
    }

    try {
      await serviceManager.stop(service);
      await serviceManager.start(service);
      const response: ServiceResponse = {
        service,
        status: 'running',
        message: `Service ${service} restarted successfully`
      };

      return res.status(200).json({
        success: true,
        data: response
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: `Failed to restart service ${service}`,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get status of all services
  public async getAllServicesStatus(req: Request, res: Response) {
    const services: AllowedService[] = ['bind', 'dhcpd', 'httpd'];
    const statuses: ServiceResponse[] = [];

    try {
      for (const service of services) {
        const status = await serviceManager.status(service);
        statuses.push({
          service,
          status: status ? 'running' : 'stopped',
          message: `Service ${service} is ${status ? 'running' : 'stopped'}`
        });
      }

      return res.status(200).json({
        success: true,
        data: statuses
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to get status for all services',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export default new ServicesController();


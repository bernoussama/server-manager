import { Request, Response } from 'express';
import { ServiceManagerMock } from '../lib/ServiceManagerMock';

// Mock the ServiceManager module
jest.mock('../../src/lib/ServiceManager', () => {
  return {
    ServiceManager: jest.fn().mockImplementation(() => {
      return new ServiceManagerMock();
    })
  };
});

// Import the controller after mocking dependencies
import servicesController from '../../src/controllers/servicesController';

describe('ServicesController', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;

  beforeEach(() => {
    jsonMock = jest.fn().mockReturnThis();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    
    req = {};
    res = {
      status: statusMock,
      json: jsonMock
    };
  });

  describe('getServiceStatus', () => {
    it('should return 400 for invalid service name', async () => {
      req.params = { service: 'invalid-service' };
      
      await servicesController.getServiceStatus(req as Request, res as Response);
      
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid service name. Allowed services are: named, dhcpd, httpd'
      });
    });

    it('should return 200 with running status for active service', async () => {
      req.params = { service: 'named' };
      
      await servicesController.getServiceStatus(req as Request, res as Response);
      
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          service: 'named',
          status: 'running',
          message: 'Service named is running'
        }
      });
    });

    it('should return 200 with stopped status for inactive service', async () => {
      req.params = { service: 'httpd' };
      
      await servicesController.getServiceStatus(req as Request, res as Response);
      
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          service: 'httpd',
          status: 'stopped',
          message: 'Service httpd is stopped'
        }
      });
    });
  });

  describe('startService', () => {
    it('should return 400 for invalid service name', async () => {
      req.params = { service: 'invalid-service' };
      
      await servicesController.startService(req as Request, res as Response);
      
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid service name. Allowed services are: named, dhcpd, httpd'
      });
    });

    it('should start a service and return 200 with success message', async () => {
      req.params = { service: 'httpd' };
      
      await servicesController.startService(req as Request, res as Response);
      
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          service: 'httpd',
          status: 'running',
          message: 'Service httpd started successfully'
        }
      });
      
      // Verify the service is now running by checking its status
      req.params = { service: 'httpd' };
      await servicesController.getServiceStatus(req as Request, res as Response);
      
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          service: 'httpd',
          status: 'running',
          message: 'Service httpd is running'
        }
      });
    });
  });

  describe('stopService', () => {
    it('should return 400 for invalid service name', async () => {
      req.params = { service: 'invalid-service' };
      
      await servicesController.stopService(req as Request, res as Response);
      
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid service name. Allowed services are: named, dhcpd, httpd'
      });
    });

    it('should stop a service and return 200 with success message', async () => {
      // First make sure the service is running
      req.params = { service: 'named' };
      
      // Stop the service
      await servicesController.stopService(req as Request, res as Response);
      
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          service: 'named',
          status: 'stopped',
          message: 'Service named stopped successfully'
        }
      });
      
      // Verify the service is now stopped by checking its status
      req.params = { service: 'named' };
      await servicesController.getServiceStatus(req as Request, res as Response);
      
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          service: 'named',
          status: 'stopped',
          message: 'Service named is stopped'
        }
      });
    });
  });

  describe('restartService', () => {
    it('should return 400 for invalid service name', async () => {
      req.params = { service: 'invalid-service' };
      
      await servicesController.restartService(req as Request, res as Response);
      
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid service name. Allowed services are: named, dhcpd, httpd'
      });
    });

    it('should restart a service and return 200 with success message', async () => {
      req.params = { service: 'httpd' };
      
      // Restart the service
      await servicesController.restartService(req as Request, res as Response);
      
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          service: 'httpd',
          status: 'running',
          message: 'Service httpd restarted successfully'
        }
      });
      
      // Verify the service is now running by checking its status
      req.params = { service: 'httpd' };
      await servicesController.getServiceStatus(req as Request, res as Response);
      
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: {
          service: 'httpd',
          status: 'running',
          message: 'Service httpd is running'
        }
      });
    });
  });

  describe('getAllServicesStatus', () => {
    it('should return status of all services', async () => {
      // Get a reference to the ServiceManagerMock instance
      const serviceManagerMock = new ServiceManagerMock();
      
      // Set specific statuses for testing
      serviceManagerMock.setServiceStatus('named', false);
      serviceManagerMock.setServiceStatus('dhcpd', true);
      serviceManagerMock.setServiceStatus('httpd', true);
      
      // Override the mock implementation for this test
      jest.spyOn(require('../../src/lib/ServiceManager'), 'ServiceManager').mockImplementation(() => {
        return serviceManagerMock;
      });
      
      await servicesController.getAllServicesStatus(req as Request, res as Response);
      
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        data: [
          {
            service: 'named',
            status: 'stopped',
            message: 'Service named is stopped'
          },
          {
            service: 'dhcpd',
            status: 'running',
            message: 'Service dhcpd is running'
          },
          {
            service: 'httpd',
            status: 'running',
            message: 'Service httpd is running'
          }
        ]
      });
    });
  });
});

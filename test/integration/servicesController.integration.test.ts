import request from 'supertest';
import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import servicesController from '../../src/controllers/servicesController';

const execAsync = promisify(exec);

// Create a test Express app
const app = express();
app.use(express.json());

// Set up routes for testing
app.get('/api/services', servicesController.getAllServicesStatus);
app.get('/api/services/:service', servicesController.getServiceStatus);
app.post('/api/services/:service/start', servicesController.startService);
app.post('/api/services/:service/stop', servicesController.stopService);
app.post('/api/services/:service/restart', servicesController.restartService);

// Helper function to check if a service is active
async function isServiceActive(service: string): Promise<boolean> {
  try {
    const { stdout } = await execAsync(`systemctl is-active ${service}`);
    return stdout.trim() === 'active';
  } catch (error) {
    return false;
  }
}

// These tests interact with actual system services
// They are marked as skip by default to avoid affecting the system
// Remove the .skip to run them when needed
describe.skip('ServicesController Integration Tests', () => {
  // Test variables
  const testService = 'named'; // Use the DNS service for testing

  // Ensure the service is in a known state before tests
  beforeAll(async () => {
    // Try to start the service to ensure it's in a running state
    try {
      await execAsync(`sudo systemctl start ${testService}`);
      // Wait a moment for the service to fully start
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Failed to start ${testService} for testing:`, error);
    }
  });

  describe('GET /api/services/:service', () => {
    it('should return the correct status of a service', async () => {
      // First check the actual status of the service
      const isActive = await isServiceActive(testService);
      
      // Then make the API request
      const response = await request(app)
        .get(`/api/services/${testService}`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Verify the response matches the actual service status
      expect(response.body.success).toBe(true);
      expect(response.body.data.service).toBe(testService);
      expect(response.body.data.status).toBe(isActive ? 'running' : 'stopped');
    });
  });

  describe('POST /api/services/:service/stop', () => {
    it('should stop a running service', async () => {
      // First make sure the service is running
      if (!(await isServiceActive(testService))) {
        await execAsync(`sudo systemctl start ${testService}`);
        // Wait a moment for the service to fully start
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Then make the API request to stop it
      const response = await request(app)
        .post(`/api/services/${testService}/stop`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Verify the response
      expect(response.body.success).toBe(true);
      expect(response.body.data.service).toBe(testService);
      expect(response.body.data.status).toBe('stopped');
      
      // Verify the service is actually stopped
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for the command to take effect
      const isActive = await isServiceActive(testService);
      expect(isActive).toBe(false);
    });
  });

  describe('POST /api/services/:service/start', () => {
    it('should start a stopped service', async () => {
      // First make sure the service is stopped
      if (await isServiceActive(testService)) {
        await execAsync(`sudo systemctl stop ${testService}`);
        // Wait a moment for the service to fully stop
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Then make the API request to start it
      const response = await request(app)
        .post(`/api/services/${testService}/start`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Verify the response
      expect(response.body.success).toBe(true);
      expect(response.body.data.service).toBe(testService);
      expect(response.body.data.status).toBe('running');
      
      // Verify the service is actually running
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for the command to take effect
      const isActive = await isServiceActive(testService);
      expect(isActive).toBe(true);
    });
  });

  describe('POST /api/services/:service/restart', () => {
    it('should restart a service', async () => {
      // First make sure the service is running
      if (!(await isServiceActive(testService))) {
        await execAsync(`sudo systemctl start ${testService}`);
        // Wait a moment for the service to fully start
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Then make the API request to restart it
      const response = await request(app)
        .post(`/api/services/${testService}/restart`)
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Verify the response
      expect(response.body.success).toBe(true);
      expect(response.body.data.service).toBe(testService);
      expect(response.body.data.status).toBe('running');
      
      // Verify the service is still running after restart
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for the command to take effect
      const isActive = await isServiceActive(testService);
      expect(isActive).toBe(true);
    });
  });

  describe('GET /api/services', () => {
    it('should return status of all services', async () => {
      const response = await request(app)
        .get('/api/services')
        .expect('Content-Type', /json/)
        .expect(200);
      
      // Verify the response structure
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      
      // Check if our test service is in the list
      const testServiceData = response.body.data.find(
        (service: any) => service.service === testService
      );
      expect(testServiceData).toBeDefined();
      
      // Verify the status matches the actual service status
      const isActive = await isServiceActive(testService);
      expect(testServiceData.status).toBe(isActive ? 'running' : 'stopped');
    });
  });

  // Restore service to running state after tests
  afterAll(async () => {
    try {
      await execAsync(`sudo systemctl start ${testService}`);
    } catch (error) {
      console.error(`Failed to restore ${testService} after testing:`, error);
    }
  });
});

import request from 'supertest'; // Assuming supertest is available or will be added
// DO NOT import app or SystemMetrics here at the top level

describe('GET /api/system-metrics', () => {
  let app: any; // Express app
  let MockedSystemMetrics: jest.MockedClass<any>; // Using 'any' for simplicity, ideally define a type

  beforeEach(() => {
    jest.resetModules(); // Crucial: resets module cache to re-evaluate modules

    // Mock SystemMetrics *before* it's used by the controller/app
    // This factory function is called when SystemMetrics is required
    jest.mock('../../lib/systemMetrics', () => {
      const mSystemMetrics = jest.fn(); // This is the mock constructor
      // Assign mock functions to the prototype of this mock constructor
      mSystemMetrics.prototype.getUptime = jest.fn();
      mSystemMetrics.prototype.getMemoryUsage = jest.fn();
      mSystemMetrics.prototype.getCpuUsage = jest.fn();
      mSystemMetrics.prototype.getDiskUsage = jest.fn();
      mSystemMetrics.prototype.getActiveServices = jest.fn();
      return { SystemMetrics: mSystemMetrics }; // Export the mock constructor as SystemMetrics
    });

    // Now that SystemMetrics is mocked, require it to get a reference to the mock
    MockedSystemMetrics = require('../../lib/systemMetrics').SystemMetrics;

    // Configure the default behavior of the mocked prototype methods for each test
    MockedSystemMetrics.prototype.getUptime.mockResolvedValue('1 day, 2 hours');
    MockedSystemMetrics.prototype.getMemoryUsage.mockResolvedValue({
      total: 8192, used: 4096, free: 4096, unit: 'MB',
    });
    MockedSystemMetrics.prototype.getCpuUsage.mockResolvedValue({
      currentLoad: 25.5, cores: 4,
    });
    MockedSystemMetrics.prototype.getDiskUsage.mockResolvedValue([
      { filesystem: '/dev/sda1', size: '100G', used: '50G', available: '50G', usagePercentage: '50%', mountPath: '/' },
    ]);
    MockedSystemMetrics.prototype.getActiveServices.mockResolvedValue([
      { name: 'test.service', status: 'active (running)', description: 'Test Service' },
    ]);

    // Now, load the Express app. It will import the controller,
    // which will in turn instantiate the mocked SystemMetrics.
    app = require('../../app').default;
  });

  it('should return a 200 OK status and aggregated system metrics', async () => {
    const response = await request(app).get('/api/system-metrics');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      uptime: '1 day, 2 hours',
      memory: { total: 8192, used: 4096, free: 4096, unit: 'MB' },
      cpu: { currentLoad: 25.5, cores: 4 },
      disk: [
        { filesystem: '/dev/sda1', size: '100G', used: '50G', available: '50G', usagePercentage: '50%', mountPath: '/' },
      ],
      activeServices: [
        { name: 'test.service', status: 'active (running)', description: 'Test Service' },
      ],
    });

    // Verify that the SystemMetrics constructor was called once (by the controller)
    expect(MockedSystemMetrics).toHaveBeenCalledTimes(1);

    // Verify that the methods on the instance were called
    const instance = MockedSystemMetrics.mock.instances[0];
    expect(instance.getUptime).toHaveBeenCalledTimes(1);
    expect(instance.getMemoryUsage).toHaveBeenCalledTimes(1);
    expect(instance.getCpuUsage).toHaveBeenCalledTimes(1);
    expect(instance.getDiskUsage).toHaveBeenCalledTimes(1);
    expect(instance.getActiveServices).toHaveBeenCalledTimes(1);
  });

  it('should handle errors from the SystemMetrics service', async () => {
    // Override a specific mock for this test case
    // This getMemoryUsage is on the prototype of the MockedSystemMetrics constructor
    MockedSystemMetrics.prototype.getMemoryUsage.mockRejectedValue(new Error('Memory service failed'));

    const response = await request(app).get('/api/system-metrics');

    expect(response.status).toBe(500);
    expect(response.body).toHaveProperty('message');
    // Optionally, check the message content if it's predictable
    // expect(response.body.message).toBe('Memory service failed'); // Or whatever the error handler outputs
  });
}); 
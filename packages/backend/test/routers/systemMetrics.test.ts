import { systemMetricsRouter, SystemMetricsResponse } from '../../src/routers/systemMetrics'; // Assuming SystemMetricsResponse is exported from router
import { SystemMetrics } from '../../src/lib/systemMetrics';
import { TRPCError } from '@trpc/server';
import type { MemoryUsage, CpuUsage, DiskUsage, ActiveService } from '../../src/lib/systemMetrics'; // Import sub-types

// Mock SystemMetrics class
jest.mock('../../src/lib/systemMetrics');
const MockedSystemMetrics = SystemMetrics as jest.MockedClass<typeof SystemMetrics>;

// Mock logger
jest.mock('../../src/lib/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const caller = systemMetricsRouter.createCaller({});

describe('systemMetricsRouter', () => {
  // Define mock implementations for each SystemMetrics method
  let mockGetUptime: jest.Mock;
  let mockGetMemoryUsage: jest.Mock;
  let mockGetCpuUsage: jest.Mock;
  let mockGetDiskUsage: jest.Mock;
  let mockGetActiveServices: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockGetUptime = jest.fn();
    mockGetMemoryUsage = jest.fn();
    mockGetCpuUsage = jest.fn();
    mockGetDiskUsage = jest.fn();
    mockGetActiveServices = jest.fn();

    MockedSystemMetrics.mockImplementation(() => ({
      getUptime: mockGetUptime,
      getMemoryUsage: mockGetMemoryUsage,
      getCpuUsage: mockGetCpuUsage,
      getDiskUsage: mockGetDiskUsage,
      getActiveServices: mockGetActiveServices,
    } as unknown as SystemMetrics));
  });

  describe('getMetrics procedure', () => {
    const sampleUptime = '1 day, 2 hours';
    const sampleMemoryUsage: MemoryUsage = { total: 8192, free: 4096, used: 4096, unit: 'MB' };
    const sampleCpuUsage: CpuUsage = { currentLoad: 25.5, cores: 4 };
    const sampleDiskUsage: DiskUsage[] = [{ filesystem: '/dev/sda1', size: '100G', used: '50G', available: '50G', usagePercentage: '50%', mountPath: '/' }];
    const sampleActiveServices: ActiveService[] = [{ name: 'nginx.service', status: 'active (running)', description: 'Nginx HTTP server' }];

    it('should return all system metrics successfully', async () => {
      mockGetUptime.mockResolvedValue(sampleUptime);
      mockGetMemoryUsage.mockResolvedValue(sampleMemoryUsage);
      mockGetCpuUsage.mockResolvedValue(sampleCpuUsage);
      mockGetDiskUsage.mockResolvedValue(sampleDiskUsage);
      mockGetActiveServices.mockResolvedValue(sampleActiveServices);

      const result = await caller.getMetrics();

      expect(result).toEqual<SystemMetricsResponse>({
        uptime: sampleUptime,
        memory: sampleMemoryUsage,
        cpu: sampleCpuUsage,
        disk: sampleDiskUsage,
        activeServices: sampleActiveServices,
      });

      expect(mockGetUptime).toHaveBeenCalledTimes(1);
      expect(mockGetMemoryUsage).toHaveBeenCalledTimes(1);
      expect(mockGetCpuUsage).toHaveBeenCalledTimes(1);
      expect(mockGetDiskUsage).toHaveBeenCalledTimes(1);
      expect(mockGetActiveServices).toHaveBeenCalledTimes(1);
    });

    it('should throw INTERNAL_SERVER_ERROR if getUptime fails', async () => {
      mockGetUptime.mockRejectedValue(new Error('Uptime command failed'));
      mockGetMemoryUsage.mockResolvedValue(sampleMemoryUsage); // Other methods succeed
      mockGetCpuUsage.mockResolvedValue(sampleCpuUsage);
      mockGetDiskUsage.mockResolvedValue(sampleDiskUsage);
      mockGetActiveServices.mockResolvedValue(sampleActiveServices);

      await expect(caller.getMetrics()).rejects.toThrowError(TRPCError);
      await expect(caller.getMetrics()).rejects.toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch system metrics',
        // Optionally check the cause if your TRPCError setup includes it
        // cause: expect.objectContaining({ message: 'Uptime command failed' }),
      });
    });

    it('should throw INTERNAL_SERVER_ERROR if getMemoryUsage fails', async () => {
      mockGetUptime.mockResolvedValue(sampleUptime);
      mockGetMemoryUsage.mockRejectedValue(new Error('Memory info parse error')); // This one fails
      mockGetCpuUsage.mockResolvedValue(sampleCpuUsage);
      mockGetDiskUsage.mockResolvedValue(sampleDiskUsage);
      mockGetActiveServices.mockResolvedValue(sampleActiveServices);

      await expect(caller.getMetrics()).rejects.toThrowError(TRPCError);
      await expect(caller.getMetrics()).rejects.toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch system metrics',
      });
    });
    
    it('should throw INTERNAL_SERVER_ERROR if getCpuUsage fails', async () => {
      mockGetUptime.mockResolvedValue(sampleUptime);
      mockGetMemoryUsage.mockResolvedValue(sampleMemoryUsage);
      mockGetCpuUsage.mockRejectedValue(new Error('CPU load error')); // This one fails
      mockGetDiskUsage.mockResolvedValue(sampleDiskUsage);
      mockGetActiveServices.mockResolvedValue(sampleActiveServices);

      await expect(caller.getMetrics()).rejects.toThrowError(TRPCError);
      await expect(caller.getMetrics()).rejects.toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch system metrics',
      });
    });

    it('should throw INTERNAL_SERVER_ERROR if getDiskUsage fails', async () => {
      mockGetUptime.mockResolvedValue(sampleUptime);
      mockGetMemoryUsage.mockResolvedValue(sampleMemoryUsage);
      mockGetCpuUsage.mockResolvedValue(sampleCpuUsage);
      mockGetDiskUsage.mockRejectedValue(new Error('df command failed')); // This one fails
      mockGetActiveServices.mockResolvedValue(sampleActiveServices);

      await expect(caller.getMetrics()).rejects.toThrowError(TRPCError);
      await expect(caller.getMetrics()).rejects.toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch system metrics',
      });
    });

    it('should throw INTERNAL_SERVER_ERROR if getActiveServices fails', async () => {
      mockGetUptime.mockResolvedValue(sampleUptime);
      mockGetMemoryUsage.mockResolvedValue(sampleMemoryUsage);
      mockGetCpuUsage.mockResolvedValue(sampleCpuUsage);
      mockGetDiskUsage.mockResolvedValue(sampleDiskUsage);
      mockGetActiveServices.mockRejectedValue(new Error('systemctl failed')); // This one fails

      await expect(caller.getMetrics()).rejects.toThrowError(TRPCError);
      await expect(caller.getMetrics()).rejects.toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch system metrics',
      });
    });
  });
});

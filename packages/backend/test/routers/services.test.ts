import { servicesRouter } from '../../src/routers/services';
import { ServiceManager } from '../../src/lib/ServiceManager';
import { TRPCError } from '@trpc/server';
import type { 
  AllowedServiceType, 
  ServiceResponseType,
  ServiceInputType,
  ServiceStatusType
} from '@server-manager/shared/validators/serviceValidator';

// Mock ServiceManager
jest.mock('../../src/lib/ServiceManager');
const MockedServiceManager = ServiceManager as jest.MockedClass<typeof ServiceManager>;

// Mock logger
jest.mock('../../src/lib/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const caller = servicesRouter.createCaller({});

describe('servicesRouter', () => {
  let mockStatus: jest.Mock;
  let mockStart: jest.Mock;
  let mockStop: jest.Mock;
  let mockRestart: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup mock implementations for ServiceManager methods
    mockStatus = jest.fn();
    mockStart = jest.fn();
    mockStop = jest.fn();
    mockRestart = jest.fn();

    MockedServiceManager.mockImplementation(() => ({
      status: mockStatus,
      start: mockStart,
      stop: mockStop,
      restart: mockRestart,
      // Mock other methods if they were to be called by the router
      getDetailedStatus: jest.fn(),
      enable: jest.fn(),
      disable: jest.fn(),
    } as unknown as ServiceManager)); // Cast to unknown then ServiceManager to satisfy constructor/private methods
  });

  const allowedServices: AllowedServiceType[] = ['named', 'dhcpd', 'httpd'];

  describe('getAllServicesStatus procedure', () => {
    it('should return status for all allowed services', async () => {
      mockStatus
        .mockResolvedValueOnce(true) // named
        .mockResolvedValueOnce(false) // dhcpd
        .mockResolvedValueOnce(true); // httpd

      const result = await caller.getAllServicesStatus();

      expect(mockStatus).toHaveBeenCalledTimes(3);
      expect(mockStatus).toHaveBeenCalledWith('named');
      expect(mockStatus).toHaveBeenCalledWith('dhcpd');
      expect(mockStatus).toHaveBeenCalledWith('httpd');
      expect(result).toEqual<ServiceResponseType[]>([
        { service: 'named', status: 'running', message: 'Service named is running' },
        { service: 'dhcpd', status: 'stopped', message: 'Service dhcpd is stopped' },
        { service: 'httpd', status: 'running', message: 'Service httpd is running' },
      ]);
    });

    it('should throw INTERNAL_SERVER_ERROR if ServiceManager.status throws', async () => {
      mockStatus.mockRejectedValueOnce(new Error('Systemctl error'));

      await expect(caller.getAllServicesStatus()).rejects.toThrowError(TRPCError);
      await expect(caller.getAllServicesStatus()).rejects.toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get status for all services',
      });
    });
  });

  describe('getServiceStatus procedure', () => {
    it('should return status for a specific service (running)', async () => {
      const input: ServiceInputType = { service: 'named' };
      mockStatus.mockResolvedValueOnce(true);

      const result = await caller.getServiceStatus(input);

      expect(mockStatus).toHaveBeenCalledWith('named');
      expect(result).toEqual<ServiceResponseType>({
        service: 'named', status: 'running', message: 'Service named is running',
      });
    });

    it('should return status for a specific service (stopped)', async () => {
      const input: ServiceInputType = { service: 'dhcpd' };
      mockStatus.mockResolvedValueOnce(false);

      const result = await caller.getServiceStatus(input);

      expect(mockStatus).toHaveBeenCalledWith('dhcpd');
      expect(result).toEqual<ServiceResponseType>({
        service: 'dhcpd', status: 'stopped', message: 'Service dhcpd is stopped',
      });
    });
    
    it('should throw if Zod validation fails for service name', async () => {
        // @ts-expect-error Testing invalid input
        await expect(caller.getServiceStatus({ service: 'invalidservice' })).rejects.toThrowError(TRPCError);
         await expect(caller.getServiceStatus({ service: 'invalidservice' })).rejects.toMatchObject({
            // TRPCClientError has a different shape, this tests the router's zod parsing
            // For server-side caller, Zod directly throws its error which might not be a TRPCError
            // but the tRPC framework should catch it and convert.
            // Depending on how createCaller wraps errors, this might be a ZodError or a TRPCError with Zod cause.
            // Let's assume it becomes a TRPCError.
            code: 'BAD_REQUEST',
        });
    });


    it('should throw INTERNAL_SERVER_ERROR if ServiceManager.status throws for specific service', async () => {
      const input: ServiceInputType = { service: 'httpd' };
      mockStatus.mockRejectedValueOnce(new Error('Systemctl error'));

      await expect(caller.getServiceStatus(input)).rejects.toThrowError(TRPCError);
      await expect(caller.getServiceStatus(input)).rejects.toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to get status for service ${input.service}`,
      });
    });
  });

  describe('startService procedure', () => {
    const input: ServiceInputType = { service: 'named' };

    it('should start a service successfully', async () => {
      mockStart.mockResolvedValueOnce(undefined); // ServiceManager.start resolves
      mockStatus.mockResolvedValueOnce(true);    // ServiceManager.status returns running

      const result = await caller.startService(input);

      expect(mockStart).toHaveBeenCalledWith('named');
      expect(mockStatus).toHaveBeenCalledWith('named'); // Status check after start
      expect(result).toEqual<ServiceResponseType>({
        service: 'named', status: 'running', message: 'Service named started successfully',
      });
    });

    it('should indicate failure if service does not run after start command', async () => {
      mockStart.mockResolvedValueOnce(undefined);
      mockStatus.mockResolvedValueOnce(false); // Service still stopped

      const result = await caller.startService(input);
      expect(result).toEqual<ServiceResponseType>({
        service: 'named', status: 'stopped', message: 'Service named failed to start',
      });
    });
    
    it('should throw INTERNAL_SERVER_ERROR if ServiceManager.start throws', async () => {
      mockStart.mockRejectedValueOnce(new Error('Failed to execute start'));

      await expect(caller.startService(input)).rejects.toThrowError(TRPCError);
      await expect(caller.startService(input)).rejects.toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to start service ${input.service}`,
      });
    });
  });

  describe('stopService procedure', () => {
    const input: ServiceInputType = { service: 'httpd' };

    it('should stop a service successfully', async () => {
      mockStop.mockResolvedValueOnce(undefined);  // ServiceManager.stop resolves
      mockStatus.mockResolvedValueOnce(false);   // ServiceManager.status returns stopped

      const result = await caller.stopService(input);

      expect(mockStop).toHaveBeenCalledWith('httpd');
      expect(mockStatus).toHaveBeenCalledWith('httpd');
      expect(result).toEqual<ServiceResponseType>({
        service: 'httpd', status: 'stopped', message: 'Service httpd stopped successfully',
      });
    });
    
    it('should indicate failure if service does not stop after command', async () => {
      mockStop.mockResolvedValueOnce(undefined);
      mockStatus.mockResolvedValueOnce(true); // Service still running

      const result = await caller.stopService(input);
      expect(result).toEqual<ServiceResponseType>({
        service: 'httpd', status: 'running', message: 'Service httpd failed to stop',
      });
    });

    it('should throw INTERNAL_SERVER_ERROR if ServiceManager.stop throws', async () => {
      mockStop.mockRejectedValueOnce(new Error('Failed to execute stop'));

      await expect(caller.stopService(input)).rejects.toThrowError(TRPCError);
      await expect(caller.stopService(input)).rejects.toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to stop service ${input.service}`,
      });
    });
  });

  describe('restartService procedure', () => {
    const input: ServiceInputType = { service: 'dhcpd' };

    it('should restart a service successfully', async () => {
      mockRestart.mockResolvedValueOnce(undefined); // ServiceManager.restart resolves
      mockStatus.mockResolvedValueOnce(true);     // ServiceManager.status returns running

      const result = await caller.restartService(input);

      expect(mockRestart).toHaveBeenCalledWith('dhcpd');
      expect(mockStatus).toHaveBeenCalledWith('dhcpd');
      expect(result).toEqual<ServiceResponseType>({
        service: 'dhcpd', status: 'running', message: 'Service dhcpd restarted successfully',
      });
    });

    it('should indicate failure if service does not run after restart command', async () => {
      mockRestart.mockResolvedValueOnce(undefined);
      mockStatus.mockResolvedValueOnce(false); // Service stopped after restart

      const result = await caller.restartService(input);
      expect(result).toEqual<ServiceResponseType>({
        service: 'dhcpd', status: 'stopped', message: 'Service dhcpd failed to restart',
      });
    });

    it('should throw INTERNAL_SERVER_ERROR if ServiceManager.restart throws', async () => {
      mockRestart.mockRejectedValueOnce(new Error('Failed to execute restart'));

      await expect(caller.restartService(input)).rejects.toThrowError(TRPCError);
      await expect(caller.restartService(input)).rejects.toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to restart service ${input.service}`,
      });
    });
  });
});

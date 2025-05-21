import { router, publicProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { ServiceManager } from '../lib/ServiceManager';
import { 
  AllowedService as AllowedServiceType, // Renaming to avoid conflict with Zod schema variable
  ServiceStatus, 
  ServiceResponse 
} from '@server-manager/shared/types/services';
import logger from '../lib/logger';

// Zod schema for allowed service names
const AllowedServiceSchema = z.enum(['named', 'dhcpd', 'httpd']);

// Instantiate the service manager
const serviceManager = new ServiceManager();

// Helper to map boolean status to ServiceStatus string
const mapStatusToString = (isActive: boolean): ServiceStatus => {
  return isActive ? 'running' : 'stopped';
};

export const servicesRouter = router({
  // Get status of all services
  getAllServicesStatus: publicProcedure
    .query(async () => {
      logger.info('(tRPC) Request to get status of all services');
      const serviceNames: AllowedServiceType[] = ['named', 'dhcpd', 'httpd'];
      const statuses: ServiceResponse[] = [];

      try {
        for (const serviceName of serviceNames) {
          logger.debug(`(tRPC) Checking status for service: ${serviceName}`);
          const isActive = await serviceManager.status(serviceName);
          statuses.push({
            service: serviceName,
            status: mapStatusToString(isActive),
            message: `Service ${serviceName} is ${mapStatusToString(isActive)}`,
          });
        }
        logger.info('(tRPC) Successfully retrieved status for all services');
        return statuses;
      } catch (error) {
        logger.error('(tRPC) Failed to get status for all services:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get status for all services',
          cause: error instanceof Error ? error : undefined,
        });
      }
    }),

  // Get status of a specific service
  getServiceStatus: publicProcedure
    .input(z.object({ service: AllowedServiceSchema }))
    .query(async ({ input }) => {
      const { service } = input;
      logger.info(`(tRPC) Request received to get service status for: ${service}`);
      
      try {
        const isActive = await serviceManager.status(service);
        logger.info(`(tRPC) Service ${service} status: ${mapStatusToString(isActive)}`);
        const response: ServiceResponse = {
          service,
          status: mapStatusToString(isActive),
          message: `Service ${service} is ${mapStatusToString(isActive)}`,
        };
        return response;
      } catch (error) {
        logger.error(`(tRPC) Failed to get status for service ${service}:`, error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to get status for service ${service}`,
          cause: error instanceof Error ? error : undefined,
        });
      }
    }),

  // Start a service
  startService: publicProcedure
    .input(z.object({ service: AllowedServiceSchema }))
    .mutation(async ({ input }) => {
      const { service } = input;
      logger.info(`(tRPC) Request to start service: ${service}`);
      try {
        await serviceManager.start(service);
        logger.info(`(tRPC) Service ${service} start command executed`);
        
        const isRunning = await serviceManager.status(service);
        const actualStatus = mapStatusToString(isRunning);
        logger.info(`(tRPC) Service ${service} status after start attempt: ${actualStatus}`);
        
        const response: ServiceResponse = {
          service,
          status: actualStatus,
          message: `Service ${service} ${isRunning ? 'started successfully' : 'failed to start'}`,
        };
        return response;
      } catch (error) {
        logger.error(`(tRPC) Failed to start service ${service}:`, error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to start service ${service}`,
          cause: error instanceof Error ? error : undefined,
        });
      }
    }),

  // Stop a service
  stopService: publicProcedure
    .input(z.object({ service: AllowedServiceSchema }))
    .mutation(async ({ input }) => {
      const { service } = input;
      logger.info(`(tRPC) Request to stop service: ${service}`);
      try {
        await serviceManager.stop(service);
        logger.info(`(tRPC) Service ${service} stop command executed`);

        const isRunning = await serviceManager.status(service);
        const actualStatus = mapStatusToString(isRunning);
        logger.info(`(tRPC) Service ${service} status after stop attempt: ${actualStatus}`);

        const response: ServiceResponse = {
          service,
          status: actualStatus,
          message: `Service ${service} ${!isRunning ? 'stopped successfully' : 'failed to stop'}`,
        };
        return response;
      } catch (error) {
        logger.error(`(tRPC) Failed to stop service ${service}:`, error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to stop service ${service}`,
          cause: error instanceof Error ? error : undefined,
        });
      }
    }),

  // Restart a service
  restartService: publicProcedure
    .input(z.object({ service: AllowedServiceSchema }))
    .mutation(async ({ input }) => {
      const { service } = input;
      logger.info(`(tRPC) Request to restart service: ${service}`);
      try {
        // ServiceManager has a restart method, which is generally preferred.
        // The controller did stop then start, but ServiceManager.restart() might be more atomic or optimized.
        // If ServiceManager.restart() is not suitable, then uncomment the stop/start below.
        await serviceManager.restart(service);
        // await serviceManager.stop(service);
        // logger.info(`(tRPC) Service ${service} stop command executed for restart`);
        // await serviceManager.start(service);
        logger.info(`(tRPC) Service ${service} restart command executed`);
        
        const isRunning = await serviceManager.status(service);
        const actualStatus = mapStatusToString(isRunning);
        logger.info(`(tRPC) Service ${service} status after restart attempt: ${actualStatus}`);

        const response: ServiceResponse = {
          service,
          status: actualStatus,
          message: `Service ${service} ${isRunning ? 'restarted successfully' : 'failed to restart'}`,
        };
        return response;
      } catch (error) {
        logger.error(`(tRPC) Failed to restart service ${service}:`, error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Failed to restart service ${service}`,
          cause: error instanceof Error ? error : undefined,
        });
      }
    }),
});

export type ServicesRouter = typeof servicesRouter;

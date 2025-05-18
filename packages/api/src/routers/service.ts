import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { allowedServiceEnum } from '../schemas';

export const serviceRouter = router({
  // Get status of all services
  getAll: protectedProcedure
    .query(async () => {
      // This will be implemented in the backend
      return {
        success: true,
        data: [
          { service: 'named', status: 'running', message: 'Service is running' },
          { service: 'dhcpd', status: 'stopped', message: 'Service is stopped' },
          { service: 'httpd', status: 'running', message: 'Service is running' },
        ],
      };
    }),

  // Get status of a specific service
  getStatus: protectedProcedure
    .input(z.object({ service: allowedServiceEnum }))
    .query(async ({ input }) => {
      // This will be implemented in the backend
      return {
        success: true,
        data: {
          service: input.service,
          status: 'running',
          message: `Service ${input.service} is running`,
        },
      };
    }),

  // Start a service
  start: protectedProcedure
    .input(z.object({ service: allowedServiceEnum }))
    .mutation(async ({ input }) => {
      // This will be implemented in the backend
      return {
        success: true,
        data: {
          service: input.service,
          status: 'running',
          message: `Service ${input.service} started`,
        },
      };
    }),

  // Stop a service
  stop: protectedProcedure
    .input(z.object({ service: allowedServiceEnum }))
    .mutation(async ({ input }) => {
      // This will be implemented in the backend
      return {
        success: true,
        data: {
          service: input.service,
          status: 'stopped',
          message: `Service ${input.service} stopped`,
        },
      };
    }),

  // Restart a service
  restart: protectedProcedure
    .input(z.object({ service: allowedServiceEnum }))
    .mutation(async ({ input }) => {
      // This will be implemented in the backend
      return {
        success: true,
        data: {
          service: input.service,
          status: 'running',
          message: `Service ${input.service} restarted`,
        },
      };
    }),
}); 
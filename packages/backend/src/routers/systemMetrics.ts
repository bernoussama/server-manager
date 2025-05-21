import { router, publicProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { 
  SystemMetrics,
  MemoryUsage,
  CpuUsage,
  DiskUsage,
  ActiveService
} from '../lib/systemMetrics';
import logger from '../lib/logger';

// Define the structure of the API response for system metrics
// This mirrors the SystemMetricsResponse from the controller
export interface SystemMetricsResponse {
  uptime: string;
  memory: MemoryUsage;
  cpu: CpuUsage;
  disk: DiskUsage[];
  activeServices: ActiveService[];
}

const systemMetrics = new SystemMetrics();

export const systemMetricsRouter = router({
  getMetrics: publicProcedure
    .query(async (): Promise<SystemMetricsResponse> => {
      logger.info('(tRPC) System metrics request received');
      try {
        const [uptime, memory, cpu, disk, activeServices] = await Promise.all([
          systemMetrics.getUptime(),
          systemMetrics.getMemoryUsage(),
          systemMetrics.getCpuUsage(),
          systemMetrics.getDiskUsage(),
          systemMetrics.getActiveServices(),
        ]);

        const response: SystemMetricsResponse = {
          uptime,
          memory,
          cpu,
          disk,
          activeServices,
        };
        
        logger.info('(tRPC) Successfully fetched all system metrics.');
        return response;
      } catch (error) {
        logger.error('(tRPC) Error fetching system metrics:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch system metrics',
          cause: error instanceof Error ? error : undefined,
        });
      }
    }),
});

export type SystemMetricsRouter = typeof systemMetricsRouter;

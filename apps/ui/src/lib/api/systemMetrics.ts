import apiClient from '../api';
import type { SystemMetricsResponse } from '@server-manager/shared';

/**
 * System Metrics API module
 * Provides methods for fetching system metrics data
 */
export const systemMetricsApi = {
  /**
   * Get current system metrics including CPU, memory, disk usage, uptime, and active services
   */
  getSystemMetrics(): Promise<SystemMetricsResponse> {
    return apiClient.get('/system-metrics');
  },
};

export default systemMetricsApi; 
import { apiClient } from '../api';
import { servicesApi } from './services';
import { usersApi } from './users';
import { systemMetricsApi } from './systemMetrics';

/**
 * Main API object that combines all API modules
 */
export const api: {
  services: typeof servicesApi;
  users: typeof usersApi;
  systemMetrics: typeof systemMetricsApi;
  client: typeof apiClient;
} = {
  // Individual API modules
  services: servicesApi,
  users: usersApi,
  systemMetrics: systemMetricsApi,
  
  // Base client for custom requests
  client: apiClient
};

export * from './services';
export * from './users';
export * from './systemMetrics';
export * from './dhcp';

export default api;
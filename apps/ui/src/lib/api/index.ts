import { apiClient } from '../api';
import { servicesApi } from './services';
import { usersApi } from './users';

/**
 * Main API object that combines all API modules
 */
export const api: {
  services: typeof servicesApi;
  users: typeof usersApi;
  client: typeof apiClient;
} = {
  // Individual API modules
  services: servicesApi,
  users: usersApi,
  
  // Base client for custom requests
  client: apiClient
};

export * from './services';
export * from './users';

export default api;
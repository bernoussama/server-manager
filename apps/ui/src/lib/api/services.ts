import apiClient from '../api';
import type { AllowedService, ServiceStatus, ServiceResponse, ServiceResponseWrapper, ServicesStatusResponse } from '@server-manager/shared';

/**
 * Services API module
 * Provides methods for interacting with service-related endpoints
 */
export const servicesApi = {
  /**
   * Get status of all services
   */
  getAllServicesStatus(): Promise<ServicesStatusResponse> {
    return apiClient.get('/services');
  },

  /**
   * Get status of a specific service
   */
  getServiceStatus(service: AllowedService): Promise<ServiceResponseWrapper> {
    return apiClient.get(`/services/${service}`);
  },

  /**
   * Start a service
   */
  startService(service: AllowedService): Promise<ServiceResponseWrapper> {
    return apiClient.post(`/services/${service}/start`);
  },

  /**
   * Stop a service
   */
  stopService(service: AllowedService): Promise<ServiceResponseWrapper> {
    return apiClient.post(`/services/${service}/stop`);
  },

  /**
   * Restart a service
   */
  restartService(service: AllowedService): Promise<ServiceResponseWrapper> {
    return apiClient.post(`/services/${service}/restart`);
  },
};

// Re-export types for convenience
export type { AllowedService, ServiceStatus, ServiceResponse, ServiceResponseWrapper, ServicesStatusResponse } from '@server-manager/shared';

export default servicesApi;
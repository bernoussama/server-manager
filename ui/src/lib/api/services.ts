import apiClient from '../api';

// Types for service-related data
export type ServiceStatus = 'running' | 'stopped' | 'failed' | 'unknown';
export type AllowedService = 'named' | 'dhcpd' | 'httpd';

export interface ServiceResponse {
  service: AllowedService;
  status: ServiceStatus;
  message: string;
}

export interface ServiceResponseWrapper {
  success: boolean;
  data: ServiceResponse;
  message?: string;
  error?: string;
}

export interface ServicesStatusResponse {
  success: boolean;
  data: ServiceResponse[];
}

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

export default servicesApi;
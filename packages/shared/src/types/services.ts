// Service Types

// Allowed service types
export type AllowedService = 'named' | 'dhcpd' | 'httpd';

// Service status types
export type ServiceStatus = 'running' | 'stopped' | 'failed' | 'unknown';

// Service response shape
export interface ServiceResponse {
  service: AllowedService;
  status: ServiceStatus;
  message: string;
}

// API response wrapper
export interface ServiceResponseWrapper {
  success: boolean;
  data: ServiceResponse;
  message?: string;
  error?: string;
}

// Multiple services status response
export interface ServicesStatusResponse {
  success: boolean;
  data: ServiceResponse[];
} 
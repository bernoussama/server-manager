import type { HttpConfiguration, HttpServiceResponse, HttpUpdateResponse, HttpConfigFormValues } from '@server-manager/shared';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Interface for the API response when fetching current configuration
export interface HttpConfigResponse {
  message: string;
  data: HttpConfiguration;
}

// Interface for validation response
export interface HttpValidationResponse {
  message: string;
  valid: boolean;
  errors?: Array<{
    path: (string | number)[];
    message: string;
  }>;
}

// Interface for service control response
export interface HttpServiceControlResponse {
  success: boolean;
  data: HttpServiceResponse;
  message?: string;
}

// Helper function to get auth token
const getAuthToken = (): string | null => {
  return localStorage.getItem('token');
};

// Helper function to get auth headers
const getAuthHeaders = (): Record<string, string> => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

// Extracted common error handling helper
const handleApiError = (error: any, operation: string): never => {
  console.error(`Failed to ${operation}:`, error);
  if (error.status && error.data) {
    throw error;
  }
  throw {
    status: null,
    data: { message: 'Network error or failed to parse response.', errors: [] }
  };
};

/**
 * Get current HTTP configuration
 */
export const getHttpConfigurationAPI = async (): Promise<HttpConfigResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/http/config`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    const responseData: HttpConfigResponse = await response.json();

    if (!response.ok) {
      console.error('API Error:', responseData);
      throw { status: response.status, data: responseData };
    }

    return responseData;
  } catch (error: any) {
    throw handleApiError(error, 'get HTTP configuration');
  }
};

/**
 * Update HTTP configuration
 */
export const updateHttpConfigurationAPI = async (formData: HttpConfigFormValues): Promise<HttpUpdateResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/http/config`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(formData),
    });

    const responseData: HttpUpdateResponse = await response.json();

    if (!response.ok) {
      console.error('API Error:', responseData);
      throw { status: response.status, data: responseData };
    }

    return responseData;
  } catch (error: any) {
    throw handleApiError(error, 'update HTTP configuration');
  }
};

/**
 * Validate HTTP configuration without applying changes
 */
export const validateHttpConfigurationAPI = async (formData: HttpConfigFormValues): Promise<HttpValidationResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/http/validate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(formData),
    });

    const responseData: HttpValidationResponse = await response.json();

    if (!response.ok) {
      console.error('API Error:', responseData);
      throw { status: response.status, data: responseData };
    }

    return responseData;
  } catch (error: any) {
    throw handleApiError(error, 'validate HTTP configuration');
  }
};

/**
 * Get HTTP service status
 */
export const getHttpServiceStatusAPI = async (): Promise<HttpServiceControlResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/http/status`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    const responseData: HttpServiceControlResponse = await response.json();

    if (!response.ok) {
      console.error('API Error:', responseData);
      throw { status: response.status, data: responseData };
    }

    return responseData;
  } catch (error: any) {
    throw handleApiError(error, 'get HTTP service status');
  }
};

/**
 * Control HTTP service (start, stop, restart, reload)
 */
export const controlHttpServiceAPI = async (action: 'start' | 'stop' | 'restart' | 'reload' | 'status'): Promise<HttpServiceControlResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/http/service/${action}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    const responseData: HttpServiceControlResponse = await response.json();

    if (!response.ok) {
      console.error('API Error:', responseData);
      throw { status: response.status, data: responseData };
    }

    return responseData;
  } catch (error: any) {
    throw handleApiError(error, `${action} HTTP service`);
  }
}; 
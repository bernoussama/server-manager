import type { DnsUpdateResponse, DnsConfiguration } from '@server-manager/shared';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Interface for the API response when fetching current configuration
export interface DnsConfigResponse {
  message: string;
  data: DnsConfiguration;
}

export const updateDnsConfigurationAPI = async (formData: any): Promise<DnsUpdateResponse> => {
  try {
    // Do not transform the form data here, send it as is to the backend
    const response = await fetch(`${API_BASE_URL}/dns/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add Authorization header if your API requires authentication
        // 'Authorization': `Bearer ${your_auth_token}`,
      },
      body: JSON.stringify(formData),
    });

    const responseData: DnsUpdateResponse = await response.json();

    if (!response.ok) {
      // If the server returns a non-OK status, throw an error with the response data
      // This allows us to catch and display specific error messages from the backend
      throw { status: response.status, data: responseData };
    }

    return responseData;
  } catch (error: any) {
    // Rethrow a structured error. If it's an error from our fetch block, it will have status and data.
    // Otherwise, it's a network error or something else.
    if (error.status && error.data) {
        throw error;
    }
    throw { status: null, data: { message: 'Network error or failed to parse response.', errors: [] } };
  }
};

// Extracted common error‐handling helper
const handleApiError = (error: any, operation: string): never => {
  if (error.status && error.data) {
    throw error;
  }
  throw {
    status: null,
    data: { message: 'Network error or failed to parse response.', errors: [] }
  };
};

export const getDnsConfigurationAPI = async (): Promise<DnsConfigResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/dns/config`, {
      method: 'GET',
    });

    const responseData: DnsConfigResponse = await response.json();

    if (!response.ok) {
      throw { status: response.status, data: responseData };
    }

    return responseData;
  } catch (error: any) {
    throw handleApiError(error, 'get DNS configuration');
  }
};
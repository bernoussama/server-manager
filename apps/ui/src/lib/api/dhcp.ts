import type { DhcpConfiguration, DhcpConfigFormValues, DhcpUpdateResponse, DhcpServiceResponse } from '@server-manager/shared';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Interface for the API response when fetching current configuration
export interface DhcpConfigResponse {
  message: string;
  data: DhcpConfiguration;
  success: boolean;
}

// Helper function for auth headers
function getAuthHeaders() {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
}

// Handle API errors consistently
const handleApiError = (error: any, operation: string): never => {
  console.error(`Failed to ${operation}:`, error);
  
  if (error.status && error.data) {
    throw error;
  }
  
  throw { 
    status: null, 
    data: { 
      message: `Network error or failed to parse response while trying to ${operation}.`, 
      errors: [] 
    } 
  };
};

// Get current DHCP configuration
export const getDhcpConfigurationAPI = async (): Promise<DhcpConfigResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/dhcp/config`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    const responseData: DhcpConfigResponse = await response.json();

    if (!response.ok) {
      console.error('API Error:', responseData);
      throw { status: response.status, data: responseData };
    }

    return responseData;
  } catch (error: any) {
    throw handleApiError(error, 'get DHCP configuration');
  }
};

// Update DHCP configuration
export const updateDhcpConfigurationAPI = async (formData: DhcpConfigFormValues): Promise<DhcpUpdateResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/dhcp/config`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(formData),
    });

    const responseData: DhcpUpdateResponse = await response.json();

    if (!response.ok) {
      console.error('API Error:', responseData);
      throw { status: response.status, data: responseData };
    }

    return responseData;
  } catch (error: any) {
    throw handleApiError(error, 'update DHCP configuration');
  }
};

// Validate DHCP configuration without saving
export const validateDhcpConfigurationAPI = async (formData: DhcpConfigFormValues): Promise<DhcpUpdateResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/dhcp/validate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(formData),
    });

    const responseData: DhcpUpdateResponse = await response.json();

    if (!response.ok) {
      console.error('API Error:', responseData);
      throw { status: response.status, data: responseData };
    }

    return responseData;
  } catch (error: any) {
    throw handleApiError(error, 'validate DHCP configuration');
  }
};

// Get DHCP service status
export const getDhcpServiceStatusAPI = async (): Promise<{ data: DhcpServiceResponse }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/dhcp/status`, {
      method: 'GET',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch DHCP service status: ${response.statusText}`);
    }

    return response.json();
  } catch (error: any) {
    throw handleApiError(error, 'get DHCP service status');
  }
};

// Control DHCP service (start/stop/restart)
export const controlDhcpServiceAPI = async (action: string): Promise<{ data: DhcpServiceResponse }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/dhcp/service/${action}`, {
      method: 'POST',
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error(`Failed to ${action} DHCP service: ${response.statusText}`);
    }

    return response.json();
  } catch (error: any) {
    throw handleApiError(error, `${action} DHCP service`);
  }
}; 
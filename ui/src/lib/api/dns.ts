import { DnsConfigurationFormValues, DnsUpdateResponse } from '../../types/dns';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export const updateDnsConfigurationAPI = async (config: DnsConfigurationFormValues): Promise<DnsUpdateResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/dns/config`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Add Authorization header if your API requires authentication
        // 'Authorization': `Bearer ${your_auth_token}`,
      },
      body: JSON.stringify(config),
    });

    const responseData: DnsUpdateResponse = await response.json();

    if (!response.ok) {
      // If the server returns a non-OK status, throw an error with the response data
      // This allows us to catch and display specific error messages from the backend
      console.error('API Error:', responseData);
      throw { status: response.status, data: responseData };
    }

    return responseData;
  } catch (error: any) {
    console.error('Failed to update DNS configuration:', error);
    // Rethrow a structured error. If it's an error from our fetch block, it will have status and data.
    // Otherwise, it's a network error or something else.
    if (error.status && error.data) {
        throw error;
    }
    throw { status: null, data: { message: 'Network error or failed to parse response.', errors: [] } };
  }
}; 
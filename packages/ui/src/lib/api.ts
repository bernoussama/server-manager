import { toast } from '@/hooks/use-toast';
import { ApiResponse } from '@server-manager/shared';

// Define the base URL for API requests
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Base interface for API responses
// interface ApiResponse<T> {
//   data?: T;
//   success?: boolean;
//   message?: string;
//   error?: string;
// }

// Generic error handler
const handleError = (error: unknown): never => {
  const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
  toast({
    title: 'Error',
    description: errorMessage,
    variant: 'destructive',
  });
  throw new Error(errorMessage);
};

/**
 * Base API client for making HTTP requests
 */
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // Generic fetch method with error handling
  private async fetchWithErrorHandling<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || `API error: ${response.status}`);
      }

      return data as T;
    } catch (error) {
      return handleError(error);
    }
  }

  // HTTP GET request
  async get<T>(endpoint: string): Promise<T> {
    return this.fetchWithErrorHandling<T>(endpoint);
  }

  // HTTP POST request
  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.fetchWithErrorHandling<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  // HTTP PATCH request
  async patch<T>(endpoint: string, body?: unknown): Promise<T> {
    return this.fetchWithErrorHandling<T>(endpoint, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  // HTTP DELETE request
  async delete<T>(endpoint: string): Promise<T> {
    return this.fetchWithErrorHandling<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

// Create and export the default API client instance
export const apiClient = new ApiClient();
export default apiClient;
// src/test/lib/api.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { server } from '../setup';
import { http, HttpResponse } from 'msw';
import apiClient from '../../lib/api';
import { toast } from '@/hooks/use-toast';

// Mock the toast function
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

describe('API Client', () => {
  const API_BASE_URL = 'http://localhost:3000/api';
  
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  describe('GET requests', () => {
    it('should make a GET request and return data successfully', async () => {
      // Arrange
      const mockData = { id: 1, name: 'Test' };
      server.use(
        http.get(`${API_BASE_URL}/test`, () => {
          return HttpResponse.json(mockData);
        })
      );
      
      // Act
      const result = await apiClient.get('/test');
      
      // Assert
      expect(result).toEqual(mockData);
    });
    
    it('should handle errors and show toast notification', async () => {
      // Arrange
      const errorMessage = 'Not found';
      server.use(
        http.get(`${API_BASE_URL}/test`, () => {
          return new HttpResponse(
            JSON.stringify({ error: errorMessage }),
            { status: 404 }
          );
        })
      );
      
      // Act & Assert
      await expect(apiClient.get('/test')).rejects.toThrow(errorMessage);
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      }));
    });
  });
  
  describe('POST requests', () => {
    it('should make a POST request with body and return data successfully', async () => {
      // Arrange
      const requestBody = { name: 'New Item' };
      const mockResponse = { id: 1, ...requestBody };
      server.use(
        http.post(`${API_BASE_URL}/test`, async ({ request }) => {
          const body = await request.json();
          expect(body).toEqual(requestBody);
          return HttpResponse.json(mockResponse);
        })
      );
      
      // Act
      const result = await apiClient.post('/test', requestBody);
      
      // Assert
      expect(result).toEqual(mockResponse);
    });
  });
  
  describe('PATCH requests', () => {
    it('should make a PATCH request with body and return data successfully', async () => {
      // Arrange
      const requestBody = { name: 'Updated Item' };
      const mockResponse = { id: 1, ...requestBody };
      server.use(
        http.patch(`${API_BASE_URL}/test`, async ({ request }) => {
          const body = await request.json();
          expect(body).toEqual(requestBody);
          return HttpResponse.json(mockResponse);
        })
      );
      
      // Act
      const result = await apiClient.patch('/test', requestBody);
      
      // Assert
      expect(result).toEqual(mockResponse);
    });
  });
  
  describe('DELETE requests', () => {
    it('should make a DELETE request and return data successfully', async () => {
      // Arrange
      const mockResponse = { message: 'Deleted successfully' };
      server.use(
        http.delete(`${API_BASE_URL}/test`, () => {
          return HttpResponse.json(mockResponse);
        })
      );
      
      // Act
      const result = await apiClient.delete('/test');
      
      // Assert
      expect(result).toEqual(mockResponse);
    });
  });
});
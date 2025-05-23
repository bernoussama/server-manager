// src/test/lib/api/services.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { server } from '../../setup';
import { http, HttpResponse } from 'msw';
import { servicesApi } from '../../../lib/api/services';
import type { ServiceResponseWrapper, ServicesStatusResponse, AllowedService } from '@server-manager/shared';
import apiClient from '../../../lib/api';

// Spy on the apiClient methods
vi.spyOn(apiClient, 'get');
vi.spyOn(apiClient, 'post');

describe('Services API Client', () => {
  const API_BASE_URL = 'http://localhost:3000/api';
  
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAllServicesStatus', () => {
    it('should fetch status of all services successfully', async () => {
      // Arrange
      const mockResponse: ServicesStatusResponse = {
        success: true,
        data: [
          { service: 'named', status: 'running', message: 'Service is running' },
          { service: 'dhcpd', status: 'stopped', message: 'Service is stopped' },
          { service: 'httpd', status: 'running', message: 'Service is running' }
        ]
      };
      
      server.use(
        http.get(`${API_BASE_URL}/services`, () => {
          return HttpResponse.json(mockResponse);
        })
      );
      
      // Act
      const result = await servicesApi.getAllServicesStatus();
      
      // Assert
      expect(result).toEqual(mockResponse);
      expect(apiClient.get).toHaveBeenCalledWith('/services');
    });
  });

  describe('getServiceStatus', () => {
    it('should fetch status of a specific service successfully', async () => {
      // Arrange
      const service: AllowedService = 'named';
      const mockResponse: ServiceResponseWrapper = {
        success: true,
        data: {
          service: 'named',
          status: 'running',
          message: 'Service is running'
        }
      };
      
      server.use(
        http.get(`${API_BASE_URL}/services/${service}`, () => {
          return HttpResponse.json(mockResponse);
        })
      );
      
      // Act
      const result = await servicesApi.getServiceStatus(service);
      
      // Assert
      expect(result).toEqual(mockResponse);
      expect(apiClient.get).toHaveBeenCalledWith(`/services/${service}`);
    });

    it('should handle error response for non-existent service', async () => {
      // Arrange
      const service: AllowedService = 'named';
      const mockResponse: ServiceResponseWrapper = {
        success: false,
        data: {
          service: 'named',
          status: 'unknown',
          message: 'Service not found'
        },
        error: 'Service not found'
      };
      
      server.use(
        http.get(`${API_BASE_URL}/services/${service}`, () => {
          return HttpResponse.json(mockResponse);
        })
      );
      
      // Act
      const result = await servicesApi.getServiceStatus(service);
      
      // Assert
      expect(result).toEqual(mockResponse);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('startService', () => {
    it('should start a service successfully', async () => {
      // Arrange
      const service: AllowedService = 'named';
      const mockResponse: ServiceResponseWrapper = {
        success: true,
        data: {
          service: 'named',
          status: 'running',
          message: 'Service started successfully'
        }
      };
      
      server.use(
        http.post(`${API_BASE_URL}/services/${service}/start`, () => {
          return HttpResponse.json(mockResponse);
        })
      );
      
      // Act
      const result = await servicesApi.startService(service);
      
      // Assert
      expect(result).toEqual(mockResponse);
      expect(apiClient.post).toHaveBeenCalledWith(`/services/${service}/start`);
    });
  });

  describe('stopService', () => {
    it('should stop a service successfully', async () => {
      // Arrange
      const service: AllowedService = 'named';
      const mockResponse: ServiceResponseWrapper = {
        success: true,
        data: {
          service: 'named',
          status: 'stopped',
          message: 'Service stopped successfully'
        }
      };
      
      server.use(
        http.post(`${API_BASE_URL}/services/${service}/stop`, () => {
          return HttpResponse.json(mockResponse);
        })
      );
      
      // Act
      const result = await servicesApi.stopService(service);
      
      // Assert
      expect(result).toEqual(mockResponse);
      expect(apiClient.post).toHaveBeenCalledWith(`/services/${service}/stop`);
    });
  });

  describe('restartService', () => {
    it('should restart a service successfully', async () => {
      // Arrange
      const service: AllowedService = 'named';
      const mockResponse: ServiceResponseWrapper = {
        success: true,
        data: {
          service: 'named',
          status: 'running',
          message: 'Service restarted successfully'
        }
      };
      
      server.use(
        http.post(`${API_BASE_URL}/services/${service}/restart`, () => {
          return HttpResponse.json(mockResponse);
        })
      );
      
      // Act
      const result = await servicesApi.restartService(service);
      
      // Assert
      expect(result).toEqual(mockResponse);
      expect(apiClient.post).toHaveBeenCalledWith(`/services/${service}/restart`);
    });
  });
});
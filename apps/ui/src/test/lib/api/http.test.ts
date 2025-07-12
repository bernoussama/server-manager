import { describe, it, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

import { 
  getHttpConfigurationAPI, 
  updateHttpConfigurationAPI, 
  validateHttpConfigurationAPI,
  getHttpServiceStatusAPI,
  controlHttpServiceAPI 
} from '@/lib/api/http';
import type { HttpConfiguration, HttpConfigResponse, HttpServiceResponse, HttpConfigFormValues } from '@server-manager/shared';

const API_BASE_URL = 'http://localhost:8000/api';

// Mock response interfaces
interface HttpValidationResponse {
  message: string;
  valid: boolean;
  errors?: Array<{
    path: (string | number)[];
    message: string;
  }>;
}

const server = setupServer();

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('HTTP API Tests', () => {
  describe('getHttpConfigurationAPI', () => {
    it('should fetch HTTP configuration successfully', async () => {
      // Arrange
      const mockConfiguration: HttpConfiguration = {
        serverStatus: true,
        globalConfig: {
          serverName: 'www.srv.world:80',
          serverAdmin: 'root@localhost',
          listen: [{ port: 80 }],
          errorLog: 'logs/error_log',
          logLevel: 'warn',
          addDefaultCharset: 'UTF-8',
          enableSendfile: true,
          user: 'apache',
          group: 'apache'
        },
        virtualHosts: [{
          id: '550e8400-e29b-41d4-a716-446655440000',
          enabled: true,
          serverName: 'www.srv.world',
          documentRoot: '/var/www/html',
          port: 80,
          directoryIndex: ['index.html', 'index.php', 'index.cgi'],
          errorLog: '/var/log/httpd/www.srv.world_error.log',
          customLog: [{
            type: 'access',
            path: '/var/log/httpd/www.srv.world_access.log',
            format: 'combined'
          }]
        }]
      };

      const mockResponse: HttpConfigResponse = {
        success: true,
        message: 'Current HTTP configuration loaded successfully',
        data: mockConfiguration
      };

      server.use(
        http.get(`${API_BASE_URL}/http/configuration`, () => {
          return HttpResponse.json(mockResponse);
        })
      );

      // Act
      const result = await getHttpConfigurationAPI();

      // Assert
      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors', async () => {
      // Arrange
      server.use(
        http.get(`${API_BASE_URL}/http/configuration`, () => {
          return new HttpResponse(null, { status: 500 });
        })
      );
      
      // Act & Assert
      await expect(getHttpConfigurationAPI()).rejects.toThrow();
    });
  });

  describe('updateHttpConfigurationAPI', () => {
    const mockFormData: HttpConfigFormValues = {
      serverStatus: true,
      serverName: 'test.example.com',
      serverAdmin: 'admin@test.example.com',
      listenPorts: '80,443',
      errorLog: 'logs/error_log',
      logLevel: 'warn',
      addDefaultCharset: 'UTF-8',
      enableSendfile: true,
      user: 'apache',
      group: 'apache',
      virtualHosts: [{
        id: '550e8400-e29b-41d4-a716-446655440001',
        enabled: true,
        serverName: 'test.example.com',
        documentRoot: '/var/www/html',
        port: '80',
        directoryIndex: 'index.html',
        accessLogFormat: 'combined',
        sslEnabled: false,
        serverAlias: '',
        errorLog: '',
        accessLog: '',
        sslCertificateFile: '',
        sslCertificateKeyFile: '',
        customDirectives: ''
      }]
    };

    it('should validate configuration successfully', async () => {
      // Arrange
      const mockResponse: HttpValidationResponse = {
        message: 'HTTP configuration validation passed',
        valid: true
      };
      
      server.use(
        http.post(`${API_BASE_URL}/http/validate`, () => {
          return HttpResponse.json(mockResponse);
        })
      );
      
      // Act
      const result = await validateHttpConfigurationAPI(mockFormData);
      
      // Assert
      expect(result).toEqual(mockResponse);
      expect(result.valid).toBe(true);
    });

    it('should detect invalid configuration', async () => {
      // Arrange
      const invalidFormData = {
        ...mockFormData,
        serverName: '',
        timeout: 'invalid'
      };

      const mockResponse: HttpValidationResponse = {
        message: 'Configuration validation failed',
        valid: false,
        errors: [
          { path: ['serverName'], message: 'Server name is required' },
          { path: ['timeout'], message: 'Timeout must be a number' }
        ]
      };
      
      server.use(
        http.post(`${API_BASE_URL}/http/validate`, () => {
          return new HttpResponse(JSON.stringify(mockResponse), { status: 400 });
        })
      );
      
      // Act & Assert
      await expect(validateHttpConfigurationAPI(invalidFormData)).rejects.toThrow();
    });

    it('should handle syntax validation errors', async () => {
      // Arrange
      const mockResponse: HttpValidationResponse = {
        message: 'Configuration validation failed',
        valid: false,
        errors: [
          { path: [], message: 'Apache configuration syntax error' }
        ]
      };
      
      server.use(
        http.post(`${API_BASE_URL}/http/validate`, () => {
          return new HttpResponse(JSON.stringify(mockResponse), { status: 400 });
        })
      );
      
      // Act & Assert
      await expect(validateHttpConfigurationAPI(mockFormData)).rejects.toThrow();
    });
  });

  describe('getHttpServiceStatusAPI', () => {
    it('should get HTTP service status successfully', async () => {
      // Arrange
      const mockResponse: HttpServiceResponse = {
        service: 'httpd',
        status: 'running',
        message: 'Apache service is running'
      };

      server.use(
        http.get(`${API_BASE_URL}/http/service/status`, () => {
          return HttpResponse.json({ success: true, data: mockResponse });
        })
      );

      // Act
      const result = await getHttpServiceStatusAPI();

      // Assert
      expect(result).toEqual({ success: true, data: mockResponse });
    });

    it('should handle service status errors', async () => {
      // Arrange
      server.use(
        http.get(`${API_BASE_URL}/http/service/status`, () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      // Act & Assert
      await expect(getHttpServiceStatusAPI()).rejects.toThrow();
    });
  });

  describe('controlHttpServiceAPI', () => {
    it('should start HTTP service successfully', async () => {
      // Arrange
      const mockResponse: HttpServiceResponse = {
        service: 'httpd',
        status: 'running',
        message: 'Service start completed'
      };

      server.use(
        http.post(`${API_BASE_URL}/http/service/start`, () => {
          return HttpResponse.json({ 
            success: true, 
            data: mockResponse,
            message: 'HTTP service start completed successfully'
          });
        })
      );

      // Act
      const result = await controlHttpServiceAPI('start');

      // Assert
      expect(result.success).toBe(true);
      expect(result.data.status).toBe('running');
    });

    it('should handle service control errors', async () => {
      // Arrange
      server.use(
        http.post(`${API_BASE_URL}/http/service/stop`, () => {
          return new HttpResponse(null, { status: 500 });
        })
      );

      // Act & Assert
      await expect(controlHttpServiceAPI('stop')).rejects.toThrow();
    });
  });
});
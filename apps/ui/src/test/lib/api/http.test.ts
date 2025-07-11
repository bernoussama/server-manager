import { describe, it, expect, vi, beforeEach } from 'vitest';
import { server } from '../../setup';
import { http, HttpResponse } from 'msw';
import { 
  getHttpConfigurationAPI, 
  updateHttpConfigurationAPI, 
  validateHttpConfigurationAPI,
  getHttpServiceStatusAPI,
  controlHttpServiceAPI,
  type HttpConfigResponse,
  type HttpValidationResponse,
  type HttpServiceControlResponse
} from '../../../lib/api/http';
import type { HttpConfiguration, HttpConfigFormValues } from '@server-manager/shared';

// Mock the localStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
vi.stubGlobal('localStorage', mockLocalStorage);

describe('HTTP API Client', () => {
  const API_BASE_URL = 'http://localhost:3000/api';
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue('mock-token');
  });

  describe('getHttpConfigurationAPI', () => {
    it('should fetch current HTTP configuration successfully', async () => {
      // Arrange
      const mockConfiguration: HttpConfiguration = {
        serverStatus: true,
        globalConfig: {
          serverName: 'example.com',
          serverAdmin: 'admin@example.com',
          listen: [{ port: 80 }, { port: 443, ssl: true }],
          serverTokens: 'Prod',
          timeout: 60,
          keepAlive: true
        },
        virtualHosts: [{
          id: '550e8400-e29b-41d4-a716-446655440001',
          enabled: true,
          serverName: 'example.com',
          documentRoot: '/var/www/html',
          port: 80,
          directoryIndex: ['index.html'],
          customLog: [{
            type: 'access',
            path: '/var/log/httpd/access.log',
            format: 'combined'
          }]
        }]
      };

      const mockResponse: HttpConfigResponse = {
        message: 'HTTP configuration retrieved successfully',
        data: mockConfiguration
      };
      
      server.use(
        http.get(`${API_BASE_URL}/http/config`, () => {
          return HttpResponse.json(mockResponse);
        })
      );
      
      // Act
      const result = await getHttpConfigurationAPI();
      
      // Assert
      expect(result).toEqual(mockResponse);
      expect(result.data.globalConfig.serverName).toBe('example.com');
      expect(result.data.virtualHosts).toHaveLength(1);
    });

    it('should handle authentication errors', async () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue(null);
      
      server.use(
        http.get(`${API_BASE_URL}/http/config`, () => {
          return new HttpResponse(null, { status: 401 });
        })
      );
      
      // Act & Assert
      await expect(getHttpConfigurationAPI()).rejects.toThrow();
    });

    it('should handle server errors', async () => {
      // Arrange
      server.use(
        http.get(`${API_BASE_URL}/http/config`, () => {
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
      serverTokens: 'Prod',
      timeout: '60',
      keepAlive: true,
      modules: [],
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

    it('should update HTTP configuration successfully', async () => {
      // Arrange
      const mockResponse = {
        success: true,
        message: 'HTTP configuration updated successfully',
        data: mockFormData
      };
      
      server.use(
        http.put(`${API_BASE_URL}/http/config`, () => {
          return HttpResponse.json(mockResponse);
        })
      );
      
      // Act
      const result = await updateHttpConfigurationAPI(mockFormData);
      
      // Assert
      expect(result).toEqual(mockResponse);
      expect(result.success).toBe(true);
    });

    it('should handle validation errors', async () => {
      // Arrange
      const invalidFormData = {
        ...mockFormData,
        serverName: '', // Invalid
      };

      const mockResponse = {
        success: false,
        message: 'Validation Error',
        errors: [
          { path: ['serverName'], message: 'Server name is required' }
        ]
      };
      
      server.use(
        http.put(`${API_BASE_URL}/http/config`, () => {
          return new HttpResponse(JSON.stringify(mockResponse), { status: 400 });
        })
      );
      
      // Act & Assert
      await expect(updateHttpConfigurationAPI(invalidFormData)).rejects.toThrow();
    });

    it('should handle service restart failures', async () => {
      // Arrange
      const mockResponse = {
        success: false,
        message: 'Failed to reload HTTP server',
        error: 'Service restart failed'
      };
      
      server.use(
        http.put(`${API_BASE_URL}/http/config`, () => {
          return new HttpResponse(JSON.stringify(mockResponse), { status: 500 });
        })
      );
      
      // Act & Assert
      await expect(updateHttpConfigurationAPI(mockFormData)).rejects.toThrow();
    });
  });

  describe('validateHttpConfigurationAPI', () => {
    const mockFormData: HttpConfigFormValues = {
      serverStatus: true,
      serverName: 'test.example.com',
      serverAdmin: 'admin@test.example.com',
      listenPorts: '80,443',
      serverTokens: 'Prod',
      timeout: '60',
      keepAlive: true,
      modules: [],
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
      const mockResponse: HttpServiceControlResponse = {
        success: true,
        data: {
          service: 'httpd',
          status: 'running',
          message: 'Apache service is running'
        }
      };
      
      server.use(
        http.get(`${API_BASE_URL}/http/status`, () => {
          return HttpResponse.json(mockResponse);
        })
      );
      
      // Act
      const result = await getHttpServiceStatusAPI();
      
      // Assert
      expect(result).toEqual(mockResponse);
      expect(result.data.service).toBe('httpd');
      expect(result.data.status).toBe('running');
    });

    it('should handle service status check errors', async () => {
      // Arrange
      const mockResponse: HttpServiceControlResponse = {
        success: true,
        data: {
          service: 'httpd',
          status: 'failed',
          message: 'Failed to check service status'
        }
      };
      
      server.use(
        http.get(`${API_BASE_URL}/http/status`, () => {
          return HttpResponse.json(mockResponse);
        })
      );
      
      // Act
      const result = await getHttpServiceStatusAPI();
      
      // Assert
      expect(result).toEqual(mockResponse);
      expect(result.data.status).toBe('failed');
    });
  });

  describe('controlHttpServiceAPI', () => {
    const actions = ['start', 'stop', 'restart', 'reload', 'status'] as const;

    actions.forEach(action => {
      it(`should ${action} HTTP service successfully`, async () => {
        // Arrange
        const expectedStatus = action === 'stop' ? 'stopped' : 'running';
        const mockResponse: HttpServiceControlResponse = {
          success: true,
          data: {
            service: 'httpd',
            status: expectedStatus,
            message: `HTTP service ${action} completed successfully`
          }
        };
        
        server.use(
          http.post(`${API_BASE_URL}/http/service/${action}`, () => {
            return HttpResponse.json(mockResponse);
          })
        );
        
        // Act
        const result = await controlHttpServiceAPI(action);
        
        // Assert
        expect(result).toEqual(mockResponse);
        expect(result.data.service).toBe('httpd');
        expect(result.success).toBe(true);
      });
    });

    it('should handle service control errors', async () => {
      // Arrange
      const mockResponse: HttpServiceControlResponse = {
        success: true,
        data: {
          service: 'httpd',
          status: 'failed',
          message: 'Service control failed'
        }
      };
      
      server.use(
        http.post(`${API_BASE_URL}/http/service/restart`, () => {
          return HttpResponse.json(mockResponse);
        })
      );
      
      // Act
      const result = await controlHttpServiceAPI('restart');
      
      // Assert
      expect(result).toEqual(mockResponse);
      expect(result.data.status).toBe('failed');
    });

    it('should reject invalid service actions', async () => {
      // Arrange
      server.use(
        http.post(`${API_BASE_URL}/http/service/invalid`, () => {
          return new HttpResponse(JSON.stringify({
            success: false,
            message: 'Invalid action: invalid'
          }), { status: 400 });
        })
      );
      
      // Act & Assert
      await expect(controlHttpServiceAPI('invalid' as any)).rejects.toThrow();
    });
  });

  describe('Error handling', () => {
    it('should handle network errors', async () => {
      // Arrange
      server.use(
        http.get(`${API_BASE_URL}/http/config`, () => {
          return HttpResponse.error();
        })
      );
      
      // Act & Assert
      await expect(getHttpConfigurationAPI()).rejects.toThrow();
    });

    it('should handle JSON parsing errors', async () => {
      // Arrange
      server.use(
        http.get(`${API_BASE_URL}/http/config`, () => {
          return new HttpResponse('Invalid JSON', { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        })
      );
      
      // Act & Assert
      await expect(getHttpConfigurationAPI()).rejects.toThrow();
    });

    it('should handle missing authentication token', async () => {
      // Arrange
      mockLocalStorage.getItem.mockReturnValue(null);
      
      server.use(
        http.get(`${API_BASE_URL}/http/config`, ({ request }) => {
          const authHeader = request.headers.get('Authorization');
          if (!authHeader) {
            return new HttpResponse(null, { status: 401 });
          }
          return HttpResponse.json({});
        })
      );
      
      // Act & Assert
      await expect(getHttpConfigurationAPI()).rejects.toThrow();
    });
  });
}); 
import { describe, it, expect } from 'vitest';
import {
  isValidPort,
  isValidPath,
  isValidServerName,
  isValidEmail,
  virtualHostSchema,
  httpConfigSchema,
  type HttpConfigFormValues,
  type VirtualHostFormValues
} from '../httpFormValidator';
import {
  transformUiVirtualHostToApi,
  transformApiVirtualHostToUi,
  parsePortString,
  transformHttpFormToApi,
  transformHttpApiToForm
} from '../httpTransformers';
import type { HttpConfiguration, HttpVirtualHost } from '../../types/http';

describe('HTTP Validators', () => {
  describe('isValidPort', () => {
    it('should validate valid ports', () => {
      expect(isValidPort('80')).toBe(true);
      expect(isValidPort('443')).toBe(true);
      expect(isValidPort('8080')).toBe(true);
      expect(isValidPort('65535')).toBe(true);
      expect(isValidPort('1')).toBe(true);
    });

    it('should reject invalid ports', () => {
      expect(isValidPort('0')).toBe(false);
      expect(isValidPort('65536')).toBe(false);
      expect(isValidPort('-1')).toBe(false);
      expect(isValidPort('abc')).toBe(false);
      expect(isValidPort('')).toBe(false);
      expect(isValidPort('80.5')).toBe(false);
    });
  });

  describe('isValidPath', () => {
    it('should validate valid absolute paths', () => {
      expect(isValidPath('/var/www/html')).toBe(true);
      expect(isValidPath('/home/user/site')).toBe(true);
      expect(isValidPath('/')).toBe(true);
      expect(isValidPath('/usr/local/apache2/htdocs')).toBe(true);
    });

    it('should reject invalid paths', () => {
      expect(isValidPath('var/www/html')).toBe(false); // relative path
      expect(isValidPath('')).toBe(false); // empty
      expect(isValidPath('relative/path')).toBe(false); // relative
    });
  });

  describe('isValidServerName', () => {
    it('should validate valid server names', () => {
      expect(isValidServerName('example.com')).toBe(true);
      expect(isValidServerName('www.example.com')).toBe(true);
      expect(isValidServerName('sub.domain.example.com')).toBe(true);
      expect(isValidServerName('localhost')).toBe(true);
      expect(isValidServerName('test-server.com')).toBe(true);
    });

    it('should reject invalid server names', () => {
      expect(isValidServerName('')).toBe(false);
      expect(isValidServerName('invalid server name')).toBe(false); // spaces
      expect(isValidServerName('.example.com')).toBe(false); // starts with dot
      expect(isValidServerName('example..com')).toBe(false); // double dots
      expect(isValidServerName('example.com.')).toBe(false); // ends with dot
    });
  });

  describe('isValidEmail', () => {
    it('should validate valid email addresses', () => {
      expect(isValidEmail('admin@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
      expect(isValidEmail('test+tag@example.org')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('user@.com')).toBe(false);
    });
  });

  describe('virtualHostSchema', () => {
    const validVirtualHost: VirtualHostFormValues = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      enabled: true,
      serverName: 'example.com',
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
    };

    it('should validate a valid virtual host', () => {
      const result = virtualHostSchema.safeParse(validVirtualHost);
      expect(result.success).toBe(true);
    });

    it('should require SSL certificate files when SSL is enabled', () => {
      const sslVirtualHost = {
        ...validVirtualHost,
        sslEnabled: true,
        port: '443'
      };

      const result = virtualHostSchema.safeParse(sslVirtualHost);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(issue => 
          issue.path.includes('sslCertificateFile')
        )).toBe(true);
      }
    });

    it('should validate SSL virtual host with certificate files', () => {
      const sslVirtualHost = {
        ...validVirtualHost,
        sslEnabled: true,
        port: '443',
        sslCertificateFile: '/etc/ssl/certs/example.com.crt',
        sslCertificateKeyFile: '/etc/ssl/private/example.com.key'
      };

      const result = virtualHostSchema.safeParse(sslVirtualHost);
      expect(result.success).toBe(true);
    });

    it('should reject invalid server names', () => {
      const invalidVirtualHost = {
        ...validVirtualHost,
        serverName: 'invalid server name'
      };

      const result = virtualHostSchema.safeParse(invalidVirtualHost);
      expect(result.success).toBe(false);
    });

    it('should reject invalid document roots', () => {
      const invalidVirtualHost = {
        ...validVirtualHost,
        documentRoot: 'relative/path'
      };

      const result = virtualHostSchema.safeParse(invalidVirtualHost);
      expect(result.success).toBe(false);
    });
  });

  describe('httpConfigSchema', () => {
    const validConfig: HttpConfigFormValues = {
      serverStatus: true,
      serverName: 'example.com',
      serverAdmin: 'admin@example.com',
      listenPorts: '80,443',
      serverTokens: 'Prod',
      timeout: '60',
      keepAlive: true,
      virtualHosts: [{
        id: '550e8400-e29b-41d4-a716-446655440001',
        enabled: true,
        serverName: 'example.com',
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

    it('should validate a valid HTTP configuration', () => {
      const result = httpConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('should require at least one virtual host', () => {
      const configWithoutVHosts = {
        ...validConfig,
        virtualHosts: []
      };

      const result = httpConfigSchema.safeParse(configWithoutVHosts);
      expect(result.success).toBe(false);
    });

    it('should detect duplicate server names', () => {
      const configWithDuplicates = {
        ...validConfig,
        virtualHosts: [
          validConfig.virtualHosts[0],
          {
            ...validConfig.virtualHosts[0],
            id: '550e8400-e29b-41d4-a716-446655440002'
          }
        ]
      };

      const result = httpConfigSchema.safeParse(configWithDuplicates);
      expect(result.success).toBe(false);
    });

    it('should reject invalid server admin email', () => {
      const invalidConfig = {
        ...validConfig,
        serverAdmin: 'not-an-email'
      };

      const result = httpConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });

    it('should reject invalid listen ports', () => {
      const invalidConfig = {
        ...validConfig,
        listenPorts: '80,70000'
      };

      const result = httpConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });
});

describe('HTTP Transformers', () => {
  describe('parsePortString', () => {
    it('should parse comma-separated ports', () => {
      const result = parsePortString('80,443,8080');
      expect(result).toEqual([
        { port: 80, ssl: false },
        { port: 443, ssl: true },
        { port: 8080, ssl: false }
      ]);
    });

    it('should handle single port', () => {
      const result = parsePortString('80');
      expect(result).toEqual([{ port: 80, ssl: false }]);
    });

    it('should handle empty string', () => {
      const result = parsePortString('');
      expect(result).toEqual([]);
    });

    it('should automatically detect SSL for port 443', () => {
      const result = parsePortString('443');
      expect(result).toEqual([{ port: 443, ssl: true }]);
    });
  });

  describe('transformUiVirtualHostToApi', () => {
    const uiVirtualHost: VirtualHostFormValues = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      enabled: true,
      serverName: 'example.com',
      serverAlias: 'www.example.com, alias.example.com',
      documentRoot: '/var/www/html',
      port: '80',
      directoryIndex: 'index.html index.htm',
      errorLog: '/var/log/httpd/error.log',
      accessLog: '/var/log/httpd/access.log',
      accessLogFormat: 'combined',
      sslEnabled: true,
      sslCertificateFile: '/etc/ssl/certs/example.com.crt',
      sslCertificateKeyFile: '/etc/ssl/private/example.com.key',
      customDirectives: 'SetEnv TEST_MODE true\nHeader always set X-Frame-Options DENY'
    };

    it('should transform UI virtual host to API format', () => {
      const result = transformUiVirtualHostToApi(uiVirtualHost);

      expect(result).toEqual({
        id: '550e8400-e29b-41d4-a716-446655440001',
        enabled: true,
        serverName: 'example.com',
        serverAlias: ['www.example.com', 'alias.example.com'],
        documentRoot: '/var/www/html',
        port: 80,
        directoryIndex: ['index.html', 'index.htm'],
        errorLog: '/var/log/httpd/error.log',
        customLog: [{
          type: 'access',
          path: '/var/log/httpd/access.log',
          format: 'combined'
        }],
        ssl: {
          enabled: true,
          certificateFile: '/etc/ssl/certs/example.com.crt',
          certificateKeyFile: '/etc/ssl/private/example.com.key',
          sslEngine: true
        },
        customDirectives: [
          { name: 'SetEnv', value: 'TEST_MODE true' },
          { name: 'Header', value: 'always set X-Frame-Options DENY' }
        ]
      });
    });

    it('should handle empty optional fields', () => {
      const minimalVHost: VirtualHostFormValues = {
        id: '550e8400-e29b-41d4-a716-446655440001',
        enabled: true,
        serverName: 'example.com',
        documentRoot: '/var/www/html',
        port: '80',
        accessLogFormat: 'combined',
        sslEnabled: false,
        serverAlias: '',
        directoryIndex: '',
        errorLog: '',
        accessLog: '',
        sslCertificateFile: '',
        sslCertificateKeyFile: '',
        customDirectives: ''
      };

      const result = transformUiVirtualHostToApi(minimalVHost);

      expect(result.serverAlias).toEqual([]);
      expect(result.directoryIndex).toEqual([]);
      expect(result.errorLog).toBeUndefined();
      expect(result.customLog).toBeUndefined();
      expect(result.ssl).toBeUndefined();
      expect(result.customDirectives).toEqual([]);
    });
  });

  describe('transformApiVirtualHostToUi', () => {
    const apiVirtualHost: HttpVirtualHost = {
      id: '550e8400-e29b-41d4-a716-446655440001',
      enabled: true,
      serverName: 'example.com',
      serverAlias: ['www.example.com', 'alias.example.com'],
      documentRoot: '/var/www/html',
      port: 80,
      directoryIndex: ['index.html', 'index.htm'],
      errorLog: '/var/log/httpd/error.log',
      customLog: [{
        type: 'access',
        path: '/var/log/httpd/access.log',
        format: 'combined'
      }],
      ssl: {
        enabled: true,
        certificateFile: '/etc/ssl/certs/example.com.crt',
        certificateKeyFile: '/etc/ssl/private/example.com.key',
        sslEngine: true
      },
      customDirectives: [
        { name: 'SetEnv', value: 'TEST_MODE true' },
        { name: 'Header', value: 'always set X-Frame-Options DENY' }
      ]
    };

    it('should transform API virtual host to UI format', () => {
      const result = transformApiVirtualHostToUi(apiVirtualHost);

      expect(result).toEqual({
        id: '550e8400-e29b-41d4-a716-446655440001',
        enabled: true,
        serverName: 'example.com',
        serverAlias: 'www.example.com, alias.example.com',
        documentRoot: '/var/www/html',
        port: '80',
        directoryIndex: 'index.html index.htm',
        errorLog: '/var/log/httpd/error.log',
        accessLog: '/var/log/httpd/access.log',
        accessLogFormat: 'combined',
        sslEnabled: true,
        sslCertificateFile: '/etc/ssl/certs/example.com.crt',
        sslCertificateKeyFile: '/etc/ssl/private/example.com.key',
        customDirectives: 'SetEnv TEST_MODE true\nHeader always set X-Frame-Options DENY'
      });
    });
  });

  describe('transformHttpFormToApi', () => {
    const formData: HttpConfigFormValues = {
      serverStatus: true,
      serverName: 'example.com',
      serverAdmin: 'admin@example.com',
      listenPorts: '80,443',
      serverTokens: 'Prod',
      timeout: '60',
      keepAlive: true,
      virtualHosts: [{
        id: '550e8400-e29b-41d4-a716-446655440001',
        enabled: true,
        serverName: 'example.com',
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

    it('should transform form data to API format', () => {
      const result = transformHttpFormToApi(formData);

      expect(result.serverStatus).toBe(true);
      expect(result.globalConfig.serverName).toBe('example.com');
      expect(result.globalConfig.serverAdmin).toBe('admin@example.com');
      expect(result.globalConfig.listen).toEqual([
        { port: 80, ssl: false },
        { port: 443, ssl: true }
      ]);
      expect(result.globalConfig.serverTokens).toBe('Prod');
      expect(result.globalConfig.timeout).toBe(60);
      expect(result.globalConfig.keepAlive).toBe(true);
      expect(result.virtualHosts).toHaveLength(1);
    });
  });

  describe('transformHttpApiToForm', () => {
    const apiData: HttpConfiguration = {
      serverStatus: true,
      globalConfig: {
        serverName: 'example.com',
        serverAdmin: 'admin@example.com',
        listen: [
          { port: 80, ssl: false },
          { port: 443, ssl: true }
        ],
        serverTokens: 'Prod',
        timeout: 60,
        keepAlive: true
      },
      virtualHosts: [{
        id: '550e8400-e29b-41d4-a716-446655440001',
        enabled: true,
        serverName: 'example.com',
        documentRoot: '/var/www/html',
        port: 80
      }]
    };

    it('should transform API data to form format', () => {
      const result = transformHttpApiToForm(apiData);

      expect(result.serverStatus).toBe(true);
      expect(result.serverName).toBe('example.com');
      expect(result.serverAdmin).toBe('admin@example.com');
      expect(result.listenPorts).toBe('80, 443');
      expect(result.serverTokens).toBe('Prod');
      expect(result.timeout).toBe('60');
      expect(result.keepAlive).toBe(true);
      expect(result.virtualHosts).toHaveLength(1);
    });

    it('should handle missing optional fields', () => {
      const minimalApiData: HttpConfiguration = {
        serverStatus: false,
        globalConfig: {
          listen: []
        },
        virtualHosts: []
      };

      const result = transformHttpApiToForm(minimalApiData);

      expect(result.serverName).toBe('');
      expect(result.serverAdmin).toBe('');
      expect(result.listenPorts).toBe('');
      expect(result.serverTokens).toBe('Prod');
      expect(result.timeout).toBe('300');
      expect(result.keepAlive).toBe(true);
    });
  });
}); 
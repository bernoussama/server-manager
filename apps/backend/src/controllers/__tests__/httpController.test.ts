const { generateHttpdConf } = require('../httpController');

describe('HTTP Controller', () => {
  describe('generateHttpdConf', () => {
    it('should generate basic httpd.conf with default configuration', () => {
      const config = {
        serverStatus: true,
        globalConfig: {
          serverRoot: '/etc/httpd',
          serverName: 'localhost',
          serverAdmin: 'admin@localhost',
          listen: [
            { port: 80 },
            { port: 443, ssl: true }
          ]
        },
        virtualHosts: []
      };

      const result = generateHttpdConf(config);

      expect(result).toContain('ServerRoot "/etc/httpd"');
      expect(result).toContain('ServerName localhost');
      expect(result).toContain('ServerAdmin admin@localhost');
      expect(result).toContain('Listen *:80');
      expect(result).toContain('Listen *:443 ssl');
      expect(result).toContain('LoadModule ssl_module modules/mod_ssl.so');
      expect(result).toContain('LoadModule mpm_event_module modules/mod_mpm_event.so');
    });

    it('should sanitize dangerous characters in server values', () => {
      const config = {
        serverStatus: true,
        globalConfig: {
          serverRoot: '/etc/httpd',
          serverName: 'test<script>alert("xss")</script>.com',
          serverAdmin: 'admin@test">&<.com',
          listen: [{ port: 80 }]
        },
        virtualHosts: []
      };

      const result = generateHttpdConf(config);

      expect(result).toContain('ServerName testscriptalert(xss)/script.com');
      expect(result).toContain('ServerAdmin admin@test.com');
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('>&');
    });

    it('should handle custom directives safely', () => {
      const config = {
        serverStatus: true,
        globalConfig: {
          serverRoot: '/etc/httpd',
          serverName: 'localhost',
          serverAdmin: 'admin@localhost',
          listen: [{ port: 80 }],
          customDirectives: [
            {
              name: 'Test<Directive>',
              value: 'value"with`special&chars',
              comment: 'Comment with > redirect'
            }
          ]
        },
        virtualHosts: []
      };

      const result = generateHttpdConf(config);

      expect(result).toContain('# Comment with  redirect');
      expect(result).toContain('TestDirective valuewithspecialchars');
      expect(result).not.toContain('<Directive>');
      expect(result).not.toContain('`');
    });

    it('should only load SSL module when SSL listeners exist', () => {
      const configWithoutSSL = {
        serverStatus: true,
        globalConfig: {
          serverRoot: '/etc/httpd',
          serverName: 'localhost',
          serverAdmin: 'admin@localhost',
          listen: [{ port: 80 }]
        },
        virtualHosts: []
      };

      const resultWithoutSSL = generateHttpdConf(configWithoutSSL);
      expect(resultWithoutSSL).not.toContain('LoadModule ssl_module');

      const configWithSSL = {
        ...configWithoutSSL,
        globalConfig: {
          ...configWithoutSSL.globalConfig,
          listen: [
            { port: 80 },
            { port: 443, ssl: true }
          ]
        }
      };

      const resultWithSSL = generateHttpdConf(configWithSSL);
      expect(resultWithSSL).toContain('LoadModule ssl_module modules/mod_ssl.so');
    });

    it('should load essential modules first and avoid duplicates', () => {
      const config = {
        serverStatus: true,
        globalConfig: {
          serverRoot: '/etc/httpd',
          serverName: 'localhost',
          serverAdmin: 'admin@localhost',
          listen: [{ port: 80 }],
          modules: [
            { name: 'dir', enabled: true, required: true },
            { name: 'rewrite', enabled: true },
            { name: 'custom_module', enabled: true }
          ]
        },
        virtualHosts: []
      };

      const result = generateHttpdConf(config);

      // Essential modules should be loaded
      expect(result).toContain('LoadModule mpm_event_module modules/mod_mpm_event.so');
      expect(result).toContain('LoadModule dir_module modules/mod_dir.so');
      
      // Additional modules should be loaded
      expect(result).toContain('LoadModule rewrite_module modules/mod_rewrite.so');
      expect(result).toContain('LoadModule custom_module_module modules/mod_custom_module.so');

      // Count occurrences of dir module - should only appear once
      const dirModuleMatches = (result.match(/LoadModule dir_module/g) || []);
      expect(dirModuleMatches).toHaveLength(1);
    });
  });
}); 
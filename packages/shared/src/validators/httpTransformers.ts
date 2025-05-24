import type { HttpConfiguration, HttpVirtualHost, HttpConfigFormValues } from '../types/http';
import type { VirtualHostFormValues } from './httpFormValidator';

// Transform UI Virtual Host form data to API format
export const transformUiVirtualHostToApi = (uiVHost: VirtualHostFormValues): HttpVirtualHost => {
  const parseServerAlias = (alias: string = ''): string[] => {
    return alias.split(',').map(a => a.trim()).filter(Boolean);
  };

  const parseDirectoryIndex = (index: string = ''): string[] => {
    return index.split(' ').map(i => i.trim()).filter(Boolean);
  };

  const parseCustomDirectives = (directives: string = '') => {
    if (!directives.trim()) return [];
    
    return directives.split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => {
        const [name, ...valueParts] = line.split(' ');
        return {
          name: name || '',
          value: valueParts.join(' ') || ''
        };
      });
  };

  const virtualHost: HttpVirtualHost = {
    id: uiVHost.id,
    enabled: uiVHost.enabled,
    serverName: uiVHost.serverName,
    serverAlias: parseServerAlias(uiVHost.serverAlias),
    documentRoot: uiVHost.documentRoot,
    port: parseInt(uiVHost.port),
    directoryIndex: parseDirectoryIndex(uiVHost.directoryIndex),
    customDirectives: parseCustomDirectives(uiVHost.customDirectives)
  };

  // Add optional fields
  if (uiVHost.errorLog?.trim()) {
    virtualHost.errorLog = uiVHost.errorLog;
  }

  if (uiVHost.accessLog?.trim()) {
    virtualHost.customLog = [{
      type: 'access',
      path: uiVHost.accessLog,
      format: uiVHost.accessLogFormat || 'combined'
    }];
  }

  // SSL Configuration
  if (uiVHost.sslEnabled) {
    virtualHost.ssl = {
      enabled: true,
      certificateFile: uiVHost.sslCertificateFile,
      certificateKeyFile: uiVHost.sslCertificateKeyFile,
      sslEngine: true
    };
  }

  return virtualHost;
};

// Transform API Virtual Host to UI form format
export const transformApiVirtualHostToUi = (apiVHost: HttpVirtualHost): VirtualHostFormValues => {
  const serializeServerAlias = (aliases: string[] = []): string => {
    return aliases.join(', ');
  };

  const serializeDirectoryIndex = (indexes: string[] = []): string => {
    return indexes.join(' ');
  };

  const serializeCustomDirectives = (directives: any[] = []): string => {
    return directives
      .map(d => `${d.name} ${d.value}`)
      .join('\n');
  };

  const uiVHost: VirtualHostFormValues = {
    id: apiVHost.id,
    enabled: apiVHost.enabled,
    serverName: apiVHost.serverName,
    serverAlias: serializeServerAlias(apiVHost.serverAlias),
    documentRoot: apiVHost.documentRoot,
    port: apiVHost.port.toString(),
    directoryIndex: serializeDirectoryIndex(apiVHost.directoryIndex),
    errorLog: apiVHost.errorLog || '',
    accessLog: apiVHost.customLog?.[0]?.path || '',
    accessLogFormat: (apiVHost.customLog?.[0]?.format as any) || 'combined',
    sslEnabled: apiVHost.ssl?.enabled || false,
    sslCertificateFile: apiVHost.ssl?.certificateFile || '',
    sslCertificateKeyFile: apiVHost.ssl?.certificateKeyFile || '',
    customDirectives: serializeCustomDirectives(apiVHost.customDirectives)
  };

  return uiVHost;
};

// Parse port string to array
export const parsePortString = (ports: string): Array<{ port: number; address?: string; ssl?: boolean }> => {
  return ports.split(',')
    .map(p => p.trim())
    .filter(Boolean)
    .map(portStr => {
      const port = parseInt(portStr);
      return {
        port,
        ssl: port === 443
      };
    });
};

// Transform UI form data to API format
export const transformHttpFormToApi = (formData: HttpConfigFormValues): HttpConfiguration => {
  return {
    serverStatus: formData.serverStatus,
    globalConfig: {
      serverName: formData.serverName,
      serverAdmin: formData.serverAdmin,
      listen: parsePortString(formData.listenPorts),
      serverTokens: formData.serverTokens as any,
      timeout: parseInt(formData.timeout),
      keepAlive: formData.keepAlive
    },
    virtualHosts: formData.virtualHosts.map(transformUiVirtualHostToApi)
  };
};

// Transform API data to UI form format
export const transformHttpApiToForm = (apiData: HttpConfiguration): HttpConfigFormValues => {
  const serializePorts = (listen: Array<{ port: number; address?: string; ssl?: boolean }> = []): string => {
    return listen.map(l => l.port.toString()).join(', ');
  };

  return {
    serverStatus: apiData.serverStatus,
    serverName: apiData.globalConfig.serverName || '',
    serverAdmin: apiData.globalConfig.serverAdmin || '',
    listenPorts: serializePorts(apiData.globalConfig.listen),
    serverTokens: (apiData.globalConfig.serverTokens || 'Prod') as any,
    timeout: (apiData.globalConfig.timeout || 300).toString(),
    keepAlive: apiData.globalConfig.keepAlive !== false,
    virtualHosts: apiData.virtualHosts.map(transformApiVirtualHostToUi)
  };
}; 
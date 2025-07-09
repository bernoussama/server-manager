// HTTP Server Configuration Types

export type HttpServerStatus = 'running' | 'stopped' | 'failed' | 'unknown';

export type LogFormat = 'combined' | 'common' | 'referer' | 'agent' | 'custom';

export interface HttpDirective {
  id?: string;
  name: string;
  value: string;
  comment?: string;
}

export interface HttpLogConfig {
  type: 'error' | 'access' | 'custom';
  path: string;
  format?: LogFormat | string;
  level?: 'debug' | 'info' | 'notice' | 'warn' | 'error' | 'crit' | 'alert' | 'emerg';
}

export interface HttpDirectoryConfig {
  path: string;
  allowOverride?: string;
  options?: string[];
  require?: string[];
  directoryIndex?: string[];
  customDirectives?: HttpDirective[];
}

export interface HttpSSLConfig {
  enabled: boolean;
  certificateFile?: string;
  certificateKeyFile?: string;
  certificateChainFile?: string;
  sslEngine?: boolean;
  sslProtocol?: string[];
  sslCipherSuite?: string;
}

// Module configuration interface
export interface HttpModuleConfig {
  name: string;
  enabled: boolean;
  required?: boolean; // Some modules might be required and can't be disabled
  description?: string;
  filename?: string; // e.g., "modules/mod_ssl.so"
}

export interface HttpVirtualHost {
  id: string;
  enabled: boolean;
  serverName: string;
  serverAlias?: string[];
  documentRoot: string;
  port: number;
  ipAddress?: string; // for *:80 or specific IP
  
  // Basic Configuration
  directoryIndex?: string[];
  
  // Logging
  errorLog?: string;
  customLog?: HttpLogConfig[];
  logLevel?: string;
  
  // SSL Configuration
  ssl?: HttpSSLConfig;
  
  // Directory Configuration
  directories?: HttpDirectoryConfig[];
  
  // Custom Directives
  customDirectives?: HttpDirective[];
  
  // Redirects and Rewrites
  redirects?: Array<{
    from: string;
    to: string;
    type: 'permanent' | 'temporary' | 'seeother' | 'gone';
  }>;
  
  rewrites?: Array<{
    pattern: string;
    substitution: string;
    flags?: string[];
  }>;
}

export interface HttpGlobalConfig {
  // Server Settings
  serverRoot?: string;
  serverName?: string;
  serverAdmin?: string;
  
  // Network Settings
  listen: Array<{
    port: number;
    address?: string;
    ssl?: boolean;
  }>;
  
  // Process Management
  startServers?: number;
  minSpareServers?: number;
  maxSpareServers?: number;
  maxRequestWorkers?: number;
  serverLimit?: number;
  
  // Security
  serverTokens?: 'Off' | 'Prod' | 'Major' | 'Minor' | 'Min' | 'OS' | 'Full';
  serverSignature?: 'Off' | 'On' | 'Email';
  user?: string;
  group?: string;
  
  // Modules
  loadedModules?: string[];
  modules?: HttpModuleConfig[];
  
  // Global Logging
  errorLog?: string;
  logLevel?: string;
  
  // Performance
  timeout?: number;
  keepAlive?: boolean;
  keepAliveTimeout?: number;
  maxKeepAliveRequests?: number;
  
  // Custom Global Directives
  customDirectives?: HttpDirective[];
}

export interface HttpConfiguration {
  serverStatus: boolean;
  globalConfig: HttpGlobalConfig;
  virtualHosts: HttpVirtualHost[];
}

// Form/UI Types
export interface HttpConfigFormValues {
  serverStatus: boolean;
  
  // Global Settings (simplified for UI)
  serverName: string;
  serverAdmin: string;
  listenPorts: string; // comma-separated: "80,443"
  serverTokens: string;
  timeout: string;
  keepAlive: boolean;
  user: string;
  group: string;
  
  // Modules configuration for UI
  modules: Array<{
    name: string;
    enabled: boolean;
    required?: boolean;
    description?: string;
  }>;
  
  // Virtual Hosts
  virtualHosts: Array<{
    id: string;
    enabled: boolean;
    serverName: string;
    serverAlias?: string; // comma-separated
    documentRoot: string;
    port: string;
    directoryIndex?: string; // space-separated
    errorLog?: string;
    accessLog?: string;
    accessLogFormat: 'combined' | 'common' | 'referer' | 'agent' | 'custom';
    
    // SSL
    sslEnabled: boolean;
    sslCertificateFile?: string;
    sslCertificateKeyFile?: string;
    
    // Custom directives as text
    customDirectives?: string;
  }>;
}

// API Response Types
export interface HttpUpdateResponse {
  success: boolean;
  message: string;
  data?: HttpConfiguration;
  errors?: Array<{
    path: (string | number)[];
    message: string;
  }>;
}

export interface HttpConfigResponse {
  success: boolean;
  message: string;
  data: HttpConfiguration;
}

// Component Props Types
export type HttpVirtualHostFieldProps = {
  virtualHost: HttpVirtualHost;
  onChange: (virtualHost: HttpVirtualHost) => void;
  onRemove?: () => void;
  isNew?: boolean;
};

// Utility Types
export type HttpServiceAction = 'start' | 'stop' | 'restart' | 'reload' | 'status';

export interface HttpServiceResponse {
  service: 'httpd';
  status: HttpServerStatus;
  message: string;
  configTest?: {
    valid: boolean;
    errors?: string[];
  };
} 
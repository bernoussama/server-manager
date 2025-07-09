import { z } from 'zod';

// Helper validation functions
export const isValidPort = (port: string): boolean => {
  const portNum = parseInt(port);
  return !isNaN(portNum) && portNum >= 1 && portNum <= 65535;
};

export const isValidPath = (path: string): boolean => {
  return path.startsWith('/') && path.length > 0;
};

export const isValidServerName = (serverName: string): boolean => {
  // Basic domain name validation
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
  return domainRegex.test(serverName);
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Schema for module configuration
export const moduleSchema = z.object({
  name: z.string().min(1, "Module name is required"),
  enabled: z.boolean().default(false),
  required: z.boolean().optional(),
  description: z.string().optional(),
});

// Schema for Virtual Host configuration in the UI form
export const virtualHostSchema = z.object({
  id: z.string().uuid(),
  enabled: z.boolean().default(true),
  serverName: z.string().min(1, "Server name is required").refine(isValidServerName, {
    message: "Invalid server name format"
  }),
  serverAlias: z.string().optional(),
  documentRoot: z.string().min(1, "Document root is required").refine(isValidPath, {
    message: "Document root must be a valid absolute path"
  }),
  port: z.string().refine(isValidPort, {
    message: "Port must be a number between 1 and 65535"
  }),
  directoryIndex: z.string().optional(),
  errorLog: z.string().optional(),
  accessLog: z.string().optional(),
  accessLogFormat: z.enum(['combined', 'common', 'referer', 'agent', 'custom']).default('combined'),
  
  // SSL Configuration
  sslEnabled: z.boolean().default(false),
  sslCertificateFile: z.string().optional(),
  sslCertificateKeyFile: z.string().optional(),
  
  // Custom directives as text
  customDirectives: z.string().optional(),
}).superRefine((data, ctx) => {
  // SSL validation
  if (data.sslEnabled) {
    if (!data.sslCertificateFile || data.sslCertificateFile.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sslCertificateFile'],
        message: 'SSL certificate file is required when SSL is enabled'
      });
    }
    if (!data.sslCertificateKeyFile || data.sslCertificateKeyFile.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sslCertificateKeyFile'],
        message: 'SSL certificate key file is required when SSL is enabled'
      });
    }
  }
  
  // Port validation for SSL
  const portNum = parseInt(data.port);
  if (data.sslEnabled && portNum === 80) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['port'],
      message: 'SSL enabled virtual hosts should not use port 80'
    });
  }
});

// Schema for the entire HTTP configuration form
export const httpConfigSchema = z.object({
  serverStatus: z.boolean(),
  
  // Global Settings
  serverName: z.string().min(1, "Server name is required").refine(isValidServerName, {
    message: "Invalid server name format"
  }),
  serverAdmin: z.string().min(1, "Server admin email is required").refine(isValidEmail, {
    message: "Invalid email format"
  }),
  listenPorts: z.string().min(1, "At least one port must be specified").refine((ports) => {
    const portList = ports.split(',').map(p => p.trim());
    return portList.every(isValidPort);
  }, {
    message: "All ports must be valid numbers between 1 and 65535"
  }),
  serverTokens: z.enum(['Off', 'Prod', 'Major', 'Minor', 'Min', 'OS', 'Full']).default('Prod'),
  timeout: z.string().regex(/^\d+$/, { message: 'Timeout must be a number' }).default('300'),
  keepAlive: z.boolean().default(true),
  user: z.string().min(1, "User is required").default('apache'),
  group: z.string().min(1, "Group is required").default('apache'),
  
  // Modules configuration
  modules: z.array(moduleSchema).default([]),
  
  // Virtual Hosts
  virtualHosts: z.array(virtualHostSchema).min(1, "At least one virtual host is required"),
}).superRefine((data, ctx) => {
  // Check for duplicate server names
  const serverNames = data.virtualHosts.map(vh => vh.serverName.toLowerCase());
  const duplicates = serverNames.filter((name, index) => serverNames.indexOf(name) !== index);
  
  if (duplicates.length > 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['virtualHosts'],
      message: `Duplicate server names found: ${duplicates.join(', ')}`
    });
  }
  
  // Check for port conflicts
  const portsByName = new Map<string, string>();
  data.virtualHosts.forEach((vh, index) => {
    const key = `${vh.serverName}:${vh.port}`;
    if (portsByName.has(key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['virtualHosts', index, 'port'],
        message: `Port ${vh.port} already used by server ${vh.serverName}`
      });
    }
    portsByName.set(key, vh.serverName);
  });
  
  // Module validation: Check if SSL module is enabled when SSL is configured
  const sslModuleEnabled = data.modules.some(m => m.name === 'ssl' && m.enabled);
  const hasSslVirtualHost = data.virtualHosts.some(vh => vh.sslEnabled);
  
  if (hasSslVirtualHost && !sslModuleEnabled) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['modules'],
      message: 'SSL module must be enabled when SSL virtual hosts are configured'
    });
  }
  
  // Check required modules can't be disabled
  data.modules.forEach((module, index) => {
    if (module.required && !module.enabled) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['modules', index, 'enabled'],
        message: `${module.name} is a required module and cannot be disabled`
      });
    }
  });
});

// Type exports
export type HttpConfigFormValues = z.infer<typeof httpConfigSchema>;
export type VirtualHostFormValues = z.infer<typeof virtualHostSchema>;
export type ModuleFormValues = z.infer<typeof moduleSchema>; 
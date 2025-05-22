import { z } from 'zod';

/**
 * DNS Record Schema
 * 
 * Represents individual DNS records like A, CNAME, MX, etc.
 * Example:
 * {
 *   "id": "b180ed20-b0ec-40f6-a71a-b8ed778fdf12",
 *   "type": "A",
 *   "name": "@",
 *   "value": "192.168.1.100",
 *   "priority": "", // Only used for MX, SRV records
 *   "weight": "",   // Only used for SRV records
 *   "port": ""      // Only used for SRV records
 * }
 */
export const dnsRecordSchema = z.object({
  id: z.string().uuid().optional(),
  type: z.enum(['A', 'AAAA', 'CNAME', 'TXT', 'NS', 'PTR', 'MX', 'SRV']),
  name: z.string(),
  value: z.string(),
  priority: z.union([z.string(), z.number(), z.undefined()]),
  weight: z.union([z.string(), z.number(), z.undefined()]),
  port: z.union([z.string(), z.number(), z.undefined()]),
  ttl: z.number().optional(),
}).superRefine((record, ctx) => {
  // Additional validation for A records - must be valid IPv4 address
  if (record.type === 'A') {
    // Check if it's a valid IPv4 address
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    if (!ipv4Regex.test(record.value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A record must have a valid IPv4 address",
        path: ['value']
      });
      return;
    }
    
    // Validate each octet is in range 0-255
    const octets = record.value.split('.');
    if (octets.length !== 4) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A record must have a valid IPv4 address with 4 octets",
        path: ['value']
      });
      return;
    }
    
    for (const octet of octets) {
      const num = parseInt(octet, 10);
      if (isNaN(num) || num < 0 || num > 255) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Each octet in an IPv4 address must be between 0 and 255",
          path: ['value']
        });
        return;
      }
    }
  }
  
  // Additional validation for AAAA records - must be valid IPv6 address
  if (record.type === 'AAAA') {
    // Basic IPv6 validation - this is simplified
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::$|^::1$|^([0-9a-fA-F]{1,4}:){1,7}:$|^:([0-9a-fA-F]{1,4}:){1,7}$|^([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}$|^([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}$|^([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}$|^([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})$|^:((:[0-9a-fA-F]{1,4}){1,7}|:)$/;
    if (!ipv6Regex.test(record.value)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "AAAA record must have a valid IPv6 address",
        path: ['value']
      });
      return;
    }
  }
  
  // Additional validation for MX records - must have priority
  if (record.type === 'MX') {
    if (record.priority === undefined || 
        (typeof record.priority === 'string' && record.priority.trim() === '') || 
        (typeof record.priority === 'number' && isNaN(record.priority))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "MX record must have a priority",
        path: ['priority']
      });
      return;
    }
  }
  
  // Additional validation for SRV records - must have priority, weight, and port
  if (record.type === 'SRV') {
    if (record.priority === undefined || 
        (typeof record.priority === 'string' && record.priority.trim() === '') ||
        (typeof record.priority === 'number' && isNaN(record.priority))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "SRV record must have a priority",
        path: ['priority']
      });
      return;
    }
    if (record.weight === undefined || 
        (typeof record.weight === 'string' && record.weight.trim() === '') ||
        (typeof record.weight === 'number' && isNaN(record.weight))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "SRV record must have a weight",
        path: ['weight']
      });
      return;
    }
    if (record.port === undefined || 
        (typeof record.port === 'string' && record.port.trim() === '') ||
        (typeof record.port === 'number' && isNaN(record.port))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "SRV record must have a port",
        path: ['port']
      });
      return;
    }
  }
});

// Helper function to parse string lists (like "8.8.8.8; 8.8.4.4;")
export const parseStringList = (input: string, validatorFn?: (item: string) => boolean): string[] => {
  if (!input) return [];
  
  // Split by semicolons and remove any trailing semicolons
  const items = input.split(';')
    .map(item => item.trim())
    .filter(item => item.length > 0);
  
  if (validatorFn) {
    items.forEach(item => {
      if (!validatorFn(item)) {
        throw new Error(`Invalid item in list: ${item}`);
      }
    });
  }
  
  return items;
};

// Create a custom refinement for string lists
export const stringListRefinement = (key: string, validatorFn?: (item: string) => boolean) => {
  return z.union([
    z.string().transform((val, ctx) => {
      try {
        return parseStringList(val, validatorFn);
      } catch (error) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Invalid ${key} list: ${(error as Error).message}`,
          path: [key],
        });
        return z.NEVER;
      }
    }),
    z.array(z.string()).superRefine((arr, ctx) => {
      if (validatorFn) {
        for (const item of arr) {
          if (!validatorFn(item)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: `Invalid item in ${key} list: ${item}`,
              path: [key],
            });
          }
        }
      }
      return arr;
    })
  ]);
};

export const isValidIpAddress = (ip: string): boolean => {
  // Regular expression for IPv4 address validation
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  if (!ipv4Regex.test(ip)) {
    return false;
  }
  
  // Additional validation for each octet in the IPv4 address
  const octets = ip.split('.');
  if (octets.length !== 4) {
    return false;
  }
  
  for (const octet of octets) {
    const num = parseInt(octet, 10);
    if (isNaN(num) || num < 0 || num > 255) {
      return false;
    }
  }
  
  return true;
};


// Schema for SOA settings
export const soaSettingsSchema = z.object({
  ttl: z.string().min(1, "TTL is required"),
  primaryNameserver: z.string().min(1, "Primary nameserver is required"),
  adminEmail: z.string().min(1, "Admin email is required"),
  serial: z.string().optional(),
  refresh: z.string().optional(),
  retry: z.string().optional(),
  expire: z.string().optional(),
  minimumTtl: z.string().optional(),
});

/**
 * Zone Schema
 * 
 * Represents a DNS zone with its records.
 * Example:
 * {
 *   "id": "f4b0899c-6a96-46eb-bd19-3c4836d86cd1",
 *   "zoneName": "example.com",
 *   "zoneType": "master",
 *   "fileName": "forward.example.com",
 *   "allowUpdate": "none",
 *   "records": [...]
 * }
 */
export const zoneSchema = z.object({
  id: z.string().uuid().optional(),
  zoneName: z.string().min(1, { message: 'Zone name is required' }),
  zoneType: z.enum(['master', 'slave', 'forward']),
  fileName: z.string(),
  allowUpdate: z.union([z.string(), z.array(z.string())]),
  soaSettings: soaSettingsSchema,
  records: z.array(dnsRecordSchema).default([]),
});

// Helper function to check if a numeric priority has a valid range
export const isValidPriority = (priority: string): boolean => {
  const num = parseInt(priority, 10);
  return !isNaN(num) && num >= 0 && num <= 65535;
};

// Helper function to check if a numeric weight has a valid range
export const isValidWeight = (weight: string): boolean => {
  const num = parseInt(weight, 10);
  return !isNaN(num) && num >= 0 && num <= 65535;
};

// Helper function to check if a numeric port has a valid range
export const isValidPort = (port: string): boolean => {
  const num = parseInt(port, 10);
  return !isNaN(num) && num >= 0 && num <= 65535;
};

/**
 * DNS Configuration Schema
 * 
 * The main configuration schema for BIND DNS settings.
 * String lists should be formatted with semicolons, e.g., "value1; value2; value3;"
 * 
 * Example:
 * {
 *   "dnsServerStatus": false,
 *   "listenOn": "127.0.0.1; 192.168.1.160;",
 *   "allowQuery": "localhost; 192.168.1.0/24;",
 *   "allowRecursion": "localhost;",
 *   "forwarders": "8.8.8.8; 8.8.4.4;",
 *   "allowTransfer": "",
 *   "zones": [...]
 * }
 */
export const dnsConfigurationSchema = z.object({
  // Server Configuration
  dnsServerStatus: z.boolean().default(false),
  listenOn: z.union([z.string(), z.array(z.string())]),
  allowQuery: z.union([z.string(), z.array(z.string())]),
  allowRecursion: z.union([z.string(), z.array(z.string())]),
  forwarders: z.union([z.string(), z.array(z.string())]),
  allowTransfer: z.union([z.string(), z.array(z.string())]),
  
  // Multiple Zones
  zones: z.array(zoneSchema).min(1, { message: 'At least one zone is required' }),

  // Optional advanced fields (can be added back if needed)
  dnssecValidation: z.boolean().optional().default(false),
  queryLogging: z.boolean().optional().default(false),
});

// Export types
export type DnsRecord = z.infer<typeof dnsRecordSchema>;
export type Zone = z.infer<typeof zoneSchema>;
export type DnsConfiguration = z.infer<typeof dnsConfigurationSchema>; 
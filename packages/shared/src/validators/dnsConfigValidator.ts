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
  priority: z.string().optional(),
  weight: z.string().optional(),
  port: z.string().optional(),
  ttl: z.number().optional(),
}).refine((record) => {
  // Additional validation for A records - must be valid IPv4 address
  if (record.type === 'A') {
    // Check if it's a valid IPv4 address
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    if (!ipv4Regex.test(record.value)) {
      return false;
    }
    
    // Validate each octet is in range 0-255
    const octets = record.value.split('.');
    if (octets.length !== 4) return false;
    
    for (const octet of octets) {
      const num = parseInt(octet, 10);
      if (isNaN(num) || num < 0 || num > 255) {
        return false;
      }
    }
  }
  
  // Additional validation for AAAA records - must be valid IPv6 address
  if (record.type === 'AAAA') {
    // Basic IPv6 validation - this is simplified
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::$|^::1$|^([0-9a-fA-F]{1,4}:){1,7}:$|^:([0-9a-fA-F]{1,4}:){1,7}$|^([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}$|^([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}$|^([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}$|^([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}$|^[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})$|^:((:[0-9a-fA-F]{1,4}){1,7}|:)$/;
    if (!ipv6Regex.test(record.value)) {
      return false;
    }
  }
  
  // Additional validation for MX records - must have priority
  if (record.type === 'MX' && (!record.priority || record.priority.trim() === '')) {
    return false;
  }
  
  // Additional validation for SRV records - must have priority, weight, and port
  if (record.type === 'SRV' && 
     (!record.priority || record.priority.trim() === '' || 
      !record.weight || record.weight.trim() === '' || 
      !record.port || record.port.trim() === '')) {
    return false;
  }
  
  return true;
}, {
  message: "Invalid record value for the specified record type. A records must be valid IPv4 addresses, AAAA records must be valid IPv6 addresses, MX records must have priority, and SRV records must have priority, weight, and port.",
  path: ['value'], // This will highlight the value field in error messages
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
  allowUpdate: z.string().default('none'),
  records: z.array(dnsRecordSchema).default([]),
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
  return z.string().transform((val, ctx) => {
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
  });
};

// IP address validation function
export const isValidIpAddress = (ip: string): boolean => {
  // Simple IPv4 regex
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = ip.match(ipv4Regex);
  if (!match) return false;
  
  // Check that each octet is in range
  for (let i = 1; i <= 4; i++) {
    const octet = parseInt(match[i], 10);
    if (octet < 0 || octet > 255) return false;
  }
  
  return true;
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
  listenOn: stringListRefinement('listenOn', isValidIpAddress),
  allowQuery: stringListRefinement('allowQuery'),
  allowRecursion: stringListRefinement('allowRecursion'),
  forwarders: stringListRefinement('forwarders', isValidIpAddress),
  allowTransfer: stringListRefinement('allowTransfer'),
  
  // Multiple Zones
  zones: z.array(zoneSchema).min(1, { message: 'At least one zone is required' }),

  // Optional advanced fields (can be added back if needed)
  dnssecValidation: z.boolean().optional().default(true),
  queryLogging: z.boolean().optional().default(false),
}); 
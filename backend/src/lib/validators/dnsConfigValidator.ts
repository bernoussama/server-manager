import { z } from 'zod';

// Define the DNS record schema
const dnsRecordSchema = z.object({
  id: z.string().uuid().optional(),
  type: z.enum(['A', 'AAAA', 'CNAME', 'TXT', 'NS', 'PTR', 'MX', 'SRV']),
  name: z.string(),
  value: z.string(),
  priority: z.string().optional(),
  weight: z.string().optional(),
  port: z.string().optional(),
  ttl: z.number().optional(),
});

// Define the zone schema
const zoneSchema = z.object({
  id: z.string().uuid().optional(),
  zoneName: z.string().min(1, { message: 'Zone name is required' }),
  zoneType: z.enum(['master', 'slave', 'forward']),
  fileName: z.string(),
  allowUpdate: z.string().default('none'),
  records: z.array(dnsRecordSchema).default([]),
});

// Helper function to parse string lists (like "8.8.8.8; 8.8.4.4;")
const parseStringList = (input: string, validatorFn?: (item: string) => boolean): string[] => {
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
const stringListRefinement = (key: string, validatorFn?: (item: string) => boolean) => {
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
const isValidIpAddress = (ip: string): boolean => {
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

// Define the main DNS configuration schema
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

export type DnsRecord = z.infer<typeof dnsRecordSchema>;
export type Zone = z.infer<typeof zoneSchema>;
export type DnsConfiguration = z.infer<typeof dnsConfigurationSchema>;
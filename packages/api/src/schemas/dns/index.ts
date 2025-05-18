import { z } from 'zod';

// DNS Record Types
export const dnsRecordTypeEnum = z.enum([
  'A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'PTR', 'SOA', 'SRV'
]);

// Base DNS Record Schema
export const baseDnsRecordSchema = z.object({
  id: z.string().uuid().optional(),
  type: dnsRecordTypeEnum,
  name: z.string(),
  value: z.string(),
  ttl: z.number().optional(),
  comment: z.string().optional(),
});

// Specialized record schemas
export const mxDnsRecordSchema = baseDnsRecordSchema.extend({
  type: z.literal('MX'),
  priority: z.number(),
});

export const srvDnsRecordSchema = baseDnsRecordSchema
  .omit({ value: true })
  .extend({
    type: z.literal('SRV'),
    priority: z.number(),
    weight: z.number(),
    port: z.number(),
    target: z.string(),
  });

export const soaDnsRecordSchema = baseDnsRecordSchema.extend({
  type: z.literal('SOA'),
  primary: z.string(),
  admin: z.string(),
  serial: z.number(),
  refresh: z.number(),
  retry: z.number(),
  expire: z.number(),
  minimum: z.number(),
});

// DNS record validator using discriminated union
export const dnsRecordSchema = z.discriminatedUnion('type', [
  baseDnsRecordSchema.extend({ type: z.enum(['A', 'AAAA', 'CNAME', 'TXT', 'NS', 'PTR']) }),
  mxDnsRecordSchema,
  srvDnsRecordSchema,
  soaDnsRecordSchema,
]);

// Helper function to parse string lists (like "8.8.8.8; 8.8.4.4;")
// This converts string semicolon-separated lists to string arrays
export const parseStringList = (input: string | string[], validatorFn?: (item: string) => boolean): string[] => {
  if (!input) return [];
  
  // If input is already an array, just validate and return it
  if (Array.isArray(input)) {
    if (validatorFn) {
      input.forEach(item => {
        if (!validatorFn(item)) {
          throw new Error(`Invalid item in list: ${item}`);
        }
      });
    }
    return input;
  }
  
  // Otherwise, split by semicolons and remove any trailing semicolons
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
    z.array(z.string()).transform((val, ctx) => {
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
    })
  ]);
};

// IP address validation function
export const isValidIpAddress = (ip: string): boolean => {
  // Simple IPv4 regex
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = ip.match(ipv4Regex);
  if (!match || match.length !== 5) return false;
  
  // Check that each octet is in range
  for (let i = 1; i <= 4; i++) {
    const octet = parseInt(match[i] as string, 10);
    if (isNaN(octet) || octet < 0 || octet > 255) return false;
  }
  
  return true;
};

// DNS Zone Schema
export const dnsZoneSchema = z.object({
  id: z.string().uuid().optional(),
  zoneName: z.string().min(1, { message: 'Zone name is required' }),
  zoneType: z.enum(['master', 'slave', 'forward']),
  fileName: z.string(),
  allowUpdate: z.union([
    z.string(),
    z.array(z.string())
  ]).transform((val) => Array.isArray(val) ? val : val.split(';').map(s => s.trim()).filter(Boolean)),
  records: z.array(dnsRecordSchema).default([]),
});

// DNS Server Configuration Schema
export const dnsServerConfigSchema = z.object({
  // Server Status
  dnsServerStatus: z.boolean().default(false),
  
  // Network Settings
  listenOn: z.union([z.string(), z.array(z.string())]).transform(
    (val) => Array.isArray(val) ? val : val.split(';').map(s => s.trim()).filter(Boolean)
  ),
  allowQuery: z.union([z.string(), z.array(z.string())]).transform(
    (val) => Array.isArray(val) ? val : val.split(';').map(s => s.trim()).filter(Boolean)
  ),
  allowRecursion: z.union([z.string(), z.array(z.string())]).transform(
    (val) => Array.isArray(val) ? val : val.split(';').map(s => s.trim()).filter(Boolean)
  ),
  forwarders: z.union([z.string(), z.array(z.string())]).transform(
    (val) => Array.isArray(val) ? val : val.split(';').map(s => s.trim()).filter(Boolean)
  ),
  forwardOnly: z.boolean().optional(),
  
  // DNSSEC
  dnssecValidation: z.boolean().optional().default(true),
  
  // Logging
  queryLogging: z.boolean().optional().default(false),
  logFile: z.string().optional(),
  logLevel: z.enum(['critical', 'error', 'warning', 'notice', 'info', 'debug']).optional(),
  
  // Performance
  maxCacheTtl: z.number().optional(),
  maxNcacheTtl: z.number().optional(),
  
  // Zone Transfer
  allowTransfer: z.union([z.string(), z.array(z.string())]).transform(
    (val) => Array.isArray(val) ? val : val.split(';').map(s => s.trim()).filter(Boolean)
  ),
  allowUpdate: z.union([z.string(), z.array(z.string())]).optional().transform(
    (val) => val ? (Array.isArray(val) ? val : val.split(';').map(s => s.trim()).filter(Boolean)) : []
  ),
});

// Full DNS Configuration Schema
export const dnsConfigurationSchema = dnsServerConfigSchema.extend({
  zones: z.array(dnsZoneSchema).min(1, { message: 'At least one zone is required' }),
});

// DNS Update Response Schema
export const dnsUpdateResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: dnsConfigurationSchema.optional(),
  errors: z.array(z.object({
    path: z.array(z.union([z.string(), z.number()])),
    message: z.string()
  })).optional()
});

// DNS Form Schemas (for frontend use)
export const dnsRecordFormSchema = z.object({
  id: z.string().uuid(),
  type: dnsRecordTypeEnum,
  name: z.string().min(1, "Name is required"),
  value: z.string(),
  priority: z.string().optional(),
  weight: z.string().optional(),
  port: z.string().optional(),
});

export const dnsZoneFormSchema = z.object({
  id: z.string().uuid(),
  zoneName: z.string().min(1, "Zone name is required"),
  zoneType: z.enum(['master', 'slave', 'forward']),
  fileName: z.string().min(1, "File name is required"),
  allowUpdate: z.string(),
  records: z.array(dnsRecordFormSchema),
});

export const dnsConfigFormSchema = z.object({
  dnsServerStatus: z.boolean(),
  listenOn: z.string(),
  allowQuery: z.string(),
  allowRecursion: z.string(),
  forwarders: z.string(),
  allowTransfer: z.string(),
  zones: z.array(dnsZoneFormSchema),
});

// Export types based on schemas
export type DnsRecordType = z.infer<typeof dnsRecordTypeEnum>;
export type BaseDnsRecord = z.infer<typeof baseDnsRecordSchema>;
export type MxDnsRecord = z.infer<typeof mxDnsRecordSchema>;
export type SrvDnsRecord = z.infer<typeof srvDnsRecordSchema>;
export type SoaDnsRecord = z.infer<typeof soaDnsRecordSchema>;
export type DnsRecord = z.infer<typeof dnsRecordSchema>;
export type DnsZone = z.infer<typeof dnsZoneSchema>;
export type DnsServerConfig = z.infer<typeof dnsServerConfigSchema>;
export type DnsConfiguration = z.infer<typeof dnsConfigurationSchema>;
export type DnsUpdateResponse = z.infer<typeof dnsUpdateResponseSchema>;
export type DnsRecordForm = z.infer<typeof dnsRecordFormSchema>;
export type DnsZoneForm = z.infer<typeof dnsZoneFormSchema>;
export type DnsConfigForm = z.infer<typeof dnsConfigFormSchema>; 
import { z } from 'zod';

/**
 * DNS Record Schema
 */
export const dnsRecordSchema = z.object({
  id: z.string().uuid().optional(),
  type: z.enum(['A', 'AAAA', 'CNAME', 'TXT', 'NS', 'PTR', 'MX', 'SRV']),
  name: z.string(), // Should be further validated for valid hostname characters if needed
  value: z.string(),
  priority: z.union([z.string().regex(/^\d*$/).transform(Number), z.number(), z.undefined()]).optional(), // Optional and can be numeric string
  weight: z.union([z.string().regex(/^\d*$/).transform(Number), z.number(), z.undefined()]).optional(),
  port: z.union([z.string().regex(/^\d*$/).transform(Number), z.number(), z.undefined()]).optional(),
  ttl: z.number().optional(),
}).superRefine((record, ctx) => {
  if (record.type === 'A') {
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    if (!ipv4Regex.test(record.value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "A record must have a valid IPv4 address", path: ['value'] });
      return;
    }
    const octets = record.value.split('.');
    if (octets.some(octet => parseInt(octet, 10) < 0 || parseInt(octet, 10) > 255)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Each octet in an IPv4 address must be between 0 and 255", path: ['value'] });
    }
  }
  if (record.type === 'AAAA') {
    // Basic IPv6 validation (simplified for brevity, consider a library for robust validation if needed)
    const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^(?:[0-9a-fA-F]{1,4}:){0,6}::(?:[0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$/;
    if (!ipv6Regex.test(record.value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "AAAA record must have a valid IPv6 address", path: ['value'] });
    }
  }
  if (record.type === 'MX' && (record.priority === undefined || record.priority === null || record.priority === '')) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "MX record must have a priority", path: ['priority'] });
  }
  if (record.type === 'SRV') {
    if (record.priority === undefined || record.priority === null || record.priority === '') ctx.addIssue({ code: z.ZodIssueCode.custom, message: "SRV record must have priority", path: ['priority'] });
    if (record.weight === undefined || record.weight === null || record.weight === '') ctx.addIssue({ code: z.ZodIssueCode.custom, message: "SRV record must have weight", path: ['weight'] });
    if (record.port === undefined || record.port === null || record.port === '') ctx.addIssue({ code: z.ZodIssueCode.custom, message: "SRV record must have port", path: ['port'] });
  }
});
export type DnsRecordType = z.infer<typeof dnsRecordSchema>;


// Schema for SOA settings
export const soaSettingsSchema = z.object({
  ttl: z.string().min(1, "TTL is required"), // Keep as string, backend can parse
  primaryNameserver: z.string().min(1, "Primary nameserver is required"),
  adminEmail: z.string().min(1, "Admin email is required"), // Format: admin.example.com.
  serial: z.string().optional(), // Backend can generate if empty
  refresh: z.string().optional(),
  retry: z.string().optional(),
  expire: z.string().optional(),
  minimumTtl: z.string().optional(),
});
export type SoaSettingsType = z.infer<typeof soaSettingsSchema>;

/**
 * Zone Schema
 */
export const zoneSchema = z.object({
  id: z.string().uuid().optional(),
  zoneName: z.string().min(1, { message: 'Zone name is required' }),
  zoneType: z.enum(['master', 'slave', 'forward']),
  fileName: z.string().min(1, { message: 'File name is required' }), // Allow flexibility, backend validates existence/format
  allowUpdate: z.union([z.string(), z.array(z.string())]).optional().default('none'), // Default to 'none'
  soaSettings: soaSettingsSchema,
  records: z.array(dnsRecordSchema).default([]),
});
export type ZoneType = z.infer<typeof zoneSchema>;


/**
 * DNS Configuration Schema (Main)
 */
const StringOrStringArray = z.union([
  z.string().transform((val, ctx) => {
    if (typeof val === 'string') {
      return val.split(';').map(s => s.trim()).filter(Boolean);
    }
    // This case should ideally not be hit if Zod processes string first,
    // but as a fallback, if it's already an array (e.g. from default value), pass through.
    // However, Zod unions are processed in order, so string should be caught first.
    // For robustness, one might pre-process or ensure string type before this union.
    // Or, ensure default values are strings if this transform is to be consistently applied.
    // For now, assuming string input for transformation.
    // If default values are arrays, Zod might select the z.array(z.string()) path directly.
    // Let's simplify: if it's a string, transform. If it's already array, it's fine by z.array(z.string()).
    return val; // This transform is primarily for string inputs.
  }),
  z.array(z.string())
]);

export const dnsConfigurationSchema = z.object({
  dnsServerStatus: z.boolean().default(false),
  listenOn: StringOrStringArray.optional().default('127.0.0.1;'),
  allowQuery: StringOrStringArray.optional().default('localhost;'),
  allowRecursion: StringOrStringArray.optional().default('localhost;'),
  forwarders: StringOrStringArray.optional().default('8.8.8.8; 8.8.4.4;'),
  allowTransfer: StringOrStringArray.optional().default('none;'),
  
  zones: z.array(zoneSchema).min(1, { message: 'At least one zone is required' }),

  dnssecValidation: z.boolean().optional().default(true),
  queryLogging: z.boolean().optional().default(false),
});
export type DnsConfigurationType = z.infer<typeof dnsConfigurationSchema>;

// Re-exporting with original names for compatibility if they were used directly
// This is for backward compatibility if other files imported these exact names.
// Ideally, refactor to use DnsRecordType, ZoneType, DnsConfigurationType, SoaSettingsType.
export type DnsRecord = DnsRecordType;
export type Zone = ZoneType;
export type DnsConfiguration = DnsConfigurationType;
export type SoaSettings = SoaSettingsType;

// Helper function to parse string lists (like "8.8.8.8; 8.8.4.4;") - REMOVED as it's not used here and caused issues
// Create a custom refinement for string lists - REMOVED
// Helper functions for IP validation, priority, weight, port - REMOVED as they are not directly part of Zod schemas here or are embedded in superRefine
import { z } from 'zod';

// Helper validation functions
export const isNonEmptyString = (val: string | undefined): val is string =>
  val !== undefined && val.trim() !== '';

export const isNumeric = (val: string | undefined): val is string =>
  isNonEmptyString(val) && !isNaN(parseInt(val));

// Record types for the UI form
export const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'PTR', 'SRV'] as const;
export type UiRecordType = typeof RECORD_TYPES[number];

// Schema for DNS records in the UI form
export const dnsRecordUISchema = z.object({
  id: z.string().uuid(),
  type: z.enum(RECORD_TYPES),
  name: z.string().min(1, "Name is required"),
  value: z.string(),
  priority: z.string().optional(),
  weight: z.string().optional(),
  port: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.type === 'MX') {
    if (!isNonEmptyString(data.priority)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['priority'], message: 'Priority is required' });
    } else if (!isNumeric(data.priority)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['priority'], message: 'Priority must be a number' });
    }
    if (!isNonEmptyString(data.value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['value'], message: 'Value (mail server hostname) is required' });
    }
  } else if (data.type === 'SRV') {
    if (!isNonEmptyString(data.priority)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['priority'], message: 'Priority is required' });
    } else if (!isNumeric(data.priority)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['priority'], message: 'Priority must be a number' });
    }
    if (!isNonEmptyString(data.weight)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['weight'], message: 'Weight is required' });
    } else if (!isNumeric(data.weight)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['weight'], message: 'Weight must be a number' });
    }
    if (!isNonEmptyString(data.port)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['port'], message: 'Port is required' });
    } else if (!isNumeric(data.port)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['port'], message: 'Port must be a number' });
    }
    if (!isNonEmptyString(data.value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['value'], message: 'Target is required (in value field)' });
    }
  } else if (['A', 'AAAA', 'CNAME', 'TXT', 'NS', 'PTR'].includes(data.type)) {
    if (!isNonEmptyString(data.value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['value'], message: 'Value is required for this record type' });
    }
  }
});

// Schema for zone configuration in the UI form
export const zoneSchema = z.object({
  id: z.string().uuid(),
  zoneName: z.string().min(1, "Zone name is required"),
  zoneType: z.enum(['master', 'slave', 'forward']),
  fileName: z.string().min(1, "File name is required"),
  allowUpdate: z.string(),
  records: z.array(dnsRecordUISchema),
});

// Schema for the entire DNS configuration form
export const dnsConfigSchema = z.object({
  dnsServerStatus: z.boolean(),
  listenOn: z.string(),
  allowQuery: z.string(),
  allowRecursion: z.string(),
  forwarders: z.string(),
  allowTransfer: z.string(),
  zones: z.array(zoneSchema),
}); 
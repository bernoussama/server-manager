// This file re-exports the validators needed by DNSConfig

// Define record type constants manually
export const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'PTR', 'SRV'] as const;
export type UiRecordType = typeof RECORD_TYPES[number];

// Define validation functions
export const isNonEmptyString = (val: string | undefined): val is string =>
  val !== undefined && val.trim() !== '';

export const isNumeric = (val: string | undefined): val is string =>
  isNonEmptyString(val) && !isNaN(parseInt(val));

// Import zod
import { z } from 'zod';

// Define schemas
export const soaSettingsSchema = z.object({
  ttl: z.string().min(1, "TTL is required"),
  primaryNameserver: z.string().min(1, "Primary nameserver is required"),
  adminEmail: z.string().min(1, "Admin email is required"),
  serial: z.string().min(1, "Serial is required"),
  refresh: z.string().min(1, "Refresh is required"),
  retry: z.string().min(1, "Retry is required"),
  expire: z.string().min(1, "Expire is required"),
  minimumTtl: z.string().min(1, "Minimum TTL is required"),
});

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

export const zoneSchema = z.object({
  id: z.string().uuid(),
  zoneName: z.string().min(1, "Zone name is required"),
  zoneType: z.enum(['master', 'slave', 'forward']),
  fileName: z.string().min(1, "File name is required"),
  allowUpdate: z.string(),
  soaSettings: soaSettingsSchema,
  records: z.array(dnsRecordUISchema),
});

export const dnsConfigSchema = z.object({
  dnsServerStatus: z.boolean(),
  listenOn: z.string(),
  allowQuery: z.string(),
  allowRecursion: z.string(),
  forwarders: z.string(),
  allowTransfer: z.string(),
  zones: z.array(zoneSchema),
});

// Transform functions
import { DnsRecord, DnsRecordType, MxDnsRecord, SrvDnsRecord, BaseDnsRecord } from '@server-manager/shared';

export const transformUiRecordToApiRecord = (uiRec: {
  id: string;
  type: DnsRecordType;
  name: string;
  value: string;
  priority?: string;
  weight?: string;
  port?: string;
}): DnsRecord => {
  const baseApiRecord = {
    id: uiRec.id,
    type: uiRec.type as DnsRecordType,
    name: uiRec.name,
  };

  if (uiRec.type === 'MX') {
    const mxRecord: MxDnsRecord = {
      ...baseApiRecord,
      type: 'MX',
      value: uiRec.value,
      priority: parseInt(uiRec.priority!, 10),
    };
    return mxRecord;
  }

  if (uiRec.type === 'SRV') {
    const srvRecord: SrvDnsRecord = {
      ...baseApiRecord,
      type: 'SRV',
      priority: parseInt(uiRec.priority!, 10),
      weight: parseInt(uiRec.weight!, 10),
      port: parseInt(uiRec.port!, 10),
      target: uiRec.value,
    };
    return srvRecord;
  }

  return {
    ...baseApiRecord,
    value: uiRec.value,
  } as BaseDnsRecord & { type: Exclude<DnsRecordType, 'MX' | 'SRV' | 'SOA'> };
};

export const parseStringToArray = (input: string): string[] => {
  return input.split(';')
    .map(item => item.trim())
    .filter(item => item.length > 0);
};

export const transformFormToApiData = (formData: any) => {
  return {
    dnsServerStatus: formData.dnsServerStatus,
    listenOn: parseStringToArray(formData.listenOn),
    allowQuery: parseStringToArray(formData.allowQuery),
    allowRecursion: parseStringToArray(formData.allowRecursion),
    forwarders: parseStringToArray(formData.forwarders),
    allowTransfer: parseStringToArray(formData.allowTransfer),
    zones: formData.zones.map((zone: any) => ({
      id: zone.id,
      zoneName: zone.zoneName,
      zoneType: zone.zoneType,
      fileName: zone.fileName,
      allowUpdate: parseStringToArray(zone.allowUpdate),
      soaSettings: zone.soaSettings,
      records: zone.records.map(transformUiRecordToApiRecord)
    }))
  };
}; 
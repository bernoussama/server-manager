import { z } from 'zod';

const genericRecord = z.object({
  name: z.string().min(1, { message: 'Record name is required' }),
  ttl: z.number().int().nonnegative().optional().default(3600),
  comment: z.string().optional(),
});

const aaaaLike = genericRecord.extend({
  type: z.enum(['A', 'AAAA', 'CNAME', 'TXT', 'NS', 'PTR']),
  value: z.string().min(1),
});

const mxRecord = genericRecord.extend({
  type: z.literal('MX'),
  value: z.string().min(1),
  priority: z.number().int().nonnegative(),
});

const srvRecord = genericRecord.extend({
  type: z.literal('SRV'),
  priority: z.number().int().nonnegative(),
  weight: z.number().int().nonnegative(),
  port: z.number().int().min(1).max(65535),
  target: z.string().min(1),
});

const soaRecord = genericRecord.extend({
  type: z.literal('SOA'),
  primary: z.string().min(1),
  admin: z.string().email(),
  serial: z.number().int().positive(),
  refresh: z.number().int().positive(),
  retry: z.number().int().positive(),
  expire: z.number().int().positive(),
  minimum: z.number().int().nonnegative(),
});

const dnsRecordSchema = z.discriminatedUnion('type', [
  aaaaLike,
  mxRecord,
  srvRecord,
  soaRecord,
]);

export const dnsConfigurationSchema = z.object({
  // Server Configuration
  dnsServerStatus: z.boolean().default(false),
  listenOn: z.array(z.string().ip({ version: 'v4' })).default(['127.0.0.1']),
  allowQuery: z.array(z.string()).default(['localhost', '127.0.0.1']),
  allowRecursion: z.array(z.string()).default(['localhost', 'localnets', 'local']),
  forwarders: z.array(z.string().ip({ version: 'v4' })).optional(),
  
  // Zone Configuration
  domainName: z.string().min(1, { message: 'Domain name is required' }),
  primaryNameserver: z.string().min(1, { message: 'Primary nameserver is required' }),
  adminEmail: z.string().email().default('admin@example.com'),
  
  // Zone Records
  records: z.array(dnsRecordSchema).default([]),
  
  // Advanced Options
  forwardOnly: z.boolean().default(false),
  dnssecValidation: z.boolean().default(true),
  queryLogging: z.boolean().default(false),
  
  // Zone Transfer
  allowTransfer: z.array(z.string()).default(['none']),
  allowUpdate: z.array(z.string()).default(['none']),
  
  // Performance
  maxCacheTtl: z.number().int().positive().default(604800), // 1 week
  maxNcacheTtl: z.number().int().positive().default(10800), // 3 hours
  
  // Logging
  logFile: z.string().default('/var/log/named/named.log'),
  logLevel: z.enum(['critical', 'error', 'warning', 'notice', 'info', 'debug']).default('error'),
});

export type DnsConfiguration = z.infer<typeof dnsConfigurationSchema>;
export type DnsRecord = z.infer<typeof dnsRecordSchema>;
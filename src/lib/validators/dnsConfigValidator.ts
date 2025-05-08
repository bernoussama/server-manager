import { z } from 'zod';

const dnsRecordSchema = z.object({
  type: z.string().min(1, { message: 'Record type is required' }), // e.g., A, CNAME, MX, TXT
  name: z.string().min(1, { message: 'Record name is required' }), // e.g., @, www, mail
  value: z.string().min(1, { message: 'Record value is required' }), // e.g., IP address, hostname
  // ttl: z.number().int().positive().optional(), // Optional: Time To Live
  // priority: z.number().int().positive().optional(), // Optional: MX record priority
});

export const dnsConfigurationSchema = z.object({
  dnsServerStatus: z.boolean(),
  domainName: z.string().min(1, { message: 'Domain name is required' }),
  primaryNameserver: z.string().min(1, { message: 'Primary nameserver is required' }),
  records: z.array(dnsRecordSchema),
});

export type DnsConfiguration = z.infer<typeof dnsConfigurationSchema>;
export type DnsRecord = z.infer<typeof dnsRecordSchema>; 
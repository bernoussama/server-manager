// Corresponds to DnsRecord in the backend (src/lib/validators/dnsConfigValidator.ts)
export interface DnsRecordFormValues {
  type: string; // e.g., A, CNAME, MX, TXT
  name: string; // e.g., @, www, mail
  value: string; // e.g., IP address, hostname, or "priority exchange" for MX
  // ttl?: number; // Optional: Time To Live - not in current backend validator but good for future
  // priority?: number; // Optional: MX record priority - handled via value string for now
}

// Corresponds to DnsConfiguration in the backend
export interface DnsConfigurationFormValues {
  dnsServerStatus: boolean;
  domainName: string;
  primaryNameserver: string;
  records: DnsRecordFormValues[];
}

// For API responses
export interface DnsUpdateResponse {
  message: string;
  data?: DnsConfigurationFormValues; // Optional: backend might return the confirmed data
  errors?: Array<{ path: (string | number)[]; message: string }>; // For Zod validation errors
} 
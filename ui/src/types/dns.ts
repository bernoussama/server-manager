// DNS Record Types
export type DnsRecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'PTR' | 'SOA' | 'SRV';

// Base DNS Record Interface
export interface BaseDnsRecord {
  id?: string;
  type: DnsRecordType;
  name: string;
  value: string;
  ttl?: number;
  comment?: string;
}

// Specialized Record Types
export interface MxDnsRecord extends BaseDnsRecord {
  type: 'MX';
  priority: number;
}

export interface SrvDnsRecord extends Omit<BaseDnsRecord, 'value'> {
   type: 'SRV';
   priority: number;
   weight: number;
   port: number;
   target: string;
 }

export interface SoaDnsRecord extends BaseDnsRecord {
  type: 'SOA';
  primary: string;
  admin: string;
  serial: number;
  refresh: number;
  retry: number;
  expire: number;
  minimum: number;
}

// Union type for all possible record types
export type DnsRecord =
  // All generic records except the ones that have stricter shapes
  | (BaseDnsRecord & { type: Exclude<DnsRecordType, 'MX' | 'SRV' | 'SOA'> })
  | MxDnsRecord
  | SrvDnsRecord
  | SoaDnsRecord;

// DNS Server Configuration
export interface DnsServerConfig {
  // Server Status
  dnsServerStatus: boolean;
  
  // Network Settings
  listenOn?: string[];
  allowQuery?: string[];
  allowRecursion?: string[];
  forwarders?: string[];
  forwardOnly?: boolean;
  
  // DNSSEC
  dnssecValidation?: boolean;
  
  // Logging
  queryLogging?: boolean;
  logFile?: string;
  logLevel?: 'critical' | 'error' | 'warning' | 'notice' | 'info' | 'debug';
  
  // Performance
  maxCacheTtl?: number;
  maxNcacheTtl?: number;
  
  // Zone Transfer
  allowTransfer?: string[];
  allowUpdate?: string[];
}

// DNS Zone Configuration
export interface DnsZoneConfig {
  domainName: string;
  primaryNameserver: string;
  adminEmail?: string;
  records: DnsRecord[];
}

// Combined DNS Configuration
export interface DnsConfiguration extends DnsServerConfig, DnsZoneConfig {}

// Form Values (for the UI)
export interface DnsConfigurationFormValues extends Omit<DnsConfiguration, 'records'> {
  records: (DnsRecord & { id?: string })[];
}

// API Response Types
export interface DnsUpdateResponse {
  success: boolean;
  message: string;
  data?: DnsConfiguration;
  errors?: Array<{
    path: (string | number)[];
    message: string;
  }>;
}

// Helper type for form field props
export type DnsRecordFieldProps<T extends DnsRecord> = {
  record: T;
  onChange: (record: T) => void;
  onRemove?: () => void;
  isNew?: boolean;
}
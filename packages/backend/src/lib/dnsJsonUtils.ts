import { DnsConfiguration, Zone, DnsRecord } from '@server-manager/shared/validators';
import logger from './logger';

/**
 * JSON representation of a DNS record for human-readable storage
 */
export interface DnsRecordJson {
  id?: string;
  type: string;
  name: string;
  value: string;
  priority?: number | string;
  weight?: number | string;
  port?: number | string;
  ttl?: number;
  createdAt?: string;
  lastModified?: string;
}

/**
 * JSON representation of a DNS zone for human-readable storage
 */
export interface ZoneJson {
  id?: string;
  zoneName: string;
  zoneType: string;
  fileName: string;
  allowUpdate: string | string[];
  records: DnsRecordJson[];
  createdAt?: string;
  lastModified?: string;
  serialNumber?: number;
}

/**
 * JSON representation of DNS configuration for human-readable storage
 */
export interface DnsConfigurationJson {
  dnsServerStatus: boolean;
  listenOn: string | string[];
  allowQuery: string | string[];
  allowRecursion: string | string[];
  forwarders: string | string[];
  allowTransfer: string | string[];
  zones: ZoneJson[];
  dnssecValidation?: boolean;
  queryLogging?: boolean;
  createdAt?: string;
  lastModified?: string;
  version?: string;
}

/**
 * Convert a DNS record object to JSON format
 */
export const dnsRecordToJson = (record: DnsRecord): DnsRecordJson => {
  const jsonRecord: DnsRecordJson = {
    id: record.id,
    type: record.type,
    name: record.name,
    value: record.value,
    lastModified: new Date().toISOString(),
  };

  // Only include optional fields if they have values
  if (record.priority !== undefined && record.priority !== '') {
    jsonRecord.priority = record.priority;
  }
  
  if (record.weight !== undefined && record.weight !== '') {
    jsonRecord.weight = record.weight;
  }
  
  if (record.port !== undefined && record.port !== '') {
    jsonRecord.port = record.port;
  }
  
  if (record.ttl !== undefined) {
    jsonRecord.ttl = record.ttl;
  }

  return jsonRecord;
};

/**
 * Convert a DNS zone object to JSON format
 */
export const zoneToJson = (zone: Zone): ZoneJson => {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  const serialNumber = parseInt(`${year}${month}${day}01`);

  const jsonZone: ZoneJson = {
    id: zone.id,
    zoneName: zone.zoneName,
    zoneType: zone.zoneType,
    fileName: zone.fileName,
    allowUpdate: zone.allowUpdate,
    records: zone.records.map(record => dnsRecordToJson(record)),
    lastModified: new Date().toISOString(),
    serialNumber,
  };

  return jsonZone;
};

/**
 * Convert a DNS configuration object to JSON format
 */
export const dnsConfigurationToJson = (config: DnsConfiguration): DnsConfigurationJson => {
  const jsonConfig: DnsConfigurationJson = {
    dnsServerStatus: config.dnsServerStatus,
    listenOn: config.listenOn,
    allowQuery: config.allowQuery,
    allowRecursion: config.allowRecursion,
    forwarders: config.forwarders,
    allowTransfer: config.allowTransfer,
    zones: config.zones.map(zone => zoneToJson(zone)),
    dnssecValidation: config.dnssecValidation,
    queryLogging: config.queryLogging,
    lastModified: new Date().toISOString(),
    version: '1.0',
  };

  return jsonConfig;
};

/**
 * Generate formatted JSON string for a DNS record
 */
export const formatDnsRecordJson = (record: DnsRecord): string => {
  try {
    const jsonRecord = dnsRecordToJson(record);
    return JSON.stringify(jsonRecord, null, 2);
  } catch (error) {
    logger.error('Error formatting DNS record to JSON:', error);
    throw new Error(`Failed to format DNS record to JSON: ${(error as Error).message}`);
  }
};

/**
 * Generate formatted JSON string for a DNS zone
 */
export const formatZoneJson = (zone: Zone): string => {
  try {
    const jsonZone = zoneToJson(zone);
    return JSON.stringify(jsonZone, null, 2);
  } catch (error) {
    logger.error('Error formatting zone to JSON:', error);
    throw new Error(`Failed to format zone to JSON: ${(error as Error).message}`);
  }
};

/**
 * Generate formatted JSON string for DNS configuration
 */
export const formatDnsConfigurationJson = (config: DnsConfiguration): string => {
  try {
    const jsonConfig = dnsConfigurationToJson(config);
    return JSON.stringify(jsonConfig, null, 2);
  } catch (error) {
    logger.error('Error formatting DNS configuration to JSON:', error);
    throw new Error(`Failed to format DNS configuration to JSON: ${(error as Error).message}`);
  }
};

/**
 * Generate JSON representation of named.conf-style configuration
 */
export const generateNamedConfJson = (config: DnsConfiguration): string => {
  try {
    const namedConfData = {
      options: {
        directory: '/var/named',
        listenOn: config.listenOn,
        allowQuery: config.allowQuery,
        allowRecursion: config.allowRecursion,
        forwarders: config.forwarders,
        dnssecValidation: config.dnssecValidation,
        recursion: true,
      },
      zones: config.zones.map(zone => ({
        name: zone.zoneName,
        type: zone.zoneType,
        file: zone.fileName,
        allowUpdate: zone.allowUpdate,
      })),
      lastModified: new Date().toISOString(),
      version: '1.0',
    };

    return JSON.stringify(namedConfData, null, 2);
  } catch (error) {
    logger.error('Error generating named.conf JSON:', error);
    throw new Error(`Failed to generate named.conf JSON: ${(error as Error).message}`);
  }
};

/**
 * Generate JSON representation of zone configuration file
 */
export const generateZoneConfJson = (config: DnsConfiguration): string => {
  try {
    const zoneConfData = {
      zones: config.zones.map(zone => ({
        name: zone.zoneName,
        type: zone.zoneType,
        file: zone.fileName,
        allowUpdate: zone.allowUpdate,
      })),
      lastModified: new Date().toISOString(),
      version: '1.0',
    };

    return JSON.stringify(zoneConfData, null, 2);
  } catch (error) {
    logger.error('Error generating zone conf JSON:', error);
    throw new Error(`Failed to generate zone conf JSON: ${(error as Error).message}`);
  }
};

/**
 * Convert a JSON DNS record back to internal format
 */
export const jsonToDnsRecord = (jsonRecord: DnsRecordJson): DnsRecord => {
  const record: DnsRecord = {
    id: jsonRecord.id || '',
    type: jsonRecord.type as any,
    name: jsonRecord.name,
    value: jsonRecord.value,
    priority: jsonRecord.priority?.toString() || '',
    weight: jsonRecord.weight?.toString() || '',
    port: jsonRecord.port?.toString() || '',
    ttl: jsonRecord.ttl,
  };

  return record;
};

/**
 * Convert a JSON zone back to internal format
 */
export const jsonToZone = (jsonZone: ZoneJson): Zone => {
  const ensureStringArray = (value: string | string[]): string => {
    if (Array.isArray(value)) {
      return value.join('; ');
    }
    return value || '';
  };

  const zone: Zone = {
    id: jsonZone.id || '',
    zoneName: jsonZone.zoneName,
    zoneType: jsonZone.zoneType as any,
    fileName: jsonZone.fileName,
    allowUpdate: ensureStringArray(jsonZone.allowUpdate),
    records: jsonZone.records.map(record => jsonToDnsRecord(record)),
  };

  return zone;
};

/**
 * Convert arrays to semicolon-separated strings for UI consumption
 */
export const arrayToSemicolonString = (value: string | string[]): string => {
  if (Array.isArray(value)) {
    return value.join('; ');
  }
  return value || '';
};

/**
 * Convert JSON DNS configuration back to internal format for UI
 */
export const jsonToDnsConfiguration = (jsonConfig: DnsConfigurationJson): DnsConfiguration => {
  const config: DnsConfiguration = {
    dnsServerStatus: jsonConfig.dnsServerStatus,
    listenOn: arrayToSemicolonString(jsonConfig.listenOn),
    allowQuery: arrayToSemicolonString(jsonConfig.allowQuery),
    allowRecursion: arrayToSemicolonString(jsonConfig.allowRecursion),
    forwarders: arrayToSemicolonString(jsonConfig.forwarders),
    allowTransfer: arrayToSemicolonString(jsonConfig.allowTransfer),
    dnssecValidation: jsonConfig.dnssecValidation || false,
    queryLogging: jsonConfig.queryLogging || false,
    zones: jsonConfig.zones.map(zone => jsonToZone(zone)),
  };

  return config;
}; 
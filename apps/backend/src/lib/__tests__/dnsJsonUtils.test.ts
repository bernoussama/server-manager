import {
  dnsRecordToJson,
  zoneToJson,
  dnsConfigurationToJson,
  formatDnsRecordJson,
  formatZoneJson,
  formatDnsConfigurationJson,
  generateNamedConfJson,
  generateZoneConfJson,
} from '../dnsJsonUtils';
import type { DnsConfiguration, Zone, DnsRecord } from '@server-manager/shared/validators';

describe('DNS JSON Utils', () => {
  const mockDnsRecord: DnsRecord = {
    id: 'test-record-id',
    type: 'A',
    name: '@',
    value: '192.168.1.100',
    priority: undefined,
    weight: undefined,
    port: undefined,
    ttl: 3600,
  };

  const mockMXRecord: DnsRecord = {
    id: 'test-mx-id',
    type: 'MX',
    name: '@',
    value: 'mail.example.com',
    priority: 10,
    weight: undefined,
    port: undefined,
  };

  const mockZone: Zone = {
    id: 'test-zone-id',
    zoneName: 'example.com',
    zoneType: 'master',
    fileName: 'example.com.zone',
    allowUpdate: 'none',
    records: [mockDnsRecord, mockMXRecord],
  };

  const mockDnsConfig: DnsConfiguration = {
    dnsServerStatus: true,
    listenOn: '127.0.0.1',
    allowQuery: 'localhost',
    allowRecursion: 'localhost',
    forwarders: '8.8.8.8; 8.8.4.4',
    allowTransfer: '',
    zones: [mockZone],
    dnssecValidation: true,
    queryLogging: false,
  };

  describe('dnsRecordToJson', () => {
    it('should convert a DNS record to JSON format', () => {
      const result = dnsRecordToJson(mockDnsRecord);
      
      expect(result.id).toBe('test-record-id');
      expect(result.type).toBe('A');
      expect(result.name).toBe('@');
      expect(result.value).toBe('192.168.1.100');
      expect(result.ttl).toBe(3600);
      expect(result.lastModified).toBeDefined();
      
      // Should not include undefined optional fields
      expect(result.priority).toBeUndefined();
      expect(result.weight).toBeUndefined();
      expect(result.port).toBeUndefined();
    });

    it('should include optional fields when they have values', () => {
      const result = dnsRecordToJson(mockMXRecord);
      
      expect(result.priority).toBe(10);
      expect(result.weight).toBeUndefined();
      expect(result.port).toBeUndefined();
    });
  });

  describe('zoneToJson', () => {
    it('should convert a zone to JSON format', () => {
      const result = zoneToJson(mockZone);
      
      expect(result.id).toBe('test-zone-id');
      expect(result.zoneName).toBe('example.com');
      expect(result.zoneType).toBe('master');
      expect(result.fileName).toBe('example.com.zone');
      expect(result.allowUpdate).toBe('none');
      expect(result.records).toHaveLength(2);
      expect(result.lastModified).toBeDefined();
      expect(result.serialNumber).toBeDefined();
      expect(result.serialNumber).toBeGreaterThan(20240000);
    });
  });

  describe('dnsConfigurationToJson', () => {
    it('should convert DNS configuration to JSON format', () => {
      const result = dnsConfigurationToJson(mockDnsConfig);
      
      expect(result.dnsServerStatus).toBe(true);
      expect(result.listenOn).toBe('127.0.0.1');
      expect(result.allowQuery).toBe('localhost');
      expect(result.allowRecursion).toBe('localhost');
      expect(result.forwarders).toBe('8.8.8.8; 8.8.4.4');
      expect(result.allowTransfer).toBe('');
      expect(result.zones).toHaveLength(1);
      expect(result.dnssecValidation).toBe(true);
      expect(result.queryLogging).toBe(false);
      expect(result.lastModified).toBeDefined();
      expect(result.version).toBe('1.0');
    });
  });

  describe('formatDnsRecordJson', () => {
    it('should format DNS record as JSON string', () => {
      const result = formatDnsRecordJson(mockDnsRecord);
      
      expect(typeof result).toBe('string');
      expect(result).toContain('"type": "A"');
      expect(result).toContain('"value": "192.168.1.100"');
      
      // Should be valid JSON
      const parsed = JSON.parse(result);
      expect(parsed.type).toBe('A');
    });
  });

  describe('formatZoneJson', () => {
    it('should format zone as JSON string', () => {
      const result = formatZoneJson(mockZone);
      
      expect(typeof result).toBe('string');
      expect(result).toContain('"zoneName": "example.com"');
      expect(result).toContain('"zoneType": "master"');
      
      // Should be valid JSON
      const parsed = JSON.parse(result);
      expect(parsed.zoneName).toBe('example.com');
    });
  });

  describe('formatDnsConfigurationJson', () => {
    it('should format DNS configuration as JSON string', () => {
      const result = formatDnsConfigurationJson(mockDnsConfig);
      
      expect(typeof result).toBe('string');
      expect(result).toContain('"dnsServerStatus": true');
      expect(result).toContain('"listenOn": "127.0.0.1"');
      
      // Should be valid JSON
      const parsed = JSON.parse(result);
      expect(parsed.dnsServerStatus).toBe(true);
    });
  });

  describe('generateNamedConfJson', () => {
    it('should generate named.conf style JSON', () => {
      const result = generateNamedConfJson(mockDnsConfig);
      
      expect(typeof result).toBe('string');
      
      // Should be valid JSON
      const parsed = JSON.parse(result);
      expect(parsed.options).toBeDefined();
      expect(parsed.options.directory).toBe('/var/named');
      expect(parsed.options.listenOn).toBe('127.0.0.1');
      expect(parsed.zones).toHaveLength(1);
      expect(parsed.zones[0].name).toBe('example.com');
      expect(parsed.lastModified).toBeDefined();
      expect(parsed.version).toBe('1.0');
    });
  });

  describe('generateZoneConfJson', () => {
    it('should generate zone configuration JSON', () => {
      const result = generateZoneConfJson(mockDnsConfig);
      
      expect(typeof result).toBe('string');
      
      // Should be valid JSON
      const parsed = JSON.parse(result);
      expect(parsed.zones).toHaveLength(1);
      expect(parsed.zones[0].name).toBe('example.com');
      expect(parsed.zones[0].type).toBe('master');
      expect(parsed.zones[0].file).toBe('example.com.zone');
      expect(parsed.lastModified).toBeDefined();
      expect(parsed.version).toBe('1.0');
    });
  });
}); 
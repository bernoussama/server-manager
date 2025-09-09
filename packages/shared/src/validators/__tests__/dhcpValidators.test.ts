import { 
  isValidIpAddress, 
  isValidMacAddress, 
  isValidNetmask, 
  isValidHostname, 
  isValidDomainName,
  isValidLeaseTime,
  isIpInNetwork,
  isValidIpRange,
  dhcpConfigSchema,
  subnetSchema,
  hostReservationSchema
} from '../dhcpFormValidator';

import {
  transformDhcpFormToApi,
  transformDhcpApiToForm,
  generateDefaultDhcpConfig,
  calculateBroadcastAddress,
  suggestIpRange
} from '../dhcpTransformers';

import type { DhcpConfigFormValues } from '../dhcpFormValidator';

describe('DHCP Validators', () => {
  describe('isValidIpAddress', () => {
    it('should validate correct IP addresses', () => {
      expect(isValidIpAddress('192.168.1.1')).toBe(true);
      expect(isValidIpAddress('10.0.0.1')).toBe(true);
      expect(isValidIpAddress('172.16.254.1')).toBe(true);
      expect(isValidIpAddress('8.8.8.8')).toBe(true);
    });

    it('should reject invalid IP addresses', () => {
      expect(isValidIpAddress('256.1.1.1')).toBe(false);
      expect(isValidIpAddress('192.168.1')).toBe(false);
      expect(isValidIpAddress('192.168.1.1.1')).toBe(false);
      expect(isValidIpAddress('not.an.ip')).toBe(false);
      expect(isValidIpAddress('')).toBe(false);
    });
  });

  describe('isValidMacAddress', () => {
    it('should validate correct MAC addresses', () => {
      expect(isValidMacAddress('00:11:22:33:44:55')).toBe(true);
      expect(isValidMacAddress('AA:BB:CC:DD:EE:FF')).toBe(true);
      expect(isValidMacAddress('00-11-22-33-44-55')).toBe(true);
      expect(isValidMacAddress('aa:bb:cc:dd:ee:ff')).toBe(true);
    });

    it('should reject invalid MAC addresses', () => {
      expect(isValidMacAddress('00:11:22:33:44')).toBe(false);
      expect(isValidMacAddress('00:11:22:33:44:55:66')).toBe(false);
      expect(isValidMacAddress('GG:11:22:33:44:55')).toBe(false);
      expect(isValidMacAddress('001122334455')).toBe(false);
      expect(isValidMacAddress('')).toBe(false);
    });
  });

  describe('isValidNetmask', () => {
    it('should validate correct subnet masks', () => {
      expect(isValidNetmask('255.255.255.0')).toBe(true);
      expect(isValidNetmask('255.255.0.0')).toBe(true);
      expect(isValidNetmask('255.0.0.0')).toBe(true);
      expect(isValidNetmask('255.255.252.0')).toBe(true);
    });

    it('should reject invalid subnet masks', () => {
      expect(isValidNetmask('255.255.255.1')).toBe(false); // Not contiguous
      expect(isValidNetmask('255.254.255.0')).toBe(false); // Not contiguous
      expect(isValidNetmask('256.255.255.0')).toBe(false); // Invalid IP
      expect(isValidNetmask('255.255.255')).toBe(false); // Invalid format
    });
  });

  describe('isValidHostname', () => {
    it('should validate correct hostnames', () => {
      expect(isValidHostname('server1')).toBe(true);
      expect(isValidHostname('web-server')).toBe(true);
      expect(isValidHostname('DB1')).toBe(true);
      expect(isValidHostname('host123')).toBe(true);
    });

    it('should reject invalid hostnames', () => {
      expect(isValidHostname('-server')).toBe(false); // Can't start with -
      expect(isValidHostname('server-')).toBe(false); // Can't end with -
      expect(isValidHostname('server.example')).toBe(false); // No dots in hostname
      expect(isValidHostname('')).toBe(false);
    });
  });

  describe('isIpInNetwork', () => {
    it('should correctly identify IPs in network', () => {
      expect(isIpInNetwork('192.168.1.100', '192.168.1.0', '255.255.255.0')).toBe(true);
      expect(isIpInNetwork('192.168.1.254', '192.168.1.0', '255.255.255.0')).toBe(true);
      expect(isIpInNetwork('10.0.0.1', '10.0.0.0', '255.0.0.0')).toBe(true);
    });

    it('should correctly identify IPs not in network', () => {
      expect(isIpInNetwork('192.168.2.1', '192.168.1.0', '255.255.255.0')).toBe(false);
      expect(isIpInNetwork('172.16.1.1', '192.168.1.0', '255.255.255.0')).toBe(false);
    });
  });
});

describe('DHCP Transformers', () => {
  describe('generateDefaultDhcpConfig', () => {
    it('should generate a valid default configuration', () => {
      const config = generateDefaultDhcpConfig();
      
      expect(config.dhcpServerStatus).toBe(false);
      expect(config.domainName).toBe('local');
      expect(config.domainNameServers).toEqual(['8.8.8.8', '8.8.4.4']);
      expect(config.defaultLeaseTime).toBe(86400);
      expect(config.maxLeaseTime).toBe(604800);
      expect(config.authoritative).toBe(true);
      expect(config.ddnsUpdateStyle).toBe('none');
      expect(config.subnets).toEqual([]);
      expect(config.hostReservations).toEqual([]);
      expect(config.globalOptions).toEqual([]);
    });
  });

  describe('calculateBroadcastAddress', () => {
    it('should calculate correct broadcast addresses', () => {
      expect(calculateBroadcastAddress('192.168.1.0', '255.255.255.0')).toBe('192.168.1.255');
      expect(calculateBroadcastAddress('10.0.0.0', '255.0.0.0')).toBe('10.255.255.255');
      expect(calculateBroadcastAddress('172.16.0.0', '255.255.0.0')).toBe('172.16.255.255');
    });
  });

  describe('suggestIpRange', () => {
    it('should suggest reasonable IP ranges', () => {
      const range = suggestIpRange('192.168.1.0', '255.255.255.0');
      
      expect(range.start).toBe('192.168.1.100');
      expect(range.end).toBe('192.168.1.200');
    });
  });

  describe('transformDhcpFormToApi and transformDhcpApiToForm', () => {
    it('should correctly transform form data to API and back', () => {
      const formData: DhcpConfigFormValues = {
        dhcpServerStatus: true,
        domainName: 'example.com',
        domainNameServers: '8.8.8.8, 1.1.1.1',
        defaultLeaseTime: '7200',
        maxLeaseTime: '86400',
        authoritative: true,
        ddnsUpdateStyle: 'none',
        subnets: [{
          id: 'test-subnet-1',
          network: '192.168.1.0',
          netmask: '255.255.255.0',
          rangeStart: '192.168.1.100',
          rangeEnd: '192.168.1.200',
          defaultGateway: '192.168.1.1',
          domainNameServers: '8.8.8.8, 1.1.1.1',
          broadcastAddress: '192.168.1.255',
          subnetMask: '255.255.255.0'
        }],
        hostReservations: [{
          id: 'test-host-1',
          hostname: 'printer1',
          macAddress: '00:11:22:33:44:55',
          fixedAddress: '192.168.1.10'
        }],
        globalOptions: [{
          id: 'test-option-1',
          name: 'time-offset',
          value: '3600'
        }]
      };

      // Transform to API format
      const apiData = transformDhcpFormToApi(formData);
      
      expect(apiData.dhcpServerStatus).toBe(true);
      expect(apiData.domainName).toBe('example.com');
      expect(apiData.domainNameServers).toEqual(['8.8.8.8', '1.1.1.1']);
      expect(apiData.defaultLeaseTime).toBe(7200);
      expect(apiData.maxLeaseTime).toBe(86400);
      expect(apiData.subnets).toHaveLength(1);
      expect(apiData.subnets[0].range?.start).toBe('192.168.1.100');
      expect(apiData.subnets[0].range?.end).toBe('192.168.1.200');
      expect(apiData.hostReservations).toHaveLength(1);
      expect(apiData.hostReservations[0].hostname).toBe('printer1');

      // Transform back to form format
      const backToForm = transformDhcpApiToForm(apiData);
      
      expect(backToForm.dhcpServerStatus).toBe(formData.dhcpServerStatus);
      expect(backToForm.domainName).toBe(formData.domainName);
      expect(backToForm.domainNameServers).toBe('8.8.8.8, 1.1.1.1');
      expect(backToForm.defaultLeaseTime).toBe(formData.defaultLeaseTime);
      expect(backToForm.maxLeaseTime).toBe(formData.maxLeaseTime);
      expect(backToForm.subnets).toHaveLength(1);
      expect(backToForm.hostReservations).toHaveLength(1);
      expect(backToForm.globalOptions).toHaveLength(1);
    });
  });
});

describe('DHCP Schemas', () => {
  describe('dhcpConfigSchema', () => {
    it('should validate a correct DHCP configuration', () => {
      const validConfig: DhcpConfigFormValues = {
        dhcpServerStatus: true,
        domainName: 'example.com',
        domainNameServers: '8.8.8.8, 1.1.1.1',
        defaultLeaseTime: '7200',
        maxLeaseTime: '86400',
        authoritative: true,
        ddnsUpdateStyle: 'none',
                 subnets: [{
           id: 'subnet-1',
           network: '192.168.1.0',
           netmask: '255.255.255.0',
           rangeStart: '192.168.1.100',
           rangeEnd: '192.168.1.200',
           defaultGateway: '192.168.1.1',
           domainNameServers: '8.8.8.8',
           broadcastAddress: '192.168.1.255',
           subnetMask: '255.255.255.0'
         }],
        hostReservations: [],
        globalOptions: []
      };

      const result = dhcpConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('should reject invalid configurations', () => {
      const invalidConfig = {
        dhcpServerStatus: true,
        domainName: '', // Invalid: empty domain name
        domainNameServers: 'invalid-ip',
        defaultLeaseTime: 'not-a-number',
        maxLeaseTime: '86400',
        authoritative: true,
        ddnsUpdateStyle: 'none',
        subnets: [], // Invalid: no subnets
        hostReservations: [],
        globalOptions: []
      };

      const result = dhcpConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });
  });
}); 
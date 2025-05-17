import { DnsConfiguration } from '../../lib/validators/dnsConfigValidator';

// We need to mock the constants before importing the controller
jest.mock('../../controllers/dnsController', () => {
  const originalModule = jest.requireActual('../../controllers/dnsController');
  return {
    ...originalModule,
    // Mock constants
    PRIMARY_NS_RECORD: 'ns1.dynamic.internal.',
    ADMIN_EMAIL_RECORD: 'admin.dynamic.internal.',
    ZONE_NAME: 'dynamic.internal.',
    DEFAULT_TTL: 3600,
  };
});

// Import after mocking
import { generateBindZoneContent } from '../../controllers/dnsController';

describe('DNS Controller - generateBindZoneContent', () => {
  // Helper function to get the current date in YYYYMMDD format for serial number validation
  const getCurrentDateSerial = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    return `${year}${month}${day}01`;
  };

  it('should generate a valid BIND zone file with SOA and NS records', () => {
    // Arrange
    const config: DnsConfiguration = {
      dnsServerStatus: true,
      domainName: 'dynamic.internal',
      primaryNameserver: 'ns1.dynamic.internal',
      records: []
    };

    // Act
    const result = generateBindZoneContent(config);

    // Assert
    expect(result).toContain('$TTL 3600');
    expect(result).toContain('@ IN SOA ns1.dynamic.internal. admin.dynamic.internal.');
    expect(result).toContain(getCurrentDateSerial()); // Check for today's serial
    expect(result).toContain('@ IN NS ns1.dynamic.internal.');
  });

  it('should correctly format A records', () => {
    // Arrange
    const config: DnsConfiguration = {
      dnsServerStatus: true,
      domainName: 'dynamic.internal',
      primaryNameserver: 'ns1.dynamic.internal',
      records: [
        { type: 'A', name: 'www', value: '192.168.1.10' },
        { type: 'A', name: 'mail', value: '192.168.1.20' }
      ]
    };

    // Act
    const result = generateBindZoneContent(config);

    // Assert
    expect(result).toContain('www IN A 192.168.1.10');
    expect(result).toContain('mail IN A 192.168.1.20');
  });

  it('should correctly format CNAME records with trailing dots', () => {
    // Arrange
    const config: DnsConfiguration = {
      dnsServerStatus: true,
      domainName: 'dynamic.internal',
      primaryNameserver: 'ns1.dynamic.internal',
      records: [
        { type: 'CNAME', name: 'www', value: 'webserver' },
        { type: 'CNAME', name: 'mail', value: 'mailserver.dynamic.internal.' }
      ]
    };

    // Act
    const result = generateBindZoneContent(config);

    // Assert
    expect(result).toContain('www IN CNAME webserver.');
    expect(result).toContain('mail IN CNAME mailserver.dynamic.internal.');
  });

  it('should correctly format MX records', () => {
    // Arrange
    const config: DnsConfiguration = {
      dnsServerStatus: true,
      domainName: 'dynamic.internal',
      primaryNameserver: 'ns1.dynamic.internal',
      records: [
        { type: 'MX', name: '@', value: '10 mail.dynamic.internal.' },
        { type: 'MX', name: '', value: '20 backup-mail.dynamic.internal' }
      ]
    };

    // Act
    const result = generateBindZoneContent(config);

    // Assert
    expect(result).toContain('@ IN MX 10 mail.dynamic.internal.');
    expect(result).toContain('@ IN MX 20 backup-mail.dynamic.internal.');
  });

  it('should correctly format TXT records with proper escaping', () => {
    // Arrange
    const config: DnsConfiguration = {
      dnsServerStatus: true,
      domainName: 'dynamic.internal',
      primaryNameserver: 'ns1.dynamic.internal',
      records: [
        { type: 'TXT', name: '@', value: 'v=spf1 ip4:192.168.1.0/24 -all' },
        { type: 'TXT', name: 'verification', value: 'domain-verification="abc123"' }
      ]
    };

    // Act
    const result = generateBindZoneContent(config);

    // Assert
    expect(result).toContain('@ IN TXT "v=spf1 ip4:192.168.1.0/24 -all"');
    expect(result).toContain('verification IN TXT "domain-verification=\\"abc123\\""');
  });

  it('should handle mixed record types correctly', () => {
    // Arrange
    const config: DnsConfiguration = {
      dnsServerStatus: true,
      domainName: 'dynamic.internal',
      primaryNameserver: 'ns1.dynamic.internal',
      records: [
        { type: 'A', name: 'www', value: '192.168.1.10' },
        { type: 'CNAME', name: 'app', value: 'www' },
        { type: 'MX', name: '@', value: '10 mail.dynamic.internal' },
        { type: 'TXT', name: '@', value: 'v=spf1 -all' }
      ]
    };

    // Act
    const result = generateBindZoneContent(config);

    // Assert
    expect(result).toContain('www IN A 192.168.1.10');
    expect(result).toContain('app IN CNAME www.');
    expect(result).toContain('@ IN MX 10 mail.dynamic.internal.');
    expect(result).toContain('@ IN TXT "v=spf1 -all"');
  });

  it('should handle case-insensitive record types', () => {
    // Arrange
    const config: DnsConfiguration = {
      dnsServerStatus: true,
      domainName: 'dynamic.internal',
      primaryNameserver: 'ns1.dynamic.internal',
      records: [
        { type: 'a', name: 'www', value: '192.168.1.10' },
        { type: 'cname', name: 'app', value: 'www' }
      ]
    };

    // Act
    const result = generateBindZoneContent(config);

    // Assert
    expect(result).toContain('www IN A 192.168.1.10');
    expect(result).toContain('app IN CNAME www.');
  });

  it('should skip malformed MX records', () => {
    // Arrange
    const config: DnsConfiguration = {
      dnsServerStatus: true,
      domainName: 'dynamic.internal',
      primaryNameserver: 'ns1.dynamic.internal',
      records: [
        { type: 'MX', name: '@', value: 'invalid-mx-format' },
        { type: 'MX', name: '@', value: '10 valid.example.com' }
      ]
    };
    
    // Mock console.warn to capture warnings
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    // Act
    const result = generateBindZoneContent(config);

    // Assert
    expect(result).not.toContain('@ IN MX invalid-mx-format');
    expect(result).toContain('@ IN MX 10 valid.example.com.');
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Skipping malformed MX record')
    );
    
    // Cleanup
    consoleWarnSpy.mockRestore();
  });

  it('should log warnings for unsupported record types', () => {
    // Arrange
    const config: DnsConfiguration = {
      dnsServerStatus: true,
      domainName: 'dynamic.internal',
      primaryNameserver: 'ns1.dynamic.internal',
      records: [
        { type: 'UNSUPPORTED', name: 'test', value: 'some-value' },
        { type: 'A', name: 'www', value: '192.168.1.10' }
      ]
    };
    
    // Mock console.warn to capture warnings
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    // Act
    const result = generateBindZoneContent(config);

    // Assert
    expect(result).toContain('www IN A 192.168.1.10');
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unsupported DNS record type')
    );
    
    // Cleanup
    consoleWarnSpy.mockRestore();
  });
});

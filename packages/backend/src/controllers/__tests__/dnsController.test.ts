import { Zone, DnsRecord } from '@server-manager/shared/validators';

// Mock filesystem and exec functions
jest.mock('fs/promises', () => ({
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue("mock content"),
  mkdir: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('child_process', () => ({
  exec: jest.fn((cmd, callback) => {
    if (callback) {
      callback(null, { stdout: "OK", stderr: "" });
    }
    return {
      stdout: "OK",
      stderr: ""
    };
  }),
}));

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
}));

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
    const zone: Zone = {
      id: '123',
      zoneName: 'example.com',
      zoneType: 'master',
      fileName: 'example.com.zone',
      allowUpdate: 'none',
      records: [
        { id: '456', type: 'NS', name: '@', value: 'ns1.example.com' }
      ]
    };

    // Act
    const result = generateBindZoneContent(zone);

    // Assert
    expect(result).toContain('$TTL 3600');
    expect(result).toContain('@ IN SOA ns1.example.com. admin.example.com.');
    expect(result).toContain(getCurrentDateSerial()); // Check for today's serial
    expect(result).toContain('@ IN NS ns1.example.com.');
  });

  it('should correctly format A records', () => {
    // Arrange
    const zone: Zone = {
      id: '123',
      zoneName: 'example.com',
      zoneType: 'master',
      fileName: 'example.com.zone',
      allowUpdate: 'none',
      records: [
        { id: '456', type: 'A', name: 'www', value: '192.168.1.10' },
        { id: '789', type: 'A', name: 'mail', value: '192.168.1.20' }
      ]
    };

    // Act
    const result = generateBindZoneContent(zone);

    // Assert
    expect(result).toContain('www IN A 192.168.1.10');
    expect(result).toContain('mail IN A 192.168.1.20');
  });

  it('should correctly format CNAME records with trailing dots', () => {
    // Arrange
    const zone: Zone = {
      id: '123',
      zoneName: 'example.com',
      zoneType: 'master',
      fileName: 'example.com.zone',
      allowUpdate: 'none',
      records: [
        { id: '456', type: 'CNAME', name: 'www', value: '@' },
        { id: '789', type: 'CNAME', name: 'mail', value: 'mailserver.example.com.' }
      ]
    };

    // Act
    const result = generateBindZoneContent(zone);

    // Assert
    expect(result).toContain('www IN CNAME @');
    expect(result).toContain('mail IN CNAME mailserver.example.com.');
  });

  it('should correctly format MX records', () => {
    // Arrange
    const zone: Zone = {
      id: '123',
      zoneName: 'example.com',
      zoneType: 'master',
      fileName: 'example.com.zone',
      allowUpdate: 'none',
      records: [
        { id: '456', type: 'MX', name: '@', value: 'mail.example.com', priority: '10' },
        { id: '789', type: 'MX', name: '@', value: 'backup-mail.example.com', priority: '20' }
      ]
    };

    // Act
    const result = generateBindZoneContent(zone);

    // Assert
    expect(result).toContain('@ IN MX 10 mail.example.com.');
    expect(result).toContain('@ IN MX 20 backup-mail.example.com.');
  });

  it('should correctly format TXT records with proper escaping', () => {
    // Arrange
    const zone: Zone = {
      id: '123',
      zoneName: 'example.com',
      zoneType: 'master',
      fileName: 'example.com.zone',
      allowUpdate: 'none',
      records: [
        { id: '456', type: 'TXT', name: '@', value: 'v=spf1 ip4:192.168.1.0/24 -all' },
        { id: '789', type: 'TXT', name: 'verification', value: 'domain-verification="abc123"' }
      ]
    };

    // Act
    const result = generateBindZoneContent(zone);

    // Assert
    expect(result).toContain('@ IN TXT "v=spf1 ip4:192.168.1.0/24 -all"');
    expect(result).toContain('verification IN TXT "domain-verification=\\"abc123\\""');
  });

  it('should handle PTR records correctly', () => {
    // Arrange
    const zone: Zone = {
      id: '123',
      zoneName: '1.168.192.in-addr.arpa',
      zoneType: 'master',
      fileName: 'reverse.example.com',
      allowUpdate: 'none',
      records: [
        { id: '456', type: 'PTR', name: '1', value: 'example.com' }
      ]
    };

    // Act
    const result = generateBindZoneContent(zone);

    // Assert
    expect(result).toContain('1 IN PTR example.com.');
  });

  it('should skip malformed MX records', () => {
    // Arrange
    const zone: Zone = {
      id: '123',
      zoneName: 'example.com',
      zoneType: 'master',
      fileName: 'example.com.zone',
      allowUpdate: 'none',
      records: [
        { id: '456', type: 'MX', name: '@', value: 'mail.example.com' }, // Missing priority
        { id: '789', type: 'MX', name: '@', value: 'valid.example.com', priority: '10' }
      ]
    };
    
    // Mock console.warn to capture warnings
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

    // Act
    const result = generateBindZoneContent(zone);

    // Assert
    expect(result).not.toContain('@ IN MX mail.example.com');
    expect(result).toContain('@ IN MX 10 valid.example.com.');
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Skipping malformed MX record')
    );
    
    // Cleanup
    consoleWarnSpy.mockRestore();
  });
});

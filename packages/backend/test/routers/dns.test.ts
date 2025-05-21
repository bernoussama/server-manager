import { dnsRouter } from '../../src/routers/dns';
import { TRPCError } from '@trpc/server';
import type { DnsConfigurationType } from '@server-manager/shared/validators/dnsConfigValidator';

// Mock dependencies
jest.mock('fs/promises', () => ({
  writeFile: jest.fn(),
  readFile: jest.fn(),
  mkdir: jest.fn(),
  stat: jest.fn(), // For checkWritePermission
}));
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  promises: { // fs.promises is used by checkWritePermission helper
    stat: jest.fn(),
    writeFile: jest.fn(), // for the temporary permission test file
    // No need for unlink/rm here as execAsync('rm ...') will be mocked via child_process
  },
}));
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));
jest.mock('../../src/lib/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

// Promisify exec for direct use if any helper relies on it being pre-promisified
// However, the router itself uses promisify(exec), so we mock exec from child_process directly.
// const util = require('util');
// jest.mock('util', () => ({
//   ...jest.requireActual('util'),
//   promisify: jest.fn(fn => fn), // Makes exec directly mockable
// }));


import { writeFile, readFile, mkdir, stat as statAsync } from 'fs/promises';
import { existsSync, promises as fsPromises } from 'fs';
import { exec } from 'child_process';

const mockedWriteFile = writeFile as jest.Mock;
const mockedReadFile = readFile as jest.Mock;
const mockedMkdir = mkdir as jest.Mock;
const mockedExistsSync = existsSync as jest.Mock;
const mockedExec = exec as unknown as jest.Mock; // Cast to jest.Mock
const mockedFsPromisesStat = fsPromises.stat as jest.Mock;
const mockedFsPromisesWriteFile = fsPromises.writeFile as jest.Mock;


// Store original process.env.NODE_ENV
const originalNodeEnv = process.env.NODE_ENV;

// Create a caller for the dns router
const caller = dnsRouter.createCaller({});

const baseDefaultZone = {
    id: expect.any(String), // UUIDs are generated, so expect any string or a specific matcher
    zoneName: 'example.com',
    zoneType: 'master',
    fileName: 'example.com.zone',
    allowUpdate: ['none'], // Default from schema now
    soaSettings: {
      ttl: "3600",
      primaryNameserver: "ns1.example.com.",
      adminEmail: "admin.example.com.",
      serial: expect.any(String), // Serials are generated
      refresh: "3600",
      retry: "1800",
      expire: "604800",
      minimumTtl: "86400"
    },
    records: [
      { id: expect.any(String), type: 'A', name: '@', value: '192.168.1.100', priority: undefined, weight: undefined, port: undefined },
      { id: expect.any(String), type: 'CNAME', name: 'www', value: '@', priority: undefined, weight: undefined, port: undefined },
    ],
};

const defaultConfigurationOutputShape = {
    message: 'Default configuration returned as BIND files were not found.',
    data: {
      dnsServerStatus: false, // Default if service check fails or dev mode
      listenOn: ['127.0.0.1'],
      allowQuery: ['localhost'],
      allowRecursion: ['localhost'],
      forwarders: ['8.8.8.8', '8.8.4.4'],
      allowTransfer: ['none'],
      dnssecValidation: true,
      queryLogging: false,
      zones: [baseDefaultZone],
    },
};


const sampleValidInput: DnsConfigurationType = {
  dnsServerStatus: true,
  listenOn: ['127.0.0.1', '192.168.1.1'],
  allowQuery: ['localhost', '192.168.0.0/16'],
  allowRecursion: ['localhost'],
  forwarders: ['8.8.8.8'],
  allowTransfer: ['none'],
  dnssecValidation: true,
  queryLogging: false,
  zones: [
    {
      id: 'zone1',
      zoneName: 'example.com',
      zoneType: 'master',
      fileName: 'example.com.zone',
      allowUpdate: ['none'],
      soaSettings: {
        ttl: '3600',
        primaryNameserver: 'ns1.example.com.',
        adminEmail: 'admin.example.com.',
        serial: '2023010101',
        refresh: '3600',
        retry: '1800',
        expire: '604800',
        minimumTtl: '86400',
      },
      records: [
        { type: 'A', name: '@', value: '1.2.3.4', id: 'rec1' },
        { type: 'CNAME', name: 'www', value: '@', id: 'rec2' },
      ],
    },
  ],
};

describe('dnsRouter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = originalNodeEnv; // Reset NODE_ENV
  });

  afterAll(() => {
    process.env.NODE_ENV = originalNodeEnv; // Restore original NODE_ENV after all tests
  });

  describe('getConfiguration procedure', () => {
    it('should return default configuration if BIND files do not exist', async () => {
      process.env.NODE_ENV = 'development'; // Ensure dev mode for simpler service checks
      mockedReadFile.mockRejectedValueOnce({ code: 'ENOENT' }); // named.conf not found
      mockedReadFile.mockRejectedValueOnce({ code: 'ENOENT' }); // zones.conf not found

      const result = await caller.getConfiguration();
      // Normalize generated IDs for snapshot or deep equality matching if needed
      // For now, checking the overall structure and message
      expect(result.message).toBe(defaultConfigurationOutputShape.message);
      expect(result.data.dnsServerStatus).toBe(false); // In dev, service check is skipped
      expect(result.data.listenOn).toEqual(defaultConfigurationOutputShape.data.listenOn);
      // Further detailed checks for zones can be added if UUIDs are predictable or mocked
      expect(result.data.zones[0].zoneName).toEqual(defaultConfigurationOutputShape.data.zones[0].zoneName);
    });

    it('should throw NOT_IMPLEMENTED if BIND files exist', async () => {
      process.env.NODE_ENV = 'development';
      mockedReadFile.mockResolvedValueOnce('some content for named.conf'); // named.conf exists
      mockedReadFile.mockResolvedValueOnce('some content for zones.conf'); // zones.conf exists

      await expect(caller.getConfiguration()).rejects.toThrowError(TRPCError);
      await expect(caller.getConfiguration()).rejects.toMatchObject({
        code: 'NOT_IMPLEMENTED',
        message: 'Reading current configuration from BIND files is not yet implemented. Submit a new configuration to get started.',
      });
    });

    it('should reflect named service status in default config (production mode)', async () => {
      process.env.NODE_ENV = 'production';
      mockedReadFile.mockRejectedValue({ code: 'ENOENT' }); // Config files don't exist

      // Simulate service is active
      mockedExec.mockImplementation((command, callback) => {
        if (command === 'systemctl is-active named') {
          callback(null, { stdout: 'active', stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });
      
      let result = await caller.getConfiguration();
      expect(result.data.dnsServerStatus).toBe(true);

      // Simulate service is inactive
       mockedExec.mockImplementation((command, callback) => {
        if (command === 'systemctl is-active named') {
          // systemctl is-active returns exit code 3 if inactive, which throws error for execAsync
          const err = new Error('Command failed') as any;
          err.code = 3; 
          callback(err, { stdout: 'inactive', stderr: '' });
        } else {
          callback(null, { stdout: '', stderr: '' });
        }
      });
      result = await caller.getConfiguration();
      expect(result.data.dnsServerStatus).toBe(false);
    });
  });

  describe('updateConfiguration procedure', () => {
    // Common setup for successful file operations
    const setupSuccessfulFileOpsMocks = () => {
      mockedExistsSync.mockReturnValue(true); // For backup creation
      mockedWriteFile.mockResolvedValue(undefined);
      mockedMkdir.mockResolvedValue(undefined);
      // For checkWritePermission in prod
      mockedFsPromisesStat.mockResolvedValue({ isDirectory: () => true }); 
      mockedFsPromisesWriteFile.mockResolvedValue(undefined);
      // For rm in checkWritePermission (mockedExec will handle it)
    };

    const setupSuccessfulValidationAndReloadMocks = () => {
       mockedExec.mockImplementation((command, callback) => {
        if (command.startsWith('named-checkconf') || command.startsWith('named-checkzone') || command.startsWith('rm ')) {
          callback(null, { stdout: 'OK', stderr: '' });
        } else if (command === 'systemctl reload named') {
          callback(null, { stdout: 'Reloaded', stderr: '' });
        } else {
           callback(null, { stdout: '', stderr: '' }); // Default for other commands
        }
      });
    };
    
    const setupFailedValidationMocks = () => {
      mockedExec.mockImplementation((command, callback) => {
        if (command.startsWith('named-checkconf')) {
           const err = new Error('Config validation failed') as any;
           err.stderr = 'Detailed error from named-checkconf';
           callback(err, { stdout: '', stderr: err.stderr });
        } else {
           callback(null, { stdout: 'OK', stderr: '' });
        }
      });
    };

    it('should update configuration successfully (development mode)', async () => {
      process.env.NODE_ENV = 'development';
      setupSuccessfulFileOpsMocks();
      setupSuccessfulValidationAndReloadMocks();

      const result = await caller.updateConfiguration(sampleValidInput);

      expect(mockedWriteFile).toHaveBeenCalledTimes(3); // named.conf, zones.conf, 1 zone file
      expect(mockedExec).toHaveBeenCalledWith(expect.stringContaining('named-checkconf'), expect.any(Function));
      expect(mockedExec).toHaveBeenCalledWith(expect.stringContaining('named-checkzone'), expect.any(Function));
      // In dev, reload is logged, not exec'd via systemctl
      expect(mockedExec).not.toHaveBeenCalledWith('systemctl reload named', expect.any(Function)); 
      expect(result.message).toBe('DNS configuration updated successfully');
      expect(result.data).toEqual(sampleValidInput);
    });

    it('should update configuration successfully (production mode)', async () => {
      process.env.NODE_ENV = 'production';
      setupSuccessfulFileOpsMocks();
      setupSuccessfulValidationAndReloadMocks();
      
      // Specific mock for checkWritePermission's 'rm' call if not covered by general exec mock
      // This is tricky as exec is called for 'rm' and other things.
      // The current setupSuccessfulValidationAndReloadMocks should handle 'rm ' correctly.

      const result = await caller.updateConfiguration(sampleValidInput);

      expect(mockedWriteFile).toHaveBeenCalledTimes(3); 
      expect(mockedExec).toHaveBeenCalledWith('named-checkconf /etc/named.conf', expect.any(Function));
      expect(mockedExec).toHaveBeenCalledWith('named-checkzone example.com /var/named/example.com.zone', expect.any(Function));
      expect(mockedExec).toHaveBeenCalledWith('systemctl reload named', expect.any(Function));
      expect(result.message).toBe('DNS configuration updated successfully');
    });

    it('should throw BAD_REQUEST if BIND configuration validation fails', async () => {
      process.env.NODE_ENV = 'production'; // Validation typically runs in prod
      setupSuccessfulFileOpsMocks();
      setupFailedValidationMocks();
      
      await expect(caller.updateConfiguration(sampleValidInput)).rejects.toThrowError(TRPCError);
      await expect(caller.updateConfiguration(sampleValidInput)).rejects.toMatchObject({
        code: 'BAD_REQUEST',
        message: expect.stringContaining('Failed to validate BIND configuration'),
      });
    });

    it('should throw INTERNAL_SERVER_ERROR if file write fails', async () => {
      process.env.NODE_ENV = 'development';
      mockedExistsSync.mockReturnValue(false); // No backup needed
      mockedMkdir.mockResolvedValue(undefined);
      mockedWriteFile.mockRejectedValueOnce(new Error('Disk full')); // Simulate failure on first write

      await expect(caller.updateConfiguration(sampleValidInput)).rejects.toThrowError(TRPCError);
      await expect(caller.updateConfiguration(sampleValidInput)).rejects.toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to write file: Disk full',
      });
    });
    
    it('should throw INTERNAL_SERVER_ERROR if service reload fails (production mode)', async () => {
      process.env.NODE_ENV = 'production';
      setupSuccessfulFileOpsMocks();
      // Simulate successful validation but failed reload
      mockedExec.mockImplementation((command, callback) => {
        if (command.startsWith('named-checkconf') || command.startsWith('named-checkzone') || command.startsWith('rm ')) {
          callback(null, { stdout: 'OK', stderr: '' });
        } else if (command === 'systemctl reload named') {
          const err = new Error('Reload failed') as any;
          err.stderr = 'systemctl error';
          callback(err, { stdout: '', stderr: err.stderr });
        } else {
           callback(null, { stdout: '', stderr: '' });
        }
      });

      await expect(caller.updateConfiguration(sampleValidInput)).rejects.toThrowError(TRPCError);
      await expect(caller.updateConfiguration(sampleValidInput)).rejects.toMatchObject({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to reload BIND service: Reload failed',
      });
    });
  });
});

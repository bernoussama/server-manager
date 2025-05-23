import os from 'os';

// Create mock functions
const mockedExecAsync = jest.fn();
const mockedLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  http: jest.fn(),
};

// Mock os module 
jest.mock('os', () => ({
  loadavg: jest.fn().mockReturnValue([0.1, 0.2, 0.3]),
  cpus: jest.fn().mockReturnValue([{}, {}, {}, {}]), // Simulate 4 cores
}));

// Mock logger
jest.mock('../logger', () => mockedLogger);

// Mock util.promisify
jest.mock('util', () => ({
  promisify: jest.fn().mockReturnValue(mockedExecAsync)
}));

// Now import the module under test
import { SystemMetrics } from '../systemMetrics';

describe('SystemMetrics', () => {
  let systemMetrics: SystemMetrics;

  beforeEach(() => {
    systemMetrics = new SystemMetrics();
    mockedExecAsync.mockReset();
    // Reset os mocks if they were changed in a test
    (os.loadavg as jest.Mock).mockReturnValue([0.1, 0.2, 0.3]);
    (os.cpus as jest.Mock).mockReturnValue([{}, {}, {}, {}]); // Simulate 4 cores
  });

  describe('getUptime', () => {
    it('should return human-readable uptime', async () => {
      mockedExecAsync.mockResolvedValueOnce({ stdout: 'up 2 hours, 30 minutes' });
      const uptime = await systemMetrics.getUptime();
      expect(uptime).toBe('2 hours, 30 minutes');
      expect(mockedExecAsync).toHaveBeenCalledWith('uptime -p');
    });

    it('should handle errors gracefully', async () => {
      mockedExecAsync.mockRejectedValueOnce(new Error('Command failed'));
      const uptime = await systemMetrics.getUptime();
      expect(uptime).toBe('N/A');
    });
  });

  describe('getMemoryUsage', () => {
    it('should parse free -m output correctly', async () => {
      const mockOutput = `
              total        used        free      shared  buff/cache   available
Mem:           7941        3221        1085         378        3634        4204
Swap:          8191           0        8191
      `;
      mockedExecAsync.mockResolvedValueOnce({ stdout: mockOutput });
      const memoryUsage = await systemMetrics.getMemoryUsage();
      expect(memoryUsage).toEqual({
        total: 7941,
        used: 3221,
        free: 1085,
        unit: 'MB',
      });
      expect(mockedExecAsync).toHaveBeenCalledWith('free -m');
    });

    it('should handle errors parsing free -m output', async () => {
      mockedExecAsync.mockResolvedValueOnce({ stdout: 'Invalid output' });
      const memoryUsage = await systemMetrics.getMemoryUsage();
      expect(memoryUsage).toEqual({ total: 0, free: 0, used: 0, unit: 'MB' });
    });

    it('should handle command execution errors', async () => {
      mockedExecAsync.mockRejectedValueOnce(new Error('Command failed'));
      const memoryUsage = await systemMetrics.getMemoryUsage();
      expect(memoryUsage).toEqual({ total: 0, free: 0, used: 0, unit: 'MB' });
    });
  });

  describe('getCpuUsage', () => {
    it('should calculate CPU load and get core count', async () => {
      (os.loadavg as jest.Mock).mockReturnValue([0.5, 0.4, 0.3]); // 1-min load avg
      (os.cpus as jest.Mock).mockReturnValue([{}, {}, {}, {}]); // 4 cores
      const cpuUsage = await systemMetrics.getCpuUsage();
      expect(cpuUsage).toEqual({
        currentLoad: 12.5, // (0.5 / 4) * 100
        cores: 4,
      });
    });

     it('should cap currentLoad at 100%', async () => {
      (os.loadavg as jest.Mock).mockReturnValue([8, 5, 3]); // High load (8 on 4 cores)
      (os.cpus as jest.Mock).mockReturnValue([{}, {}, {}, {}]);
      const cpuUsage = await systemMetrics.getCpuUsage();
      expect(cpuUsage.currentLoad).toBe(100);
      expect(cpuUsage.cores).toBe(4);
    });

    it('should handle errors in os functions gracefully', async () => {
      (os.loadavg as jest.Mock).mockImplementation(() => { throw new Error('os.loadavg failed'); });
      const cpuUsage = await systemMetrics.getCpuUsage();
      expect(cpuUsage).toEqual({ currentLoad: 0, cores: 4 }); // Cores might still be available or default
    });
  });

  describe('getDiskUsage', () => {
    it('should parse df -h output correctly', async () => {
      const mockOutput = `
Filesystem      Size  Used Avail Use% Mounted on
/dev/sda1        20G  5.0G   14G  27% /
  tmpfs           3.9G  1.0G  2.9G  25% /dev/shm 
  /dev/mapper/vg_data-lv_data 100G   50G   50G  50% /data
      `;
      mockedExecAsync.mockResolvedValueOnce({ stdout: mockOutput });
      const diskUsage = await systemMetrics.getDiskUsage();
      expect(diskUsage).toEqual([
        { filesystem: '/dev/sda1', size: '20G', used: '5.0G', available: '14G', usagePercentage: '27%', mountPath: '/' },
        { filesystem: 'tmpfs', size: '3.9G', used: '1.0G', available: '2.9G', usagePercentage: '25%', mountPath: '/dev/shm' },
        { filesystem: '/dev/mapper/vg_data-lv_data', size: '100G', used: '50G', available: '50G', usagePercentage: '50%', mountPath: '/data' },
      ]);
      expect(mockedExecAsync).toHaveBeenCalledWith('df -h');
    });

    it('should handle empty df -h output', async () => {
      mockedExecAsync.mockResolvedValueOnce({ stdout: 'Filesystem      Size  Used Avail Use% Mounted on\n' });
      const diskUsage = await systemMetrics.getDiskUsage();
      expect(diskUsage).toEqual([]);
    });

    it('should handle command execution errors', async () => {
      mockedExecAsync.mockRejectedValueOnce(new Error('Command failed'));
      const diskUsage = await systemMetrics.getDiskUsage();
      expect(diskUsage).toEqual([]);
    });
  });

  describe('getActiveServices', () => {
    it('should parse systemctl output correctly', async () => {
      const mockOutput = `
bluetooth.service loaded active running Bluetooth service
  cron.service      loaded active running Regular background program processing daemon  
network.service   loaded active running LSB: Bring up/down networking
      `;
      mockedExecAsync.mockResolvedValueOnce({ stdout: mockOutput });
      const services = await systemMetrics.getActiveServices();
      expect(services).toEqual([
        { name: 'bluetooth.service', status: 'active (running)', description: 'Bluetooth service' },
        { name: 'cron.service', status: 'active (running)', description: 'Regular background program processing daemon' },
        { name: 'network.service', status: 'active (running)', description: 'LSB: Bring up/down networking' },
      ]);
      expect(mockedExecAsync).toHaveBeenCalledWith('systemctl list-units --type=service --state=active --no-pager --plain --no-legend');
    });

    it('should handle empty systemctl output', async () => {
      mockedExecAsync.mockResolvedValueOnce({ stdout: '' });
      const services = await systemMetrics.getActiveServices();
      expect(services).toEqual([]);
    });

    it('should handle systemctl command not found error', async () => {
      const error: any = new Error('Command failed: systemctl command not found');
      error.code = 127;
      mockedExecAsync.mockRejectedValueOnce(error);
      const services = await systemMetrics.getActiveServices();
      expect(services).toEqual([]);
    });

    it('should handle other command execution errors', async () => {
      mockedExecAsync.mockRejectedValueOnce(new Error('Another Command failed'));
      const services = await systemMetrics.getActiveServices();
      expect(services).toEqual([]);
    });
  });
}); 
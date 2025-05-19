import { promisify } from 'util';
import { exec } from 'child_process';
import os from 'os';
import logger from './logger';

const execAsync = promisify(exec);

/**
 * @interface MemoryUsage
 * @description Represents system memory usage statistics.
 * @property {number} total - Total memory in MB.
 * @property {number} free - Free memory in MB.
 * @property {number} used - Used memory in MB.
 * @property {string} unit - The unit of memory measurement (e.g., "MB").
 */
export interface MemoryUsage {
  total: number;
  free: number;
  used: number;
  unit: string;
}

/**
 * @interface CpuUsage
 * @description Represents system CPU usage statistics.
 * @property {number} currentLoad - Current CPU load percentage (approximated).
 * @property {number} cores - Number of CPU cores.
 */
export interface CpuUsage {
  currentLoad: number;
  cores: number;
}

/**
 * @interface DiskUsage
 * @description Represents usage statistics for a single mounted filesystem.
 * @property {string} filesystem - Name of the filesystem.
 * @property {string} size - Total size of the filesystem.
 * @property {string} used - Used space on the filesystem.
 * @property {string} available - Available space on the filesystem.
 * @property {string} usagePercentage - Percentage of disk space used.
 * @property {string} mountPath - Mount path of the filesystem.
 */
export interface DiskUsage {
  filesystem: string;
  size: string;
  used: string;
  available: string;
  usagePercentage: string;
  mountPath: string;
}

/**
 * @interface ActiveService
 * @description Represents an active systemd service.
 * @property {string} name - Name of the service unit.
 * @property {string} status - Current status of the service (e.g., "active (running)").
 * @property {string} description - Description of the service.
 */
export interface ActiveService {
  name: string;
  status: string;
  description: string;
}

/**
 * @class SystemMetrics
 * @description Provides methods to retrieve various system metrics like uptime, memory usage, CPU usage, disk usage, and active services.
 * This class primarily targets Linux systems and uses common shell commands.
 */
export class SystemMetrics {
  constructor() {}

  /**
   * Executes a shell command and returns its stdout.
   * @param command The command to execute.
   * @returns A promise that resolves with the command's stdout.
   */
  private async executeCommand(command: string): Promise<string> {
    try {
      const { stdout } = await execAsync(command);
      return stdout.trim();
    } catch (error) {
      logger.error(`Error executing command "${command}":`, error);
      throw error; // Re-throw to be caught by calling function
    }
  }

  /**
   * Retrieves the system uptime.
   * On Linux, uses `uptime -p` for a human-readable format.
   * @async
   * @returns {Promise<string>} A promise that resolves with the system uptime string (e.g., "2 weeks, 3 days, 14 hours, 2 minutes") or "N/A" on error.
   */
  async getUptime(): Promise<string> {
    logger.info('Fetching system uptime...');
    try {
      // The `uptime -p` command gives a pretty, human-readable output like "up 2 weeks, 3 days, 14 hours, 2 minutes"
      // We'll remove the leading "up " part.
      const uptimeOutput = await this.executeCommand('uptime -p');
      return uptimeOutput.replace(/^up\s+/, '');
    } catch (error) {
      logger.error('Failed to get system uptime:', error);
      return 'N/A'; // Return a default value or rethrow as per desired error handling
    }
  }

  /**
   * Retrieves system memory usage.
   * On Linux, parses the output of `free -m`.
   * @async
   * @returns {Promise<MemoryUsage>} A promise that resolves with an object containing total, free, and used memory in MB.
   * Returns a default object with zeros if an error occurs.
   */
  async getMemoryUsage(): Promise<MemoryUsage> {
    logger.info('Fetching memory usage...');
    try {
      const output = await this.executeCommand('free -m');
      const lines = output.split('\n');
      
      // Find the line that starts with "Mem:"
      const memLine = lines.find(line => line.trim().startsWith('Mem:'));
      
      if (memLine) {
        // Split the line into columns, which might contain multiple spaces
        const parts = memLine.trim().split(/\s+/);
        
        // Format: Mem: total used free shared buff/cache available
        // We need total (1), used (2), free (3)
        if (parts.length >= 4) {
          const total = parseInt(parts[1], 10);
          const used = parseInt(parts[2], 10);
          const free = parseInt(parts[3], 10);
          
          return {
            total,
            used,
            free,
            unit: 'MB',
          };
        }
      }
      
      logger.warn('Failed to parse memory usage from free -m output:', output);
      return { total: 0, free: 0, used: 0, unit: 'MB' };
    } catch (error) {
      logger.error('Failed to get memory usage:', error);
      return { total: 0, free: 0, used: 0, unit: 'MB' };
    }
  }

  /**
   * Retrieves system CPU usage statistics.
   * Uses `os.loadavg()` for average system load and `os.cpus().length` for core count.
   * The 1-minute load average is used as a proxy for current load, approximated as a percentage: `(loadavg[0] / cores) * 100`, capped at 100%.
   * @async
   * @returns {Promise<CpuUsage>} A promise that resolves with an object containing current CPU load and core count.
   * Returns a default object with zero load if an error occurs (core count might still be accurate).
   */
  async getCpuUsage(): Promise<CpuUsage> {
    logger.info('Fetching CPU usage...');
    try {
      const cores = os.cpus().length;
      const loadAvg = os.loadavg();
      
      // The one-minute load average is the first element in the array
      const oneMinuteLoadAvg = loadAvg[0];
      
      // Calculate the load percentage based on the number of cores
      // (loadAvg / cores) * 100 gives the percentage of CPU usage
      let currentLoad = (oneMinuteLoadAvg / cores) * 100;
      
      // Cap at 100%
      currentLoad = Math.min(currentLoad, 100);
      
      return {
        currentLoad,
        cores,
      };
    } catch (error) {
      logger.error('Failed to get CPU usage:', error);
      return {
        currentLoad: 0, 
        cores: os.cpus().length || 0, // Try to get core count even if load failed
      };
    }
  }

  /**
   * Retrieves disk usage for all mounted filesystems.
   * On Linux, parses the output of `df -h`.
   * @async
   * @returns {Promise<DiskUsage[]>} A promise that resolves with an array of DiskUsage objects.
   * Returns an empty array if an error occurs or no filesystems are found.
   */
  async getDiskUsage(): Promise<DiskUsage[]> {
    logger.info('Fetching disk usage...');
    try {
      const dfOutput = await this.executeCommand('df -h');
      // Output of `df -h` looks like:
      // Filesystem      Size  Used Avail Use% Mounted on
      // /dev/sda1        20G  5.0G   14G  27% /
      // tmpfs           3.9G     0  3.9G   0% /dev/shm
      // ...
      const lines = dfOutput.split('\n');
      const diskUsage: DiskUsage[] = [];

      // Skip the header line (lines[0])
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue; // Skip empty lines

        const parts = line.split(/\s+/);
        // Expected format: Filesystem Size Used Avail Use% Mounted on
        // Parts can be more than 6 if filesystem name or mount path has spaces.
        // The last part is always MountPath, second to last is Use%
        if (parts.length < 6) {
          logger.warn(`Skipping malformed line in df -h output: ${line}`);
          continue;
        }
        
        const mountPath = parts[parts.length - 1];
        const usagePercentage = parts[parts.length - 2];
        const available = parts[parts.length - 3];
        const used = parts[parts.length - 4];
        const size = parts[parts.length - 5];
        // Filesystem name can contain spaces, so join the remaining parts
        const filesystem = parts.slice(0, parts.length - 5).join(' ');

        diskUsage.push({
          filesystem,
          size,
          used,
          available,
          usagePercentage,
          mountPath,
        });
      }
      return diskUsage;
    } catch (error) {
      logger.error('Failed to get disk usage:', error);
      return []; // Return empty array or appropriate error state
    }
  }

  /**
   * Retrieves a list of active systemd services.
   * On Linux, parses `systemctl list-units --type=service --state=active --no-pager --plain --no-legend`.
   * @async
   * @returns {Promise<ActiveService[]>} A promise that resolves with an array of ActiveService objects.
   * Returns an empty array if an error occurs, no services are found, or if `systemctl` is not available.
   */
  async getActiveServices(): Promise<ActiveService[]> {
    logger.info('Fetching active services...');
    try {
      const commandOutput = await this.executeCommand(
        'systemctl list-units --type=service --state=active --no-pager --plain --no-legend'
      );
      // Output of `systemctl list-units --type=service --state=active --no-pager --plain --no-legend` is like:
      // service-name.service loaded active running Description of service
      // We use --plain and --no-legend to simplify parsing.
      const lines = commandOutput.split('\n');
      const services: ActiveService[] = [];

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue; // Skip empty lines

        // Parts: [UNIT, LOAD, ACTIVE, SUB, DESCRIPTION...]
        // Example: bluetooth.service loaded active running Bluetooth service
        const parts = trimmedLine.split(/\s+/);

        if (parts.length < 4) {
          logger.warn(`Skipping malformed line in systemctl output: ${trimmedLine}`);
          continue;
        }

        const name = parts[0];
        // const load = parts[1]; // e.g., loaded
        const activeState = parts[2]; // e.g., active
        const subState = parts[3];    // e.g., running, exited, mounted
        const description = parts.slice(4).join(' ');

        services.push({
          name,
          status: `${activeState} (${subState})`,
          description,
        });
      }
      return services;
    } catch (error) {
      logger.error('Failed to get active services:', error);
      // Check if the error is because systemctl is not available (e.g., non-systemd system)
      if (error instanceof Error && (error.message.includes('command not found') || (error as any).code === 127)) {
        logger.warn('systemctl command not found. Active services feature may not be supported on this system.');
        return [];
      }
      return []; // Return empty array or appropriate error state for other errors
    }
  }
} 
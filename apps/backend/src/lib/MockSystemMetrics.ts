import logger from './logger';
import type { MemoryUsage, CpuUsage, DiskUsage, ActiveService } from './systemMetrics';

/**
 * Mock System Metrics for development environments
 * Provides fake system metrics when actual system commands aren't available
 */
export class MockSystemMetrics {
  private startTime: number = Date.now();

  /**
   * Mock system uptime
   */
  async getUptime(): Promise<string> {
    logger.debug('[MOCK] Getting system uptime');
    
    // Calculate fake uptime based on when the mock was initialized
    const uptimeMs = Date.now() - this.startTime;
    const uptimeSeconds = Math.floor(uptimeMs / 1000);
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;
    
    return `${hours}h ${minutes}m ${seconds}s (mock)`;
  }

  /**
   * Mock memory usage
   */
  async getMemoryUsage(): Promise<MemoryUsage> {
    logger.debug('[MOCK] Getting memory usage');
    
    // Generate realistic but fake memory usage
    const totalGb = 8; // Simulate 8GB RAM
    const totalMb = totalGb * 1024;
    const usedMb = Math.floor(totalMb * (0.4 + Math.random() * 0.3)); // 40-70% usage
    const freeMb = totalMb - usedMb;
    
    return {
      total: totalMb,
      free: freeMb,
      used: usedMb,
      unit: 'MB'
    };
  }

  /**
   * Mock CPU usage
   */
  async getCpuUsage(): Promise<CpuUsage> {
    logger.debug('[MOCK] Getting CPU usage');
    
    // Generate realistic CPU usage
    const currentLoad = Math.floor(Math.random() * 60 + 10); // 10-70% usage
    const cores = 4; // Simulate 4-core CPU
    
    return {
      currentLoad,
      cores
    };
  }

  /**
   * Mock disk usage
   */
  async getDiskUsage(): Promise<DiskUsage[]> {
    logger.debug('[MOCK] Getting disk usage');
    
    // Generate mock disk usage data
    return [
      {
        filesystem: '/dev/sda1',
        size: '50G',
        used: '22G',
        available: '28G',
        usagePercentage: '44%',
        mountPath: '/'
      },
      {
        filesystem: '/dev/sda2',
        size: '20G',
        used: '5.2G',
        available: '14.8G',
        usagePercentage: '26%',
        mountPath: '/home'
      },
      {
        filesystem: 'tmpfs',
        size: '2.0G',
        used: '124M',
        available: '1.9G',
        usagePercentage: '7%',
        mountPath: '/tmp'
      }
    ];
  }

  /**
   * Mock active services
   */
  async getActiveServices(): Promise<ActiveService[]> {
    logger.debug('[MOCK] Getting active services');
    
    // Generate mock active services including our managed services
    const baseServices = [
      {
        name: 'systemd-resolved',
        status: 'active',
        description: 'Network Name Resolution'
      },
      {
        name: 'NetworkManager',
        status: 'active',
        description: 'Network Manager'
      },
      {
        name: 'sshd',
        status: 'active',
        description: 'OpenSSH Daemon'
      }
    ];

    // Add our managed services with variable states
    const managedServices = [
      {
        name: 'named',
        status: 'active',
        description: 'BIND DNS Server (mock)'
      },
      {
        name: 'dhcpd', 
        status: Math.random() > 0.5 ? 'active' : 'inactive',
        description: 'DHCP Server (mock)'
      },
      {
        name: 'httpd',
        status: 'active',
        description: 'Apache HTTP Server (mock)'
      }
    ];

    return [...baseServices, ...managedServices];
  }

  /**
   * Get all mock metrics at once
   */
  async getAllMetrics() {
    logger.debug('[MOCK] Getting all system metrics');
    
    const [uptime, memory, cpu, disk, activeServices] = await Promise.all([
      this.getUptime(),
      this.getMemoryUsage(),
      this.getCpuUsage(),
      this.getDiskUsage(),
      this.getActiveServices(),
    ]);

    return {
      uptime,
      memory,
      cpu,
      disk,
      activeServices,
    };
  }
} 
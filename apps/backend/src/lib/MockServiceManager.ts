import logger from './logger';

/**
 * Mock Service Manager for development environments
 * Provides fake service statuses when actual services aren't available
 */
export class MockServiceManager {
  private mockServices: Record<string, {
    status: 'active' | 'inactive' | 'failed';
    enabled: boolean;
  }> = {
    named: { status: 'active', enabled: true },
    dhcpd: { status: 'inactive', enabled: false },
    httpd: { status: 'active', enabled: true },
  };

  private validateServiceName(service: string): boolean {
    // Only allow a-z0-9- in service names to prevent command injection
    return /^[a-z0-9-]+$/.test(service);
  }

  /**
   * Mock start a service
   */
  public async start(service: string): Promise<string> {
    if (!this.validateServiceName(service)) {
      const error = `Invalid service name: ${service}`;
      logger.error(error);
      throw new Error(error);
    }

    logger.info(`[MOCK] Starting service: ${service}`);
    
    // Simulate some delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (this.mockServices[service]) {
      this.mockServices[service].status = 'active';
      return `Started ${service} (mock)`;
    } else {
      throw new Error(`Service ${service} not found`);
    }
  }

  /**
   * Mock stop a service
   */
  public async stop(service: string): Promise<string> {
    if (!this.validateServiceName(service)) {
      const error = `Invalid service name: ${service}`;
      logger.error(error);
      throw new Error(error);
    }

    logger.info(`[MOCK] Stopping service: ${service}`);
    
    // Simulate some delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (this.mockServices[service]) {
      this.mockServices[service].status = 'inactive';
      return `Stopped ${service} (mock)`;
    } else {
      throw new Error(`Service ${service} not found`);
    }
  }

  /**
   * Mock restart a service
   */
  public async restart(service: string): Promise<string> {
    if (!this.validateServiceName(service)) {
      const error = `Invalid service name: ${service}`;
      logger.error(error);
      throw new Error(error);
    }

    logger.info(`[MOCK] Restarting service: ${service}`);
    
    // Simulate some delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (this.mockServices[service]) {
      this.mockServices[service].status = 'active';
      return `Restarted ${service} (mock)`;
    } else {
      throw new Error(`Service ${service} not found`);
    }
  }

  /**
   * Mock check if a service is running
   */
  public async status(service: string): Promise<boolean> {
    if (!this.validateServiceName(service)) {
      const error = `Invalid service name: ${service}`;
      logger.error(error);
      throw new Error(error);
    }

    logger.debug(`[MOCK] Checking status of service: ${service}`);
    
    // Simulate some delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (this.mockServices[service]) {
      const isActive = this.mockServices[service].status === 'active';
      logger.debug(`[MOCK] Service ${service} status: ${isActive ? 'active' : 'inactive'}`);
      return isActive;
    }
    
    // Unknown service defaults to inactive
    return false;
  }

  /**
   * Mock get detailed status
   */
  public async getDetailedStatus(service: string): Promise<string> {
    if (!this.validateServiceName(service)) {
      const error = `Invalid service name: ${service}`;
      logger.error(error);
      throw new Error(error);
    }

    logger.debug(`[MOCK] Getting detailed status for service: ${service}`);
    
    // Simulate some delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    if (this.mockServices[service]) {
      const serviceInfo = this.mockServices[service];
      return `● ${service}.service - Mock ${service.charAt(0).toUpperCase() + service.slice(1)} Service
   Loaded: loaded (/etc/systemd/system/${service}.service; ${serviceInfo.enabled ? 'enabled' : 'disabled'})
   Active: ${serviceInfo.status} (running) since ${new Date().toISOString()}
 Main PID: ${Math.floor(Math.random() * 65535 + 1000)} (${service})
    Tasks: ${Math.floor(Math.random() * 10 + 1)}
   Memory: ${Math.floor(Math.random() * 100 + 10)}.0M
      CPU: ${(Math.random() * 5).toFixed(1)}s
   CGroup: /system.slice/${service}.service
           └─${Math.floor(Math.random() * 65535 + 1000)} /usr/bin/${service} (mock process)`;
    }
    
    return `Unit ${service}.service could not be found.`;
  }

  /**
   * Mock enable a service
   */
  public async enable(service: string): Promise<string> {
    if (!this.validateServiceName(service)) {
      const error = `Invalid service name: ${service}`;
      logger.error(error);
      throw new Error(error);
    }

    logger.info(`[MOCK] Enabling service: ${service}`);
    
    // Simulate some delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (this.mockServices[service]) {
      this.mockServices[service].enabled = true;
      return `Enabled ${service} (mock)`;
    } else {
      throw new Error(`Service ${service} not found`);
    }
  }

  /**
   * Mock disable a service
   */
  public async disable(service: string): Promise<string> {
    if (!this.validateServiceName(service)) {
      const error = `Invalid service name: ${service}`;
      logger.error(error);
      throw new Error(error);
    }

    logger.info(`[MOCK] Disabling service: ${service}`);
    
    // Simulate some delay
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (this.mockServices[service]) {
      this.mockServices[service].enabled = false;
      return `Disabled ${service} (mock)`;
    } else {
      throw new Error(`Service ${service} not found`);
    }
  }

  /**
   * Get current mock service states (for debugging)
   */
  public getMockStates(): Record<string, { status: string; enabled: boolean }> {
    return { ...this.mockServices };
  }

  /**
   * Set mock service state (for testing)
   */
  public setMockState(service: string, status: 'active' | 'inactive' | 'failed', enabled: boolean = true): void {
    if (this.validateServiceName(service)) {
      this.mockServices[service] = { status, enabled };
      logger.debug(`[MOCK] Set ${service} to ${status}, enabled: ${enabled}`);
    }
  }
} 
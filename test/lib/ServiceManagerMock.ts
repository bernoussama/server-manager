/**
 * Mock implementation of ServiceManager for testing
 */
export class ServiceManagerMock {
  private serviceStatuses: Record<string, boolean> = {
    named: true,
    dhcpd: true,
    httpd: false,
  };

  private validateServiceName(service: string): boolean {
    // Basic validation to prevent command injection
    const validServiceNameRegex = /^[a-zA-Z0-9_.-]+$/;
    return validServiceNameRegex.test(service);
  }

  /**
   * Start a system service
   * @param service - Name of the service to start
   */
  public async start(service: string): Promise<string> {
    if (!this.validateServiceName(service)) {
      throw new Error('Invalid service name');
    }

    if (!['named', 'dhcpd', 'httpd'].includes(service)) {
      throw new Error(`Unknown service: ${service}`);
    }

    this.serviceStatuses[service] = true;
    return `Service ${service} started successfully`;
  }

  /**
   * Stop a system service
   * @param service - Name of the service to stop
   */
  public async stop(service: string): Promise<string> {
    if (!this.validateServiceName(service)) {
      throw new Error('Invalid service name');
    }

    if (!['named', 'dhcpd', 'httpd'].includes(service)) {
      throw new Error(`Unknown service: ${service}`);
    }

    this.serviceStatuses[service] = false;
    return `Service ${service} stopped successfully`;
  }

  /**
   * Restart a system service
   * @param service - Name of the service to restart
   */
  public async restart(service: string): Promise<string> {
    if (!this.validateServiceName(service)) {
      throw new Error('Invalid service name');
    }

    if (!['named', 'dhcpd', 'httpd'].includes(service)) {
      throw new Error(`Unknown service: ${service}`);
    }

    this.serviceStatuses[service] = true;
    return `Service ${service} restarted successfully`;
  }

  /**
   * Get the status of a system service
   * @param service - Name of the service to check
   * @returns boolean - true if running, false if stopped
   */
  public async status(service: string): Promise<boolean> {
    if (!this.validateServiceName(service)) {
      throw new Error('Invalid service name');
    }

    if (!['named', 'dhcpd', 'httpd'].includes(service)) {
      throw new Error(`Unknown service: ${service}`);
    }

    return this.serviceStatuses[service];
  }

  /**
   * Get detailed status information about a service
   * @param service - Name of the service to check
   */
  public async getDetailedStatus(service: string): Promise<string> {
    if (!this.validateServiceName(service)) {
      throw new Error('Invalid service name');
    }

    if (!['named', 'dhcpd', 'httpd'].includes(service)) {
      throw new Error(`Unknown service: ${service}`);
    }

    const status = this.serviceStatuses[service] ? 'active' : 'inactive';
    return `● ${service}.service - ${service.toUpperCase()} Service\n   Active: ${status}`;
  }

  /**
   * Enable a service to start on boot
   * @param service - Name of the service to enable
   */
  public async enable(service: string): Promise<string> {
    if (!this.validateServiceName(service)) {
      throw new Error('Invalid service name');
    }

    if (!['named', 'dhcpd', 'httpd'].includes(service)) {
      throw new Error(`Unknown service: ${service}`);
    }

    return `Service ${service} enabled successfully`;
  }

  /**
   * Disable a service from starting on boot
   * @param service - Name of the service to disable
   */
  public async disable(service: string): Promise<string> {
    if (!this.validateServiceName(service)) {
      throw new Error('Invalid service name');
    }

    if (!['named', 'dhcpd', 'httpd'].includes(service)) {
      throw new Error(`Unknown service: ${service}`);
    }

    return `Service ${service} disabled successfully`;
  }

  // Method to manually set a service status for testing
  public setServiceStatus(service: string, status: boolean): void {
    if (!['named', 'dhcpd', 'httpd'].includes(service)) {
      throw new Error(`Unknown service: ${service}`);
    }
    this.serviceStatuses[service] = status;
  }
}

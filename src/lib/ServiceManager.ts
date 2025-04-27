import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export class ServiceManager {
  private validateServiceName(service: string): boolean {
    // Basic validation to prevent command injection
    const validServiceNameRegex = /^[a-zA-Z0-9_.-]+$/;
    return validServiceNameRegex.test(service);
  }

  private async executeCommand(command: string): Promise<string> {
    console.log(`Executing command: ${command}`);
    try {
      const { stdout, stderr } = await execAsync(command);
      console.log(`Command executed: ${command} and result: ${stdout}`);
      if (stderr) {
        console.error(`Error executing command: ${stderr}`);
        throw new Error(stderr);
      }
      return stdout.trim();
    } catch (error) {
      console.error(`Error executing command: ${command}`, error);
      if (error instanceof Error) {
        throw new Error(`Command execution failed: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Start a system service
   * @param service - Name of the service to start
   */
  public async start(service: string): Promise<string> {
    if (!this.validateServiceName(service)) {
      throw new Error('Invalid service name');
    }

    try {
      await this.executeCommand(`sudo systemctl start ${service}`);
      return `Service ${service} started successfully`;
    } catch (error) {
      throw new Error(`Failed to start ${service}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stop a system service
   * @param service - Name of the service to stop
   */
  public async stop(service: string): Promise<string> {
    if (!this.validateServiceName(service)) {
      throw new Error('Invalid service name');
    }

    try {
      await this.executeCommand(`sudo systemctl stop ${service}`);
      return `Service ${service} stopped successfully`;
    } catch (error) {
      throw new Error(`Failed to stop ${service}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Restart a system service
   * @param service - Name of the service to restart
   */
  public async restart(service: string): Promise<string> {
    if (!this.validateServiceName(service)) {
      throw new Error('Invalid service name');
    }

    try {
      await this.executeCommand(`sudo systemctl restart ${service}`);
      return `Service ${service} restarted successfully`;
    } catch (error) {
      throw new Error(`Failed to restart ${service}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
    console.log(`Checking status of validated service: ${service}`);

    try {
      const output = await this.executeCommand(`systemctl is-active ${service}`);
      console.log(`Service ${service} status: ${output}`);
      return output.trim() === 'active';
    } catch (error) {
      // If the command fails, the service is not running
      return false;
    }
  }

  /**
   * Get detailed status information about a service
   * @param service - Name of the service to check
   */
  public async getDetailedStatus(service: string): Promise<string> {
    if (!this.validateServiceName(service)) {
      throw new Error('Invalid service name');
    }

    try {
      return await this.executeCommand(`systemctl status ${service}`);
    } catch (error) {
      throw new Error(`Failed to get status for ${service}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Enable a service to start on boot
   * @param service - Name of the service to enable
   */
  public async enable(service: string): Promise<string> {
    if (!this.validateServiceName(service)) {
      throw new Error('Invalid service name');
    }

    try {
      await this.executeCommand(`sudo systemctl enable ${service}`);
      return `Service ${service} enabled successfully`;
    } catch (error) {
      throw new Error(`Failed to enable ${service}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Disable a service from starting on boot
   * @param service - Name of the service to disable
   */
  public async disable(service: string): Promise<string> {
    if (!this.validateServiceName(service)) {
      throw new Error('Invalid service name');
    }

    try {
      await this.executeCommand(`sudo systemctl disable ${service}`);
      return `Service ${service} disabled successfully`;
    } catch (error) {
      throw new Error(`Failed to disable ${service}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}


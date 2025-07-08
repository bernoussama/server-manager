import { exec } from 'child_process';
import { promisify } from 'util';
import logger from './logger';

const execAsync = promisify(exec);

export class ServiceManager {
  private validateServiceName(service: string): boolean {
    // Only allow a-z0-9- in service names to prevent command injection
    return /^[a-z0-9-]+$/.test(service);
  }

  private async executeCommand(command: string): Promise<string> {
    try {
      logger.debug(`Executing command: ${command}`);
      const { stdout, stderr } = await execAsync(command);
      
      logger.debug(`Command executed: ${command} and result: ${stdout}`);
      
      if (stderr) {
        logger.error(`Error executing command: ${stderr}`);
      }
      
      return stdout;
    } catch (error) {
      logger.error(`Error executing command: ${command}`, error);
      throw error;
    }
  }

  /**
   * Start a system service
   * @param service The service name
   * @returns Result of the start command
   */
  public async start(service: string): Promise<string> {
    if (!this.validateServiceName(service)) {
      const error = `Invalid service name: ${service}`;
      logger.error(error);
      throw new Error(error);
    }

    try {
      return await this.executeCommand(`sudo systemctl start ${service}`);
    } catch (error: any) {
      logger.error(`Failed to start service ${service}:`, error);
      throw new Error(`Failed to start service ${service}: ${error.message}`);
    }
  }

  /**
   * Stop a system service
   * @param service The service name
   * @returns Result of the stop command
   */
  public async stop(service: string): Promise<string> {
    if (!this.validateServiceName(service)) {
      const error = `Invalid service name: ${service}`;
      logger.error(error);
      throw new Error(error);
    }

    try {
      return await this.executeCommand(`sudo systemctl stop ${service}`);
    } catch (error: any) {
      logger.error(`Failed to stop service ${service}:`, error);
      throw new Error(`Failed to stop service ${service}: ${error.message}`);
    }
  }

  /**
   * Restart a system service
   * @param service The service name
   * @returns Result of the restart command
   */
  public async restart(service: string): Promise<string> {
    if (!this.validateServiceName(service)) {
      const error = `Invalid service name: ${service}`;
      logger.error(error);
      throw new Error(error);
    }

    try {
      return await this.executeCommand(`sudo systemctl restart ${service}`);
    } catch (error: any) {
      logger.error(`Failed to restart service ${service}:`, error);
      throw new Error(`Failed to restart service ${service}: ${error.message}`);
    }
  }

  /**
   * Check if a system service exists
   * @param service The service name
   * @returns true if service exists, false if not
   */
  public async exists(service: string): Promise<boolean> {
    if (!this.validateServiceName(service)) {
      const error = `Invalid service name: ${service}`;
      logger.error(error);
      throw new Error(error);
    }

    try {
      // Use 'is-enabled' to check if service exists (will fail if service doesn't exist)
      await this.executeCommand(`systemctl is-enabled ${service}`);
      return true;
    } catch (error) {
      // Check if error is specifically about service not existing
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('could not be found') || errorMsg.includes('not found')) {
        logger.debug(`Service ${service} does not exist`);
        return false;
      }
      // Service exists but might be disabled/masked, which is fine
      return true;
    }
  }

  /**
   * Get the detailed service state
   * @param service The service name
   * @returns Service state: 'active', 'inactive', 'failed', 'not-found', etc.
   */
  public async getServiceState(service: string): Promise<string> {
    if (!this.validateServiceName(service)) {
      const error = `Invalid service name: ${service}`;
      logger.error(error);
      throw new Error(error);
    }

    try {
      // Use exec directly without throwing on non-zero exit codes
      const { stdout } = await execAsync(`systemctl is-active ${service}`, { 
        encoding: 'utf8'
      }).catch((error) => {
        // systemctl is-active returns non-zero for inactive/failed services
        // but still outputs the state to stdout
        return { stdout: error.stdout || '', stderr: error.stderr || '' };
      });
      
      const state = stdout.trim();
      logger.debug(`Service ${service} state: ${state}`);
      
      return state || 'unknown';
    } catch (error: any) {
      logger.error(`Error getting service state for ${service}:`, error);
      if (error.message && error.message.includes('could not be found')) {
        return 'not-found';
      }
      return 'unknown';
    }
  }

  /**
   * Check if a system service is running
   * @param service The service name
   * @returns true if running, false if not
   */
  public async status(service: string): Promise<boolean> {
    if (!this.validateServiceName(service)) {
      const error = `Invalid service name: ${service}`;
      logger.error(error);
      throw new Error(error);
    }

    logger.debug(`Checking status of validated service: ${service}`);
    
    try {
      const state = await this.getServiceState(service);
      return state === 'active';
    } catch (error: any) {
      logger.error(`Error checking service status: ${error}`);
      return false;
    }
  }

  /**
   * Get detailed status of a system service
   * @param service The service name
   * @returns The detailed status output
   */
  public async getDetailedStatus(service: string): Promise<string> {
    if (!this.validateServiceName(service)) {
      const error = `Invalid service name: ${service}`;
      logger.error(error);
      throw new Error(error);
    }

    try {
      return await this.executeCommand(`systemctl status ${service}`);
    } catch (error: any) {
      // For status command, error might just mean the service is not running
      // So we return the error message which contains the status info
      return error.message;
    }
  }

  /**
   * Enable a system service to start on boot
   * @param service The service name
   * @returns Result of the enable command
   */
  public async enable(service: string): Promise<string> {
    if (!this.validateServiceName(service)) {
      const error = `Invalid service name: ${service}`;
      logger.error(error);
      throw new Error(error);
    }

    try {
      return await this.executeCommand(`sudo systemctl enable ${service}`);
    } catch (error: any) {
      logger.error(`Failed to enable service ${service}:`, error);
      throw new Error(`Failed to enable service ${service}: ${error.message}`);
    }
  }

  /**
   * Disable a system service from starting on boot
   * @param service The service name
   * @returns Result of the disable command
   */
  public async disable(service: string): Promise<string> {
    if (!this.validateServiceName(service)) {
      const error = `Invalid service name: ${service}`;
      logger.error(error);
      throw new Error(error);
    }

    try {
      return await this.executeCommand(`sudo systemctl disable ${service}`);
    } catch (error: any) {
      logger.error(`Failed to disable service ${service}:`, error);
      throw new Error(`Failed to disable service ${service}: ${error.message}`);
    }
  }
}


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
    
    let attempt = 0;
    const MAX_ATTEMPTS = 3;
    
    while (attempt < MAX_ATTEMPTS) {
      try {
        // Use 'is-active' which returns 'active' if the service is running
        // This is more reliable than 'status' which may return complex output
        const output = await this.executeCommand(`systemctl is-active ${service}`);
        const trimmedOutput = output.trim();
        
        logger.debug(`Service ${service} status (attempt ${attempt + 1}): ${trimmedOutput}`);
        
        // 'active' is returned if the service is running
        if (trimmedOutput === 'active') {
          return true;
        }
        
        // Otherwise the service is not running (could be 'inactive', 'failed', etc.)
        return false;
        
      } catch (error: any) {
        // On first failure, retry
        if (attempt < MAX_ATTEMPTS - 1) {
          attempt++;
          // Wait briefly before retrying
          await new Promise(resolve => setTimeout(resolve, 200));
          continue;
        }
        
        // If we've reached max attempts, log the error and assume service is not running
        logger.error(`Error checking service status: ${error}`);
        return false;
      }
    }
    
    // This should never be reached due to the return statements above
    return false;
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


import {
  HTTPD_CONF_FILE,
  HTTPD_ERROR_LOG_DIR,
  HTTPD_REQUEST_LOG_DIR,
  DOCUMENT_ROOT_DIR,
} from '../config/httpConfig'; // Assuming httpConfig.ts is in a parent directory
import { exec } from 'child_process';
import { promisify } from 'util';
import logger from '../lib/logger'; // Ensure logger is imported

const execAsync = promisify(exec);
const isProd = process.env.NODE_ENV === 'production';

export interface HttpdVHostConfig {
  serverName: string;
  documentRoot: string;
  directoryIndex?: string; // Optional, defaults to index.html
  errorLog?: string; // Optional, defaults to a standard path
  customLog?: string; // Optional, defaults to a standard path
  logFormat?: string; // Optional, defaults to combined
}

export const generateHttpdConf = (config: HttpdVHostConfig): string => {
  const directoryIndex = config.directoryIndex || 'index.html';
  const errorLogName = config.errorLog || `${config.serverName}_error.log`;
  const customLogName = config.customLog || `${config.serverName}_requests.log`;
  const logFormat = config.logFormat || 'combined';

  // Construct paths using the configuration constants
  const documentRootPath = `${DOCUMENT_ROOT_DIR}/${config.documentRoot}`;
  const errorLogPath = `${HTTPD_ERROR_LOG_DIR}/${errorLogName}`;
  const customLogPath = `${HTTPD_REQUEST_LOG_DIR}/${customLogName}`;

  return `
<VirtualHost *:80>
    ServerName ${config.serverName}
    DocumentRoot ${documentRootPath}
    DirectoryIndex ${directoryIndex}
    ErrorLog ${errorLogPath}
    CustomLog ${customLogPath} ${logFormat}
</VirtualHost>
`;
};

export const reloadHttpdService = async (): Promise<void> => {
  if (isProd) {
    try {
      // Check if httpd is active before attempting to reload
      const { stdout: statusOutput } = await execAsync('systemctl is-active httpd');
      if (statusOutput.trim() !== 'active') {
        logger.warn('HTTPD service is not active. Skipping reload.');
        // Optionally, you could try to start it:
        // logger.info('Attempting to start HTTPD service...');
        // await execAsync('systemctl start httpd');
        // logger.info('HTTPD service started.');
        return;
      }
      
      logger.info('Reloading HTTPD service...');
      await execAsync('systemctl reload httpd');
      logger.info('HTTPD service reloaded successfully.');
    } catch (error) {
      logger.error('Error reloading HTTPD service:', error);
      throw new Error(`Failed to reload HTTPD service: ${(error as Error).message}`);
    }
  } else {
    logger.info('[DEV MODE] Would reload HTTPD service with command: sudo systemctl reload httpd');
    logger.info('[DEV MODE] HTTPD service reloaded successfully (simulated).');
  }
};

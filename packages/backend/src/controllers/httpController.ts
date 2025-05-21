import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware'; // Assuming you have this
import { httpdVHostConfigSchema, HttpdVHostConfigInput } from '@server-manager/shared';
import { ZodError } from 'zod';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import logger from '../lib/logger'; // Assuming you have a logger
import { generateHttpdConf, reloadHttpdService, HttpdVHostConfig } from '../services/httpService'; // Add reloadHttpdService
import {
  HTTPD_CONF_FILE,
  HTTPD_CONF_DIR,
  HTTPD_ERROR_LOG_DIR,
  HTTPD_REQUEST_LOG_DIR,
  DOCUMENT_ROOT_DIR,
} from '../config/httpConfig';

const ensureDirectoryExists = async (dir: string): Promise<void> => {
  if (!existsSync(dir)) {
    try {
      logger.info(`Creating directory: ${dir}`);
      await mkdir(dir, { recursive: true });
      logger.info(`Directory created: ${dir}`);
    } catch (error) {
      logger.error(`Error creating directory ${dir}:`, error);
      throw new Error(`Failed to create directory ${dir}: ${(error as Error).message}`);
    }
  }
};

const writeFileWithBackup = async (filePath: string, content: string): Promise<void> => {
  try {
    // Create a backup if the file exists
    if (existsSync(filePath)) {
      const backupPath = `${filePath}.bak`;
      await writeFile(backupPath, await readFile(filePath, 'utf8'), 'utf8');
      logger.info(`Created backup of ${filePath} at ${backupPath}`);
    }
    
    // Write the new content
    await writeFile(filePath, content, 'utf8');
    logger.info(`Successfully wrote file to ${filePath}`);
  } catch (error) {
    logger.error(`Error writing file ${filePath}:`, error);
    throw new Error(`Failed to write file: ${(error as Error).message}`);
  }
};

export const updateHttpConfiguration = async (req: AuthRequest, res: Response) => {
  try {
    const validatedConfig: HttpdVHostConfigInput = httpdVHostConfigSchema.parse(req.body);
    logger.info('Received HTTP Configuration:', { config: JSON.stringify(validatedConfig) });

    // Ensure directories exist
    await ensureDirectoryExists(HTTPD_CONF_DIR);
    await ensureDirectoryExists(HTTPD_ERROR_LOG_DIR);
    await ensureDirectoryExists(HTTPD_REQUEST_LOG_DIR);
    await ensureDirectoryExists(DOCUMENT_ROOT_DIR); // Ensure base document root exists
    await ensureDirectoryExists(path.join(DOCUMENT_ROOT_DIR, validatedConfig.documentRoot));


    const httpdConfContent = generateHttpdConf(validatedConfig);
    await writeFileWithBackup(HTTPD_CONF_FILE, httpdConfContent);
        
    // Reload httpd service
    await reloadHttpdService(); // Add this line

    res.status(200).json({
      message: 'HTTP configuration updated and service reloaded successfully', // Updated message
      data: validatedConfig,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: 'Validation Error',
        errors: error.errors,
      });
    }
    logger.error('Error updating HTTP configuration:', error);
    // Check if the error message already indicates a reload failure
    const errorMessage = error instanceof Error ? error.message : 'Failed to update HTTP configuration';
    if (errorMessage.includes('Failed to reload HTTPD service')) {
        return res.status(500).json({
            message: 'HTTP configuration updated, but service reload failed.',
            details: errorMessage,
            note: 'The configuration file was written, but the httpd service could not be reloaded.',
        });
    }
    res.status(500).json({
      message: errorMessage,
    });
  }
};

export const getHttpConfiguration = async (req: AuthRequest, res: Response) => {
  try {
    if (!existsSync(HTTPD_CONF_FILE)) {
      return res.status(404).json({ message: 'HTTP configuration file not found.' });
    }
    const httpdConfContent = await readFile(HTTPD_CONF_FILE, 'utf8');
    // Note: This just returns the raw content.
    // A more advanced implementation would parse this content into a structured object.
    res.status(200).json({
      message: 'HTTP configuration retrieved successfully',
      data: httpdConfContent,
    });
  } catch (error) {
    logger.error('Error getting HTTP configuration:', error);
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to get HTTP configuration',
    });
  }
};

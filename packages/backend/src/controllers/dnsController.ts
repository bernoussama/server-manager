import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { dnsConfigurationSchema, DnsConfiguration, Zone, DnsRecord } from '@server-manager/shared/validators';
import { ZodError } from 'zod';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { existsSync } from 'fs';
import crypto from 'crypto';
import fs from 'fs';
import logger from '../lib/logger';
import {
  formatZoneJson,
  generateNamedConfJson,
  generateZoneConfJson,
  jsonToDnsConfiguration,
  DnsConfigurationJson
} from '../lib/dnsJsonUtils';

const execAsync = promisify(exec);

// --- BEGIN Configuration ---
// Determine paths based on environment
const isProd = process.env.NODE_ENV === 'production';

// Directories where configuration files will be stored
const BIND_ZONES_DIR = isProd ? '/var/named' : './test/dns/zones'; 
const BIND_CONF_DIR = isProd ? '/etc' : './test/dns/config';
const BIND_CONF_PATH = isProd ? '/etc/named.conf' : './test/dns/config/named.conf';
const ZONE_CONF_PATH = isProd ? '/etc/named.rfc1912.zones' : './test/dns/config/named.conf.zones';

const DEFAULT_TTL = 3600; // Default TTL for records
// --- END Configuration ---

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

// Helper function to ensure a value is an array of strings
const ensureStringArray = (value: string | string[]): string[] => {
  if (Array.isArray(value)) {
    return value;
  }
  
  // Parse string into array
  if (typeof value === 'string') {
    return value.split(';')
      .map(item => item.trim())
      .filter(item => item.length > 0);
  }
  
  return [];
};

// Helper function to ensure a value is a number
const ensureNumber = (value: string | number | undefined): number | undefined => {
  if (typeof value === 'number') {
    return value;
  }
  
  if (typeof value === 'string' && value.trim() !== '') {
    const num = parseInt(value.trim(), 10);
    if (!isNaN(num)) {
      return num;
    }
  }
  
  return undefined;
};

/**
 * Generate BIND zone content for a specific zone
 */
export const generateBindZoneContent = (zone: Zone): string => {
  // Increment serial number (YYYYMMDDNN format)
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  const serial = parseInt(`${year}${month}${day}01`); // Simple serial

  // Get SOA parameters - use defaults if not found
  const primaryNameserver = zone.records.find((r: DnsRecord) => r.type === 'NS' && r.name === '@')?.value || `ns1.${zone.zoneName}.`;
  
  // Ensure primaryNameserver has a trailing dot
  const primaryNs = primaryNameserver.endsWith('.') ? primaryNameserver : `${primaryNameserver}.`;
  
  // Default admin email for SOA record
  const adminEmail = 'admin@example.com';
  // Format admin email for SOA: replace @ with . and ensure trailing dot
  const adminEmailSoaFormat = adminEmail.replace('@', '.');
  const adminEmailFormatted = adminEmailSoaFormat.endsWith('.') ? adminEmailSoaFormat : `${adminEmailSoaFormat}.`;

  let zoneContent = `\$TTL ${DEFAULT_TTL}
@ IN SOA ${primaryNs} ${adminEmailFormatted} (
        ${serial}       ; Serial
        ${DEFAULT_TTL}  ; Refresh
        1800         ; Retry
        604800       ; Expire
        86400 )      ; Negative Cache TTL
;
`;

  // Add standard NS record if not explicitly defined
  if (!zone.records.some((r: DnsRecord) => r.type === 'NS' && r.name === '@')) {
    zoneContent += `@ IN NS ${primaryNs}\n`;
  }

  // Add records for this zone
  for (const record of zone.records) {
    const recordName = record.name || '@'; // Use '@' if name is empty (zone apex)
    
    switch (record.type.toUpperCase()) {
      case 'A':
        zoneContent += `${recordName} IN A ${record.value}\n`;
        break;
      case 'AAAA':
        zoneContent += `${recordName} IN AAAA ${record.value}\n`;
        break;
      case 'CNAME':
        // Ensure canonicalName (record.value) has a trailing dot if it's an FQDN
        const cnameValue = record.value === '@' ? '@' : 
                           (record.value.endsWith('.') ? record.value : `${record.value}.`);
        zoneContent += `${recordName} IN CNAME ${cnameValue}\n`;
        break;
      case 'MX':
        const priority = ensureNumber(record.priority);
        if (priority !== undefined) {
          // record.value for MX should be the exchange server
          const exchange = record.value.endsWith('.') ? record.value : `${record.value}.`;
          zoneContent += `${recordName} IN MX ${priority} ${exchange}\n`;
        } else {
          logger.warn(`Skipping malformed MX record (${recordName}): missing priority.`);
        }
        break;
      case 'TXT':
        // Ensure TXT record value is properly quoted
        zoneContent += `${recordName} IN TXT "${record.value.replace(/"/g, '\\"')}"\n`;
        break;
      case 'NS':
        const nsValue = record.value.endsWith('.') ? record.value : `${record.value}.`;
        zoneContent += `${recordName} IN NS ${nsValue}\n`;
        break;
      case 'PTR':
        // PTR record value (domain name) should end with a dot
        const ptrValue = record.value.endsWith('.') ? record.value : `${record.value}.`;
        zoneContent += `${recordName} IN PTR ${ptrValue}\n`;
        break;
      case 'SRV':
        const srvPriority = ensureNumber(record.priority);
        const srvWeight = ensureNumber(record.weight);
        const srvPort = ensureNumber(record.port);
        
        if (srvPriority !== undefined && srvWeight !== undefined && srvPort !== undefined) {
          const targetValue = record.value.endsWith('.') ? record.value : `${record.value}.`;
          zoneContent += `${recordName} IN SRV ${srvPriority} ${srvWeight} ${srvPort} ${targetValue}\n`;
        } else {
          logger.warn(`Skipping malformed SRV record (${recordName}): missing required properties.`);
        }
        break;
      default:
        logger.warn(`Unsupported DNS record type: ${record.type} for name ${recordName}.`);
    }
  }

  return zoneContent;
};

/**
 * Generate named.conf content for BIND
 */
const generateNamedConf = (config: DnsConfiguration): string => {
  // Use the override paths if set
  const actualZoneConfPath = (global as any)._DEV_OVERRIDE_ZONE_CONF_PATH || ZONE_CONF_PATH;
  
  // Ensure arrays for string list fields
  const listenOn = ensureStringArray(config.listenOn);
  const allowQuery = ensureStringArray(config.allowQuery);
  const allowRecursion = ensureStringArray(config.allowRecursion);
  const forwarders = ensureStringArray(config.forwarders);
  
  // Create the basic configuration
  return `// Generated by DNS Management System

options {
  directory "/var/named";
  listen-on port 53 { ${listenOn.join('; ')}; };
  listen-on-v6 port 53 { ::1; };
  
  allow-query { ${allowQuery.join('; ')}; };
  allow-recursion { ${allowRecursion.join('; ')}; };
  ${forwarders.length > 0 ? `forwarders { ${forwarders.join('; ')}; };` : ''}
  
  dnssec-validation ${config.dnssecValidation ? 'yes' : 'no'};
  recursion yes;
};

logging {
  channel default_debug {
    file "named.run";
    severity dynamic;
  };
};

// Include zone definitions
include "${isProd && !(global as any)._DEV_OVERRIDE_ZONE_CONF_PATH ? '/etc/named.rfc1912.zones' : actualZoneConfPath}";
`;
};

/**
 * Generate zone configuration for named.conf.zones
 */
const generateZoneConf = (config: DnsConfiguration): string => {
  let zoneConf = '// Zone definitions - generated by DNS Management System\n\n';
  
  // Use override path if set
  const actualZonesDir = (global as any)._DEV_OVERRIDE_BIND_ZONES_DIR || BIND_ZONES_DIR;
  
  for (const zone of config.zones) {
    const zoneFilePath = path.join(actualZonesDir, `${zone.fileName}`);
    const allowUpdate = ensureStringArray(zone.allowUpdate);
    const allowTransfer = config.allowTransfer ? ensureStringArray(config.allowTransfer) : [];
    
    zoneConf += `zone "${zone.zoneName}" IN {\n`;
    zoneConf += `  type ${zone.zoneType};\n`;
    
    // In production mode with no overrides, use absolute path
    // Otherwise use the path as specified
    if (isProd && !(global as any)._DEV_OVERRIDE_BIND_ZONES_DIR) {
      zoneConf += `  file "${zone.fileName}";\n`;
    } else {
      zoneConf += `  file "${zoneFilePath}";\n`;
    }
    
    zoneConf += `  allow-update { ${allowUpdate.join('; ') || 'none'}; };\n`;
    
    if (allowTransfer.length > 0) {
      zoneConf += `  allow-transfer { ${allowTransfer.join('; ')}; };\n`;
    }
    
    zoneConf += '};\n\n';
  }
  
  return zoneConf;
};

/**
 * Check if we have permission to write to the specified path
 */
const checkWritePermission = async (filePath: string): Promise<boolean> => {
  if (!isProd) return true; // In development mode, always assume we have permission

  try {
    const dirPath = path.dirname(filePath);
    
    // First check if the directory exists
    try {
      const stats = await fs.promises.stat(dirPath);
      if (!stats.isDirectory()) {
        logger.error(`Path exists but is not a directory: ${dirPath}`);
        return false;
      }
    } catch (error) {
      logger.error(`Directory does not exist: ${dirPath}`);
      
      // In production, if key directories like /var/named don't exist, we should
      // fail because the BIND server is likely not installed
      if (dirPath === '/var/named' || dirPath === '/etc') {
        return false;
      }
      
      // For other directories, we'll try to create them
      try {
        await ensureDirectoryExists(dirPath);
      } catch (createError) {
        logger.error(`Failed to create directory: ${dirPath}`, createError);
        return false;
      }
    }
    
    // Create a temporary file to check if we have write permission
    const testPath = `${dirPath}/.permission_test_${Date.now()}`;
    await writeFile(testPath, 'test', { flag: 'w' });
    await execAsync(`rm ${testPath}`);
    return true;
  } catch (error) {
    logger.error(`No write permission for ${path.dirname(filePath)}:`, error);
    return false;
  }
};

/**
 * Write a file to the filesystem
 */
/**
 * Write file with backup support and optional JSON companion file
 */
export const writeFileWithBackup = async (
  filePath: string, 
  content: string, 
  options?: {
    writeJsonVersion?: boolean;
    jsonContent?: string;
    jsonGenerator?: () => string;
  }
): Promise<void> => {
  try {
    // Check permissions in production
    if (isProd) {
      const hasPermission = await checkWritePermission(filePath);
      if (!hasPermission) {
        throw new Error(`No write permission for ${filePath}. Please run with sudo or check permissions.`);
      }
    }

    // Create a backup if the file exists
    if (existsSync(filePath)) {
      const backupPath = `${filePath}.bak`;
      await writeFile(backupPath, await readFile(filePath, 'utf8'), 'utf8');
      logger.info(`Created backup of ${filePath} at ${backupPath}`);
    }
    
    // Write the new content
    await writeFile(filePath, content, 'utf8');
    logger.info(`Successfully wrote file to ${filePath}`);

    // Write JSON version if requested
    if (options?.writeJsonVersion) {
      const jsonFilePath = `${filePath}.json`;
      let jsonContent = options.jsonContent;
      
      // Generate JSON content if generator function provided
      if (!jsonContent && options.jsonGenerator) {
        try {
          jsonContent = options.jsonGenerator();
        } catch (error) {
          logger.error(`Error generating JSON content for ${filePath}:`, error);
          throw new Error(`Failed to generate JSON content: ${(error as Error).message}`);
        }
      }
      
      if (jsonContent) {
        // Check permissions for JSON file in production
        if (isProd) {
          const hasJsonPermission = await checkWritePermission(jsonFilePath);
          if (!hasJsonPermission) {
            logger.warn(`No write permission for JSON file ${jsonFilePath}. Skipping JSON version.`);
            return;
          }
        }

        // Create backup for JSON file if it exists
        if (existsSync(jsonFilePath)) {
          const jsonBackupPath = `${jsonFilePath}.bak`;
          await writeFile(jsonBackupPath, await readFile(jsonFilePath, 'utf8'), 'utf8');
          logger.info(`Created backup of JSON file ${jsonFilePath} at ${jsonBackupPath}`);
        }
        
        // Write JSON version
        await writeFile(jsonFilePath, jsonContent, 'utf8');
        logger.info(`Successfully wrote JSON version to ${jsonFilePath}`);
      } else {
        logger.warn(`No JSON content provided for ${filePath}, skipping JSON version`);
      }
    }
  } catch (error) {
    logger.error(`Error writing file ${filePath}:`, error);
    throw new Error(`Failed to write file: ${(error as Error).message}`);
  }
};

/**
 * Validate BIND configuration
 */
const validateBindConfiguration = async (zones: Zone[]): Promise<void> => {
  const actualConfPath = (global as any)._DEV_OVERRIDE_BIND_CONF_PATH || BIND_CONF_PATH;
  const actualZonesDir = (global as any)._DEV_OVERRIDE_BIND_ZONES_DIR || BIND_ZONES_DIR;
  
  if (isProd && !(global as any)._DEV_OVERRIDE_BIND_CONF_PATH) {
    try {
      // Validate the named.conf file using named-checkconf
      await execAsync(`named-checkconf ${actualConfPath}`);
      logger.info(`Validated ${actualConfPath} successfully`);
      
      // Validate each zone file
      for (const zone of zones) {
        const zoneFilePath = path.join(actualZonesDir, zone.fileName);
        await execAsync(`named-checkzone ${zone.zoneName} ${zoneFilePath}`);
        logger.info(`Validated zone file ${zoneFilePath} for zone ${zone.zoneName} successfully`);
      }
    } catch (error) {
      logger.error('Error validating BIND configuration:', error);
      throw new Error(`Failed to validate BIND configuration: ${(error as Error).message}`);
    }
  } else {
    // In development mode, just log validation steps
    logger.info(`[DEV MODE] Would validate BIND configuration: ${actualConfPath}`);
    
    // Validate each zone file
    for (const zone of zones) {
      const zoneFilePath = path.join(actualZonesDir, zone.fileName);
      logger.info(`[DEV MODE] Would validate zone file: ${zoneFilePath} for zone ${zone.zoneName}`);
    }
    
    logger.info('[DEV MODE] Validation successful (simulated)');
  }
};

/**
 * Reload BIND service
 */
const reloadBindService = async (): Promise<void> => {
  if (isProd && !(global as any)._DEV_OVERRIDE_BIND_CONF_PATH) {
    try {
      await execAsync('systemctl reload named');
      logger.info('BIND service reloaded successfully');
    } catch (error) {
      logger.error('Error reloading BIND service:', error);
      throw new Error(`Failed to reload BIND service: ${(error as Error).message}`);
    }
  } else {
    logger.info(`[DEV MODE] Would reload BIND service with command: sudo systemctl reload named`);
    logger.info('[DEV MODE] BIND service reloaded successfully (simulated)');
  }
};

/**
 * Update DNS configuration
 */
export const updateDnsConfiguration = async (req: AuthRequest, res: Response) => {
  try {
    // Validate the request body
    const validatedConfig: DnsConfiguration = dnsConfigurationSchema.parse(req.body);

    // Convert string values to arrays where needed
    if (typeof validatedConfig.listenOn === 'string') {
      validatedConfig.listenOn = ensureStringArray(validatedConfig.listenOn);
    }
    
    if (typeof validatedConfig.allowQuery === 'string') {
      validatedConfig.allowQuery = ensureStringArray(validatedConfig.allowQuery);
    }
    
    if (typeof validatedConfig.allowRecursion === 'string') {
      validatedConfig.allowRecursion = ensureStringArray(validatedConfig.allowRecursion);
    }
    
    if (typeof validatedConfig.forwarders === 'string') {
      validatedConfig.forwarders = ensureStringArray(validatedConfig.forwarders);
    }
    
    if (typeof validatedConfig.allowTransfer === 'string') {
      validatedConfig.allowTransfer = ensureStringArray(validatedConfig.allowTransfer);
    }
    
    // Convert zone allowUpdate properties from strings to arrays
    validatedConfig.zones = validatedConfig.zones.map(zone => {
      if (typeof zone.allowUpdate === 'string') {
        return {
          ...zone,
          allowUpdate: ensureStringArray(zone.allowUpdate)
        };
      }
      return zone;
    });

    logger.info('Received DNS Configuration:', { config: JSON.stringify(validatedConfig) });
    logger.debug(`Running in ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);
    logger.debug(`Using BIND_ZONES_DIR: ${BIND_ZONES_DIR}`);
    logger.debug(`Using BIND_CONF_PATH: ${BIND_CONF_PATH}`);
    logger.debug(`Using ZONE_CONF_PATH: ${ZONE_CONF_PATH}`);
    
    // In production, check if the BIND server is properly installed
    if (isProd) {
      let missingPaths = [];
      
      // Create test file paths to check for key directories
      const criticalPaths = [
        { path: '/var/named', type: 'directory' },
        { path: '/etc/named.conf', type: 'file' }
      ];
      
      // Check if key directories/files for BIND exist
      for (const { path: criticalPath, type } of criticalPaths) {
        try {
          const stats = await fs.promises.stat(criticalPath);
          const isCorrectType = type === 'directory' ? stats.isDirectory() : stats.isFile();
          
          if (!isCorrectType) {
            logger.error(`Critical BIND path ${criticalPath} is not a ${type}`);
            missingPaths.push(`${criticalPath} (not a ${type})`);
          }
        } catch (error: any) {
          if (error.code === 'ENOENT') {
            logger.error(`Critical BIND path does not exist: ${criticalPath}`);
            missingPaths.push(criticalPath);
          }
        }
      }
      
      // If any critical paths are missing, return detailed error
      if (missingPaths.length > 0) {
        // In development mode, we can proceed by creating test directories instead
        logger.info('Missing critical BIND paths. Using development paths instead...');
        
        // Reset the paths to development paths
        const devZonesDir = './test/dns/zones';
        const devConfDir = './test/dns/config';
        
        // Ensure development directories exist
        await ensureDirectoryExists(devZonesDir);
        await ensureDirectoryExists(devConfDir);
        
        // Add debug logging to inform that we're switching to development paths
        logger.debug(`Switched to development mode paths. Using:
- Zones directory: ${devZonesDir}
- Config directory: ${devConfDir}`);
        
        // Override the paths for this request only
        // Note: This is a workaround for testing in a production environment
        // without proper BIND installation
        Object.defineProperties(global, {
          '_DEV_OVERRIDE_BIND_ZONES_DIR': {
            value: devZonesDir
          },
          '_DEV_OVERRIDE_BIND_CONF_PATH': {
            value: path.join(devConfDir, 'named.conf')
          },
          '_DEV_OVERRIDE_ZONE_CONF_PATH': {
            value: path.join(devConfDir, 'named.conf.zones')
          }
        });
      } else {
        // In production, check if we have sufficient permissions 
        try {
          const canWriteConf = await checkWritePermission(BIND_CONF_PATH);
          const canWriteZones = await checkWritePermission(path.join(BIND_ZONES_DIR, 'test-zone.txt'));
          
          if (!canWriteConf || !canWriteZones) {
            return res.status(403).json({
              message: 'Insufficient permissions',
              details: 'The server needs write access to DNS configuration directories. Please run with sudo or check permissions.',
              paths: {
                canWriteConf,
                canWriteZones,
                bindConfPath: BIND_CONF_PATH,
                bindZonesDir: BIND_ZONES_DIR
              }
            });
          }
        } catch (error) {
          return res.status(500).json({
            message: 'Error checking permissions',
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }
    
    // Use override paths if set (for testing in prod env)
    const actualZonesDir = (global as any)._DEV_OVERRIDE_BIND_ZONES_DIR || BIND_ZONES_DIR;
    const actualConfPath = (global as any)._DEV_OVERRIDE_BIND_CONF_PATH || BIND_CONF_PATH;
    const actualZoneConfPath = (global as any)._DEV_OVERRIDE_ZONE_CONF_PATH || ZONE_CONF_PATH;
    
    // Log the actual paths being used
    logger.debug(`Using actual paths:
- Zones directory: ${actualZonesDir}
- Config file: ${actualConfPath}
- Zones config file: ${actualZoneConfPath}`);
    
    // Ensure required directories exist
    await ensureDirectoryExists(actualZonesDir);
    await ensureDirectoryExists(path.dirname(actualConfPath));
    
    // Generate and write zone files
    for (const zone of validatedConfig.zones) {
      const zoneContent = generateBindZoneContent(zone);
      const zoneFilePath = path.join(actualZonesDir, zone.fileName);
      
      logger.info(`Generating zone file for ${zone.zoneName} at ${zoneFilePath}`);
      await writeFileWithBackup(zoneFilePath, zoneContent, {
        writeJsonVersion: true,
        jsonGenerator: () => formatZoneJson(zone)
      });
    }
    
    // Generate and write BIND configuration files
    const namedConf = generateNamedConf(validatedConfig);
    const zoneConf = generateZoneConf(validatedConfig);
    
    await writeFileWithBackup(actualConfPath, namedConf, {
      writeJsonVersion: true,
      jsonGenerator: () => generateNamedConfJson(validatedConfig)
    });
    await writeFileWithBackup(actualZoneConfPath, zoneConf, {
      writeJsonVersion: true,
      jsonGenerator: () => generateZoneConfJson(validatedConfig)
    });
    
    // Validate BIND configuration
    try {
      await validateBindConfiguration(validatedConfig.zones);
    } catch (error) {
      return res.status(400).json({
        message: 'DNS configuration validation failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
    
    // Only reload if the DNS server is enabled
    if (validatedConfig.dnsServerStatus) {
      try {
        await reloadBindService();
      } catch (error) {
        return res.status(500).json({
          message: 'Failed to reload DNS server',
          error: error instanceof Error ? error.message : 'Unknown error',
          note: 'Configuration files were updated but service reload failed'
        });
      }
    } else {
      logger.info('DNS server is disabled, skipping reload');
    }
    
    res.status(200).json({ 
      message: 'DNS configuration updated successfully',
      data: validatedConfig 
    });

  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ 
        message: 'Validation Error', 
        errors: error.errors 
      });
    }
    
    logger.error('Error updating DNS configuration:', error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Failed to update DNS configuration' 
    });
  }
};

/**
 * Get the current DNS configuration
 */
export const getCurrentDnsConfiguration = async (req: AuthRequest, res: Response) => {
  try {
    logger.debug(`Running in ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);
    logger.debug(`Using BIND_CONF_PATH: ${BIND_CONF_PATH}`);
    logger.debug(`Using ZONE_CONF_PATH: ${ZONE_CONF_PATH}`);
    
    // Use override paths if set (for testing in prod env)
    const actualZonesDir = (global as any)._DEV_OVERRIDE_BIND_ZONES_DIR || BIND_ZONES_DIR;
    const actualConfPath = (global as any)._DEV_OVERRIDE_BIND_CONF_PATH || BIND_CONF_PATH;
    
    // Path to the JSON configuration files
    const namedConfJsonPath = `${actualConfPath}.json`;
    const zoneConfJsonPath = `${ZONE_CONF_PATH}.json`;
    
    // Get the status of the named service if in production
    let serviceRunning = false;
    if (isProd) {
      try {
        const { stdout } = await execAsync('systemctl is-active named');
        serviceRunning = stdout.trim() === 'active';
        logger.info(`Named service is ${serviceRunning ? 'running' : 'not running'}`);
      } catch (error) {
        logger.info('Error checking named service status, assuming not running');
      }
    }
    
    // Try to read the JSON configuration files
    let namedConfJson = null;
    let zonesJson = null;
    
    try {
      const namedConfData = await readFile(namedConfJsonPath, 'utf8');
      namedConfJson = JSON.parse(namedConfData);
      logger.debug(`Successfully read named.conf.json from ${namedConfJsonPath}`);
    } catch (error) {
      logger.info(`Named.conf.json does not exist or is invalid at ${namedConfJsonPath}`);
    }
    
    try {
      const zonesConfData = await readFile(zoneConfJsonPath, 'utf8');
      zonesJson = JSON.parse(zonesConfData);
      logger.debug(`Successfully read zone.conf.json from ${zoneConfJsonPath}`);
    } catch (error) {
      logger.info(`Zone.conf.json does not exist or is invalid at ${zoneConfJsonPath}`);
    }
    
    // If JSON configuration files don't exist, return a default configuration
    if (!namedConfJson || !zonesJson) {
      logger.info('No existing JSON configuration found, returning default configuration');
      return res.status(200).json({
        message: 'Default configuration returned - no existing configuration found',
        data: {
          dnsServerStatus: serviceRunning,
          listenOn: '127.0.0.1',
          allowQuery: 'localhost; 127.0.0.1',
          allowRecursion: 'localhost',
          forwarders: '8.8.8.8; 8.8.4.4',
          allowTransfer: '',
          dnssecValidation: false,
          queryLogging: false,
          zones: [
            {
              id: crypto.randomUUID(),
              zoneName: 'example.com',
              zoneType: 'master',
              fileName: 'example.com.zone',
              allowUpdate: 'none',
              records: [
                {
                  id: crypto.randomUUID(),
                  type: 'A',
                  name: '@',
                  value: '192.168.1.100',
                  priority: '',
                  weight: '',
                  port: ''
                },
                {
                  id: crypto.randomUUID(),
                  type: 'CNAME',
                  name: 'www',
                  value: '@',
                  priority: '',
                  weight: '',
                  port: ''
                }
              ]
            }
          ]
        }
      });
    }
    
    // Now read the individual zone files to get complete records
    const zonesWithRecords = await Promise.all(
      zonesJson.zones.map(async (zone: any) => {
        try {
          const zoneJsonPath = path.join(actualZonesDir, `${zone.file}.json`);
          const zoneData = await readFile(zoneJsonPath, 'utf8');
          const zoneJson = JSON.parse(zoneData);
          
          // Transform zone records to match UI expectations
          const transformedRecords = zoneJson.records.map((record: any) => ({
            id: record.id || crypto.randomUUID(),
            type: record.type,
            name: record.name,
            value: record.value,
            priority: record.priority?.toString() || '',
            weight: record.weight?.toString() || '',
            port: record.port?.toString() || ''
          }));
          
          return {
            id: zoneJson.id || crypto.randomUUID(),
            zoneName: zoneJson.zoneName,
            zoneType: zoneJson.zoneType,
            fileName: zoneJson.fileName,
            allowUpdate: Array.isArray(zoneJson.allowUpdate) 
              ? zoneJson.allowUpdate.join('; ')
              : zoneJson.allowUpdate || 'none',
            records: transformedRecords
          };
        } catch (error) {
          logger.warn(`Could not read zone file for ${zone.name}:`, error);
          // Return zone info without records if zone file is missing
          return {
            id: crypto.randomUUID(),
            zoneName: zone.name,
            zoneType: zone.type,
            fileName: zone.file,
            allowUpdate: Array.isArray(zone.allowUpdate) 
              ? zone.allowUpdate.join('; ')
              : zone.allowUpdate || 'none',
            records: []
          };
        }
      })
    );
    
    // Build the final configuration response
    const configuration = {
      dnsServerStatus: serviceRunning,
      listenOn: Array.isArray(namedConfJson.options.listenOn) 
        ? namedConfJson.options.listenOn.join('; ')
        : namedConfJson.options.listenOn || '127.0.0.1',
      allowQuery: Array.isArray(namedConfJson.options.allowQuery) 
        ? namedConfJson.options.allowQuery.join('; ')
        : namedConfJson.options.allowQuery || 'localhost',
      allowRecursion: Array.isArray(namedConfJson.options.allowRecursion) 
        ? namedConfJson.options.allowRecursion.join('; ')
        : namedConfJson.options.allowRecursion || 'localhost',
      forwarders: Array.isArray(namedConfJson.options.forwarders) 
        ? namedConfJson.options.forwarders.join('; ')
        : namedConfJson.options.forwarders || '8.8.8.8; 8.8.4.4',
      allowTransfer: Array.isArray(namedConfJson.options.allowTransfer) 
        ? namedConfJson.options.allowTransfer.join('; ')
        : namedConfJson.options.allowTransfer || '',
      dnssecValidation: namedConfJson.options.dnssecValidation || false,
      queryLogging: namedConfJson.options.queryLogging || false,
      zones: zonesWithRecords
    };
    
    logger.info('Successfully loaded current DNS configuration from JSON files');
    res.status(200).json({ 
      message: 'Current DNS configuration loaded successfully',
      data: configuration 
    });
  } catch (error) {
    logger.error('Error getting DNS configuration:', error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Failed to get DNS configuration' 
    });
  }
}; 
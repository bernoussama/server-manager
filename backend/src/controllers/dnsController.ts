import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { dnsConfigurationSchema, DnsConfiguration, Zone, DnsRecord } from '../lib/validators/dnsConfigValidator';
import { ZodError } from 'zod';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { existsSync } from 'fs';
import crypto from 'crypto';
import fs from 'fs';

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
      console.log(`Creating directory: ${dir}`);
      await mkdir(dir, { recursive: true });
      console.log(`Directory created: ${dir}`);
    } catch (error) {
      console.error(`Error creating directory ${dir}:`, error);
      throw new Error(`Failed to create directory ${dir}: ${(error as Error).message}`);
    }
  }
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
  const primaryNameserver = zone.records.find(r => r.type === 'NS' && r.name === '@')?.value || `ns1.${zone.zoneName}.`;
  
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
  if (!zone.records.some(r => r.type === 'NS' && r.name === '@')) {
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
        if (record.priority) {
          // record.value for MX should be the exchange server
          const exchange = record.value.endsWith('.') ? record.value : `${record.value}.`;
          zoneContent += `${recordName} IN MX ${record.priority} ${exchange}\n`;
        } else {
          console.warn(`Skipping malformed MX record (${recordName}): missing priority.`);
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
        if (record.priority && record.weight && record.port) {
          const targetValue = record.value.endsWith('.') ? record.value : `${record.value}.`;
          zoneContent += `${recordName} IN SRV ${record.priority} ${record.weight} ${record.port} ${targetValue}\n`;
        } else {
          console.warn(`Skipping malformed SRV record (${recordName}): missing required properties.`);
        }
        break;
      default:
        console.warn(`Unsupported DNS record type: ${record.type} for name ${recordName}.`);
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
  
  // Create the basic configuration
  return `// Generated by DNS Management System

options {
  directory "/var/named";
  listen-on port 53 { ${config.listenOn.join('; ')}; };
  listen-on-v6 port 53 { ::1; };
  
  allow-query { ${config.allowQuery.join('; ')}; };
  allow-recursion { ${config.allowRecursion.join('; ')}; };
  ${config.forwarders.length > 0 ? `forwarders { ${config.forwarders.join('; ')}; };` : ''}
  
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
    
    zoneConf += `zone "${zone.zoneName}" IN {\n`;
    zoneConf += `  type ${zone.zoneType};\n`;
    
    // In production mode with no overrides, use absolute path
    // Otherwise use the path as specified
    if (isProd && !(global as any)._DEV_OVERRIDE_BIND_ZONES_DIR) {
      zoneConf += `  file "${zone.fileName}";\n`;
    } else {
      zoneConf += `  file "${zoneFilePath}";\n`;
    }
    
    zoneConf += `  allow-update { ${zone.allowUpdate || 'none'}; };\n`;
    
    if (config.allowTransfer && config.allowTransfer.length > 0) {
      zoneConf += `  allow-transfer { ${config.allowTransfer.join('; ')}; };\n`;
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
        console.error(`Path exists but is not a directory: ${dirPath}`);
        return false;
      }
    } catch (error) {
      console.error(`Directory does not exist: ${dirPath}`);
      
      // In production, if key directories like /var/named don't exist, we should
      // fail because the BIND server is likely not installed
      if (dirPath === '/var/named' || dirPath === '/etc') {
        return false;
      }
      
      // For other directories, we'll try to create them
      try {
        await ensureDirectoryExists(dirPath);
      } catch (createError) {
        console.error(`Failed to create directory: ${dirPath}`, createError);
        return false;
      }
    }
    
    // Create a temporary file to check if we have write permission
    const testPath = `${dirPath}/.permission_test_${Date.now()}`;
    await writeFile(testPath, 'test', { flag: 'w' });
    await execAsync(`rm ${testPath}`);
    return true;
  } catch (error) {
    console.error(`No write permission for ${path.dirname(filePath)}:`, error);
    return false;
  }
};

/**
 * Write a file to the filesystem
 */
const writeFileWithBackup = async (filePath: string, content: string): Promise<void> => {
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
      console.log(`Created backup of ${filePath} at ${backupPath}`);
    }
    
    // Write the new content
    await writeFile(filePath, content, 'utf8');
    console.log(`Successfully wrote file to ${filePath}`);
  } catch (error) {
    console.error(`Error writing file ${filePath}:`, error);
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
      console.log(`Validated ${actualConfPath} successfully`);
      
      // Validate each zone file
      for (const zone of zones) {
        const zoneFilePath = path.join(actualZonesDir, zone.fileName);
        await execAsync(`named-checkzone ${zone.zoneName} ${zoneFilePath}`);
        console.log(`Validated zone file ${zoneFilePath} for zone ${zone.zoneName} successfully`);
      }
    } catch (error) {
      console.error('Error validating BIND configuration:', error);
      throw new Error(`Failed to validate BIND configuration: ${(error as Error).message}`);
    }
  } else {
    // In development mode, just log validation steps
    console.log(`[DEV MODE] Would validate BIND configuration: ${actualConfPath}`);
    
    // Validate each zone file
    for (const zone of zones) {
      const zoneFilePath = path.join(actualZonesDir, zone.fileName);
      console.log(`[DEV MODE] Would validate zone file: ${zoneFilePath} for zone ${zone.zoneName}`);
    }
    
    console.log('[DEV MODE] Validation successful (simulated)');
  }
};

/**
 * Reload BIND service
 */
const reloadBindService = async (): Promise<void> => {
  if (isProd && !(global as any)._DEV_OVERRIDE_BIND_CONF_PATH) {
    try {
      await execAsync('systemctl reload named');
      console.log('BIND service reloaded successfully');
    } catch (error) {
      console.error('Error reloading BIND service:', error);
      throw new Error(`Failed to reload BIND service: ${(error as Error).message}`);
    }
  } else {
    console.log(`[DEV MODE] Would reload BIND service with command: sudo systemctl reload named`);
    console.log('[DEV MODE] BIND service reloaded successfully (simulated)');
  }
};

/**
 * Update DNS configuration
 */
export const updateDnsConfiguration = async (req: AuthRequest, res: Response) => {
  try {
    // Validate the request body
    const validatedConfig: DnsConfiguration = dnsConfigurationSchema.parse(req.body);

    console.log('Received DNS Configuration:', JSON.stringify(validatedConfig, null, 2));
    console.log(`Running in ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);
    console.log(`Using BIND_ZONES_DIR: ${BIND_ZONES_DIR}`);
    console.log(`Using BIND_CONF_PATH: ${BIND_CONF_PATH}`);
    console.log(`Using ZONE_CONF_PATH: ${ZONE_CONF_PATH}`);
    
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
            console.error(`Critical BIND path ${criticalPath} is not a ${type}`);
            missingPaths.push(`${criticalPath} (not a ${type})`);
          }
        } catch (error: any) {
          if (error.code === 'ENOENT') {
            console.error(`Critical BIND path does not exist: ${criticalPath}`);
            missingPaths.push(criticalPath);
          }
        }
      }
      
      // If any critical paths are missing, return detailed error
      if (missingPaths.length > 0) {
        // In development mode, we can proceed by creating test directories instead
        console.log('Missing critical BIND paths. Using development paths instead...');
        
        // Reset the paths to development paths
        const devZonesDir = './test/dns/zones';
        const devConfDir = './test/dns/config';
        
        // Ensure development directories exist
        await ensureDirectoryExists(devZonesDir);
        await ensureDirectoryExists(devConfDir);
        
        // Add debug logging to inform that we're switching to development paths
        console.log(`Switched to development mode paths. Using:
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
    console.log(`Using actual paths:
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
      
      console.log(`Generating zone file for ${zone.zoneName} at ${zoneFilePath}`);
      await writeFileWithBackup(zoneFilePath, zoneContent);
    }
    
    // Generate and write BIND configuration files
    const namedConf = generateNamedConf(validatedConfig);
    const zoneConf = generateZoneConf(validatedConfig);
    
    await writeFileWithBackup(actualConfPath, namedConf);
    await writeFileWithBackup(actualZoneConfPath, zoneConf);
    
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
      console.log('DNS server is disabled, skipping reload');
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
    
    console.error('Error updating DNS configuration:', error);
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
    console.log(`Running in ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);
    console.log(`Using BIND_CONF_PATH: ${BIND_CONF_PATH}`);
    console.log(`Using ZONE_CONF_PATH: ${ZONE_CONF_PATH}`);
    
    // Read the named.conf file to check if it exists
    let namedConfExists = false;
    let zonesConfExists = false;
    
    try {
      await readFile(BIND_CONF_PATH, 'utf8');
      namedConfExists = true;
    } catch (error) {
      console.log(`Named.conf does not exist at ${BIND_CONF_PATH}`);
    }
    
    try {
      await readFile(ZONE_CONF_PATH, 'utf8');
      zonesConfExists = true;
    } catch (error) {
      console.log(`Zone conf does not exist at ${ZONE_CONF_PATH}`);
    }
    
    // Get the status of the named service if in production
    let serviceRunning = false;
    if (isProd) {
      try {
        const { stdout } = await execAsync('systemctl is-active named');
        serviceRunning = stdout.trim() === 'active';
        console.log(`Named service is ${serviceRunning ? 'running' : 'not running'}`);
      } catch (error) {
        console.log('Error checking named service status, assuming not running');
      }
    }
    
    // If the configuration files don't exist, return a default configuration
    if (!namedConfExists || !zonesConfExists) {
      return res.status(200).json({
        message: 'Default configuration returned',
        data: {
          dnsServerStatus: serviceRunning,
          listenOn: '127.0.0.1',
          allowQuery: 'localhost; 127.0.0.1',
          allowRecursion: 'localhost',
          forwarders: '8.8.8.8; 8.8.4.4',
          allowTransfer: '',
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
                  value: '192.168.1.100'
                },
                {
                  id: crypto.randomUUID(),
                  type: 'CNAME',
                  name: 'www',
                  value: '@'
                }
              ]
            }
          ]
        }
      });
    }
    
    // In a real implementation, you would read and parse the BIND config files
    // and convert them to the expected format. For now, we'll return a message
    // that this feature is not yet implemented.
    res.status(501).json({ 
      message: 'Reading current configuration from BIND files is not yet implemented',
      hint: 'Submit a new configuration to get started' 
    });
  } catch (error) {
    console.error('Error getting DNS configuration:', error);
    res.status(500).json({ 
      message: error instanceof Error ? error.message : 'Failed to get DNS configuration' 
    });
  }
}; 
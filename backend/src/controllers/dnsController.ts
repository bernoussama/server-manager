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

const execAsync = promisify(exec);

// --- BEGIN Configuration ---
// !!!IMPORTANT: Adjust these values to your environment !!!
const BIND_ZONES_DIR = '/var/named'; // Directory where zone files will be stored
const DEFAULT_TTL = 3600; // Default TTL for records
const BIND_CONF_DIR = '/etc/named';
const BIND_CONF_PATH = '/etc/named.conf';
const ZONE_CONF_PATH = '/etc/named.conf.zones';
// --- END Configuration ---

const ensureDirectoryExists = async (dir: string): Promise<void> => {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
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
include "${ZONE_CONF_PATH}";
`;
};

/**
 * Generate zone configuration for named.conf.zones
 */
const generateZoneConf = (config: DnsConfiguration): string => {
  let zoneConf = '// Zone definitions - generated by DNS Management System\n\n';
  
  for (const zone of config.zones) {
    const zoneFilePath = path.join(BIND_ZONES_DIR, `${zone.fileName}`);
    
    zoneConf += `zone "${zone.zoneName}" IN {\n`;
    zoneConf += `  type ${zone.zoneType};\n`;
    zoneConf += `  file "${zone.fileName}";\n`;
    zoneConf += `  allow-update { ${zone.allowUpdate || 'none'}; };\n`;
    
    if (config.allowTransfer && config.allowTransfer.length > 0) {
      zoneConf += `  allow-transfer { ${config.allowTransfer.join('; ')}; };\n`;
    }
    
    zoneConf += '};\n\n';
  }
  
  return zoneConf;
};

/**
 * Write a file to the filesystem
 */
const writeFileWithBackup = async (filePath: string, content: string): Promise<void> => {
  try {
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
  try {
    // Validate the main configuration file
    console.log(`Validating BIND configuration: ${BIND_CONF_PATH}`);
    const { stdout: checkConfOut, stderr: checkConfErr } = await execAsync(`named-checkconf ${BIND_CONF_PATH}`);
    if (checkConfErr) {
      console.error(`Error during named-checkconf: ${checkConfErr}`);
      throw new Error(`BIND main configuration validation failed: ${checkConfErr}`);
    }
    console.log('BIND main configuration validation successful:', checkConfOut || 'OK');

    // Validate each zone file
    for (const zone of zones) {
      const zoneFilePath = path.join(BIND_ZONES_DIR, zone.fileName);
      console.log(`Validating zone file: ${zoneFilePath} for zone ${zone.zoneName}`);
      
      try {
        const { stdout: checkZoneOut, stderr: checkZoneErr } = await execAsync(`named-checkzone ${zone.zoneName} ${zoneFilePath}`);
        
        // Check for errors but ignore "loaded serial" messages which can appear in stderr but are not actual errors
        if (checkZoneErr && !checkZoneErr.includes("loaded serial")) {
          console.error(`Error validating zone ${zone.zoneName}: ${checkZoneErr}`);
          throw new Error(`Zone file validation for ${zone.zoneName} failed: ${checkZoneErr}`);
        }
        
        console.log(`Zone file validation for ${zone.zoneName} successful:`, checkZoneOut || 'OK');
      } catch (error) {
        console.error(`Error validating zone ${zone.zoneName}:`, error);
        throw new Error(`Failed to validate zone ${zone.zoneName}: ${(error as Error).message}`);
      }
    }
  } catch (error) {
    console.error('Error validating BIND configuration:', error);
    throw error;
  }
};

/**
 * Reload BIND service
 */
const reloadBindService = async (): Promise<void> => {
  const reloadCommand = 'sudo systemctl reload named';
  try {
    console.log(`Attempting to reload BIND service with command: ${reloadCommand}`);
    const { stdout, stderr } = await execAsync(reloadCommand);
    if (stderr) {
      console.warn(`BIND reload stderr: ${stderr}`);
    }
    console.log('BIND service reloaded successfully:', stdout || 'No stdout output from reload command.');
  } catch (error) {
    console.error('Error reloading BIND service:', error);
    throw new Error(`Failed to reload BIND service: ${(error as Error).message}`);
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
    
    // Ensure required directories exist
    await ensureDirectoryExists(BIND_ZONES_DIR);
    await ensureDirectoryExists(BIND_CONF_DIR);
    
    // Generate and write zone files
    for (const zone of validatedConfig.zones) {
      const zoneContent = generateBindZoneContent(zone);
      const zoneFilePath = path.join(BIND_ZONES_DIR, zone.fileName);
      
      console.log(`Generating zone file for ${zone.zoneName} at ${zoneFilePath}`);
      await writeFileWithBackup(zoneFilePath, zoneContent);
    }
    
    // Generate and write BIND configuration files
    const namedConf = generateNamedConf(validatedConfig);
    const zoneConf = generateZoneConf(validatedConfig);
    
    await writeFileWithBackup(BIND_CONF_PATH, namedConf);
    await writeFileWithBackup(ZONE_CONF_PATH, zoneConf);
    
    // Validate BIND configuration
    await validateBindConfiguration(validatedConfig.zones);
    
    // Only reload if the DNS server is enabled
    if (validatedConfig.dnsServerStatus) {
      await reloadBindService();
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
    
    // If the configuration files don't exist, return a default configuration
    if (!namedConfExists || !zonesConfExists) {
      return res.status(200).json({
        message: 'Default configuration returned',
        data: {
          dnsServerStatus: false,
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
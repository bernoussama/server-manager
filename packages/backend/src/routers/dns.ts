import { router, publicProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { 
  dnsConfigurationSchema, 
  DnsConfiguration, 
  Zone, 
  DnsRecord,
  soaSettingsSchema // Assuming this might be needed if not part of DnsConfiguration directly
} from '@server-manager/shared/validators/dnsConfigValidator'; // Corrected path
import { writeFile, readFile, mkdir } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { existsSync } from 'fs';
import fs from 'fs'; // For fs.promises.stat
import logger from '../lib/logger'; // Assuming logger is accessible

const execAsync = promisify(exec);

// --- BEGIN Configuration (Copied from dnsController.ts) ---
const isProd = process.env.NODE_ENV === 'production';
const BIND_ZONES_DIR = isProd ? '/var/named' : './test/dns/zones'; 
const BIND_CONF_DIR = isProd ? '/etc' : './test/dns/config'; // Not directly used in funcs below but for context
const BIND_CONF_PATH = isProd ? '/etc/named.conf' : './test/dns/config/named.conf';
const ZONE_CONF_PATH = isProd ? '/etc/named.rfc1912.zones' : './test/dns/config/named.conf.zones';
const DEFAULT_TTL = 3600;
// --- END Configuration ---

// --- BEGIN Helper Functions (Copied and adapted from dnsController.ts) ---

const ensureDirectoryExists = async (dir: string): Promise<void> => {
  if (!existsSync(dir)) {
    try {
      logger.info(`Creating directory: ${dir}`);
      await mkdir(dir, { recursive: true });
      logger.info(`Directory created: ${dir}`);
    } catch (error) {
      logger.error(`Error creating directory ${dir}:`, error);
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Failed to create directory ${dir}: ${(error as Error).message}` });
    }
  }
};

const ensureStringArray = (value: string | string[] | undefined): string[] => {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === 'string') {
    return value.split(';')
      .map(item => item.trim())
      .filter(item => item.length > 0);
  }
  return [];
};

const ensureNumber = (value: string | number | undefined): number | undefined => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const num = parseInt(value.trim(), 10);
    if (!isNaN(num)) return num;
  }
  return undefined;
};

export const generateBindZoneContent = (zone: Zone): string => {
  const soa = zone.soaSettings;
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  const serial = parseInt(`${year}${month}${day}01`);

  const primaryNameserver = soa.primaryNameserver || zone.records.find((r: DnsRecord) => r.type === 'NS' && r.name === '@')?.value || `ns1.${zone.zoneName}.`;
  const primaryNs = primaryNameserver.endsWith('.') ? primaryNameserver : `${primaryNameserver}.`;
  
  const adminEmail = soa.adminEmail || 'admin@example.com';
  const adminEmailSoaFormat = adminEmail.replace('@', '.');
  const adminEmailFormatted = adminEmailSoaFormat.endsWith('.') ? adminEmailSoaFormat : `${adminEmailSoaFormat}.`;

  const ttl = soa.ttl ? parseInt(soa.ttl) : DEFAULT_TTL;
  const refresh = soa.refresh ? parseInt(soa.refresh) : DEFAULT_TTL;
  const retry = soa.retry ? parseInt(soa.retry) : 1800;
  const expire = soa.expire ? parseInt(soa.expire) : 604800;
  const minimum = soa.minimumTtl ? parseInt(soa.minimumTtl) : 86400;

  let zoneContent = `\$TTL ${ttl}\n@ IN SOA ${primaryNs} ${adminEmailFormatted} (\n        ${serial}       ; Serial\n        ${refresh}  ; Refresh\n        ${retry}    ; Retry\n        ${expire}   ; Expire\n        ${minimum}  ; Negative Cache TTL\n);\n`;

  if (!zone.records.some((r: DnsRecord) => r.type === 'NS' && r.name === '@')) {
    zoneContent += `@ IN NS ${primaryNs}\n`;
  }

  for (const record of zone.records) {
    const recordName = record.name || '@';
    switch (record.type.toUpperCase()) {
      case 'A': zoneContent += `${recordName} IN A ${record.value}\n`; break;
      case 'AAAA': zoneContent += `${recordName} IN AAAA ${record.value}\n`; break;
      case 'CNAME':
        const cnameValue = record.value === '@' ? '@' : (record.value.endsWith('.') ? record.value : `${record.value}.`);
        zoneContent += `${recordName} IN CNAME ${cnameValue}\n`;
        break;
      case 'MX':
        const priority = ensureNumber(record.priority);
        if (priority !== undefined) {
          const exchange = record.value.endsWith('.') ? record.value : `${record.value}.`;
          zoneContent += `${recordName} IN MX ${priority} ${exchange}\n`;
        } else {
          logger.warn(`Skipping malformed MX record (${recordName}): missing priority.`);
        }
        break;
      case 'TXT': zoneContent += `${recordName} IN TXT "${record.value.replace(/"/g, '\\"')}"\n`; break;
      case 'NS':
        const nsValue = record.value.endsWith('.') ? record.value : `${record.value}.`;
        zoneContent += `${recordName} IN NS ${nsValue}\n`;
        break;
      case 'PTR':
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
      default: logger.warn(`Unsupported DNS record type: ${record.type} for name ${recordName}.`);
    }
  }
  return zoneContent;
};

const generateNamedConf = (config: DnsConfiguration): string => {
  const actualZoneConfPath = (global as any)._DEV_OVERRIDE_ZONE_CONF_PATH || ZONE_CONF_PATH;
  const listenOn = ensureStringArray(config.listenOn);
  const allowQuery = ensureStringArray(config.allowQuery);
  const allowRecursion = ensureStringArray(config.allowRecursion);
  const forwarders = ensureStringArray(config.forwarders);
  
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
include "${isProd && !(global as any)._DEV_OVERRIDE_ZONE_CONF_PATH ? '/etc/named.rfc1912.zones' : actualZoneConfPath}";
`;
};

const generateZoneConf = (config: DnsConfiguration): string => {
  let zoneConf = '// Zone definitions - generated by DNS Management System\n\n';
  const actualZonesDir = (global as any)._DEV_OVERRIDE_BIND_ZONES_DIR || BIND_ZONES_DIR;
  for (const zone of config.zones) {
    const zoneFilePath = path.join(actualZonesDir, `${zone.fileName}`);
    const allowUpdate = ensureStringArray(zone.allowUpdate);
    const allowTransfer = config.allowTransfer ? ensureStringArray(config.allowTransfer) : [];
    
    zoneConf += `zone "${zone.zoneName}" IN {\n`;
    zoneConf += `  type ${zone.zoneType};\n`;
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

const checkWritePermission = async (filePath: string): Promise<boolean> => {
  if (!isProd) return true;
  try {
    const dirPath = path.dirname(filePath);
    try {
      const stats = await fs.promises.stat(dirPath);
      if (!stats.isDirectory()) {
        logger.error(`Path exists but is not a directory: ${dirPath}`);
        return false;
      }
    } catch (error) {
      logger.error(`Directory does not exist: ${dirPath}`);
      if (dirPath === '/var/named' || dirPath === '/etc') return false;
      try { await ensureDirectoryExists(dirPath); } 
      catch (createError) { logger.error(`Failed to create directory: ${dirPath}`, createError); return false; }
    }
    const testPath = `${dirPath}/.permission_test_${Date.now()}`;
    await writeFile(testPath, 'test', { flag: 'w' });
    await execAsync(`rm ${testPath}`); // Use execAsync for rm
    return true;
  } catch (error) {
    logger.error(`No write permission for ${path.dirname(filePath)}:`, error);
    return false;
  }
};

const writeFileWithBackup = async (filePath: string, content: string): Promise<void> => {
  try {
    if (isProd) {
      const hasPermission = await checkWritePermission(filePath);
      if (!hasPermission) {
        throw new TRPCError({ code: 'FORBIDDEN', message: `No write permission for ${filePath}. Please run with sudo or check permissions.` });
      }
    }
    if (existsSync(filePath)) {
      const backupPath = `${filePath}.bak`;
      await writeFile(backupPath, await readFile(filePath, 'utf8'), 'utf8');
      logger.info(`Created backup of ${filePath} at ${backupPath}`);
    }
    await writeFile(filePath, content, 'utf8');
    logger.info(`Successfully wrote file to ${filePath}`);
  } catch (error) {
    logger.error(`Error writing file ${filePath}:`, error);
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Failed to write file: ${(error as Error).message}` });
  }
};

const validateBindConfiguration = async (zones: Zone[]): Promise<void> => {
  const actualConfPath = (global as any)._DEV_OVERRIDE_BIND_CONF_PATH || BIND_CONF_PATH;
  const actualZonesDir = (global as any)._DEV_OVERRIDE_BIND_ZONES_DIR || BIND_ZONES_DIR;
  if (isProd && !(global as any)._DEV_OVERRIDE_BIND_CONF_PATH) {
    try {
      await execAsync(`named-checkconf ${actualConfPath}`);
      logger.info(`Validated ${actualConfPath} successfully`);
      for (const zone of zones) {
        const zoneFilePath = path.join(actualZonesDir, zone.fileName);
        await execAsync(`named-checkzone ${zone.zoneName} ${zoneFilePath}`);
        logger.info(`Validated zone file ${zoneFilePath} for zone ${zone.zoneName} successfully`);
      }
    } catch (error) {
      logger.error('Error validating BIND configuration:', error);
      throw new TRPCError({ code: 'BAD_REQUEST', message: `Failed to validate BIND configuration: ${(error as Error).message}` });
    }
  } else {
    logger.info(`[DEV MODE] Would validate BIND configuration: ${actualConfPath}`);
    for (const zone of zones) {
      const zoneFilePath = path.join(actualZonesDir, zone.fileName);
      logger.info(`[DEV MODE] Would validate zone file: ${zoneFilePath} for zone ${zone.zoneName}`);
    }
    logger.info('[DEV MODE] Validation successful (simulated)');
  }
};

const reloadBindService = async (): Promise<void> => {
  if (isProd && !(global as any)._DEV_OVERRIDE_BIND_CONF_PATH) {
    try {
      await execAsync('systemctl reload named');
      logger.info('BIND service reloaded successfully');
    } catch (error) {
      logger.error('Error reloading BIND service:', error);
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: `Failed to reload BIND service: ${(error as Error).message}` });
    }
  } else {
    logger.info(`[DEV MODE] Would reload BIND service with command: sudo systemctl reload named`);
    logger.info('[DEV MODE] BIND service reloaded successfully (simulated)');
  }
};

// --- END Helper Functions ---

export const dnsRouter = router({
  updateConfiguration: publicProcedure
    .input(dnsConfigurationSchema)
    .mutation(async ({ input }) => {
      const validatedConfig = input; // Already validated by Zod

      // Process ensureStringArray for relevant fields as Zod transform might not cover all cases or was missed.
      // This is defensive coding. Ideally, Zod transform in shared schema handles this.
      validatedConfig.listenOn = ensureStringArray(validatedConfig.listenOn);
      validatedConfig.allowQuery = ensureStringArray(validatedConfig.allowQuery);
      validatedConfig.allowRecursion = ensureStringArray(validatedConfig.allowRecursion);
      validatedConfig.forwarders = ensureStringArray(validatedConfig.forwarders);
      validatedConfig.allowTransfer = ensureStringArray(validatedConfig.allowTransfer);
      validatedConfig.zones = validatedConfig.zones.map(zone => ({
        ...zone,
        allowUpdate: ensureStringArray(zone.allowUpdate),
      }));
      
      logger.info('Received DNS Configuration for tRPC update:', { config: JSON.stringify(validatedConfig, null, 2) });
      logger.debug(`Running in ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);
      // ... (rest of the logging from controller)

      // Production BIND installation checks & permission checks (adapted)
      if (isProd) {
        // Simplified check for critical paths for brevity in this tRPC adaptation
        const criticalPaths = ['/var/named', '/etc/named.conf'];
        for (const p of criticalPaths) {
          if (!existsSync(p)) {
             // In controller, this led to dev path overrides. Here, we might throw or log differently.
             logger.warn(`Critical BIND path ${p} missing. Behavior might differ from original controller.`);
             // For now, we'll let it proceed and potentially fail at writeFileWithBackup if paths are truly inaccessible.
          }
        }
        // Permission checks are embedded in writeFileWithBackup now
      }

      const actualZonesDir = (global as any)._DEV_OVERRIDE_BIND_ZONES_DIR || BIND_ZONES_DIR;
      const actualConfPath = (global as any)._DEV_OVERRIDE_BIND_CONF_PATH || BIND_CONF_PATH;
      const actualZoneConfPath = (global as any)._DEV_OVERRIDE_ZONE_CONF_PATH || ZONE_CONF_PATH;

      await ensureDirectoryExists(actualZonesDir);
      await ensureDirectoryExists(path.dirname(actualConfPath)); // Ensure config directory exists

      try {
        for (const zone of validatedConfig.zones) {
          const zoneContent = generateBindZoneContent(zone);
          const zoneFilePath = path.join(actualZonesDir, zone.fileName);
          logger.info(`Generating zone file for ${zone.zoneName} at ${zoneFilePath}`);
          await writeFileWithBackup(zoneFilePath, zoneContent);
        }

        const namedConf = generateNamedConf(validatedConfig);
        const zoneConfContent = generateZoneConf(validatedConfig); // Renamed to avoid conflict

        await writeFileWithBackup(actualConfPath, namedConf);
        await writeFileWithBackup(actualZoneConfPath, zoneConfContent);
        
        await validateBindConfiguration(validatedConfig.zones);

        if (validatedConfig.dnsServerStatus) {
          await reloadBindService();
        } else {
          logger.info('DNS server is disabled, skipping reload');
        }

        return {
          message: 'DNS configuration updated successfully',
          data: validatedConfig,
        };
      } catch (error) {
        logger.error('Error in updateDnsConfiguration tRPC procedure:', error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: error instanceof Error ? error.message : 'Failed to update DNS configuration',
        });
      }
    }),

  getConfiguration: publicProcedure
    .query(async () => {
      logger.debug(`(tRPC) Running in ${isProd ? 'PRODUCTION' : 'DEVELOPMENT'} mode`);
      // ... (logging from controller)

      let namedConfExists = false;
      let zonesConfExists = false;
      try { await readFile(BIND_CONF_PATH, 'utf8'); namedConfExists = true; } 
      catch (error) { logger.info(`(tRPC) Named.conf does not exist at ${BIND_CONF_PATH}`); }
      try { await readFile(ZONE_CONF_PATH, 'utf8'); zonesConfExists = true; } 
      catch (error) { logger.info(`(tRPC) Zone conf does not exist at ${ZONE_CONF_PATH}`); }

      let serviceRunning = false;
      if (isProd) {
        try {
          const { stdout } = await execAsync('systemctl is-active named');
          serviceRunning = stdout.trim() === 'active';
          logger.info(`(tRPC) Named service is ${serviceRunning ? 'running' : 'not running'}`);
        } catch (error) {
          logger.info('(tRPC) Error checking named service status, assuming not running');
        }
      }

      if (!namedConfExists || !zonesConfExists) {
        logger.info('(tRPC) Configuration files not found, returning default configuration.');
        // Using a simplified default structure for brevity. Ideally, import or define a proper default.
        return {
          message: 'Default configuration returned as BIND files were not found.',
          data: {
            dnsServerStatus: serviceRunning,
            listenOn: ['127.0.0.1'],
            allowQuery: ['localhost', '127.0.0.1'],
            allowRecursion: ['localhost'],
            forwarders: ['8.8.8.8', '8.8.4.4'],
            allowTransfer: [],
            dnssecValidation: true,
            queryLogging: false,
            zones: [{
              id: 'default-zone-id', // Consider crypto.randomUUID() if available/imported
              zoneName: 'example.com',
              zoneType: 'master',
              fileName: 'example.com.zone',
              allowUpdate: ['none'],
              soaSettings: { // Default SOA
                ttl: "3600",
                primaryNameserver: "ns1.example.com.",
                adminEmail: "admin.example.com.",
                serial: "", // Will be generated
                refresh: "3600",
                retry: "1800",
                expire: "604800",
                minimumTtl: "86400"
              },
              records: [
                { id: 'default-record1-id', type: 'A', name: '@', value: '192.168.1.100', priority: undefined, weight: undefined, port: undefined },
                { id: 'default-record2-id', type: 'CNAME', name: 'www', value: '@', priority: undefined, weight: undefined, port: undefined },
              ],
            }],
          } as DnsConfiguration, // Type assertion
        };
      }

      // Mirroring the 501 Not Implemented from the original controller if files exist
      logger.warn('(tRPC) Existing BIND configuration files found, but parsing them is not implemented.');
      throw new TRPCError({
        code: 'NOT_IMPLEMENTED',
        message: 'Reading current configuration from BIND files is not yet implemented. Submit a new configuration to get started.',
      });
    }),
});

export type DnsRouter = typeof dnsRouter;

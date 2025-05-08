import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { dnsConfigurationSchema, DnsConfiguration } from '../lib/validators/dnsConfigValidator';
import { ZodError } from 'zod';
import { writeFile, readFile } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// --- BEGIN Configuration ---
// !!! IMPORTANT: Adjust these values to your environment !!!
const BIND_ZONE_FILE_PATH = '/var/named/dynamic.internal.zone'; // Where the dynamic zone records will be written
const ZONE_NAME = 'dynamic.internal.'; // The zone name, ensure trailing dot
const PRIMARY_NS_RECORD = 'ns1.dynamic.internal.'; // Primary Name Server for SOA and NS records, ensure trailing dot
const ADMIN_EMAIL_RECORD = 'admin.dynamic.internal.'; // Admin email for SOA (replace . with @ for actual email), ensure trailing dot
const DEFAULT_TTL = 3600; // Default TTL for records

// Path to BIND's main configuration file
const BIND_NAMED_CONF_PATH = '/etc/named.conf';
// --- END Configuration ---


const generateBindZoneContent = (config: DnsConfiguration): string => {
  // Increment serial number (YYYYMMDDNN format)
  // For simplicity, we'll use the current date and a fixed NN (01).
  // A more robust solution would read the current serial from the file and increment it.
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  const serial = parseInt(`${year}${month}${day}01`); // Simple serial

  let zoneContent = `\$TTL ${DEFAULT_TTL}
@ IN SOA ${PRIMARY_NS_RECORD} ${ADMIN_EMAIL_RECORD} (
        ${serial}       ; Serial
        ${DEFAULT_TTL}         ; Refresh
        1800         ; Retry
        604800       ; Expire
        86400 )      ; Negative Cache TTL
;
@ IN NS ${PRIMARY_NS_RECORD}
`;

  // Add records from the configuration
  for (const record of config.records) {
    switch (record.type.toUpperCase()) {
      case 'A':
        zoneContent += `${record.name} IN A ${record.value}\n`;
        break;
      case 'CNAME':
        // Ensure canonicalName (record.value) has a trailing dot if it's an FQDN
        const cnameValue = record.value.endsWith('.') ? record.value : `${record.value}.`;
        zoneContent += `${record.name} IN CNAME ${cnameValue}\n`;
        break;
      case 'MX':
        // Expects record.value to be in format "priority exchange", e.g., "10 mail.example.com."
        const parts = record.value.split(/\s+/);
        if (parts.length === 2 && !isNaN(parseInt(parts[0]))) {
          const priority = parseInt(parts[0]);
          const exchange = parts[1].endsWith('.') ? parts[1] : `${parts[1]}.`;
          zoneContent += `${record.name || '@'} IN MX ${priority} ${exchange}\n`;
        } else {
          console.warn(`Skipping malformed MX record (${record.name}): value should be "priority exchange", got "${record.value}"`);
        }
        break;
      case 'TXT':
        // Ensure TXT record value is properly quoted
        zoneContent += `${record.name} IN TXT "${record.value.replace(/"/g, '\\"')}"\n`;
        break;
      // Add cases for other record types as needed (e.g., AAAA, SRV, etc.)
      default:
        console.warn(`Unsupported DNS record type: ${record.type} for name ${record.name}`);
    }
  }

  return zoneContent;
};

const writeZoneFile = async (filePath: string, content: string): Promise<void> => {
  try {
    await writeFile(filePath, content, 'utf8');
    console.log(`Successfully wrote BIND zone file to ${filePath}`);
  } catch (error) {
    console.error(`Error writing BIND zone file ${filePath}:`, error);
    throw new Error(`Failed to write BIND zone file: ${(error as Error).message}`);
  }
};

const validateBindConfiguration = async (): Promise<void> => {
  try {
    // Validate the main configuration file
    const { stdout: checkConfOut, stderr: checkConfErr } = await execAsync(`named-checkconf ${BIND_NAMED_CONF_PATH}`);
    if (checkConfErr) {
      console.error(`Error during named-checkconf: ${checkConfErr}`);
      throw new Error(`BIND main configuration validation failed: ${checkConfErr}`);
    }
    console.log('BIND main configuration validation successful:', checkConfOut || 'OK');

    // Validate the specific zone file
    // named-checkzone <zone_name> <zone_file_path>
    const { stdout: checkZoneOut, stderr: checkZoneErr } = await execAsync(`named-checkzone ${ZONE_NAME} ${BIND_ZONE_FILE_PATH}`);
    if (checkZoneErr && !checkZoneErr.includes("loaded serial")) { // named-checkzone might output serial to stderr on success
        // A common successful output includes "OK" or "loaded serial"
        // We need to be careful not to interpret successful "loaded serial..." messages in stderr as errors.
        // However, any other stderr output is likely an error.
        // A more robust check might parse the output more carefully.
      let isError = true;
      if (checkZoneOut.includes("OK") || (checkZoneErr.includes("loaded serial") && checkZoneOut.includes("OK"))) {
        isError = false;
      }
      
      if (isError) {
        console.error(`Error during named-checkzone for ${ZONE_NAME} at ${BIND_ZONE_FILE_PATH}: ${checkZoneErr}`);
        console.error(`named-checkzone stdout was: ${checkZoneOut}`);
        throw new Error(`BIND zone file validation for ${ZONE_NAME} failed: ${checkZoneErr}`);
      }
    }
    console.log(`BIND zone file validation for ${ZONE_NAME} successful:`, checkZoneOut || checkZoneErr); // Successful output might be in stderr
  } catch (error) {
    console.error('Error validating BIND configuration:', error);
    if (error instanceof Error && error.message.startsWith('BIND')) { // Propagate specific validation errors
        throw error;
    }
    throw new Error(`Failed to validate BIND configuration: ${(error as Error).message}`);
  }
};

const reloadBindService = async (): Promise<void> => {
  // Note: This command typically requires sudo privileges.
  // Ensure the user running this Node.js application has appropriate sudo rights without a password prompt for this command,
  // or configure a more secure way to trigger BIND reloads (e.g., via a script with setuid or a dedicated daemon).
  const reloadCommand = 'sudo systemctl reload named';
  try {
    console.log(`Attempting to reload BIND service with command: ${reloadCommand}`);
    const { stdout, stderr } = await execAsync(reloadCommand);
    if (stderr) {
      // systemctl reload might send informational messages to stderr even on success.
      // We'll log it but proceed if stdout indicates success or is empty.
      console.warn(`BIND reload stderr: ${stderr}`);
    }
    console.log('BIND service reloaded successfully:', stdout || 'No stdout output from reload command.');
  } catch (error) {
    console.error('Error reloading BIND service:', error);
    throw new Error(`Failed to reload BIND service: ${(error as Error).message}`);
  }
};

export const updateDnsConfiguration = async (req: AuthRequest, res: Response) => {
  try {
    // Validate the request body
    const validatedConfig: DnsConfiguration = dnsConfigurationSchema.parse(req.body);

    console.log('Received DNS Configuration:', JSON.stringify(validatedConfig, null, 2));
    
    // 1. Generate BIND zone file content (was TODO 2)
    const zoneFileContent = generateBindZoneContent(validatedConfig);
    console.log('Generated BIND zone file content:\n', zoneFileContent);

    // 2. Write the content to the BIND zone file (was TODO 3)
    //    (Persisting the configuration - was TODO 1 - is achieved by writing this file)
    await writeZoneFile(BIND_ZONE_FILE_PATH, zoneFileContent);

    // 3. Validate BIND configuration (new step for safety)
    await validateBindConfiguration();
    
    // 4. Trigger a reload/restart of the BIND service.
    await reloadBindService();

    res.status(200).json({ 
        message: 'DNS configuration updated, BIND configuration validated, and service reloaded successfully.', 
        data: validatedConfig 
    });

  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ message: 'Validation Error', errors: error.errors });
    }
    // Handle specific errors from our new functions
    if (error instanceof Error && (error.message.startsWith('Failed to write') || error.message.startsWith('BIND') || error.message.startsWith('Failed to validate') || error.message.startsWith('Failed to reload'))) {
        console.error('Specific error during DNS update process:', error.message);
        return res.status(500).json({ message: error.message });
    }
    console.error('Error updating DNS configuration:', error);
    res.status(500).json({ message: 'Failed to update DNS configuration.' });
  }
}; 
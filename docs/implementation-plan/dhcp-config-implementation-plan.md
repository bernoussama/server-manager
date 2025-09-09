# DHCP Configuration Implementation Plan

Based on your existing DNS and HTTP configuration patterns, here's a comprehensive plan to implement DHCP configuration management following the same architecture and principles.

## 📋 Overview

The DHCP implementation will follow the exact same pattern as your existing DNS and HTTP configurations:
- **Shared types and validators** in `packages/shared/`
- **Backend controller and routes** in `apps/backend/`
- **Frontend UI components** in `apps/ui/`
- **DHCP service integration** with existing service management

## 🏗️ Implementation Structure

### 1. **Shared Package Extensions** (`packages/shared/`)

#### A. Type Definitions (`packages/shared/src/types/dhcp.ts`)

```typescript
// DHCP Configuration Types
export interface DhcpServerConfig {
  dhcpServerStatus: boolean;
  domainName?: string;
  domainNameServers?: string[];
  defaultLeaseTime?: number;
  maxLeaseTime?: number;
  authoritative?: boolean;
  ddnsUpdateStyle?: 'interim' | 'standard' | 'none';
  logFacility?: string;
}

export interface DhcpSubnet {
  id: string;
  network: string;
  netmask: string;
  range?: {
    start: string;
    end: string;
  };
  defaultGateway?: string;
  domainNameServers?: string[];
  broadcastAddress?: string;
  subnetMask?: string;
  pools?: DhcpPool[];
  options?: DhcpOption[];
}

export interface DhcpPool {
  id: string;
  range: {
    start: string;
    end: string;
  };
  allowMembers?: string[];
  denyMembers?: string[];
  options?: DhcpOption[];
}

export interface DhcpHostReservation {
  id: string;
  hostname: string;
  macAddress: string;
  fixedAddress: string;
  options?: DhcpOption[];
}

export interface DhcpOption {
  id: string;
  name: string;
  value: string;
  code?: number;
}

export interface DhcpConfiguration extends DhcpServerConfig {
  subnets: DhcpSubnet[];
  hostReservations: DhcpHostReservation[];
  globalOptions?: DhcpOption[];
}

// Form/UI Types
export interface DhcpConfigFormValues {
  dhcpServerStatus: boolean;
  domainName: string;
  domainNameServers: string; // comma-separated
  defaultLeaseTime: string;
  maxLeaseTime: string;
  authoritative: boolean;
  ddnsUpdateStyle: string;
  
  subnets: Array<{
    id: string;
    network: string;
    netmask: string;
    rangeStart: string;
    rangeEnd: string;
    defaultGateway: string;
    domainNameServers: string;
    broadcastAddress: string;
    subnetMask: string;
  }>;
  
  hostReservations: Array<{
    id: string;
    hostname: string;
    macAddress: string;
    fixedAddress: string;
  }>;
  
  globalOptions: Array<{
    id: string;
    name: string;
    value: string;
  }>;
}

// API Response Types
export interface DhcpUpdateResponse {
  success: boolean;
  message: string;
  data?: DhcpConfiguration;
  errors?: Array<{
    path: (string | number)[];
    message: string;
  }>;
}

export interface DhcpServiceResponse {
  service: 'dhcpd';
  status: 'running' | 'stopped' | 'failed' | 'unknown';
  message: string;
  configTest?: {
    valid: boolean;
    errors?: string[];
  };
}
```

#### B. Validators (`packages/shared/src/validators/dhcpFormValidator.ts`)

```typescript
import { z } from 'zod';

// Validation helpers
export const isValidIpAddress = (ip: string): boolean => {
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  if (!ipv4Regex.test(ip)) return false;
  
  const octets = ip.split('.');
  return octets.every(octet => {
    const num = parseInt(octet, 10);
    return num >= 0 && num <= 255;
  });
};

export const isValidMacAddress = (mac: string): boolean => {
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  return macRegex.test(mac);
};

export const isValidNetmask = (netmask: string): boolean => {
  if (!isValidIpAddress(netmask)) return false;
  
  // Convert to binary and check if it's a valid subnet mask
  const octets = netmask.split('.').map(octet => parseInt(octet, 10));
  const binary = octets.map(octet => octet.toString(2).padStart(8, '0')).join('');
  
  // Valid subnet mask should have consecutive 1s followed by consecutive 0s
  return /^1*0*$/.test(binary);
};

// Schema for DHCP options
export const dhcpOptionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Option name is required"),
  value: z.string().min(1, "Option value is required"),
  code: z.number().int().min(1).max(254).optional(),
});

// Schema for host reservations
export const hostReservationSchema = z.object({
  id: z.string().uuid(),
  hostname: z.string().min(1, "Hostname is required"),
  macAddress: z.string().refine(isValidMacAddress, {
    message: "Invalid MAC address format"
  }),
  fixedAddress: z.string().refine(isValidIpAddress, {
    message: "Invalid IP address"
  }),
});

// Schema for subnets
export const subnetSchema = z.object({
  id: z.string().uuid(),
  network: z.string().refine(isValidIpAddress, {
    message: "Invalid network address"
  }),
  netmask: z.string().refine(isValidNetmask, {
    message: "Invalid subnet mask"
  }),
  rangeStart: z.string().refine(isValidIpAddress, {
    message: "Invalid start IP address"
  }),
  rangeEnd: z.string().refine(isValidIpAddress, {
    message: "Invalid end IP address"
  }),
  defaultGateway: z.string().refine(isValidIpAddress, {
    message: "Invalid gateway IP address"
  }),
  domainNameServers: z.string(),
  broadcastAddress: z.string().refine(isValidIpAddress, {
    message: "Invalid broadcast address"
  }).optional(),
  subnetMask: z.string().refine(isValidNetmask, {
    message: "Invalid subnet mask"
  }).optional(),
}).superRefine((data, ctx) => {
  // Validate IP range
  const startOctets = data.rangeStart.split('.').map(Number);
  const endOctets = data.rangeEnd.split('.').map(Number);
  
  for (let i = 0; i < 4; i++) {
    if (startOctets[i] > endOctets[i]) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['rangeEnd'],
        message: 'End IP must be greater than start IP'
      });
      break;
    } else if (startOctets[i] < endOctets[i]) {
      break;
    }
  }
});

// Main DHCP configuration schema
export const dhcpConfigSchema = z.object({
  dhcpServerStatus: z.boolean(),
  domainName: z.string().min(1, "Domain name is required"),
  domainNameServers: z.string().min(1, "At least one DNS server is required"),
  defaultLeaseTime: z.string().regex(/^\d+$/, {
    message: "Default lease time must be a number"
  }),
  maxLeaseTime: z.string().regex(/^\d+$/, {
    message: "Max lease time must be a number"
  }),
  authoritative: z.boolean().default(true),
  ddnsUpdateStyle: z.enum(['interim', 'standard', 'none']).default('none'),
  
  subnets: z.array(subnetSchema).min(1, "At least one subnet is required"),
  hostReservations: z.array(hostReservationSchema).default([]),
  globalOptions: z.array(dhcpOptionSchema).default([]),
});

export type DhcpConfigFormValues = z.infer<typeof dhcpConfigSchema>;
```

#### C. Transformers (`packages/shared/src/validators/dhcpTransformers.ts`)

```typescript
import type { DhcpConfiguration, DhcpConfigFormValues } from '../types/dhcp';

// Transform UI form data to API format
export const transformDhcpFormToApi = (formData: DhcpConfigFormValues): DhcpConfiguration => {
  return {
    dhcpServerStatus: formData.dhcpServerStatus,
    domainName: formData.domainName,
    domainNameServers: formData.domainNameServers.split(',').map(s => s.trim()),
    defaultLeaseTime: parseInt(formData.defaultLeaseTime),
    maxLeaseTime: parseInt(formData.maxLeaseTime),
    authoritative: formData.authoritative,
    ddnsUpdateStyle: formData.ddnsUpdateStyle as any,
    
    subnets: formData.subnets.map(subnet => ({
      id: subnet.id,
      network: subnet.network,
      netmask: subnet.netmask,
      range: {
        start: subnet.rangeStart,
        end: subnet.rangeEnd
      },
      defaultGateway: subnet.defaultGateway,
      domainNameServers: subnet.domainNameServers.split(',').map(s => s.trim()),
      broadcastAddress: subnet.broadcastAddress,
      subnetMask: subnet.subnetMask,
      pools: [],
      options: []
    })),
    
    hostReservations: formData.hostReservations.map(host => ({
      id: host.id,
      hostname: host.hostname,
      macAddress: host.macAddress,
      fixedAddress: host.fixedAddress,
      options: []
    })),
    
    globalOptions: formData.globalOptions.map(option => ({
      id: option.id,
      name: option.name,
      value: option.value
    }))
  };
};

// Transform API data to UI form format
export const transformDhcpApiToForm = (apiData: DhcpConfiguration): DhcpConfigFormValues => {
  return {
    dhcpServerStatus: apiData.dhcpServerStatus,
    domainName: apiData.domainName || '',
    domainNameServers: (apiData.domainNameServers || []).join(', '),
    defaultLeaseTime: (apiData.defaultLeaseTime || 86400).toString(),
    maxLeaseTime: (apiData.maxLeaseTime || 604800).toString(),
    authoritative: apiData.authoritative !== false,
    ddnsUpdateStyle: apiData.ddnsUpdateStyle || 'none',
    
    subnets: apiData.subnets.map(subnet => ({
      id: subnet.id,
      network: subnet.network,
      netmask: subnet.netmask,
      rangeStart: subnet.range?.start || '',
      rangeEnd: subnet.range?.end || '',
      defaultGateway: subnet.defaultGateway || '',
      domainNameServers: (subnet.domainNameServers || []).join(', '),
      broadcastAddress: subnet.broadcastAddress || '',
      subnetMask: subnet.subnetMask || ''
    })),
    
    hostReservations: apiData.hostReservations.map(host => ({
      id: host.id,
      hostname: host.hostname,
      macAddress: host.macAddress,
      fixedAddress: host.fixedAddress
    })),
    
    globalOptions: (apiData.globalOptions || []).map(option => ({
      id: option.id,
      name: option.name,
      value: option.value
    }))
  };
};
```

### 2. **Backend Implementation** (`apps/backend/`)

#### A. DHCP Controller (`apps/backend/src/controllers/dhcpController.ts`)

```typescript
import type { Response } from 'express';
import type { AuthRequest } from '../middlewares/authMiddleware';
import { dhcpConfigSchema, transformDhcpFormToApi, type DhcpConfigFormValues } from '@server-manager/shared/validators';
import type { DhcpConfiguration, DhcpServiceResponse } from '@server-manager/shared';
import { ZodError } from 'zod';
import { writeFile, readFile, mkdir } from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { existsSync } from 'fs';
import crypto from 'crypto';
import fs from 'fs';
import logger from '../lib/logger.js';
import { ServiceManager } from '../lib/ServiceManager.js';

const execAsync = promisify(exec);
const serviceManager = new ServiceManager();

// Configuration paths
const isProd = process.env.NODE_ENV === 'production';
const DHCPD_CONF_DIR = isProd ? '/etc/dhcp' : './test/dhcp/config';
const DHCPD_CONF_PATH = isProd ? '/etc/dhcp/dhcpd.conf' : './test/dhcp/config/dhcpd.conf';
const DHCPD_BACKUP_DIR = isProd ? '/etc/dhcp/backups' : './test/dhcp/backups';
const DHCPD_LEASES_PATH = isProd ? '/var/lib/dhcpd/dhcpd.leases' : './test/dhcp/dhcpd.leases';

// Generate DHCP configuration
const generateDhcpdConf = (config: DhcpConfiguration): string => {
  let conf = `# DHCP Server Configuration
# Generated by Server Manager on ${new Date().toISOString()}

`;

  // Global options
  if (config.domainName) {
    conf += `option domain-name "${config.domainName}";\n`;
  }
  
  if (config.domainNameServers?.length) {
    conf += `option domain-name-servers ${config.domainNameServers.join(', ')};\n`;
  }
  
  conf += `default-lease-time ${config.defaultLeaseTime || 86400};\n`;
  conf += `max-lease-time ${config.maxLeaseTime || 604800};\n`;
  
  if (config.authoritative) {
    conf += `authoritative;\n`;
  }
  
  if (config.ddnsUpdateStyle && config.ddnsUpdateStyle !== 'none') {
    conf += `ddns-update-style ${config.ddnsUpdateStyle};\n`;
  }
  
  conf += '\n';

  // Global custom options
  if (config.globalOptions?.length) {
    config.globalOptions.forEach(option => {
      conf += `option ${option.name} ${option.value};\n`;
    });
    conf += '\n';
  }

  // Subnets
  config.subnets.forEach(subnet => {
    conf += `subnet ${subnet.network} netmask ${subnet.netmask} {\n`;
    
    if (subnet.range) {
      conf += `  range ${subnet.range.start} ${subnet.range.end};\n`;
    }
    
    if (subnet.defaultGateway) {
      conf += `  option routers ${subnet.defaultGateway};\n`;
    }
    
    if (subnet.domainNameServers?.length) {
      conf += `  option domain-name-servers ${subnet.domainNameServers.join(', ')};\n`;
    }
    
    if (subnet.broadcastAddress) {
      conf += `  option broadcast-address ${subnet.broadcastAddress};\n`;
    }
    
    conf += `}\n\n`;
  });

  // Host reservations
  config.hostReservations.forEach(host => {
    conf += `host ${host.hostname} {\n`;
    conf += `  hardware ethernet ${host.macAddress};\n`;
    conf += `  fixed-address ${host.fixedAddress};\n`;
    conf += `}\n\n`;
  });

  return conf;
};

// Update DHCP configuration
export const updateDhcpConfiguration = async (req: AuthRequest, res: Response) => {
  try {
    const validatedFormData: DhcpConfigFormValues = dhcpConfigSchema.parse(req.body);
    const validatedConfig: DhcpConfiguration = transformDhcpFormToApi(validatedFormData);

    logger.info('Received DHCP Configuration:', { config: JSON.stringify(validatedConfig) });

    // Ensure directories exist
    await ensureDirectoryExists(DHCPD_CONF_DIR);
    await ensureDirectoryExists(DHCPD_BACKUP_DIR);

    // Generate configuration content
    const dhcpdConf = generateDhcpdConf(validatedConfig);

    // Write configuration with backup
    await writeFileWithBackup(DHCPD_CONF_PATH, dhcpdConf, {
      writeJsonVersion: true,
      jsonGenerator: () => validatedConfig
    });

    // Validate configuration
    if (isProd) {
      try {
        await execAsync(`dhcpd -t -cf ${DHCPD_CONF_PATH}`);
      } catch (error) {
        throw new Error(`DHCP configuration validation failed: ${(error as Error).message}`);
      }
    }

    // Reload service if enabled
    if (validatedConfig.dhcpServerStatus) {
      try {
        await serviceManager.restart('dhcpd');
      } catch (error) {
        return res.status(500).json({
          message: 'Failed to reload DHCP server',
          error: (error as Error).message,
          note: 'Configuration files were updated but service reload failed'
        });
      }
    }

    res.status(200).json({
      message: 'DHCP configuration updated successfully',
      data: validatedConfig
    });

  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        message: 'Validation Error',
        errors: error.errors
      });
    }

    logger.error('Error updating DHCP configuration:', error);
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to update DHCP configuration'
    });
  }
};

// Get current DHCP configuration
export const getCurrentDhcpConfiguration = async (req: AuthRequest, res: Response) => {
  try {
    const confJsonPath = `${DHCPD_CONF_PATH}.json`;

    // Check service status
    let serviceRunning = false;
    if (isProd) {
      try {
        const { stdout } = await execAsync('systemctl is-active dhcpd');
        serviceRunning = stdout.trim() === 'active';
      } catch (error) {
        logger.info('DHCP service is not running');
      }
    }

    // Try to read existing configuration
    try {
      const configData = await readFile(confJsonPath, 'utf8');
      const config = JSON.parse(configData);
      config.dhcpServerStatus = serviceRunning;

      res.status(200).json({
        message: 'Current DHCP configuration loaded successfully',
        data: config
      });
    } catch (error) {
      // Return default configuration if none exists
      const defaultConfig: DhcpConfiguration = {
        dhcpServerStatus: serviceRunning,
        domainName: 'local',
        domainNameServers: ['8.8.8.8', '8.8.4.4'],
        defaultLeaseTime: 86400,
        maxLeaseTime: 604800,
        authoritative: true,
        ddnsUpdateStyle: 'none',
        subnets: [{
          id: crypto.randomUUID(),
          network: '192.168.1.0',
          netmask: '255.255.255.0',
          range: {
            start: '192.168.1.100',
            end: '192.168.1.200'
          },
          defaultGateway: '192.168.1.1',
          domainNameServers: ['8.8.8.8', '8.8.4.4']
        }],
        hostReservations: [],
        globalOptions: []
      };

      res.status(200).json({
        message: 'Default DHCP configuration returned',
        data: defaultConfig
      });
    }
  } catch (error) {
    logger.error('Error getting DHCP configuration:', error);
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to get DHCP configuration'
    });
  }
};

// ... (additional helper functions similar to DNS/HTTP controllers)
```

#### B. DHCP Routes (`apps/backend/src/routes/dhcpRoutes.ts`)

```typescript
import express from 'express';
import { protect } from '../middlewares/authMiddleware';
import {
  getCurrentDhcpConfiguration,
  updateDhcpConfiguration,
  validateDhcpConfiguration,
  getDhcpServiceStatus,
  controlDhcpService
} from '../controllers/dhcpController';

const router = express.Router();

// Get current DHCP configuration
router.get('/config', getCurrentDhcpConfiguration);

// Update DHCP configuration (protected)
router.put('/config', protect, updateDhcpConfiguration);

// Validate DHCP configuration
router.post('/validate', protect, validateDhcpConfiguration);

// Get DHCP service status
router.get('/status', getDhcpServiceStatus);

// Control DHCP service (start/stop/restart)
router.post('/service/:action', protect, controlDhcpService);

export default router;
```

### 3. **Frontend Implementation** (`apps/ui/`)

#### A. API Client (`apps/ui/src/lib/api/dhcp.ts`)

```typescript
import type { DhcpConfiguration, DhcpConfigFormValues, DhcpUpdateResponse, DhcpServiceResponse } from '@server-manager/shared';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

// Get current DHCP configuration
export const getDhcpConfigurationAPI = async (): Promise<{ data: DhcpConfiguration }> => {
  const response = await fetch(`${API_BASE_URL}/dhcp/config`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch DHCP configuration: ${response.statusText}`);
  }

  return response.json();
};

// Update DHCP configuration
export const updateDhcpConfigurationAPI = async (formData: DhcpConfigFormValues): Promise<DhcpUpdateResponse> => {
  const response = await fetch(`${API_BASE_URL}/dhcp/config`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(formData),
  });

  const responseData: DhcpUpdateResponse = await response.json();

  if (!response.ok) {
    throw { status: response.status, data: responseData };
  }

  return responseData;
};

// Control DHCP service
export const controlDhcpServiceAPI = async (action: string): Promise<{ data: DhcpServiceResponse }> => {
  const response = await fetch(`${API_BASE_URL}/dhcp/service/${action}`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to ${action} DHCP service: ${response.statusText}`);
  }

  return response.json();
};

// Helper function for auth headers
function getAuthHeaders() {
  const token = localStorage.getItem('authToken');
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` })
  };
}
```

#### B. Main DHCP Component (`apps/ui/src/features/configuration/dhcp/DHCPConfig.tsx`)

```typescript
import * as React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Network } from 'lucide-react';
import { dhcpConfigSchema, transformDhcpApiToForm, type DhcpConfigFormValues } from '@server-manager/shared/validators';
import { getDhcpConfigurationAPI, updateDhcpConfigurationAPI } from "@/lib/api/dhcp";
import { v4 as uuidv4 } from 'uuid';

export function DHCPConfig() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  const form = useForm<DhcpConfigFormValues>({
    resolver: zodResolver(dhcpConfigSchema),
    defaultValues: {
      dhcpServerStatus: false,
      domainName: 'local',
      domainNameServers: '8.8.8.8, 8.8.4.4',
      defaultLeaseTime: '86400',
      maxLeaseTime: '604800',
      authoritative: true,
      ddnsUpdateStyle: 'none',
      subnets: [],
      hostReservations: [],
      globalOptions: []
    }
  });

  const { fields: subnetFields, append: appendSubnet, remove: removeSubnet } = useFieldArray({
    control: form.control,
    name: 'subnets'
  });

  const { fields: hostFields, append: appendHost, remove: removeHost } = useFieldArray({
    control: form.control,
    name: 'hostReservations'
  });

  // Load existing configuration
  React.useEffect(() => {
    const loadConfiguration = async () => {
      try {
        const { data } = await getDhcpConfigurationAPI();
        const formData = transformDhcpApiToForm(data);
        form.reset(formData);
      } catch (error) {
        console.error('Failed to load DHCP configuration:', error);
        toast({
          title: "Error",
          description: "Failed to load DHCP configuration",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadConfiguration();
  }, [form]);

  // Submit handler
  const onSubmit = async (data: DhcpConfigFormValues) => {
    setIsSaving(true);
    try {
      await updateDhcpConfigurationAPI(data);
      toast({
        title: "Success",
        description: "DHCP configuration updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.message || "Failed to update DHCP configuration",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Add new subnet
  const addSubnet = () => {
    appendSubnet({
      id: uuidv4(),
      network: '192.168.1.0',
      netmask: '255.255.255.0',
      rangeStart: '192.168.1.100',
      rangeEnd: '192.168.1.200',
      defaultGateway: '192.168.1.1',
      domainNameServers: '8.8.8.8, 8.8.4.4',
      broadcastAddress: '192.168.1.255',
      subnetMask: '255.255.255.0'
    });
  };

  // Add new host reservation
  const addHostReservation = () => {
    appendHost({
      id: uuidv4(),
      hostname: '',
      macAddress: '',
      fixedAddress: ''
    });
  };

  if (isLoading) {
    return <div>Loading DHCP configuration...</div>;
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General Settings</TabsTrigger>
            <TabsTrigger value="subnets">Subnets</TabsTrigger>
            <TabsTrigger value="reservations">Host Reservations</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5" />
                  DHCP Server Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="dhcpServerStatus"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div>
                        <FormLabel>DHCP Server Status</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Enable or disable the DHCP server
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="domainName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Domain Name</FormLabel>
                        <FormControl>
                          <Input placeholder="example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="domainNameServers"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>DNS Servers</FormLabel>
                        <FormControl>
                          <Input placeholder="8.8.8.8, 8.8.4.4" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="defaultLeaseTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Lease Time (seconds)</FormLabel>
                        <FormControl>
                          <Input placeholder="86400" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="maxLeaseTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Max Lease Time (seconds)</FormLabel>
                        <FormControl>
                          <Input placeholder="604800" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="authoritative"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div>
                        <FormLabel>Authoritative Server</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Act as the authoritative DHCP server for this network
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="subnets" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Network Subnets</h3>
              <Button type="button" onClick={addSubnet} variant="outline">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Subnet
              </Button>
            </div>

            {subnetFields.map((subnet, index) => (
              <Card key={subnet.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Subnet {index + 1}</CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeSubnet(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`subnets.${index}.network`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Network Address</FormLabel>
                          <FormControl>
                            <Input placeholder="192.168.1.0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`subnets.${index}.netmask`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subnet Mask</FormLabel>
                          <FormControl>
                            <Input placeholder="255.255.255.0" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`subnets.${index}.rangeStart`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Range Start</FormLabel>
                          <FormControl>
                            <Input placeholder="192.168.1.100" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`subnets.${index}.rangeEnd`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Range End</FormLabel>
                          <FormControl>
                            <Input placeholder="192.168.1.200" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name={`subnets.${index}.defaultGateway`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Gateway</FormLabel>
                        <FormControl>
                          <Input placeholder="192.168.1.1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="reservations" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Static Host Reservations</h3>
              <Button type="button" onClick={addHostReservation} variant="outline">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Reservation
              </Button>
            </div>

            {hostFields.map((host, index) => (
              <Card key={host.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Host Reservation {index + 1}</CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeHost(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name={`hostReservations.${index}.hostname`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Hostname</FormLabel>
                          <FormControl>
                            <Input placeholder="printer-01" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`hostReservations.${index}.macAddress`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>MAC Address</FormLabel>
                          <FormControl>
                            <Input placeholder="00:11:22:33:44:55" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`hostReservations.${index}.fixedAddress`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fixed IP Address</FormLabel>
                          <FormControl>
                            <Input placeholder="192.168.1.10" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        <div className="flex gap-4">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save DHCP Configuration'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
```

## 🔄 Integration Steps

### 1. **Update Shared Package Exports**
```typescript
// packages/shared/src/index.ts
export {
  // ... existing exports
  dhcpConfigSchema,
  transformDhcpFormToApi,
  transformDhcpApiToForm,
  isValidIpAddress,
  isValidMacAddress,
  isValidNetmask
} from './validators';

export type {
  // ... existing types
  DhcpConfiguration,
  DhcpConfigFormValues,
  DhcpUpdateResponse,
  DhcpServiceResponse
} from './types';
```

### 2. **Add DHCP Routes to Backend**
```typescript
// apps/backend/src/app.ts
import dhcpRoutes from './routes/dhcpRoutes';

// Add after existing routes
app.use('/api/dhcp', dhcpRoutes);
```

### 3. **Update UI Routing**
The DHCP configuration is already accessible via the existing `DHCPConfigView.tsx` page, but you'll need to replace the current placeholder component with the new implementation.

## 🧪 Testing Strategy

### 1. **Unit Tests**
- Validator tests for DHCP configuration schemas
- Transformer tests for form ↔ API data conversion
- IP address and MAC address validation tests

### 2. **Integration Tests**
- Backend API endpoint tests
- DHCP configuration file generation tests
- Service management integration tests

### 3. **End-to-End Tests**
- Complete DHCP configuration workflow
- Form validation and error handling
- Service start/stop/restart functionality

## 📦 Implementation Order

1. **Phase 1: Shared Package** (Types, Validators, Transformers)
2. **Phase 2: Backend** (Controller, Routes, Service Integration)
3. **Phase 3: Frontend** (API Client, UI Components)
4. **Phase 4: Integration** (Route Registration, Testing)
5. **Phase 5: Documentation** (API docs, User guides)

## 🔧 Key Implementation Notes

### DHCP Configuration Features

The implementation will support the following DHCP server features based on ISC DHCP:

1. **Global Options**
   - Domain name and DNS servers
   - Default and maximum lease times
   - Authoritative server declaration
   - Dynamic DNS update style

2. **Subnet Declarations**
   - Network address and subnet mask
   - IP address ranges for dynamic allocation
   - Default gateway (routers option)
   - Subnet-specific DNS servers
   - Broadcast address

3. **Host Reservations**
   - Static IP assignments based on MAC addresses
   - Hostname assignments
   - Host-specific options

4. **Advanced Features** (Future Extensions)
   - Client classes and conditional assignments
   - Pools with allow/deny members
   - Custom DHCP options
   - Failover configuration
   - DHCP relay agent information

### Configuration File Generation

The DHCP controller will generate ISC DHCP-compatible configuration files with:

- Proper syntax validation using `dhcpd -t`
- Automatic backup of existing configurations
- JSON metadata files for easy configuration retrieval
- Development/production mode handling

### Service Management Integration

The DHCP implementation integrates seamlessly with the existing service management system:

- Service status monitoring
- Start/stop/restart operations
- Configuration validation before service reload
- Mock service support for development

This plan follows the exact same patterns as your existing DNS and HTTP implementations, ensuring consistency and maintainability across your codebase. The DHCP configuration will integrate seamlessly with your existing service management and authentication systems. 
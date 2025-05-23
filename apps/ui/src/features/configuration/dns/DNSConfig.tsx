import * as React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { updateDnsConfigurationAPI, getDnsConfigurationAPI } from "@/lib/api/dns";
import { v4 as uuidv4 } from 'uuid';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, useFieldArray, type Control, type UseFormReturn, type FieldArrayWithId } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle } from 'lucide-react';
import { cn, formFieldErrorClass } from '@/lib/utils';
import type { 
  DnsRecord, 
  MxDnsRecord, 
  SrvDnsRecord, 
  BaseDnsRecord, 
  DnsRecordType
} from '../../../types/dns';

// Import directly from shared package
import {
  isNonEmptyString,
  isNumeric,
  RECORD_TYPES,
  dnsRecordUISchema,
  dnsConfigSchema,
  transformUiRecordToApiRecord,
  parseStringToArray,
  transformFormToApiData,
  type UiRecordType
} from '@server-manager/shared/validators';

export type DnsConfigFormValues = z.infer<typeof dnsConfigSchema>;

// Add interface for SOA settings
interface SoaSettings {
  ttl: string;
  primaryNameserver: string;
  adminEmail: string;
  serial: string;
  refresh: string;
  retry: string;
  expire: string;
  minimumTtl: string;
}

// Component for DNS record form fields
interface DnsRecordFormFieldsProps {
  zoneIndex: number;
  recordIndex: number;
  control: Control<DnsConfigFormValues>;
  form: UseFormReturn<DnsConfigFormValues>;
  remove: (index: number) => void;
  item: FieldArrayWithId;
}

const DnsRecordFormFields: React.FC<DnsRecordFormFieldsProps> = ({ 
  zoneIndex, recordIndex, control, form, remove, item 
}) => {
  const currentRecordType = form.watch(`zones.${zoneIndex}.records.${recordIndex}.type` as const);
  const recordErrors = form.formState.errors.zones?.[zoneIndex]?.records?.[recordIndex];

  return (
    <div key={item.id} className="p-3 border rounded-md space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
        <FormField
          control={control}
          name={`zones.${zoneIndex}.records.${recordIndex}.type`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select
                onValueChange={(value: UiRecordType) => {
                  field.onChange(value);
                  form.setValue(`zones.${zoneIndex}.records.${recordIndex}.priority`, '', { shouldValidate: true });
                  form.setValue(`zones.${zoneIndex}.records.${recordIndex}.weight`, '', { shouldValidate: true });
                  form.setValue(`zones.${zoneIndex}.records.${recordIndex}.port`, '', { shouldValidate: true });
                }}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger className={formFieldErrorClass(!!recordErrors?.type)}>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {RECORD_TYPES.map((type: UiRecordType) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={`zones.${zoneIndex}.records.${recordIndex}.name`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Name (@ for root)" 
                  {...field} 
                  className={formFieldErrorClass(!!recordErrors?.name)} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name={`zones.${zoneIndex}.records.${recordIndex}.value`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{currentRecordType === 'SRV' ? 'Target' : 'Value'}</FormLabel>
              <FormControl>
                <Input 
                  placeholder={currentRecordType === 'SRV' ? 'target.example.com' : 'Value'} 
                  {...field} 
                  className={formFieldErrorClass(!!recordErrors?.value)} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      {(currentRecordType === 'MX' || currentRecordType === 'SRV') && (
        <FormField
          control={control}
          name={`zones.${zoneIndex}.records.${recordIndex}.priority`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Priority</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  placeholder="10" 
                  {...field} 
                  className={formFieldErrorClass(!!recordErrors?.priority)} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
      {currentRecordType === 'SRV' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField
            control={control}
            name={`zones.${zoneIndex}.records.${recordIndex}.weight`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Weight</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="5" 
                    {...field} 
                    className={formFieldErrorClass(!!recordErrors?.weight)} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`zones.${zoneIndex}.records.${recordIndex}.port`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Port</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="5060" 
                    {...field} 
                    className={formFieldErrorClass(!!recordErrors?.port)} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
      <Button variant="outline" size="sm" type="button" onClick={() => remove(recordIndex)}>Remove</Button>
    </div>
  );
};

// Component for zone configuration
interface ZoneConfigProps {
  zoneIndex: number;
  control: Control<DnsConfigFormValues>;
  form: UseFormReturn<DnsConfigFormValues>;
  removeZone: (index: number) => void;
}

// SOA Settings Component
const SoaSettingsForm: React.FC<{ zoneIndex: number; control: Control<DnsConfigFormValues>; form: UseFormReturn<DnsConfigFormValues> }> = ({ 
  zoneIndex, control, form 
}) => {
  return (
    <div className="border rounded-md p-4 space-y-4 mb-4">
      <h3 className="text-md font-medium">SOA Record Settings</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={control}
          name={`zones.${zoneIndex}.soaSettings.ttl`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>TTL (seconds)</FormLabel>
              <FormControl>
                <Input 
                  placeholder="86400" 
                  {...field}
                  className={formFieldErrorClass(!!form.formState.errors.zones?.[zoneIndex]?.soaSettings?.ttl)}
                />
              </FormControl>
              <FormDescription>Time to live in seconds</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={control}
          name={`zones.${zoneIndex}.soaSettings.primaryNameserver`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Primary Nameserver</FormLabel>
              <FormControl>
                <Input 
                  placeholder="ns1.example.com." 
                  {...field}
                  className={formFieldErrorClass(!!form.formState.errors.zones?.[zoneIndex]?.soaSettings?.primaryNameserver)}
                />
              </FormControl>
              <FormDescription>Include the trailing dot</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`zones.${zoneIndex}.soaSettings.adminEmail`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Admin Email</FormLabel>
              <FormControl>
                <Input 
                  placeholder="admin.example.com." 
                  {...field}
                  className={formFieldErrorClass(!!form.formState.errors.zones?.[zoneIndex]?.soaSettings?.adminEmail)}
                />
              </FormControl>
              <FormDescription>Use dots instead of @ (admin.example.com)</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={control}
          name={`zones.${zoneIndex}.soaSettings.serial`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Serial</FormLabel>
              <FormControl>
                <Input 
                  placeholder="2023060101" 
                  {...field}
                  className={formFieldErrorClass(!!form.formState.errors.zones?.[zoneIndex]?.soaSettings?.serial)}
                />
              </FormControl>
              <FormDescription>Format: YYYYMMDDNN</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <FormField
          control={control}
          name={`zones.${zoneIndex}.soaSettings.refresh`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Refresh</FormLabel>
              <FormControl>
                <Input 
                  placeholder="3600" 
                  {...field}
                  className={formFieldErrorClass(!!form.formState.errors.zones?.[zoneIndex]?.soaSettings?.refresh)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={control}
          name={`zones.${zoneIndex}.soaSettings.retry`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Retry</FormLabel>
              <FormControl>
                <Input 
                  placeholder="1800" 
                  {...field}
                  className={formFieldErrorClass(!!form.formState.errors.zones?.[zoneIndex]?.soaSettings?.retry)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={control}
          name={`zones.${zoneIndex}.soaSettings.expire`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Expire</FormLabel>
              <FormControl>
                <Input 
                  placeholder="604800" 
                  {...field}
                  className={formFieldErrorClass(!!form.formState.errors.zones?.[zoneIndex]?.soaSettings?.expire)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={control}
          name={`zones.${zoneIndex}.soaSettings.minimumTtl`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Minimum TTL</FormLabel>
              <FormControl>
                <Input 
                  placeholder="86400" 
                  {...field}
                  className={formFieldErrorClass(!!form.formState.errors.zones?.[zoneIndex]?.soaSettings?.minimumTtl)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </div>
  );
};

const ZoneConfig: React.FC<ZoneConfigProps> = ({ zoneIndex, control, form, removeZone }) => {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `zones.${zoneIndex}.records` as const,
  });

  const handleAddRecord = () => {
    append({ 
      id: uuidv4(), 
      type: "A", 
      name: "", 
      value: "", 
      priority: "", 
      weight: "", 
      port: "" 
    });
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex justify-between items-center">
          <FormField
            control={control}
            name={`zones.${zoneIndex}.zoneName`}
            render={({ field }) => (
              <FormItem className="flex-1">
                <FormLabel>Zone Name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="example.com" 
                    {...field}
                    className={formFieldErrorClass(!!form.formState.errors.zones?.[zoneIndex]?.zoneName)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={() => removeZone(zoneIndex)}
            className="ml-4 mt-6"
          >
            Remove Zone
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={control}
            name={`zones.${zoneIndex}.zoneType`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Zone Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger className={formFieldErrorClass(!!form.formState.errors.zones?.[zoneIndex]?.zoneType)}>
                      <SelectValue placeholder="Select zone type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="master">Master</SelectItem>
                    <SelectItem value="slave">Slave</SelectItem>
                    <SelectItem value="forward">Forward</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`zones.${zoneIndex}.fileName`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>File Name</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="forward.example.com" 
                    {...field}
                    className={formFieldErrorClass(!!form.formState.errors.zones?.[zoneIndex]?.fileName)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <FormField
          control={control}
          name={`zones.${zoneIndex}.allowUpdate`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Allow Update</FormLabel>
              <FormControl>
                <Input 
                  placeholder="none" 
                  {...field}
                  className={formFieldErrorClass(!!form.formState.errors.zones?.[zoneIndex]?.allowUpdate)}
                />
              </FormControl>
              <FormDescription>
                Comma-separated list of IP addresses or 'none'
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <Separator className="my-4" />
        
        {/* Add SOA Settings Component */}
        <SoaSettingsForm zoneIndex={zoneIndex} control={control} form={form} />
        
        <Separator className="my-4" />
        
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label className="text-lg">DNS Records</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddRecord}
              className="flex items-center gap-1"
            >
              <PlusCircle className="h-4 w-4" /> Add Record
            </Button>
          </div>
          
          <div className="space-y-4">
            {fields.map((item, recordIndex) => (
              <DnsRecordFormFields
                key={item.id}
                zoneIndex={zoneIndex}
                recordIndex={recordIndex}
                control={control}
                form={form}
                remove={remove}
                item={item}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export function DNSConfig() {
  const [activeTab, setActiveTab] = React.useState("main-config");
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  
  // Get current date in YYYYMMDD format
  const getCurrentDateSerial = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    const day = today.getDate().toString().padStart(2, '0');
    return `${year}${month}${day}01`;
  };
  
  const form = useForm<DnsConfigFormValues>({
    resolver: zodResolver(dnsConfigSchema),
    defaultValues: {
      dnsServerStatus: false,
      listenOn: "127.0.0.1; 192.168.1.160;",
      allowQuery: "localhost; 192.168.1.0/24;",
      allowRecursion: "localhost;",
      forwarders: "8.8.8.8; 8.8.4.4;",
      allowTransfer: "none;",
      dnssecValidation: false,
      zones: [
        {
          id: uuidv4(),
          zoneName: "example.com",
          zoneType: "master",
          fileName: "forward.example.com",
          allowUpdate: "none",
          soaSettings: {
            ttl: "86400",
            primaryNameserver: "ns1.example.com.",
            adminEmail: "admin.example.com.",
            serial: getCurrentDateSerial(),
            refresh: "3600",
            retry: "1800",
            expire: "604800",
            minimumTtl: "86400"
          },
          records: [
            { id: uuidv4(), type: "A", name: "@", value: "192.168.1.1", priority: "", weight: "", port: "" },
            { id: uuidv4(), type: "CNAME", name: "www", value: "@", priority: "", weight: "", port: "" },
            { id: uuidv4(), type: "MX", name: "@", value: "mail.example.com", priority: "10", weight: "", port: "" },
          ],
        },
        {
          id: uuidv4(),
          zoneName: "1.168.192.in-addr.arpa",
          zoneType: "master",
          fileName: "reverse.example.com",
          allowUpdate: "none",
          soaSettings: {
            ttl: "86400",
            primaryNameserver: "ns1.example.com.",
            adminEmail: "admin.example.com.",
            serial: getCurrentDateSerial(),
            refresh: "3600",
            retry: "1800",
            expire: "604800",
            minimumTtl: "86400"
          },
          records: [
            { id: uuidv4(), type: "PTR", name: "1", value: "example.com.", priority: "", weight: "", port: "" },
          ],
        }
      ],
    },
    mode: 'onChange',
  });

  const { fields: zoneFields, append: appendZone, remove: removeZone } = useFieldArray({
    control: form.control,
    name: "zones",
  });

  // Transform API response to form values
  const transformApiToFormValues = React.useCallback((apiData: any): DnsConfigFormValues => {
    const transformedZones = apiData.zones.map((zone: any) => ({
      id: zone.id || uuidv4(),
      zoneName: zone.zoneName,
      zoneType: zone.zoneType,
      fileName: zone.fileName,
      allowUpdate: zone.allowUpdate || "none",
      soaSettings: zone.soaSettings || {
        ttl: "86400",
        primaryNameserver: "ns1.example.com.",
        adminEmail: "admin.example.com.",
        serial: getCurrentDateSerial(),
        refresh: "3600",
        retry: "1800",
        expire: "604800",
        minimumTtl: "86400"
      },
      records: zone.records.map((record: any) => ({
        id: record.id || uuidv4(),
        type: record.type,
        name: record.name,
        value: record.value,
        priority: record.priority || "",
        weight: record.weight || "",
        port: record.port || ""
      }))
    }));

    return {
      dnsServerStatus: apiData.dnsServerStatus || false,
      listenOn: apiData.listenOn || "127.0.0.1",
      allowQuery: apiData.allowQuery || "localhost",
      allowRecursion: apiData.allowRecursion || "localhost",
      forwarders: apiData.forwarders || "8.8.8.8; 8.8.4.4",
      allowTransfer: apiData.allowTransfer || "",
      dnssecValidation: apiData.dnssecValidation || false,
      zones: transformedZones
    };
  }, []);

  // Fetch current configuration on component mount
  React.useEffect(() => {
    const fetchConfiguration = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        
        const response = await getDnsConfigurationAPI();
        const formValues = transformApiToFormValues(response.data);
        
        // Reset the form with fetched values
        form.reset(formValues);
        
        toast({ 
          title: "Configuration Loaded", 
          description: "DNS configuration loaded successfully from server." 
        });
      } catch (error: any) {
        console.error('Failed to load DNS configuration:', error);
        setLoadError(error?.data?.message || error?.message || 'Failed to load configuration');
        
        toast({
          title: "Loading Failed",
          description: "Failed to load DNS configuration. Using default values.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfiguration();
  }, [form, transformApiToFormValues]);

  const onSubmit = async (data: DnsConfigFormValues) => {
    console.log('Form data submitted:', data);
    try {
      // Helper function to safely transform a string input to array
      const toStringArray = (input: string | string[] | undefined): string[] => {
        if (!input) return [];
        if (Array.isArray(input)) return input;
        return input.split(';').map(s => s.trim()).filter(Boolean);
      };

      // Transform the form data to the API format
      const transformedData = {
        dnsServerStatus: data.dnsServerStatus,
        listenOn: toStringArray(data.listenOn),
        allowQuery: toStringArray(data.allowQuery),
        allowRecursion: toStringArray(data.allowRecursion),
        forwarders: toStringArray(data.forwarders),
        allowTransfer: toStringArray(data.allowTransfer),
        dnssecValidation: data.dnssecValidation,
        zones: data.zones.map(zone => ({
          id: zone.id,
          zoneName: zone.zoneName,
          zoneType: zone.zoneType,
          fileName: zone.fileName,
          allowUpdate: toStringArray(zone.allowUpdate),
          soaSettings: zone.soaSettings,
          records: zone.records.map(transformUiRecordToApiRecord)
        }))
      };

      await updateDnsConfigurationAPI(transformedData);
      toast({ title: "Success", description: "DNS configuration saved successfully!" });
    } catch (err: any) {
      if (err.data && Array.isArray(err.data.errors)) {
        err.data.errors.forEach((error: { path: (string | number)[], message: string }) => {
          form.setError(error.path.join('.') as any, { 
            type: 'manual', 
            message: error.message 
          });
        });
        toast({ title: "Validation Failed", description: "Please check the errors on the form.", variant: "destructive" });
      } else {
        toast({
          title: "Error",
          description: err?.data?.message || err?.message || "Failed to save DNS configuration.",
          variant: "destructive",
        });
      }
    }
  };

  const handleAddZone = () => {
    appendZone({
      id: uuidv4(),
      zoneName: "",
      zoneType: "master",
      fileName: "",
      allowUpdate: "none",
      soaSettings: {
        ttl: "86400",
        primaryNameserver: "ns1.example.com.",
        adminEmail: "admin.example.com.",
        serial: getCurrentDateSerial(),
        refresh: "3600",
        retry: "1800",
        expire: "604800",
        minimumTtl: "86400"
      },
      records: [],
    });
    // Switch to zones tab when adding a new zone
    setActiveTab("zones");
  };

  // Generate preview of bind configuration
  const generateBindConfig = () => {
    const values = form.getValues();
    
    let config = `# BIND DNS Server Configuration\n\n`;
    config += `options {\n`;
    config += `  listen-on port 53 { ${values.listenOn} };\n`;
    config += `  allow-query { ${values.allowQuery} };\n`;
    config += `  allow-recursion { ${values.allowRecursion} };\n`;
    config += `  forwarders { ${values.forwarders} };\n`;
    config += `  allow-transfer { ${values.allowTransfer} };\n`;
    config += `  dnssec-validation ${values.dnssecValidation ? 'yes' : 'no'};\n`;
    config += `};\n\n`;
    
    values.zones.forEach((zone) => {
      config += `zone "${zone.zoneName}" IN {\n`;
      config += `  type ${zone.zoneType};\n`;
      config += `  file "${zone.fileName}";\n`;
      config += `  allow-update { ${zone.allowUpdate} };\n`;
      config += `};\n\n`;

      // Generate zone file preview
      config += `# Zone file: ${zone.fileName} \n`;
      config += `$TTL ${zone.soaSettings?.ttl || '86400'}\n`;
      config += `@ IN SOA ${zone.soaSettings?.primaryNameserver || 'ns1.example.com.'} ${zone.soaSettings?.adminEmail || 'admin.example.com.'} (\n`;
      config += `        ${zone.soaSettings?.serial || getCurrentDateSerial()}  ;Serial\n`;
      config += `        ${zone.soaSettings?.refresh || '3600'}        ;Refresh\n`;
      config += `        ${zone.soaSettings?.retry || '1800'}        ;Retry\n`;
      config += `        ${zone.soaSettings?.expire || '604800'}      ;Expire\n`;
      config += `        ${zone.soaSettings?.minimumTtl || '86400'}       ;Minimum TTL\n`;
      config += `)\n\n`;
      
      // Add record preview
      zone.records.forEach(record => {
        if (record.type === 'MX') {
          config += `${record.name} IN ${record.type} ${record.priority} ${record.value}\n`;
        } else if (record.type === 'SRV') {
          config += `${record.name} IN ${record.type} ${record.priority} ${record.weight} ${record.port} ${record.value}\n`;
        } else {
          config += `${record.name} IN ${record.type} ${record.value}\n`;
        }
      });
      config += `\n`;
    });
    
    return config;
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading DNS configuration...</p>
        </div>
      </div>
    );
  }

  // Show error state  
  if (loadError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-destructive mb-4">Failed to load DNS configuration</p>
          <p className="text-muted-foreground text-sm mb-4">{loadError}</p>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="dnsServerStatus"
          render={({ field }) => (
            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm">
              <div className="space-y-0.5">
                <FormLabel className="text-base">DNS Server Status</FormLabel>
                <FormDescription>
                  Enable or disable the DNS server.
                </FormDescription>
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

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="main-config">Main Config</TabsTrigger>
            <TabsTrigger value="zones">Zones</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          
          <TabsContent value="main-config" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Main Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="listenOn"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Listen On</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="127.0.0.1; 192.168.1.160;" 
                          {...field}
                          className={formFieldErrorClass(!!form.formState.errors.listenOn)}
                        />
                      </FormControl>
                      <FormDescription>
                        Semicolon-separated list of IP addresses to listen on
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="allowQuery"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Allow Query</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="localhost; 192.168.1.0/24;" 
                          {...field}
                          className={formFieldErrorClass(!!form.formState.errors.allowQuery)}
                        />
                      </FormControl>
                      <FormDescription>
                        Semicolon-separated list of IP addresses/networks allowed to query
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="allowRecursion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Allow Recursion</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="localhost;" 
                          {...field}
                          className={formFieldErrorClass(!!form.formState.errors.allowRecursion)}
                        />
                      </FormControl>
                      <FormDescription>
                        Semicolon-separated list of IP addresses/networks allowed recursive queries
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="forwarders"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Forwarders</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="8.8.8.8; 8.8.4.4;" 
                          {...field}
                          className={formFieldErrorClass(!!form.formState.errors.forwarders)}
                        />
                      </FormControl>
                      <FormDescription>
                        Semicolon-separated list of DNS servers to forward queries to
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="allowTransfer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Allow Transfer</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="none;" 
                          {...field}
                          className={formFieldErrorClass(!!form.formState.errors.allowTransfer)}
                        />
                      </FormControl>
                      <FormDescription>
                        Semicolon-separated list of IP addresses/networks allowed zone transfers
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dnssecValidation"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>DNSSEC Validation</FormLabel>
                        <FormDescription>
                          Enable DNSSEC validation for resolving queries.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                       <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="zones" className="space-y-4 mt-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">DNS Zones</h2>
              <Button 
                onClick={handleAddZone} 
                className="flex items-center gap-1"
              >
                <PlusCircle className="h-4 w-4" /> Add Zone
              </Button>
            </div>
            
            {zoneFields.map((zone, index) => (
              <ZoneConfig
                key={zone.id}
                zoneIndex={index}
                control={form.control}
                form={form}
                removeZone={removeZone}
              />
            ))}
            
            {zoneFields.length === 0 && (
              <div className="text-center p-8 border border-dashed rounded-md">
                <p className="text-muted-foreground">No zones configured. Click "Add Zone" to create one.</p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="preview" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Configuration Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea 
                  readOnly 
                  className="font-mono h-[500px] whitespace-pre"
                  value={generateBindConfig()}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
        
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving..." : "Save DNS Configuration"}
        </Button>
      </form>
    </Form>
  );
} 
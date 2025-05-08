'use client';

import React, { useState } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { DnsConfigurationFormValues, DnsRecordFormValues } from '../../types/dns';
import { updateDnsConfigurationAPI } from '../../lib/api/dns';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Trash2, PlusCircle } from 'lucide-react';
import { toast } from 'sonner';

const dnsRecordSchemaClient = z.object({
  type: z.enum(['A', 'CNAME', 'MX', 'TXT', 'AAAA', 'SRV', 'NS']), // Add more types as needed
  name: z.string().min(1, 'Record name is required'),
  value: z.string().min(1, 'Record value is required'),
  // Add more specific validation for value based on type if needed
  // e.g., for A records, value should be an IP address.
  // for MX, value should be "priority FQDN."
});

const dnsConfigurationSchemaClient = z.object({
  dnsServerStatus: z.boolean(),
  domainName: z.string().min(1, 'Domain name is required').refine(val => val.endsWith('.'), { message: 'Domain name must end with a period (.)'}),
  primaryNameserver: z.string().min(1, 'Primary nameserver is required').refine(val => val.endsWith('.'), { message: 'Primary nameserver must end with a period (.)'}),
  records: z.array(dnsRecordSchemaClient).min(1, 'At least one DNS record is required'),
});

const RECORD_TYPES = ['A', 'CNAME', 'MX', 'TXT', 'AAAA', 'SRV', 'NS']; // For the select dropdown

export function DnsConfigForm() {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<DnsConfigurationFormValues>({
    resolver: zodResolver(dnsConfigurationSchemaClient),
    defaultValues: {
      dnsServerStatus: true,
      domainName: 'example.com.', // Default value, ensure trailing dot
      primaryNameserver: 'ns1.example.com.', // Default value, ensure trailing dot
      records: [
        { type: 'A', name: '@', value: '192.168.1.100' },
        { type: 'CNAME', name: 'www', value: '@' },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'records',
  });

  const onSubmit = async (data: DnsConfigurationFormValues) => {
    setIsLoading(true);
    toast.info('Updating DNS configuration...');
    console.log('Submitting DNS Configuration:', data);

    try {
      const result = await updateDnsConfigurationAPI(data);
      toast.success(result.message || 'DNS configuration updated successfully!');
      console.log('API Success:', result);
      // Optionally reset form or update with response data if needed
      // form.reset(result.data); 
    } catch (error: any) {
      console.error('API Error caught in form:', error);
      let errorMessage = 'Failed to update DNS configuration.';
      if (error && error.data && error.data.message) {
        errorMessage = error.data.message;
      }
      if (error && error.data && error.data.errors) {
        // Handle Zod validation errors from backend
        error.data.errors.forEach((err: { path: (string | number)[]; message: string }) => {
          const fieldName = err.path.join('.') as any; // Type assertion
          // react-hook-form setError requires a specific structure
          // For nested fields like records[0].name, this might need more specific handling
          // if fieldName is like "records.0.name" we might need to parse it.
          // For now, just show a general error with details
          errorMessage += ` \nField: ${fieldName}, Error: ${err.message}`;
          // Attempt to set error on form field if possible (basic for now)
          try {
            form.setError(fieldName, { type: 'manual', message: err.message });
          } catch (e) {
            console.warn('Could not set error on field:', fieldName, e);
          }
        });
      }
      toast.error(errorMessage, { duration: 10000 }); // Show detailed error for longer
    }
    setIsLoading(false);
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>DNS Server Configuration</CardTitle>
        <CardDescription>Manage your DNS zone records and server settings.</CardDescription>
      </CardHeader>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="dnsServerStatus">DNS Server Status</Label>
            <Controller
              name="dnsServerStatus"
              control={form.control}
              render={({ field }) => (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="dnsServerStatus"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isLoading}
                  />
                  <Label htmlFor="dnsServerStatus" className="text-sm font-medium">
                    {field.value ? 'Enabled' : 'Disabled'}
                  </Label>
                </div>
              )}
            />
            {form.formState.errors.dnsServerStatus && (
              <p className="text-sm text-red-500">{form.formState.errors.dnsServerStatus.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="domainName">Domain Name (e.g., example.com.)</Label>
            <Input 
              id="domainName" 
              {...form.register('domainName')} 
              placeholder="your.domain.com." 
              disabled={isLoading} 
            />
            {form.formState.errors.domainName && (
              <p className="text-sm text-red-500">{form.formState.errors.domainName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="primaryNameserver">Primary Nameserver (e.g., ns1.example.com.)</Label>
            <Input 
              id="primaryNameserver" 
              {...form.register('primaryNameserver')} 
              placeholder="ns1.your.domain.com." 
              disabled={isLoading} 
            />
            {form.formState.errors.primaryNameserver && (
              <p className="text-sm text-red-500">{form.formState.errors.primaryNameserver.message}</p>
            )}
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">DNS Records</h3>
            {fields.map((item, index) => (
              <Card key={item.id} className="mb-4 p-4 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  <div className="space-y-1">
                    <Label htmlFor={`records.${index}.type`}>Type</Label>
                    <Controller
                      name={`records.${index}.type` as const}
                      control={form.control}
                      render={({ field }) => (
                        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={isLoading}>
                          <SelectTrigger id={`records.${index}.type`}>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {RECORD_TYPES.map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {form.formState.errors.records?.[index]?.type && typeof form.formState.errors.records?.[index]?.type?.message === 'string' && (
                      <p className="text-sm text-red-500">{form.formState.errors.records?.[index]?.type?.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={`records.${index}.name`}>Name</Label>
                    <Input
                      id={`records.${index}.name`}
                      {...form.register(`records.${index}.name` as const)}
                      placeholder="@, www, mail"
                      disabled={isLoading}
                    />
                    {form.formState.errors.records?.[index]?.name && (
                      <p className="text-sm text-red-500">{form.formState.errors.records?.[index]?.name?.message}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor={`records.${index}.value`}>Value</Label>
                    <Input
                      id={`records.${index}.value`}
                      {...form.register(`records.${index}.value` as const)}
                      placeholder="IP, hostname, or '10 mx.example.com.'"
                      disabled={isLoading}
                    />
                    {form.formState.errors.records?.[index]?.value && (
                      <p className="text-sm text-red-500">{form.formState.errors.records?.[index]?.value?.message}</p>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => remove(index)}
                  disabled={isLoading || fields.length <= 1}
                  className="mt-2"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Remove Record
                </Button>
              </Card>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ type: 'A', name: '', value: '' } as DnsRecordFormValues) }
              disabled={isLoading}
              className="mt-2"
            >
              <PlusCircle className="h-4 w-4 mr-2" /> Add Record
            </Button>
            {form.formState.errors.records && form.formState.errors.records.message && (
                 <p className="text-sm text-red-500">{form.formState.errors.records.message}</p>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isLoading} className="w-full md:w-auto">
            {isLoading ? 'Saving...' : 'Save DNS Configuration'}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
} 
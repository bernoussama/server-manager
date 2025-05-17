import * as React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useState } from "react"; // Keep for 'saving' if not fully replaced by isSubmitting
import { updateDnsConfigurationAPI } from "@/lib/api/dns";
import { v4 as uuidv4 } from 'uuid';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, useFieldArray, Controller, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';

interface DnsRecordUI {
  id: string;
  type: string;
  name: string;
  value: string; // For SRV, this UI field holds the 'target'
  priority?: string;
  weight?: string;
  port?: string;
}

const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'PTR', 'SRV'] as const;
type RecordTypeTuple = typeof RECORD_TYPES;
type RecordType = RecordTypeTuple[number];

// Zod schema for DnsRecordUI
const dnsRecordUISchema = z.object({
  id: z.string().uuid(),
  type: z.enum(RECORD_TYPES),
  name: z.string().min(1, "Name is required"),
  value: z.string(), // This will be 'target' for SRV records in UI, validated as required conditionally
  priority: z.string().optional(),
  weight: z.string().optional(),
  port: z.string().optional(),
}).superRefine((data, ctx) => {
  const isNumeric = (val: string | undefined) => val !== undefined && val.trim() !== '' && !isNaN(parseInt(val));
  const isMissing = (val: string | undefined) => val === undefined || val.trim() === '';

  if (data.type === 'MX') {
    if (isMissing(data.priority)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['priority'], message: 'Priority is required' });
    } else if (!isNumeric(data.priority)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['priority'], message: 'Priority must be a number' });
    }
    if (isMissing(data.value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['value'], message: 'Value (mail server hostname) is required' });
    }
  } else if (data.type === 'SRV') {
    if (isMissing(data.priority)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['priority'], message: 'Priority is required' });
    } else if (!isNumeric(data.priority)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['priority'], message: 'Priority must be a number' });
    }
    if (isMissing(data.weight)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['weight'], message: 'Weight is required' });
    } else if (!isNumeric(data.weight)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['weight'], message: 'Weight must be a number' });
    }
    if (isMissing(data.port)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['port'], message: 'Port is required' });
    } else if (!isNumeric(data.port)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['port'], message: 'Port must be a number' });
    }
    if (isMissing(data.value)) { // UI 'value' is SRV 'target'
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['value'], message: 'Target is required (in value field)' });
    }
  } else if (['A', 'AAAA', 'CNAME', 'TXT', 'NS', 'PTR'].includes(data.type)) {
    if (isMissing(data.value)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['value'], message: 'Value is required for this record type' });
    }
  }
});

// Zod schema for the main form
const dnsConfigSchema = z.object({
  dnsServerStatus: z.boolean(),
  domainName: z.string().min(1, "Domain name is required")
    .regex(/^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}$/, "Invalid domain name format"),
  primaryNameserver: z.string().min(1, "Primary nameserver is required")
    .regex(/^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,6}$/, "Invalid nameserver format"),
  records: z.array(dnsRecordUISchema).min(1, "At least one DNS record is required"),
});

export type DnsConfigFormValues = z.infer<typeof dnsConfigSchema>;

const initialNewRecordBase: Omit<z.infer<typeof dnsRecordUISchema>, 'id'> = { type: "A", name: "", value: "", priority: "", weight: "", port: "" };

export function DNSConfig() {
  // const [saving, setSaving] = useState(false); // Replaced by form.formState.isSubmitting

  const form = useForm<DnsConfigFormValues>({
    resolver: zodResolver(dnsConfigSchema),
    defaultValues: {
      dnsServerStatus: false,
      domainName: "",
      primaryNameserver: "",
      records: [
        { id: uuidv4(), type: "A", name: "@", value: "192.168.1.1", priority: "", weight: "", port: "" },
        { id: uuidv4(), type: "CNAME", name: "www", value: "@", priority: "", weight: "", port: "" },
        { id: uuidv4(), type: "MX", name: "mail", value: "mail.example.com", priority: "10", weight: "", port: "" },
      ],
    },
    mode: 'onChange', // Validate on change for immediate feedback
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "records",
  });

  const onSubmit = async (data: DnsConfigFormValues) => {
    // setSaving(true); // form.formState.isSubmitting handles this
    try {
      const apiRecords = data.records.map(rec => {
        const apiRecord: any = {
          type: rec.type,
          name: rec.name,
        };
        if (rec.value !== undefined) apiRecord.value = rec.value;

        if (rec.type === 'MX' || rec.type === 'SRV') {
          if (rec.priority !== undefined && rec.priority.trim() !== '') {
            apiRecord.priority = parseInt(rec.priority, 10);
          }
        }
        if (rec.type === 'SRV') {
          if (rec.weight !== undefined && rec.weight.trim() !== '') {
            apiRecord.weight = parseInt(rec.weight, 10);
          }
          if (rec.port !== undefined && rec.port.trim() !== '') {
            apiRecord.port = parseInt(rec.port, 10);
          }
          apiRecord.target = rec.value; // Map UI 'value' to API 'target'
          delete apiRecord.value;
        }
        return apiRecord;
      });

      const configToSave = {
        dnsServerStatus: data.dnsServerStatus,
        domainName: data.domainName,
        primaryNameserver: data.primaryNameserver,
        records: apiRecords,
      };

      await updateDnsConfigurationAPI(configToSave);
      toast({ title: "Success", description: "DNS configuration saved successfully!" });
    } catch (err: any) {
      if (err.response && err.response.status === 400 && err.response.data && Array.isArray(err.response.data.errors)) {
        err.response.data.errors.forEach((error: { path: (string | number)[], message: string }) => {
          let fieldPath = error.path.join('.');
          // Map API's 'target' error for SRV back to UI's 'value' field
          if (error.path.length === 3 && error.path[0] === 'records' && typeof error.path[1] === 'number' && error.path[2] === 'target') {
            const recordIndex = error.path[1];
            // Ensure the record at this index is indeed an SRV record before remapping
            if (form.getValues(`records.${recordIndex}.type`) === 'SRV') {
              fieldPath = `records.${recordIndex}.value`;
            }
          }
          form.setError(fieldPath as any, { type: 'manual', message: error.message });
        });
        toast({ title: "Validation Failed", description: "Please check the errors on the form.", variant: "destructive" });
      } else {
        toast({
          title: "Error",
          description: err?.response?.data?.message || err?.message || "Failed to save DNS configuration.",
          variant: "destructive",
        });
      }
    } finally {
      // setSaving(false);
    }
  };

  const handleAddNewRecord = () => {
    append({ ...initialNewRecordBase, id: uuidv4() });
  };

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
        <Separator />
        <div className="grid gap-4">
          <FormField
            control={form.control}
            name="domainName"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="domain">Domain Name</FormLabel>
                <FormControl>
                  <Input id="domain" placeholder="example.com" {...field} className={form.formState.errors.domainName ? 'border-red-500' : ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="primaryNameserver"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="nameserver">Primary Nameserver</FormLabel>
                <FormControl>
                  <Input id="nameserver" placeholder="ns1.example.com" {...field} className={form.formState.errors.primaryNameserver ? 'border-red-500' : ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="grid gap-2">
            <Label>DNS Records</Label>
            <div className="w-full rounded-md border p-4 space-y-4" data-component-name="DNSConfig">
              {fields.map((item, index) => {
                const currentRecordType = form.watch(`records.${index}.type`);
                const recordErrors = form.formState.errors.records?.[index];
                return (
                  <div key={item.id} className="p-3 border rounded-md space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
                      <FormField
                        control={form.control}
                        name={`records.${index}.type`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Type</FormLabel>
                            <Select
                              onValueChange={(value) => {
                                field.onChange(value);
                                // Reset related fields on type change
                                form.setValue(`records.${index}.priority`, '', { shouldValidate: true });
                                form.setValue(`records.${index}.weight`, '', { shouldValidate: true });
                                form.setValue(`records.${index}.port`, '', { shouldValidate: true });
                                if (value !== 'SRV') { // Keep value for other types
                                    // form.setValue(`records.${index}.value`, '', { shouldValidate: true }); // Or conditionally clear
                                }
                              }}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className={recordErrors?.type ? 'border-red-500' : ''}>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {RECORD_TYPES.map(type => (
                                  <SelectItem key={type} value={type}>{type}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`records.${index}.name`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Name (@ for root)" {...field} className={recordErrors?.name ? 'border-red-500' : ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`records.${index}.value`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{currentRecordType === 'SRV' ? 'Target' : 'Value'}</FormLabel>
                            <FormControl>
                              <Input placeholder={currentRecordType === 'SRV' ? 'target.example.com' : 'Value'} {...field} className={recordErrors?.value ? 'border-red-500' : ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    {(currentRecordType === 'MX' || currentRecordType === 'SRV') && (
                      <FormField
                        control={form.control}
                        name={`records.${index}.priority`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priority</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="10" {...field} className={recordErrors?.priority ? 'border-red-500' : ''} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                    {currentRecordType === 'SRV' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <FormField
                          control={form.control}
                          name={`records.${index}.weight`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Weight</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="5" {...field} className={recordErrors?.weight ? 'border-red-500' : ''} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name={`records.${index}.port`}
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Port</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="5060" {...field} className={recordErrors?.port ? 'border-red-500' : ''} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                    <Button variant="outline" size="sm" type="button" onClick={() => remove(index)}>Remove</Button>
                  </div>
                );
              })}
            </div>
            <FormMessage>{form.formState.errors.records?.message}</FormMessage>
            <Button
              variant="outline"
              className="w-full mt-4"
              type="button"
              onClick={handleAddNewRecord}
            >
              + Add Record
            </Button>
          </div>
        </div>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving..." : "Save DNS Configuration"}
        </Button>
      </form>
    </Form>
  );
} 
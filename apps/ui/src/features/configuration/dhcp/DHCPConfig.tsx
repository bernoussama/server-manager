import * as React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { toast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Network, Server, Users, Settings } from 'lucide-react';
import { dhcpConfigSchema, transformDhcpApiToForm, type DhcpConfigFormValues } from '@server-manager/shared/validators';
import { getDhcpConfigurationAPI, updateDhcpConfigurationAPI, getDhcpServiceStatusAPI, controlDhcpServiceAPI } from "@/lib/api/dhcp";
import { v4 as uuidv4 } from 'uuid';

export function DHCPConfig() {
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [serviceStatus, setServiceStatus] = React.useState<'running' | 'stopped' | 'unknown'>('unknown');

  const form = useForm<DhcpConfigFormValues>({
    resolver: zodResolver(dhcpConfigSchema),
    defaultValues: {
      dhcpServerStatus: false,
      domainName: 'local',
      domainNameServers: '8.8.8.8, 8.8.4.4',
      defaultLeaseTime: '86400',
      maxLeaseTime: '604800',
      authoritative: true,
      ddnsUpdateStyle: 'none' as const,
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

  const { fields: optionFields, append: appendOption, remove: removeOption } = useFieldArray({
    control: form.control,
    name: 'globalOptions'
  });

  // Load existing configuration and service status
  React.useEffect(() => {
    const loadConfiguration = async () => {
      try {
        const [configResponse, statusResponse] = await Promise.all([
          getDhcpConfigurationAPI(),
          getDhcpServiceStatusAPI().catch(() => ({ data: { status: 'unknown' } }))
        ]);
        
        const formData = transformDhcpApiToForm(configResponse.data);
        form.reset(formData as any); // Type coercion for form reset
        setServiceStatus(statusResponse.data.status as any);
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
      
      // Refresh service status
      try {
        const statusResponse = await getDhcpServiceStatusAPI();
        setServiceStatus(statusResponse.data.status as any);
      } catch (error) {
        console.warn('Failed to refresh service status:', error);
      }
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

  // Add new global option
  const addGlobalOption = () => {
    appendOption({
      id: uuidv4(),
      name: '',
      value: ''
    });
  };

  // Control service
  const handleServiceAction = async (action: string) => {
    try {
      await controlDhcpServiceAPI(action);
      const statusResponse = await getDhcpServiceStatusAPI();
      setServiceStatus(statusResponse.data.status as any);
      toast({
        title: "Success",
        description: `DHCP service ${action} completed successfully`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.message || `Failed to ${action} DHCP service`,
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading DHCP configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">DHCP Configuration</h2>
            <p className="text-muted-foreground">Configure your DHCP server settings</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              serviceStatus === 'running' ? 'bg-green-100 text-green-800' :
              serviceStatus === 'stopped' ? 'bg-red-100 text-red-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              Service: {serviceStatus}
            </div>
            {serviceStatus === 'stopped' && (
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => handleServiceAction('start')}
              >
                Start Service
              </Button>
            )}
            {serviceStatus === 'running' && (
              <Button 
                type="button" 
                variant="outline" 
                size="sm"
                onClick={() => handleServiceAction('restart')}
              >
                Restart Service
              </Button>
            )}
          </div>
        </div>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="subnets">Subnets</TabsTrigger>
            <TabsTrigger value="reservations">Host Reservations</TabsTrigger>
            <TabsTrigger value="options">Global Options</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
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
                        <FormDescription>
                          Enable or disable the DHCP server
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
                        <FormDescription>Comma-separated list of DNS servers</FormDescription>
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
                        <FormDescription>Default: 86400 (24 hours)</FormDescription>
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
                        <FormDescription>Default: 604800 (7 days)</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="authoritative"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Authoritative Server</FormLabel>
                          <FormDescription>
                            Act as the authoritative DHCP server for this network
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

                  <FormField
                    control={form.control}
                    name="ddnsUpdateStyle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>DDNS Update Style</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select DDNS style" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="interim">Interim</SelectItem>
                            <SelectItem value="standard">Standard</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
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
                    <CardTitle className="flex items-center gap-2">
                      <Network className="h-4 w-4" />
                      Subnet {index + 1}
                    </CardTitle>
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

                  <div className="grid grid-cols-2 gap-4">
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

                    <FormField
                      control={form.control}
                      name={`subnets.${index}.domainNameServers`}
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
                </CardContent>
              </Card>
            ))}

            {subnetFields.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Network className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No subnets configured</p>
                  <Button type="button" onClick={addSubnet} variant="ghost" className="mt-2">
                    Add your first subnet
                  </Button>
                </CardContent>
              </Card>
            )}
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
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Host Reservation {index + 1}
                    </CardTitle>
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

            {hostFields.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Users className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No host reservations configured</p>
                  <Button type="button" onClick={addHostReservation} variant="ghost" className="mt-2">
                    Add your first reservation
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="options" className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Global DHCP Options</h3>
              <Button type="button" onClick={addGlobalOption} variant="outline">
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Option
              </Button>
            </div>

            {optionFields.map((option, index) => (
              <Card key={option.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Option {index + 1}
                    </CardTitle>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removeOption(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name={`globalOptions.${index}.name`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Option Name</FormLabel>
                          <FormControl>
                            <Input placeholder="ntp-servers" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name={`globalOptions.${index}.value`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Option Value</FormLabel>
                          <FormControl>
                            <Input placeholder="pool.ntp.org" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            ))}

            {optionFields.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Settings className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No global options configured</p>
                  <Button type="button" onClick={addGlobalOption} variant="ghost" className="mt-2">
                    Add your first option
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex gap-4">
          <Button type="submit" disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save DHCP Configuration'}
          </Button>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => form.reset()}
            disabled={isSaving}
          >
            Reset
          </Button>
        </div>
      </form>
    </Form>
  );
} 
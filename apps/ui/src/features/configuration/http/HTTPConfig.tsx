import React from 'react';
import { useForm, useFieldArray, type Control, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { v4 as uuidv4 } from 'uuid';
import { httpConfigSchema, transformHttpApiToForm, type HttpConfigFormValues, type VirtualHostFormValues } from '@server-manager/shared/validators';
import type { HttpConfiguration } from '@server-manager/shared';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Server, Globe, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getHttpConfigurationAPI, updateHttpConfigurationAPI, getHttpServiceStatusAPI, controlHttpServiceAPI } from '@/lib/api/http';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// Virtual Host Configuration Component
interface VirtualHostConfigProps {
  virtualHostIndex: number;
  control: Control<HttpConfigFormValues>;
  form: UseFormReturn<HttpConfigFormValues>;
  removeVirtualHost: (index: number) => void;
}

const VirtualHostConfig: React.FC<VirtualHostConfigProps> = ({ 
  virtualHostIndex, control, form, removeVirtualHost 
}) => {
  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Globe className="h-4 w-4" />
            <CardTitle className="text-sm">Virtual Host {virtualHostIndex + 1}</CardTitle>
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => removeVirtualHost(virtualHostIndex)}
            className="h-8 w-8"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={control}
            name={`virtualHosts.${virtualHostIndex}.enabled`}
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel className="text-sm font-medium">Enabled</FormLabel>
                  <FormDescription className="text-xs">
                    Enable this virtual host
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={control}
            name={`virtualHosts.${virtualHostIndex}.serverName`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Server Name</FormLabel>
                <FormControl>
                  <Input placeholder="example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`virtualHosts.${virtualHostIndex}.port`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Port</FormLabel>
                <FormControl>
                  <Input placeholder="80" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={control}
          name={`virtualHosts.${virtualHostIndex}.documentRoot`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Document Root</FormLabel>
              <FormControl>
                <Input placeholder="/var/www/html" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={control}
          name={`virtualHosts.${virtualHostIndex}.serverAlias`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Server Alias</FormLabel>
              <FormControl>
                <Input placeholder="www.example.com,blog.example.com" {...field} />
              </FormControl>
              <FormDescription>
                Comma-separated list of server aliases
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={control}
            name={`virtualHosts.${virtualHostIndex}.directoryIndex`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Directory Index</FormLabel>
                <FormControl>
                  <Input placeholder="index.html index.php" {...field} />
                </FormControl>
                <FormDescription>
                  Space-separated list of index files
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`virtualHosts.${virtualHostIndex}.accessLogFormat`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Access Log Format</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select format" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="combined">Combined</SelectItem>
                    <SelectItem value="common">Common</SelectItem>
                    <SelectItem value="referer">Referer</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={control}
            name={`virtualHosts.${virtualHostIndex}.errorLog`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Error Log</FormLabel>
                <FormControl>
                  <Input placeholder="/var/log/httpd/error.log" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`virtualHosts.${virtualHostIndex}.accessLog`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Access Log</FormLabel>
                <FormControl>
                  <Input placeholder="/var/log/httpd/access.log" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* SSL Configuration */}
        <div className="space-y-4">
          <FormField
            control={control}
            name={`virtualHosts.${virtualHostIndex}.sslEnabled`}
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <FormLabel className="flex items-center space-x-2">
                    <Shield className="h-4 w-4" />
                    <span>Enable SSL/TLS</span>
                  </FormLabel>
                  <FormDescription>
                    Enable HTTPS for this virtual host
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />

          {form.watch(`virtualHosts.${virtualHostIndex}.sslEnabled`) && (
            <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-md">
              <FormField
                control={control}
                name={`virtualHosts.${virtualHostIndex}.sslCertificateFile`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SSL Certificate File</FormLabel>
                    <FormControl>
                      <Input placeholder="/etc/ssl/certs/example.crt" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`virtualHosts.${virtualHostIndex}.sslCertificateKeyFile`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>SSL Certificate Key File</FormLabel>
                    <FormControl>
                      <Input placeholder="/etc/ssl/private/example.key" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>

        <FormField
          control={control}
          name={`virtualHosts.${virtualHostIndex}.customDirectives`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Custom Directives</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="# Custom Apache directives
RewriteEngine On
RewriteRule ^(.*)$ https://www.example.com$1 [R=301,L]"
                  rows={4}
                  {...field} 
                />
              </FormControl>
              <FormDescription>
                Custom Apache directives for this virtual host
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </CardContent>
    </Card>
  );
};

// Service Status Component
const HttpServiceStatus: React.FC<{ onStatusChange?: () => void }> = ({ onStatusChange }) => {
  const [status, setStatus] = React.useState<'running' | 'stopped' | 'failed' | 'unknown'>('unknown');
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();

  const fetchStatus = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await getHttpServiceStatusAPI();
      setStatus(response.data.status);
    } catch (error: any) {
      console.error('Failed to fetch HTTP service status:', error);
      setStatus('unknown');
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleServiceAction = async (action: 'start' | 'stop' | 'restart') => {
    try {
      setIsLoading(true);
      await controlHttpServiceAPI(action);
      await fetchStatus();
      onStatusChange?.();
      toast({
        title: "Success",
        description: `HTTP service ${action} completed successfully.`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error?.data?.message || `Failed to ${action} HTTP service.`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'running':
        return <Badge variant="default" className="bg-green-500">Running</Badge>;
      case 'stopped':
        return <Badge variant="secondary">Stopped</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Server className="h-5 w-5" />
          <span>HTTP Service Control</span>
        </CardTitle>
        <CardDescription>
          Manage the Apache HTTP service
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Service Status:</span>
          {getStatusBadge()}
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleServiceAction('start')}
            disabled={isLoading || status === 'running'}
          >
            Start
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleServiceAction('stop')}
            disabled={isLoading || status === 'stopped'}
          >
            Stop
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleServiceAction('restart')}
            disabled={isLoading}
          >
            Restart
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchStatus}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Main HTTP Configuration Component
export function HTTPConfig() {
  const [activeTab, setActiveTab] = React.useState("main-config");
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const { toast } = useToast();

  const form = useForm<HttpConfigFormValues>({
    resolver: zodResolver(httpConfigSchema),
    defaultValues: {
      serverStatus: false,
      serverName: 'localhost',
      serverAdmin: 'admin@localhost',
      listenPorts: '80,443',
      serverTokens: 'Prod',
      timeout: '60',
      keepAlive: true,
      modules: [
        {
          name: 'mpm_event',
          enabled: true,
          required: true,
          description: 'Event-driven processing module (recommended for most configurations)'
        },
        {
          name: 'dir',
          enabled: true,
          required: true,
          description: 'Directory index handling'
        },
        {
          name: 'mime',
          enabled: true,
          required: true,
          description: 'MIME type associations'
        },
        {
          name: 'rewrite',
          enabled: true,
          required: false,
          description: 'URL rewriting engine'
        },
        {
          name: 'ssl',
          enabled: true,
          required: false,
          description: 'SSL/TLS encryption support'
        },
        {
          name: 'alias',
          enabled: true,
          required: false,
          description: 'URL aliasing and redirection'
        },
        {
          name: 'authz_core',
          enabled: true,
          required: true,
          description: 'Core authorization functionality'
        },
        {
          name: 'authz_host',
          enabled: true,
          required: false,
          description: 'Host-based authorization'
        },
        {
          name: 'log_config',
          enabled: true,
          required: false,
          description: 'Logging configuration'
        }
      ],
      virtualHosts: [
        {
          id: uuidv4(),
          enabled: true,
          serverName: 'localhost',
          documentRoot: '/var/www/html',
          port: '80',
          directoryIndex: 'index.html index.php',
          errorLog: '/var/log/httpd/localhost_error.log',
          accessLog: '/var/log/httpd/localhost_access.log',
          accessLogFormat: 'combined',
          sslEnabled: false,
          serverAlias: '',
          sslCertificateFile: '',
          sslCertificateKeyFile: '',
          customDirectives: ''
        }
      ]
    },
    mode: 'onChange',
  });

  const { fields: virtualHostFields, append: appendVirtualHost, remove: removeVirtualHost } = useFieldArray({
    control: form.control,
    name: "virtualHosts",
  });

  // Transform API response to form values
  const transformApiToFormValues = React.useCallback((apiData: HttpConfiguration): HttpConfigFormValues => {
    const transformed = transformHttpApiToForm(apiData);
    // Ensure serverTokens is properly typed
    return {
      ...transformed,
      serverTokens: (transformed.serverTokens as any) || 'Prod'
    };
  }, []);

  // Fetch current configuration on component mount
  React.useEffect(() => {
    const fetchConfiguration = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        
        const response = await getHttpConfigurationAPI();
        const formValues = transformApiToFormValues(response.data);
        
        // Reset the form with fetched values
        form.reset(formValues);
        
        toast({ 
          title: "Configuration Loaded", 
          description: "HTTP configuration loaded successfully from server." 
        });
      } catch (error: any) {
        console.error('Failed to load HTTP configuration:', error);
        setLoadError(error?.data?.message || error?.message || 'Failed to load configuration');
        
        toast({
          title: "Loading Failed",
          description: "Failed to load HTTP configuration. Using default values.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfiguration();
  }, [form, transformApiToFormValues, toast]);

  const onSubmit = async (data: HttpConfigFormValues) => {
    console.log('Form data submitted:', data);
    try {
      await updateHttpConfigurationAPI(data);
      toast({ title: "Success", description: "HTTP configuration saved successfully!" });
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
          description: err?.data?.message || err?.message || "Failed to save HTTP configuration.",
          variant: "destructive",
        });
      }
    }
  };

  const handleAddVirtualHost = () => {
    appendVirtualHost({
      id: uuidv4(),
      enabled: true,
      serverName: '',
      documentRoot: '/var/www/html',
      port: '80',
      directoryIndex: 'index.html',
      errorLog: '',
      accessLog: '',
      accessLogFormat: 'combined',
      sslEnabled: false,
      serverAlias: '',
      sslCertificateFile: '',
      sslCertificateKeyFile: '',
      customDirectives: ''
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-lg font-medium">Loading HTTP Configuration...</div>
          <div className="text-sm text-muted-foreground mt-2">Please wait while we fetch the current settings.</div>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-lg font-medium text-destructive">Failed to Load Configuration</div>
          <div className="text-sm text-muted-foreground mt-2">{loadError}</div>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="main-config">Global Configuration</TabsTrigger>
            <TabsTrigger value="virtual-hosts">Virtual Hosts</TabsTrigger>
            <TabsTrigger value="service-control">Service Control</TabsTrigger>
          </TabsList>
          
          <TabsContent value="main-config" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>HTTP Server Global Configuration</CardTitle>
                <CardDescription>
                  Configure global Apache HTTP server settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="serverStatus"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">HTTP Server Status</FormLabel>
                        <FormDescription>
                          Enable or disable the HTTP server
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="serverName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Server Name</FormLabel>
                        <FormControl>
                          <Input placeholder="localhost" {...field} />
                        </FormControl>
                        <FormDescription>
                          Primary server name (FQDN)
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="serverAdmin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Server Admin</FormLabel>
                        <FormControl>
                          <Input placeholder="admin@localhost" {...field} />
                        </FormControl>
                        <FormDescription>
                          Administrator email address
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="listenPorts"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Listen Ports</FormLabel>
                        <FormControl>
                          <Input placeholder="80,443" {...field} />
                        </FormControl>
                        <FormDescription>
                          Comma-separated list of ports
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="timeout"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Timeout (seconds)</FormLabel>
                        <FormControl>
                          <Input placeholder="60" {...field} />
                        </FormControl>
                        <FormDescription>
                          Request timeout in seconds
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="serverTokens"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Server Tokens</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select server tokens" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Off">Off</SelectItem>
                            <SelectItem value="Prod">Prod</SelectItem>
                            <SelectItem value="Major">Major</SelectItem>
                            <SelectItem value="Minor">Minor</SelectItem>
                            <SelectItem value="Min">Min</SelectItem>
                            <SelectItem value="OS">OS</SelectItem>
                            <SelectItem value="Full">Full</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Controls server version information disclosure
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="keepAlive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">Keep Alive</FormLabel>
                          <FormDescription>
                            Enable persistent connections
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Apache Modules Configuration */}
            <Card>
              <CardHeader>
                <CardTitle>Apache Modules</CardTitle>
                <CardDescription>
                  Configure which Apache modules to load. Required modules cannot be disabled.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {form.watch('modules')?.map((module, index) => (
                    <FormField
                      key={module.name}
                      control={form.control}
                      name={`modules.${index}.enabled`}
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base flex items-center gap-2">
                              {module.name}
                              {module.required && (
                                <Badge variant="secondary" className="text-xs">Required</Badge>
                              )}
                            </FormLabel>
                            <FormDescription className="text-sm">
                              {module.description || `Apache module: mod_${module.name}`}
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch 
                              checked={field.value} 
                              onCheckedChange={field.onChange}
                              disabled={module.required}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  ))}
                  
                  {(!form.watch('modules') || form.watch('modules').length === 0) && (
                    <div className="text-center py-8 text-muted-foreground">
                      <div className="text-lg font-medium">No modules configured</div>
                      <div className="text-sm mt-2">Modules will be automatically configured when you save the configuration.</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="virtual-hosts" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium">Virtual Hosts</h3>
                <p className="text-sm text-muted-foreground">
                  Manage virtual host configurations
                </p>
              </div>
              <Button type="button" onClick={handleAddVirtualHost}>
                <Plus className="h-4 w-4 mr-2" />
                Add Virtual Host
              </Button>
            </div>

            <div className="space-y-4">
              {virtualHostFields.map((field, index) => (
                <VirtualHostConfig
                  key={field.id}
                  virtualHostIndex={index}
                  control={form.control}
                  form={form}
                  removeVirtualHost={removeVirtualHost}
                />
              ))}
            </div>

            {virtualHostFields.length === 0 && (
              <Card className="p-8 text-center">
                <div className="text-muted-foreground">
                  <Globe className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  <p>No virtual hosts configured.</p>
                  <p className="text-sm">Click "Add Virtual Host" to get started.</p>
                </div>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="service-control" className="space-y-6">
            <HttpServiceStatus onStatusChange={() => {
              // Optionally refetch configuration after service changes
            }} />
          </TabsContent>
        </Tabs>

        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            Save HTTP Configuration
          </Button>
        </div>
      </form>
    </Form>
  );
} 
import { Layers, Activity, Settings, Terminal, Globe, Network, Server, Home, BarChart } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { ThemeProvider } from './components/theme-provider';
import { ThemeToggle } from './components/theme-toggle';
import { Sidebar } from './components/ui/sidebar';
import { useState, useEffect } from 'react';
import servicesApi, { AllowedService, ServiceStatus } from './lib/api/services';
import { toast } from '@/hooks/use-toast';

function ServiceCard({ name, status: initialStatus, memory, cpu }: {
  name: string;
  status: 'running' | 'stopped';
  memory: string;
  cpu: string;
}) {
  const [status, setStatus] = useState<ServiceStatus>(initialStatus);
  const [isLoading, setIsLoading] = useState<{
    start: boolean;
    stop: boolean;
    restart: boolean;
    refreshing: boolean;
  }>({
    start: false,
    stop: false,
    restart: false,
    refreshing: false,
  });

  // Auto-refresh the status every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLoading.start && !isLoading.stop && !isLoading.restart && !isLoading.refreshing) {
        refreshStatus();
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [isLoading.start, isLoading.stop, isLoading.restart, isLoading.refreshing]);

  // Convert service name to the expected API format
  const getServiceId = (): AllowedService => {
    const serviceMap: Record<string, AllowedService> = {
      'DNS Server': 'named',
      'DHCP Server': 'dhcpd',
      'HTTP Server': 'httpd',
    };
    return serviceMap[name] || 'named';
  };

  // Fetch the current status of the service
  const refreshStatus = async () => {
    try {
      setIsLoading(prev => ({ ...prev, refreshing: true }));
      const response = await servicesApi.getServiceStatus(getServiceId());
      if (response.success && response.data) {
        setStatus(response.data.status);
      }
    } catch (error) {
      console.error('Failed to refresh service status:', error);
    } finally {
      setIsLoading(prev => ({ ...prev, refreshing: false }));
    }
  };

  const waitAndRefreshStatus = async () => {
    // Wait 2 seconds before checking status to allow operation to complete
    setTimeout(async () => {
      await refreshStatus();
      // Check again after another second in case there's a delay in the system reflecting status
      setTimeout(async () => {
        await refreshStatus();
      }, 1000);
    }, 2000);
  };

  const handleStart = async () => {
    try {
      setIsLoading(prev => ({ ...prev, start: true }));
      const response = await servicesApi.startService(getServiceId());
      if (response.success) {
        toast({
          title: 'Service Started',
          description: `${name} has been started successfully.`,
        });
        await waitAndRefreshStatus();
      } else {
        throw new Error(response.error || 'Failed to start service');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to start service',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(prev => ({ ...prev, start: false }));
    }
  };

  const handleStop = async () => {
    try {
      setIsLoading(prev => ({ ...prev, stop: true }));
      const response = await servicesApi.stopService(getServiceId());
      if (response.success) {
        toast({
          title: 'Service Stopped',
          description: `${name} has been stopped successfully.`,
        });
        await waitAndRefreshStatus();
      } else {
        throw new Error(response.error || 'Failed to stop service');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to stop service',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(prev => ({ ...prev, stop: false }));
    }
  };

  const handleRestart = async () => {
    try {
      setIsLoading(prev => ({ ...prev, restart: true }));
      const response = await servicesApi.restartService(getServiceId());
      if (response.success) {
        toast({
          title: 'Service Restarted',
          description: `${name} has been restarted successfully.`,
        });
        await waitAndRefreshStatus();
      } else {
        throw new Error(response.error || 'Failed to restart service');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to restart service',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(prev => ({ ...prev, restart: false }));
    }
  };

  return (
    <Card className="p-4 rounded-xl shadow-md transition-transform hover:scale-[1.02] bg-card flex flex-col justify-between min-h-[200px]">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-muted mb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            {name}
            <Badge
              variant={status === 'running' ? 'default' : 'destructive'}
              className={`ml-2 px-3 py-1 text-xs font-bold rounded-full ${status === 'running' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
            >
              {status}
              {isLoading.refreshing && '...'}
            </Badge>
          </CardTitle>
        </div>
        <div className="flex space-x-1">
          <Button
            variant="default"
            size="icon"
            onClick={handleStart}
            disabled={isLoading.start || isLoading.stop || isLoading.restart || status === 'running'}
            className="rounded-full bg-green-500 hover:bg-green-600 text-white"
            title="Start"
          >
            {isLoading.start ? <span className="animate-spin">↻</span> : <span>▶</span>}
          </Button>
          <Button
            variant="destructive"
            size="icon"
            onClick={handleStop}
            disabled={isLoading.stop || isLoading.start || isLoading.restart || status === 'stopped'}
            className="rounded-full"
            title="Stop"
          >
            {isLoading.stop ? <span className="animate-spin">↻</span> : <span>■</span>}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRestart}
            disabled={isLoading.restart || isLoading.start || isLoading.stop || status === 'stopped'}
            className="rounded-full"
            title="Restart"
          >
            {isLoading.restart ? <span className="animate-spin">↻</span> : <span>⟳</span>}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={refreshStatus}
            disabled={isLoading.refreshing || isLoading.start || isLoading.stop || isLoading.restart}
            className="rounded-full"
            title="Refresh"
          >
            <span>↻</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 mt-2">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex flex-col items-start">
            <span className="font-medium text-xs text-foreground">Memory</span>
            <span className="font-mono text-base">{memory}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="font-medium text-xs text-foreground">CPU</span>
            <span className="font-mono text-base">{cpu}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SystemStats() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">45%</div>
          <p className="text-xs text-muted-foreground">+2% from last hour</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
          <Layers className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">2.4GB</div>
          <p className="text-xs text-muted-foreground">of 8GB</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Uptime</CardTitle>
          <Terminal className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">15d 4h</div>
          <p className="text-xs text-muted-foreground">Last boot: Jan 15, 2024</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Services</CardTitle>
          <Settings className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">8</div>
          <p className="text-xs text-muted-foreground">of 12 total services</p>
        </CardContent>
      </Card>
    </div>
  );
}

function ServiceLogs() {
  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>Service Logs</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] w-full rounded-md border p-4">
          <pre className="text-sm">
            {`[2024-01-20 10:15:32] DNS Service started
[2024-01-20 10:15:33] DHCP Service started
[2024-01-20 10:15:34] HTTP Service started
[2024-01-20 10:16:00] DNS query: example.com from 192.168.1.100
[2024-01-20 10:16:05] DHCP: New lease for 192.168.1.120
[2024-01-20 10:16:10] HTTP: 200 GET /index.html`}
          </pre>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function DNSConfig() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h4 className="text-sm font-medium leading-none">DNS Server Status</h4>
          <p className="text-sm text-muted-foreground">Enable or disable the DNS server</p>
        </div>
        <Switch />
      </div>
      <Separator />
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="domain">Domain Name</Label>
          <Input id="domain" placeholder="example.com" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="nameserver">Primary Nameserver</Label>
          <Input id="nameserver" placeholder="ns1.example.com" />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="records">DNS Records</Label>
          <ScrollArea className="h-[200px] w-full rounded-md border">
            <div className="p-4 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="grid grid-cols-4 gap-2">
                  <Input placeholder="Type" defaultValue={i === 0 ? "A" : i === 1 ? "CNAME" : "MX"} />
                  <Input placeholder="Name" defaultValue={i === 0 ? "@" : i === 1 ? "www" : "mail"} />
                  <Input placeholder="Value" defaultValue={i === 0 ? "192.168.1.1" : i === 1 ? "@" : "mail.example.com"} />
                  <Button variant="outline" size="icon" className="w-full">+</Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
      <Button>Save DNS Configuration</Button>
    </div>
  );
}

function DHCPConfig() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h4 className="text-sm font-medium leading-none">DHCP Server Status</h4>
          <p className="text-sm text-muted-foreground">Enable or disable the DHCP server</p>
        </div>
        <Switch />
      </div>
      <Separator />
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="start-ip">Start IP</Label>
            <Input id="start-ip" placeholder="192.168.1.100" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="end-ip">End IP</Label>
            <Input id="end-ip" placeholder="192.168.1.200" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="subnet-mask">Subnet Mask</Label>
            <Input id="subnet-mask" placeholder="255.255.255.0" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lease-time">Lease Time (hours)</Label>
            <Input id="lease-time" type="number" placeholder="24" />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="gateway">Default Gateway</Label>
          <Input id="gateway" placeholder="192.168.1.1" />
        </div>
        <div className="grid gap-2">
          <Label>Static Leases</Label>
          <ScrollArea className="h-[200px] w-full rounded-md border">
            <div className="p-4 space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="grid grid-cols-3 gap-2">
                  <Input placeholder="MAC Address" defaultValue={i === 0 ? "00:11:22:33:44:55" : "66:77:88:99:AA:BB"} />
                  <Input placeholder="IP Address" defaultValue={i === 0 ? "192.168.1.10" : "192.168.1.11"} />
                  <Button variant="outline" size="icon" className="w-full">+</Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
      <Button>Save DHCP Configuration</Button>
    </div>
  );
}

function HTTPConfig() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h4 className="text-sm font-medium leading-none">HTTP Server Status</h4>
          <p className="text-sm text-muted-foreground">Enable or disable the HTTP server</p>
        </div>
        <Switch />
      </div>
      <Separator />
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="port">Port</Label>
            <Input id="port" placeholder="80" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="root-dir">Root Directory</Label>
            <Input id="root-dir" placeholder="/var/www/html" />
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Virtual Hosts</Label>
          <ScrollArea className="h-[200px] w-full rounded-md border">
            <div className="p-4 space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="grid grid-cols-3 gap-2">
                  <Input placeholder="Domain" defaultValue={i === 0 ? "example.com" : "blog.example.com"} />
                  <Input placeholder="Root Path" defaultValue={i === 0 ? "/var/www/example" : "/var/www/blog"} />
                  <Button variant="outline" size="icon" className="w-full">+</Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
        <div className="grid gap-2">
          <div className="flex items-center space-x-2">
            <Switch id="ssl" />
            <Label htmlFor="ssl">Enable SSL/TLS</Label>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="grid gap-2">
              <Label htmlFor="cert-path">Certificate Path</Label>
              <Input id="cert-path" placeholder="/etc/ssl/certs/example.crt" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="key-path">Private Key Path</Label>
              <Input id="key-path" placeholder="/etc/ssl/private/example.key" />
            </div>
          </div>
        </div>
      </div>
      <Button>Save HTTP Configuration</Button>
    </div>
  );
}

export default function App() {
  const sidebarItems = [
    { title: "Dashboard", href: "/", icon: <Home className="h-4 w-4" /> },
    { title: "System Stats", href: "/stats", icon: <BarChart className="h-4 w-4" /> },
    { title: "DNS Config", href: "/dns", icon: <Globe className="h-4 w-4" /> },
    { title: "DHCP Config", href: "/dhcp", icon: <Network className="h-4 w-4" /> },
    { title: "HTTP Config", href: "/http", icon: <Server className="h-4 w-4" /> },
    { title: "Services", href: "/services", icon: <Layers className="h-4 w-4" /> },
    { title: "Settings", href: "/settings", icon: <Settings className="h-4 w-4" /> },
  ];

  return (
    <ThemeProvider defaultTheme="system" storageKey="app-theme">
      <div className="flex min-h-screen bg-background">
        <Sidebar items={sidebarItems} />
        <div className="flex-1 md:ml-64">
          <div className="flex flex-col space-y-8 p-8">
            <div className="flex justify-between items-center">
              <h1 className="text-3xl font-bold md:block hidden">System Dashboard</h1>
              <div className="flex items-center space-x-2">
                <ThemeToggle />
              </div>
            </div>

            <SystemStats />

            <Tabs defaultValue="services" className="space-y-4">
              <TabsList>
                <TabsTrigger value="services">Services</TabsTrigger>
                <TabsTrigger value="dns">DNS Config</TabsTrigger>
                <TabsTrigger value="dhcp">DHCP Config</TabsTrigger>
                <TabsTrigger value="http">HTTP Config</TabsTrigger>
              </TabsList>

              <TabsContent value="services" className="space-y-4">
                <div className="grid gap-6 md:grid-cols-3">
                  <ServiceCard
                    name="DNS Server"
                    status="running"
                    memory="128MB"
                    cpu="2%"
                  />
                  <ServiceCard
                    name="DHCP Server"
                    status="running"
                    memory="96MB"
                    cpu="1%"
                  />
                  <ServiceCard
                    name="HTTP Server"
                    status="stopped"
                    memory="0MB"
                    cpu="0%"
                  />
                </div>
                <ServiceLogs />
              </TabsContent>

              <TabsContent value="dns">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Globe className="h-5 w-5" />
                      DNS Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DNSConfig />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="dhcp">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Network className="h-5 w-5" />
                      DHCP Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DHCPConfig />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="http">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Server className="h-5 w-5" />
                      HTTP Configuration
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <HTTPConfig />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}

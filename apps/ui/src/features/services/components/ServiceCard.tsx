import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import servicesApi, { type AllowedService, type ServiceStatus } from '@/lib/api/services';
import { toast } from '@/hooks/use-toast';
import { Activity, Play, Square, RotateCcw, RefreshCw, Server } from 'lucide-react';

export function ServiceCard({ 
  name, 
  status: initialStatus, 
  memory, 
  cpu,
  onServiceUpdate
}: {
  name: string;
  status: ServiceStatus;
  memory: string;
  cpu: string;
  onServiceUpdate?: () => void;
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

  // Update local status when prop changes
  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  // Auto-refresh the status every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLoading.start && !isLoading.stop && !isLoading.restart && !isLoading.refreshing) {
        refreshStatus();
      }
    }, 10000);
    
    return () => clearInterval(interval);
  }, [isLoading.start, isLoading.stop, isLoading.restart, isLoading.refreshing]);

  const getServiceId = (): AllowedService => {
    const serviceMap: Record<string, AllowedService> = {
      'DNS Server': 'named',
      'DHCP Server': 'dhcpd',
      'HTTP Server': 'httpd',
    };
    return serviceMap[name] || 'named';
  };

  const refreshStatus = async () => {
    try {
      setIsLoading(prev => ({ ...prev, refreshing: true }));
      const response = await servicesApi.getServiceStatus(getServiceId());
      if (response.success && response.data) {
        setStatus(response.data.status);
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Refresh Error", description: "Failed to refresh service status. The displayed status might be outdated." });
    } finally {
      setIsLoading(prev => ({ ...prev, refreshing: false }));
    }
  };

  const waitAndRefreshStatus = async () => {
    setTimeout(async () => {
      await refreshStatus();
      setTimeout(async () => {
        await refreshStatus();
        // Notify parent component that service status may have changed
        onServiceUpdate?.();
      }, 10000);
    }, 10000);
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

  const getStatusBadge = () => {
    const isRefreshing = isLoading.refreshing;
    
    switch (status) {
      case 'running':
        return (
          <Badge className="bg-green-500 text-white hover:bg-green-600">
            <Activity className="h-3 w-3 mr-1" />
            Running{isRefreshing && '...'}
          </Badge>
        );
      case 'stopped':
        return (
          <Badge className="bg-gray-500 text-white hover:bg-gray-600">
            <Square className="h-3 w-3 mr-1" />
            Stopped{isRefreshing && '...'}
          </Badge>
        );
      case 'failed':
        return (
          <Badge className="bg-red-500 text-white hover:bg-red-600">
            <Activity className="h-3 w-3 mr-1" />
            Failed{isRefreshing && '...'}
          </Badge>
        );
      case 'unknown':
      default:
        return (
          <Badge variant="outline">
            <Server className="h-3 w-3 mr-1" />
            Unknown{isRefreshing && '...'}
          </Badge>
        );
    }
  };

  const parseMemoryValue = (memStr: string) => {
    const match = memStr.match(/(\d+\.?\d*)\s*(\w+)/);
    if (match) {
      const value = parseFloat(match[1]);
      const unit = match[2];
      return { value, unit, display: memStr };
    }
    return { value: 0, unit: 'MB', display: memStr };
  };

  const parseCpuValue = (cpuStr: string) => {
    const match = cpuStr.match(/(\d+\.?\d*)%?/);
    if (match) {
      const value = parseFloat(match[1]);
      return { value, display: `${value}%` };
    }
    return { value: 0, display: cpuStr };
  };

  const memoryInfo = parseMemoryValue(memory);
  const cpuInfo = parseCpuValue(cpu);

  const isServiceOperational = status === 'running';
  const canStart = !isServiceOperational && status !== 'unknown';
  const canStop = isServiceOperational;
  const canRestart = status !== 'unknown';
  const anyLoading = isLoading.start || isLoading.stop || isLoading.restart;

  return (
    <Card className="transition-all duration-200 hover:shadow-md">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{name}</CardTitle>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshStatus}
            disabled={isLoading.refreshing || anyLoading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading.refreshing ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status Actions */}
        <div className="flex gap-1">
          <Button
            variant={canStart ? "default" : "secondary"}
            size="sm"
            onClick={handleStart}
            disabled={!canStart || anyLoading || isLoading.refreshing}
            className="flex-1 h-8 bg-green-500 hover:bg-green-600 text-white disabled:bg-gray-200 disabled:text-gray-500"
          >
            {isLoading.start ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <Play className="h-3 w-3" />
            )}
            <span className="ml-1 text-xs">Start</span>
          </Button>
          
          <Button
            variant={canStop ? "destructive" : "secondary"}
            size="sm"
            onClick={handleStop}
            disabled={!canStop || anyLoading || isLoading.refreshing}
            className="flex-1 h-8"
          >
            {isLoading.stop ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <Square className="h-3 w-3" />
            )}
            <span className="ml-1 text-xs">Stop</span>
          </Button>
          
          <Button
            variant={canRestart ? "outline" : "secondary"}
            size="sm"
            onClick={handleRestart}
            disabled={!canRestart || anyLoading || isLoading.refreshing}
            className="flex-1 h-8"
          >
            {isLoading.restart ? (
              <RefreshCw className="h-3 w-3 animate-spin" />
            ) : (
              <RotateCcw className="h-3 w-3" />
            )}
            <span className="ml-1 text-xs">Restart</span>
          </Button>
        </div>

        {/* Resource Usage */}
        <div className="space-y-3">
          {/* Memory Usage */}
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium">Memory Usage</span>
              <span className="text-muted-foreground">{memoryInfo.display}</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  memoryInfo.value > 80 ? 'bg-red-500' : 
                  memoryInfo.value > 60 ? 'bg-yellow-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(memoryInfo.value, 100)}%` }}
              />
            </div>
          </div>

          {/* CPU Usage */}
          <div>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium">CPU Usage</span>
              <span className="text-muted-foreground">{cpuInfo.display}</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  cpuInfo.value > 80 ? 'bg-red-500' : 
                  cpuInfo.value > 60 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(cpuInfo.value, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Last Update */}
        <p className="text-xs text-muted-foreground">
          Last update: {new Date().toLocaleTimeString()}
        </p>
      </CardContent>
    </Card>
  );
} 
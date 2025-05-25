import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import servicesApi, { type AllowedService, type ServiceStatus } from '@/lib/api/services';
import { toast } from '@/hooks/use-toast';

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
      console.error('Failed to refresh service status:', error);
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
    switch (status) {
      case 'running':
        return (
          <Badge
            variant="default"
            className="ml-2 px-3 py-1 text-xs font-bold rounded-full bg-green-500 text-white"
          >
            {status}
            {isLoading.refreshing && '...'}
          </Badge>
        );
      case 'stopped':
        return (
          <Badge
            variant="destructive"
            className="ml-2 px-3 py-1 text-xs font-bold rounded-full bg-red-500 text-white"
          >
            {status}
            {isLoading.refreshing && '...'}
          </Badge>
        );
      case 'failed':
        return (
          <Badge
            variant="destructive"
            className="ml-2 px-3 py-1 text-xs font-bold rounded-full bg-orange-500 text-white"
          >
            {status}
            {isLoading.refreshing && '...'}
          </Badge>
        );
      case 'unknown':
      default:
        return (
          <Badge
            variant="outline"
            className="ml-2 px-3 py-1 text-xs font-bold rounded-full"
          >
            {status || 'unknown'}
            {isLoading.refreshing && '...'}
          </Badge>
        );
    }
  };

  const isServiceOperational = status === 'running';
  const canStart = !isServiceOperational && status !== 'unknown';
  const canStop = isServiceOperational;
  const canRestart = status !== 'unknown';

  return (
    <Card className="p-4 rounded-xl shadow-md transition-transform hover:scale-[1.02] bg-card flex flex-col justify-between min-h-[200px]">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-muted mb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            {name}
            {getStatusBadge()}
          </CardTitle>
        </div>
        <div className="flex space-x-1">
          <Button
            variant="default"
            size="icon"
            onClick={handleStart}
            disabled={isLoading.start || isLoading.stop || isLoading.restart || !canStart}
            className="rounded-full bg-green-500 hover:bg-green-600 text-white disabled:opacity-50"
            title="Start"
          >
            {isLoading.start ? <span className="animate-spin">↻</span> : <span>▶</span>}
          </Button>
          <Button
            variant="destructive"
            size="icon"
            onClick={handleStop}
            disabled={isLoading.stop || isLoading.start || isLoading.restart || !canStop}
            className="rounded-full disabled:opacity-50"
            title="Stop"
          >
            {isLoading.stop ? <span className="animate-spin">↻</span> : <span>■</span>}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRestart}
            disabled={isLoading.restart || isLoading.start || isLoading.stop || !canRestart}
            className="rounded-full disabled:opacity-50"
            title="Restart"
          >
            {isLoading.restart ? <span className="animate-spin">↻</span> : <span>⟳</span>}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={refreshStatus}
            disabled={isLoading.refreshing || isLoading.start || isLoading.stop || isLoading.restart}
            className="rounded-full disabled:opacity-50"
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Activity, Layers, Terminal, Settings, RefreshCw, HardDrive } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { systemMetricsApi } from '@/lib/api/systemMetrics';
import type { SystemMetricsResponse } from '@server-manager/shared';
import { toast } from '@/hooks/use-toast';

interface SystemStatsProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function SystemStats({ autoRefresh = true, refreshInterval = 5000 }: SystemStatsProps) {
  const [metrics, setMetrics] = useState<SystemMetricsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else if (!metrics) {
        setIsLoading(true);
      }
      
      setError(null);
      const response = await systemMetricsApi.getSystemMetrics();
      setMetrics(response);
      
      if (isManualRefresh) {
        toast({
          title: "System metrics refreshed",
          description: "Latest system metrics have been loaded.",
        });
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch system metrics';
      setError(errorMessage);
      
      if (isManualRefresh) {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [metrics]);

  // Auto-refresh functionality
  useEffect(() => {
    // Initial fetch
    fetchMetrics();

    if (!autoRefresh) return;

    // Set up interval for auto-refresh
    const interval = setInterval(() => {
      fetchMetrics();
    }, refreshInterval);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [fetchMetrics, autoRefresh, refreshInterval]);

  const handleManualRefresh = () => {
    fetchMetrics(true);
  };

  const formatMemoryUsage = () => {
    if (!metrics?.memory) return { percentage: 0, display: 'N/A' };
    
    const { used, total, unit } = metrics.memory;
    const percentage = total > 0 ? Math.round((used / total) * 100) : 0;
    return {
      percentage,
      display: `${used.toLocaleString()} ${unit} / ${total.toLocaleString()} ${unit}`,
      description: `${percentage}% used`
    };
  };

  const formatCpuUsage = () => {
    if (!metrics?.cpu) return { percentage: 0, display: 'N/A' };
    
    const percentage = Math.round(metrics.cpu.currentLoad);
    return {
      percentage,
      display: `${percentage}%`,
      description: `${metrics.cpu.cores} cores`
    };
  };

  const getMainDiskUsage = () => {
    if (!metrics?.disk || metrics.disk.length === 0) return null;
    
    // Find the root filesystem or the largest filesystem
    const rootDisk = metrics.disk.find(d => d.mountPath === '/') || metrics.disk[0];
    return rootDisk;
  };

  const formatUptime = () => {
    if (!metrics?.uptime) return 'N/A';
    return metrics.uptime;
  };

  if (isLoading && !metrics) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Loading...</CardTitle>
              <div className="h-4 w-4 animate-pulse bg-muted rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted animate-pulse rounded mb-2" />
              <div className="h-4 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="grid gap-4 md:grid-cols-1">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-destructive">
              Error Loading System Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">{error}</p>
            <Button onClick={handleManualRefresh} disabled={isRefreshing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const memoryInfo = formatMemoryUsage();
  const cpuInfo = formatCpuUsage();
  const mainDisk = getMainDiskUsage();

  return (
    <div className="space-y-4">
      {/* Refresh Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">System Metrics</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleManualRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* CPU Usage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cpuInfo.display}</div>
            <p className="text-xs text-muted-foreground">{cpuInfo.description}</p>
            {/* CPU Usage Progress Bar */}
            <div className="mt-3 w-full bg-secondary rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  cpuInfo.percentage > 80 ? 'bg-red-500' : 
                  cpuInfo.percentage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(cpuInfo.percentage, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Memory Usage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{memoryInfo.description}</div>
            <p className="text-xs text-muted-foreground">{memoryInfo.display}</p>
            {/* Memory Usage Progress Bar */}
            <div className="mt-3 w-full bg-secondary rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-500 ${
                  memoryInfo.percentage > 90 ? 'bg-red-500' : 
                  memoryInfo.percentage > 70 ? 'bg-yellow-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(memoryInfo.percentage, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* System Uptime */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Uptime</CardTitle>
            <Terminal className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatUptime()}</div>
            <p className="text-xs text-muted-foreground">
              Last update: {new Date().toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>

        {/* Disk Usage */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {mainDisk ? `Disk (${mainDisk.mountPath})` : 'Disk Usage'}
            </CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {mainDisk ? (
              <>
                <div className="text-2xl font-bold">{mainDisk.usagePercentage}</div>
                <p className="text-xs text-muted-foreground">
                  {mainDisk.used} of {mainDisk.size} used
                </p>
                {/* Disk Usage Progress Bar */}
                <div className="mt-3 w-full bg-secondary rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${
                      parseInt(mainDisk.usagePercentage) > 90 ? 'bg-red-500' : 
                      parseInt(mainDisk.usagePercentage) > 70 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: mainDisk.usagePercentage }}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">N/A</div>
                <p className="text-xs text-muted-foreground">No disk data available</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Services Summary */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Services</CardTitle>
          <Settings className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {metrics?.activeServices?.length || 0}
          </div>
          <p className="text-xs text-muted-foreground">
            Services currently running
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 
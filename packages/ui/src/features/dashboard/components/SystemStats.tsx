import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, Layers, Terminal, Settings, AlertTriangle, Loader2 } from 'lucide-react';
import { t } from '@/lib/trpc'; // Import tRPC client

// Helper component for loading state
const StatCardSkeleton = () => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">Loading...</CardTitle>
      <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold text-muted-foreground">-</div>
      <p className="text-xs text-muted-foreground">-</p>
    </CardContent>
  </Card>
);

export function SystemStats() {
  const systemMetricsQuery = t.systemMetrics.getMetrics.useQuery(undefined, {
    refetchInterval: 5000, // Refetch every 5 seconds
    refetchOnWindowFocus: true,
  });

  if (systemMetricsQuery.isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>
    );
  }

  if (systemMetricsQuery.isError) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="md:col-span-2 lg:col-span-4">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-destructive">Error Fetching System Metrics</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-destructive">
              {systemMetricsQuery.error?.message || 'An unexpected error occurred.'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const data = systemMetricsQuery.data;

  // Helper to format memory (assuming input is in MB)
  const formatMemory = (valueInMb: number) => {
    if (valueInMb >= 1024) {
      return `${(valueInMb / 1024).toFixed(1)} GB`;
    }
    return `${valueInMb} MB`;
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data?.cpu ? `${data.cpu.currentLoad.toFixed(1)}%` : 'N/A'}
          </div>
          <p className="text-xs text-muted-foreground">
            {data?.cpu ? `${data.cpu.cores} Cores` : '-'}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
          <Layers className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data?.memory ? formatMemory(data.memory.used) : 'N/A'}
          </div>
          <p className="text-xs text-muted-foreground">
            {data?.memory ? `of ${formatMemory(data.memory.total)}` : '-'}
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Uptime</CardTitle>
          <Terminal className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data?.uptime || 'N/A'}</div>
          {/* <p className="text-xs text-muted-foreground">Last boot: Jan 15, 2024</p>  // This info is not available from backend */}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Active Services</CardTitle>
          <Settings className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {data?.activeServices ? data.activeServices.length : 'N/A'}
          </div>
          {/* <p className="text-xs text-muted-foreground">of 12 total services</p> // This info is not available from backend */}
        </CardContent>
      </Card>
    </div>
  );
} 
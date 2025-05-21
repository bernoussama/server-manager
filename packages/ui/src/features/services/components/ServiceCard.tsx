import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEffect } from 'react'; // Removed useState as status will come from useQuery
import { t } from '@/lib/trpc'; // Import tRPC
import type { AllowedService as AllowedServiceType, ServiceStatus } from '@server-manager/shared/types/services'; // Import shared types
import { toast } from '@/hooks/use-toast';

export function ServiceCard({ name, status: initialStatus, memory, cpu }: {
  name: string;
  status: ServiceStatus; // Use ServiceStatus from shared
  memory: string;
  cpu: string;
}) {
  const getServiceId = (): AllowedServiceType => {
    const serviceMap: Record<string, AllowedServiceType> = {
      'DNS Server': 'named',
      'DHCP Server': 'dhcpd',
      'HTTP Server': 'httpd',
    };
    // Ensure that the name passed to the component is one of the keys in serviceMap
    // or handle the case where it might not be. For now, assume 'named' as a fallback
    // if name is not found, though this should ideally be validated or typed.
    return serviceMap[name] || 'named'; 
  };

  const serviceId = getServiceId();

  const serviceStatusQuery = t.services.getServiceStatus.useQuery(
    { service: serviceId },
    {
      initialData: { service: serviceId, status: initialStatus, message: `Initial status for ${name}` },
      refetchInterval: 10000, // Auto-refresh every 10 seconds
      refetchOnWindowFocus: true,
    }
  );

  const currentStatus = serviceStatusQuery.data?.status || initialStatus;
  const isServiceActionInProgress = () => 
    startServiceMutation.isPending || 
    stopServiceMutation.isPending || 
    restartServiceMutation.isPending;

  const commonMutationOptions = {
    onSuccess: () => {
      serviceStatusQuery.refetch(); // Refetch status after action
      // Optional: Add a small delay before another refetch if needed for service to fully update
      setTimeout(() => serviceStatusQuery.refetch(), 1500); 
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'An unexpected error occurred.',
        variant: 'destructive',
      });
    },
  };

  const startServiceMutation = t.services.startService.useMutation({
    ...commonMutationOptions,
    onSuccess: (data) => {
      toast({ title: 'Service Action', description: data.message || `${name} start initiated.` });
      commonMutationOptions.onSuccess();
    },
  });

  const stopServiceMutation = t.services.stopService.useMutation({
    ...commonMutationOptions,
    onSuccess: (data) => {
      toast({ title: 'Service Action', description: data.message || `${name} stop initiated.` });
      commonMutationOptions.onSuccess();
    },
  });

  const restartServiceMutation = t.services.restartService.useMutation({
    ...commonMutationOptions,
    onSuccess: (data) => {
      toast({ title: 'Service Action', description: data.message || `${name} restart initiated.` });
      commonMutationOptions.onSuccess();
    },
  });

  const handleStart = () => startServiceMutation.mutate({ service: serviceId });
  const handleStop = () => stopServiceMutation.mutate({ service: serviceId });
  const handleRestart = () => restartServiceMutation.mutate({ service: serviceId });

  return (
    <Card className="p-4 rounded-xl shadow-md transition-transform hover:scale-[1.02] bg-card flex flex-col justify-between min-h-[200px]">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-muted mb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            {name}
            <Badge
              variant={currentStatus === 'running' ? 'default' : 'destructive'}
              className={`ml-2 px-3 py-1 text-xs font-bold rounded-full ${currentStatus === 'running' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}
            >
              {currentStatus}
              {serviceStatusQuery.isFetching && !isServiceActionInProgress() && '...'}
            </Badge>
          </CardTitle>
        </div>
        <div className="flex space-x-1">
          <Button
            variant="default"
            size="icon"
            onClick={handleStart}
            disabled={isServiceActionInProgress() || currentStatus === 'running'}
            className="rounded-full bg-green-500 hover:bg-green-600 text-white"
            title="Start"
          >
            {startServiceMutation.isPending ? <span className="animate-spin">↻</span> : <span>▶</span>}
          </Button>
          <Button
            variant="destructive"
            size="icon"
            onClick={handleStop}
            disabled={isServiceActionInProgress() || currentStatus === 'stopped'}
            className="rounded-full"
            title="Stop"
          >
            {stopServiceMutation.isPending ? <span className="animate-spin">↻</span> : <span>■</span>}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRestart}
            disabled={isServiceActionInProgress() || currentStatus === 'stopped'}
            className="rounded-full"
            title="Restart"
          >
            {restartServiceMutation.isPending ? <span className="animate-spin">↻</span> : <span>⟳</span>}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => serviceStatusQuery.refetch()}
            disabled={serviceStatusQuery.isFetching || isServiceActionInProgress()}
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
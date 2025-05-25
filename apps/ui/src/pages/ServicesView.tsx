import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ServiceCard } from '@/features/services/components/ServiceCard';
import { ServiceLogs } from '@/features/services/components/ServiceLogs';
import servicesApi from '@/lib/api/services';
import { systemMetricsApi } from '@/lib/api/systemMetrics';
import { toast } from '@/hooks/use-toast';
import type { ServiceResponse, SystemMetricsResponse } from '@server-manager/shared';

interface ServiceWithMetrics extends ServiceResponse {
  memory: string;
  cpu: string;
}

export function ServicesView() {
  const [services, setServices] = useState<ServiceWithMetrics[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Service name mapping for display
  const serviceDisplayNames: Record<string, string> = {
    named: 'DNS Server',
    dhcpd: 'DHCP Server',
    httpd: 'HTTP Server'
  };

  const fetchServicesData = useCallback(async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      
      setError(null);

      // Fetch services status and system metrics in parallel
      const [servicesResponse, metricsResponse] = await Promise.allSettled([
        servicesApi.getAllServicesStatus(),
        systemMetricsApi.getSystemMetrics()
      ]);

      // Handle services response
      let servicesData: ServiceResponse[] = [];
      if (servicesResponse.status === 'fulfilled' && servicesResponse.value.success) {
        servicesData = servicesResponse.value.data;
      } else {
        console.error('Failed to fetch services:', servicesResponse.status === 'rejected' ? servicesResponse.reason : servicesResponse.value);
        
        // Fallback: try to fetch individual service statuses
        const fallbackServices = ['named', 'dhcpd', 'httpd'] as const;
        const fallbackResults = await Promise.allSettled(
          fallbackServices.map(service => servicesApi.getServiceStatus(service))
        );
        
        servicesData = fallbackResults
          .map((result, index) => {
            if (result.status === 'fulfilled' && result.value.success) {
              return result.value.data;
            }
            // Return a default service with unknown status
            return {
              service: fallbackServices[index],
              status: 'unknown' as const,
              message: 'Unable to determine service status'
            };
          });
      }

      // Handle metrics response
      let metricsData: SystemMetricsResponse | null = null;
      if (metricsResponse.status === 'fulfilled') {
        metricsData = metricsResponse.value;
      } else {
        console.error('Failed to fetch system metrics:', metricsResponse.reason);
      }

      // Find service-specific metrics from active services
      const getServiceMetrics = (serviceName: string) => {
        if (!metricsData?.activeServices) {
          return { memory: 'N/A', cpu: 'N/A' };
        }

        // Try to find the service in active services
        const activeService = metricsData.activeServices.find(
          s => s.name.toLowerCase().includes(serviceName.toLowerCase()) ||
               s.name.toLowerCase().includes(serviceDisplayNames[serviceName]?.toLowerCase())
        );

        if (activeService) {
          // If we can extract metrics from the description, use them
          // Otherwise, show that it's running but metrics unavailable
          return { memory: 'Active', cpu: 'Active' };
        }

        // For stopped services or when metrics aren't available
        return { memory: '0 MB', cpu: '0%' };
      };

      // Combine services with metrics
      const servicesWithMetrics: ServiceWithMetrics[] = servicesData.map(service => ({
        ...service,
        ...getServiceMetrics(service.service)
      }));

      setServices(servicesWithMetrics);
      setLastUpdated(new Date());
      
      if (isManualRefresh) {
        toast({
          title: "Services refreshed",
          description: "Service status and metrics have been updated.",
        });
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch services data';
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
  }, [serviceDisplayNames]);

  // Initial load
  useEffect(() => {
    fetchServicesData();
  }, [fetchServicesData]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isLoading && !isRefreshing) {
        fetchServicesData();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchServicesData, isLoading, isRefreshing]);

  const handleManualRefresh = () => {
    fetchServicesData(true);
  };

  const handleServiceUpdate = () => {
    // When a service action is performed, refresh the data
    setTimeout(() => fetchServicesData(), 2000);
  };

  if (isLoading && services.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Services</h2>
          <Button variant="outline" size="sm" disabled>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Loading...
          </Button>
        </div>
        
        <div className="grid gap-6 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="min-h-[200px]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="h-6 bg-muted animate-pulse rounded w-24" />
                  <div className="h-6 bg-muted animate-pulse rounded w-16" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="h-8 bg-muted animate-pulse rounded" />
                  <div className="flex justify-between">
                    <div className="h-4 bg-muted animate-pulse rounded w-16" />
                    <div className="h-4 bg-muted animate-pulse rounded w-16" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error && services.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Services</h2>
          <Button variant="outline" size="sm" onClick={handleManualRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        </div>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load services data: {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with refresh button */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Services</h2>
          {lastUpdated && (
            <p className="text-sm text-muted-foreground mt-1">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={handleManualRefresh} disabled={isRefreshing}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Error alert if there are issues but we have some data */}
      {error && services.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Some data may be outdated: {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Services Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        {services.map((service) => (
          <ServiceCard
            key={service.service}
            name={serviceDisplayNames[service.service] || service.service}
            status={service.status === 'unknown' ? 'stopped' : service.status}
            memory={service.memory}
            cpu={service.cpu}
            onServiceUpdate={handleServiceUpdate}
          />
        ))}
      </div>

      {/* Service Logs */}
      <ServiceLogs />
    </div>
  );
} 
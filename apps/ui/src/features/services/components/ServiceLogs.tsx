import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Download, Trash2 } from 'lucide-react';
import { useState } from 'react';

interface LogEntry {
  timestamp: string;
  service: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
}

export function ServiceLogs() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Mock log entries - in the future, this could be fetched from an API
  const logEntries: LogEntry[] = [
    {
      timestamp: new Date(Date.now() - 300000).toISOString(),
      service: 'DNS',
      level: 'INFO',
      message: 'Service started successfully'
    },
    {
      timestamp: new Date(Date.now() - 280000).toISOString(),
      service: 'DHCP',
      level: 'INFO',
      message: 'Service started successfully'
    },
    {
      timestamp: new Date(Date.now() - 260000).toISOString(),
      service: 'HTTP',
      level: 'INFO',
      message: 'Service started successfully'
    },
    {
      timestamp: new Date(Date.now() - 240000).toISOString(),
      service: 'DNS',
      level: 'INFO',
      message: 'Query received: example.com from 192.168.1.100'
    },
    {
      timestamp: new Date(Date.now() - 220000).toISOString(),
      service: 'DHCP',
      level: 'INFO',
      message: 'New lease assigned: 192.168.1.120 to 00:11:22:33:44:55'
    },
    {
      timestamp: new Date(Date.now() - 200000).toISOString(),
      service: 'HTTP',
      level: 'INFO',
      message: '200 GET /index.html - 192.168.1.100'
    },
    {
      timestamp: new Date(Date.now() - 180000).toISOString(),
      service: 'DNS',
      level: 'DEBUG',
      message: 'Cache hit for domain: google.com'
    },
    {
      timestamp: new Date(Date.now() - 160000).toISOString(),
      service: 'DHCP',
      level: 'WARN',
      message: 'DHCP pool is 80% full'
    },
    {
      timestamp: new Date(Date.now() - 140000).toISOString(),
      service: 'HTTP',
      level: 'ERROR',
      message: '404 GET /nonexistent.html - 192.168.1.105'
    },
    {
      timestamp: new Date(Date.now() - 120000).toISOString(),
      service: 'DNS',
      level: 'INFO',
      message: 'Zone transfer completed for domain.local'
    }
  ];

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getLevelBadge = (level: LogEntry['level']) => {
    const variants = {
      INFO: 'bg-blue-500',
      WARN: 'bg-yellow-500',
      ERROR: 'bg-red-500',
      DEBUG: 'bg-gray-500'
    };

    return (
      <Badge 
        variant="secondary" 
        className={`text-white text-xs px-2 py-1 ${variants[level]}`}
      >
        {level}
      </Badge>
    );
  };

  const getServiceBadge = (service: string) => {
    const colors = {
      DNS: 'bg-green-600',
      DHCP: 'bg-purple-600',
      HTTP: 'bg-orange-600'
    };

    return (
      <Badge 
        variant="outline" 
        className={`text-white text-xs px-2 py-1 ${colors[service as keyof typeof colors] || 'bg-gray-600'}`}
      >
        {service}
      </Badge>
    );
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const handleDownload = () => {
    // Create downloadable log file
    const logContent = logEntries
      .map(entry => `[${formatTimestamp(entry.timestamp)}] [${entry.level}] [${entry.service}] ${entry.message}`)
      .join('\n');
    
    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `service-logs-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    // In a real implementation, this would clear the logs
    console.log('Clear logs requested');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          Service Logs
          <Badge variant="outline" className="text-xs">
            {logEntries.length} entries
          </Badge>
        </CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button variant="outline" size="sm" onClick={handleClear}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px] w-full rounded-md border">
          <div className="p-4 space-y-2">
            {logEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No logs available
              </p>
            ) : (
              logEntries.map((entry, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-2 p-3 rounded-lg bg-muted/50 hover:bg-muted/80 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getLevelBadge(entry.level)}
                      {getServiceBadge(entry.service)}
                    </div>
                    <span className="text-xs text-muted-foreground font-mono">
                      {formatTimestamp(entry.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm font-mono text-foreground">
                    {entry.message}
                  </p>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
} 
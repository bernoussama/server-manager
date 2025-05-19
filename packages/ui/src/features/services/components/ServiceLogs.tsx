import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';

export function ServiceLogs() {
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
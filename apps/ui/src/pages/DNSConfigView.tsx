import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DNSConfig } from "@/features/configuration/dns/DNSConfig";
import { GlobeIcon } from "lucide-react";

export function DNSConfigView() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <GlobeIcon className="h-5 w-5" />
          DNS Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <DNSConfig />
      </CardContent>
    </Card>
  );
} 
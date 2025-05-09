import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DHCPConfig } from "@/features/configuration/dhcp/DHCPConfig";
import { Network } from "lucide-react";

export function DHCPConfigView() {
  return (
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
  );
}
 
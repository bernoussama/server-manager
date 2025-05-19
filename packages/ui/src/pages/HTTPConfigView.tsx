import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HTTPConfig } from "@/features/configuration/http/HTTPConfig";
import { Server } from "lucide-react";

export function HTTPConfigView() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Server className="h-5 w-5" />
          HTTP Configuration
        </CardTitle>
      </CardHeader>
      <CardContent>
        <HTTPConfig />
      </CardContent>
    </Card>
  );
} 
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

export function SettingsView() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
         <Settings className="h-5 w-5" />
          Settings
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p>This is the settings page. Configure application settings here.</p>
        {/* Add settings components here */}
      </CardContent>
    </Card>
  );
} 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

export function HTTPConfig() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h4 className="text-sm font-medium leading-none">HTTP Server Status</h4>
          <p className="text-sm text-muted-foreground">Enable or disable the HTTP server</p>
        </div>
        <Switch />
      </div>
      <Separator />
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="port">Port</Label>
            <Input id="port" placeholder="80" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="root-dir">Root Directory</Label>
            <Input id="root-dir" placeholder="/var/www/html" />
          </div>
        </div>
        <div className="grid gap-2">
          <Label>Virtual Hosts</Label>
          <ScrollArea className="h-[200px] w-full rounded-md border">
            <div className="p-4 space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="grid grid-cols-3 gap-2">
                  <Input placeholder="Domain" defaultValue={i === 0 ? "example.com" : "blog.example.com"} />
                  <Input placeholder="Root Path" defaultValue={i === 0 ? "/var/www/example" : "/var/www/blog"} />
                  <Button variant="outline" size="icon" className="w-full">+</Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
        <div className="grid gap-2">
          <div className="flex items-center space-x-2">
            <Switch id="ssl" />
            <Label htmlFor="ssl">Enable SSL/TLS</Label>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div className="grid gap-2">
              <Label htmlFor="cert-path">Certificate Path</Label>
              <Input id="cert-path" placeholder="/etc/ssl/certs/example.crt" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="key-path">Private Key Path</Label>
              <Input id="key-path" placeholder="/etc/ssl/private/example.key" />
            </div>
          </div>
        </div>
      </div>
      <Button>Save HTTP Configuration</Button>
    </div>
  );
} 
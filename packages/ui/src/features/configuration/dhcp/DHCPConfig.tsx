import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";

export function DHCPConfig() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h4 className="text-sm font-medium leading-none">DHCP Server Status</h4>
          <p className="text-sm text-muted-foreground">Enable or disable the DHCP server</p>
        </div>
        <Switch />
      </div>
      <Separator />
      <div className="grid gap-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="start-ip">Start IP</Label>
            <Input id="start-ip" placeholder="192.168.1.100" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="end-ip">End IP</Label>
            <Input id="end-ip" placeholder="192.168.1.200" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="subnet-mask">Subnet Mask</Label>
            <Input id="subnet-mask" placeholder="255.255.255.0" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="lease-time">Lease Time (hours)</Label>
            <Input id="lease-time" type="number" placeholder="24" />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="gateway">Default Gateway</Label>
          <Input id="gateway" placeholder="192.168.1.1" />
        </div>
        <div className="grid gap-2">
          <Label>Static Leases</Label>
          <ScrollArea className="h-[200px] w-full rounded-md border">
            <div className="p-4 space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="grid grid-cols-3 gap-2">
                  <Input placeholder="MAC Address" defaultValue={i === 0 ? "00:11:22:33:44:55" : "66:77:88:99:AA:BB"} />
                  <Input placeholder="IP Address" defaultValue={i === 0 ? "192.168.1.10" : "192.168.1.11"} />
                  <Button variant="outline" size="icon" className="w-full">+</Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
      <Button>Save DHCP Configuration</Button>
    </div>
  );
} 
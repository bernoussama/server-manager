import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { updateDnsConfigurationAPI } from "@/lib/api/dns";

export function DNSConfig() {
  const [records, setRecords] = useState([
    { type: "A", name: "@", value: "192.168.1.1" },
    { type: "CNAME", name: "www", value: "@" },
    { type: "MX", name: "mail", value: "mail.example.com" }
  ]);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newRecord, setNewRecord] = useState({ type: "", name: "", value: "" });
  const [domain, setDomain] = useState("");
  const [nameserver, setNameserver] = useState("");
  const [dnsServerStatus, setDnsServerStatus] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const config = {
        dnsServerStatus,
        domainName: domain,
        primaryNameserver: nameserver,
        records,
      };
      await updateDnsConfigurationAPI(config);
      alert("DNS configuration saved successfully!");
    } catch (err: any) {
      alert(
        err?.data?.message || "Failed to save DNS configuration. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h4 className="text-sm font-medium leading-none">DNS Server Status</h4>
          <p className="text-sm text-muted-foreground">Enable or disable the DNS server</p>
        </div>
        <Switch checked={dnsServerStatus} onCheckedChange={setDnsServerStatus} />
      </div>
      <Separator />
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="domain">Domain Name</Label>
          <Input id="domain" placeholder="example.com" value={domain} onChange={e => setDomain(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="nameserver">Primary Nameserver</Label>
          <Input id="nameserver" placeholder="ns1.example.com" value={nameserver} onChange={e => setNameserver(e.target.value)} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="records">DNS Records</Label>
          <div className="w-full rounded-md border p-4 space-y-4" data-component-name="DNSConfig">
              <div className="grid grid-cols-3 gap-2 font-semibold text-xs text-muted-foreground mb-1">
  <div>Type</div>
  <div>Name</div>
  <div>Value</div>
</div>
{records.map((record, i) => (
                <div key={i} className="grid grid-cols-3 gap-2">
                  <Input placeholder="Type" value={record.type} onChange={(e) => {
                    const newRecords = [...records];
                    newRecords[i].type = e.target.value;
                    setRecords(newRecords);
                  }} />
                  <Input placeholder="Name" value={record.name} onChange={(e) => {
                    const newRecords = [...records];
                    newRecords[i].name = e.target.value;
                    setRecords(newRecords);
                  }} />
                  <Input placeholder="Value" value={record.value} onChange={(e) => {
                    const newRecords = [...records];
                    newRecords[i].value = e.target.value;
                    setRecords(newRecords);
                  }} />
                </div>
              ))}
              
              {isAddingNew && (
                <div className="grid grid-cols-3 gap-2">
                  <Input 
                    placeholder="Type" 
                    value={newRecord.type} 
                    onChange={(e) => setNewRecord({...newRecord, type: e.target.value})} 
                  />
                  <Input 
                    placeholder="Name" 
                    value={newRecord.name} 
                    onChange={(e) => setNewRecord({...newRecord, name: e.target.value})} 
                  />
                  <Input 
                    placeholder="Value" 
                    value={newRecord.value} 
                    onChange={(e) => setNewRecord({...newRecord, value: e.target.value})} 
                  />
                </div>
              )}
              
              {isAddingNew ? (
                <div className="flex gap-2 mt-2">
                  <Button 
                    variant="default" 
                    onClick={() => {
                      if (newRecord.type && newRecord.name && newRecord.value) {
                        setRecords([...records, newRecord]);
                        setNewRecord({ type: "", name: "", value: "" });
                        setIsAddingNew(false);
                      }
                    }}
                  >
                    Save
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setNewRecord({ type: "", name: "", value: "" });
                      setIsAddingNew(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button 
                  variant="outline" 
                  className="w-full mt-2" 
                  onClick={() => setIsAddingNew(true)}
                >
                  + Add Record
                </Button>
              )}
          </div>
        </div>
      </div>
      <Button onClick={handleSave} disabled={saving}>
  {saving ? "Saving..." : "Save DNS Configuration"}
</Button>
    </div>
  );
} 
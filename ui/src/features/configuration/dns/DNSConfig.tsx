import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { updateDnsConfigurationAPI } from "@/lib/api/dns";
import { v4 as uuidv4 } from 'uuid';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DnsRecordUI {
  id: string;
  type: string;
  name: string;
  value: string;
  priority?: string; // Keep as string for input, parse on submit
  weight?: string;   // Keep as string for input, parse on submit
  port?: string;     // Keep as string for input, parse on submit
}

const RECORD_TYPES = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'NS', 'PTR', 'SRV'];

export function DNSConfig() {
  const initialRecords: DnsRecordUI[] = [
    { id: uuidv4(), type: "A", name: "@", value: "192.168.1.1" },
    { id: uuidv4(), type: "CNAME", name: "www", value: "@" },
    { id: uuidv4(), type: "MX", name: "mail", value: "mail.example.com", priority: "10" },
  ];
  const initialNewRecord: DnsRecordUI = { id: '', type: "A", name: "", value: "", priority: "", weight: "", port: "" };

  const [records, setRecords] = useState<DnsRecordUI[]>(initialRecords);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newRecord, setNewRecord] = useState<DnsRecordUI>(initialNewRecord);
  const [domain, setDomain] = useState("");
  const [nameserver, setNameserver] = useState("");
  const [dnsServerStatus, setDnsServerStatus] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const clearError = (fieldPath: string) => {
    setFormErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[fieldPath];
      return newErrors;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setFormErrors({}); // Clear previous errors
    try {
      const apiRecords = records.map(rec => {
        const apiRecord: any = {
          type: rec.type,
          name: rec.name,
        };
        // Common value field, also used as target for SRV and exchange for MX
        if (rec.value !== undefined) apiRecord.value = rec.value;

        if (rec.type === 'MX' || rec.type === 'SRV') {
          if (rec.priority !== undefined && rec.priority !== '') {
            apiRecord.priority = parseInt(rec.priority, 10);
            if (isNaN(apiRecord.priority)) delete apiRecord.priority; // let Zod catch it if it's truly bad
          }
        }
        if (rec.type === 'SRV') {
          if (rec.weight !== undefined && rec.weight !== '') {
            apiRecord.weight = parseInt(rec.weight, 10);
            if (isNaN(apiRecord.weight)) delete apiRecord.weight;
          }
          if (rec.port !== undefined && rec.port !== '') {
            apiRecord.port = parseInt(rec.port, 10);
            if (isNaN(apiRecord.port)) delete apiRecord.port;
          }
          // Map UI 'value' to API 'target' for SRV records
          apiRecord.target = rec.value;
          delete apiRecord.value; // SRV uses target, not value in schema
        }
        return apiRecord;
      });

      const config = {
        dnsServerStatus,
        domainName: domain,
        primaryNameserver: nameserver,
        records: apiRecords,
      };
      await updateDnsConfigurationAPI(config);
      alert("DNS configuration saved successfully!");
    } catch (err: any) {
      if (err.response && err.response.status === 400 && err.response.data && Array.isArray(err.response.data.errors)) {
        const newFormErrors: Record<string, string> = {};
        err.response.data.errors.forEach((error: { path: (string | number)[], message: string }) => {
          newFormErrors[error.path.join('.')] = error.message;
        });
        setFormErrors(newFormErrors);
        alert("Validation failed. Please check the errors on the form.");
      } else {
        alert(
          err?.response?.data?.message || err?.message || "Failed to save DNS configuration. Please try again."
        );
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRecordChange = (id: string, field: keyof DnsRecordUI, value: string | number) => {
    setRecords(prevRecords =>
      prevRecords.map(rec => {
        if (rec.id === id) {
          const updatedRecord = { ...rec, [field]: value };
          // If type changes, reset type-specific fields
          if (field === 'type') {
            delete updatedRecord.priority;
            delete updatedRecord.weight;
            delete updatedRecord.port;
            if (value !== 'SRV') {
              // Keep value if not SRV as many types use it. SRV uses 'target' which is mapped from 'value'
            }
          }
          return updatedRecord;
        }
        return rec;
      })
    );
    const fieldPath = `records.${records.findIndex(r => r.id === id)}.${field}`;
    clearError(fieldPath);
  };

  const handleNewRecordChange = (field: keyof DnsRecordUI, value: string | number) => {
    setNewRecord(prev => {
      const updatedRecord = { ...prev, [field]: value };
      if (field === 'type') {
        delete updatedRecord.priority;
        delete updatedRecord.weight;
        delete updatedRecord.port;
      }
      return updatedRecord;
    });
    // No direct error clearing for new record form before adding, handled by overall validation
  };

  const addNewRecordHandler = () => {
    if (newRecord.type && newRecord.name && newRecord.value) { // Basic check before adding
      setRecords([...records, { ...newRecord, id: uuidv4() }]);
      setNewRecord({ ...initialNewRecord, id: '', type: "A" }); // Reset with a default type
      setIsAddingNew(false);
    } else {
      // Optionally, set some local error for the new record form here
      alert("New record must have Type, Name, and Value.");
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
          <Input id="domain" placeholder="example.com" value={domain} onChange={e => { setDomain(e.target.value); clearError('domainName'); }} />
          {formErrors.domainName && <p className="text-sm text-red-500">{formErrors.domainName}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="nameserver">Primary Nameserver</Label>
          <Input id="nameserver" placeholder="ns1.example.com" value={nameserver} onChange={e => { setNameserver(e.target.value); clearError('primaryNameserver'); }} />
          {formErrors.primaryNameserver && <p className="text-sm text-red-500">{formErrors.primaryNameserver}</p>}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="records">DNS Records</Label>
          <div className="w-full rounded-md border p-4 space-y-4" data-component-name="DNSConfig">
            <div className="grid grid-cols-1 gap-4">
              {records.map((record, index) => {
                const recordErrorPath = (field: string) => `records.${index}.${field}`;
                return (
                  <div key={record.id} className="p-3 border rounded-md space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start">
                      <div>
                        <Label htmlFor={`record-type-${record.id}`}>Type</Label>
                        <Select
                          value={record.type}
                          onValueChange={(value) => handleRecordChange(record.id, 'type', value)}
                        >
                          <SelectTrigger id={`record-type-${record.id}`}> <SelectValue placeholder="Select type" /> </SelectTrigger>
                          <SelectContent>
                            {RECORD_TYPES.map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {formErrors[recordErrorPath('type')] && <p className="text-sm text-red-500">{formErrors[recordErrorPath('type')]}</p>}
                      </div>
                      <div>
                        <Label htmlFor={`record-name-${record.id}`}>Name</Label>
                        <Input id={`record-name-${record.id}`} placeholder="Name (@ for root)" value={record.name} onChange={(e) => handleRecordChange(record.id, 'name', e.target.value)} />
                        {formErrors[recordErrorPath('name')] && <p className="text-sm text-red-500">{formErrors[recordErrorPath('name')]}</p>}
                      </div>
                      <div>
                        <Label htmlFor={`record-value-${record.id}`}>{record.type === 'SRV' ? 'Target' : 'Value'}</Label>
                        <Input id={`record-value-${record.id}`} placeholder={record.type === 'SRV' ? 'target.example.com' : 'Value'} value={record.value} onChange={(e) => handleRecordChange(record.id, 'value', e.target.value)} />
                        {formErrors[recordErrorPath(record.type === 'SRV' ? 'target' : 'value')] && <p className="text-sm text-red-500">{formErrors[recordErrorPath(record.type === 'SRV' ? 'target' : 'value')]}</p>}
                        {/* Show SRV target error if 'value' on UI becomes 'target' in API error path for SRV */} 
                        {record.type === 'SRV' && formErrors[recordErrorPath('value')] && <p className="text-sm text-red-500">{formErrors[recordErrorPath('value')]}</p>} 
                      </div>
                    </div>
                    {(record.type === 'MX' || record.type === 'SRV') && (
                      <div>
                        <Label htmlFor={`record-priority-${record.id}`}>Priority</Label>
                        <Input id={`record-priority-${record.id}`} type="number" placeholder="10" value={record.priority || ''} onChange={(e) => handleRecordChange(record.id, 'priority', e.target.value)} />
                        {formErrors[recordErrorPath('priority')] && <p className="text-sm text-red-500">{formErrors[recordErrorPath('priority')]}</p>}
                      </div>
                    )}
                    {record.type === 'SRV' && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <Label htmlFor={`record-weight-${record.id}`}>Weight</Label>
                          <Input id={`record-weight-${record.id}`} type="number" placeholder="5" value={record.weight || ''} onChange={(e) => handleRecordChange(record.id, 'weight', e.target.value)} />
                          {formErrors[recordErrorPath('weight')] && <p className="text-sm text-red-500">{formErrors[recordErrorPath('weight')]}</p>}
                        </div>
                        <div>
                          <Label htmlFor={`record-port-${record.id}`}>Port</Label>
                          <Input id={`record-port-${record.id}`} type="number" placeholder="5060" value={record.port || ''} onChange={(e) => handleRecordChange(record.id, 'port', e.target.value)} />
                          {formErrors[recordErrorPath('port')] && <p className="text-sm text-red-500">{formErrors[recordErrorPath('port')]}</p>}
                        </div>
                      </div>
                    )}
                    <Button variant="outline" size="sm" onClick={() => setRecords(records.filter(r => r.id !== record.id))}>Remove</Button>
                  </div>
                );
              })}
            </div>
            
            {isAddingNew && (
              <div className="mt-4 p-3 border rounded-md space-y-2">
                <h5 className="text-md font-semibold">Add New Record</h5>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-start">
                  <div>
                    <Label htmlFor="new-record-type">Type</Label>
                    <Select
                      value={newRecord.type}
                      onValueChange={(value) => handleNewRecordChange('type', value)}
                    >
                      <SelectTrigger id="new-record-type"> <SelectValue placeholder="Select type" /> </SelectTrigger>
                      <SelectContent>
                        {RECORD_TYPES.map(type => (
                          <SelectItem key={`new-${type}`} value={type}>{type}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="new-record-name">Name</Label>
                    <Input id="new-record-name" placeholder="Name (@ for root)" value={newRecord.name} onChange={(e) => handleNewRecordChange('name', e.target.value)} />
                  </div>
                  <div>
                     <Label htmlFor="new-record-value">{newRecord.type === 'SRV' ? 'Target' : 'Value'}</Label>
                    <Input id="new-record-value" placeholder={newRecord.type === 'SRV' ? 'target.example.com': 'Value'} value={newRecord.value} onChange={(e) => handleNewRecordChange('value', e.target.value)} />
                  </div>
                </div>
                {(newRecord.type === 'MX' || newRecord.type === 'SRV') && (
                  <div>
                    <Label htmlFor="new-record-priority">Priority</Label>
                    <Input id="new-record-priority" type="number" placeholder="10" value={newRecord.priority || ''} onChange={(e) => handleNewRecordChange('priority', e.target.value)} />
                  </div>
                )}
                {newRecord.type === 'SRV' && (
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="new-record-weight">Weight</Label>
                      <Input id="new-record-weight" type="number" placeholder="5" value={newRecord.weight || ''} onChange={(e) => handleNewRecordChange('weight', e.target.value)} />
                    </div>
                    <div>
                      <Label htmlFor="new-record-port">Port</Label>
                      <Input id="new-record-port" type="number" placeholder="5060" value={newRecord.port || ''} onChange={(e) => handleNewRecordChange('port', e.target.value)} />
                    </div>
                  </div>
                )}
              </div>
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
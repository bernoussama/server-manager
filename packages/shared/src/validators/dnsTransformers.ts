import type { DnsRecord, DnsRecordType, MxDnsRecord, SrvDnsRecord, BaseDnsRecord } from '../types/dns';

/**
 * Transform UI record to API record
 * Converts UI form structure to the API schema structure
 */
export const transformUiRecordToApiRecord = (uiRec: {
  id: string;
  type: DnsRecordType;
  name: string;
  value: string;
  priority?: string;
  weight?: string;
  port?: string;
}): DnsRecord => {
  const baseApiRecord = {
    id: uiRec.id,
    type: uiRec.type as DnsRecordType,
    name: uiRec.name,
  };

  if (uiRec.type === 'MX') {
    const mxRecord: MxDnsRecord = {
      ...baseApiRecord,
      type: 'MX',
      value: uiRec.value,
      priority: parseInt(uiRec.priority!, 10),
    };
    return mxRecord;
  }

  if (uiRec.type === 'SRV') {
    const srvRecord: SrvDnsRecord = {
      ...baseApiRecord,
      type: 'SRV',
      priority: parseInt(uiRec.priority!, 10),
      weight: parseInt(uiRec.weight!, 10),
      port: parseInt(uiRec.port!, 10),
      target: uiRec.value,
    };
    return srvRecord;
  }

  return {
    ...baseApiRecord,
    value: uiRec.value,
  } as BaseDnsRecord & { type: Exclude<DnsRecordType, 'MX' | 'SRV' | 'SOA'> };
};

/**
 * Parse semicolon-separated strings into arrays
 */
export const parseStringToArray = (input: string): string[] => {
  return input.split(';')
    .map(item => item.trim())
    .filter(item => item.length > 0);
};

/**
 * Transform form data to API data
 */
export const transformFormToApiData = (formData: any) => {
  return {
    dnsServerStatus: formData.dnsServerStatus,
    listenOn: parseStringToArray(formData.listenOn),
    allowQuery: parseStringToArray(formData.allowQuery),
    allowRecursion: parseStringToArray(formData.allowRecursion),
    forwarders: parseStringToArray(formData.forwarders),
    allowTransfer: parseStringToArray(formData.allowTransfer),
    dnssecValidation: formData.dnssecValidation,
    zones: formData.zones.map((zone: any) => ({
      id: zone.id,
      zoneName: zone.zoneName,
      zoneType: zone.zoneType,
      fileName: zone.fileName,
      allowUpdate: parseStringToArray(zone.allowUpdate),
      soaSettings: zone.soaSettings,
      records: zone.records.map(transformUiRecordToApiRecord)
    }))
  };
}; 
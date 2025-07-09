// DHCP Configuration Types
export interface DhcpServerConfig {
  dhcpServerStatus: boolean;
  domainName?: string;
  domainNameServers?: string[];
  defaultLeaseTime?: number;
  maxLeaseTime?: number;
  authoritative?: boolean;
  ddnsUpdateStyle?: 'interim' | 'standard' | 'none';
  logFacility?: string;
}

export interface DhcpSubnet {
  id: string;
  network: string;
  netmask: string;
  range?: {
    start: string;
    end: string;
  };
  defaultGateway?: string;
  domainNameServers?: string[];
  broadcastAddress?: string;
  subnetMask?: string;
  pools?: DhcpPool[];
  options?: DhcpOption[];
}

export interface DhcpPool {
  id: string;
  range: {
    start: string;
    end: string;
  };
  allowMembers?: string[];
  denyMembers?: string[];
  options?: DhcpOption[];
}

export interface DhcpHostReservation {
  id: string;
  hostname: string;
  macAddress: string;
  fixedAddress: string;
  options?: DhcpOption[];
}

export interface DhcpOption {
  id: string;
  name: string;
  value: string;
  code?: number;
}

export interface DhcpConfiguration extends DhcpServerConfig {
  subnets: DhcpSubnet[];
  hostReservations: DhcpHostReservation[];
  globalOptions?: DhcpOption[];
  listenInterface?: string; // Network interface to listen on
}

// Form/UI Types
export interface DhcpConfigFormValues {
  dhcpServerStatus: boolean;
  domainName: string;
  domainNameServers: string; // comma-separated
  defaultLeaseTime: string;
  maxLeaseTime: string;
  authoritative: boolean;
  ddnsUpdateStyle: string;
  listenInterface: string; // Network interface to listen on
  
  subnets: Array<{
    id: string;
    network: string;
    netmask: string;
    rangeStart: string;
    rangeEnd: string;
    defaultGateway: string;
    domainNameServers: string;
    broadcastAddress: string;
    subnetMask: string;
  }>;
  
  hostReservations: Array<{
    id: string;
    hostname: string;
    macAddress: string;
    fixedAddress: string;
  }>;
  
  globalOptions: Array<{
    id: string;
    name: string;
    value: string;
  }>;
}

// API Response Types
export interface DhcpUpdateResponse {
  success: boolean;
  message: string;
  data?: DhcpConfiguration;
  errors?: Array<{
    path: (string | number)[];
    message: string;
  }>;
}

export interface DhcpServiceResponse {
  service: 'dhcpd';
  status: 'running' | 'stopped' | 'failed' | 'unknown';
  message: string;
  configTest?: {
    valid: boolean;
    errors?: string[];
  };
}

export type DhcpServerStatus = 'running' | 'stopped' | 'failed' | 'unknown';

export interface DhcpConfigResponse {
  success: boolean;
  message: string;
  data: DhcpConfiguration;
}

export type DhcpServiceAction = 'start' | 'stop' | 'restart' | 'reload' | 'status';

// Network Interface Types
export interface NetworkInterface {
  name: string;
  ipAddress?: string;
  netmask?: string;
  broadcast?: string;
  macAddress?: string;
  state: 'UP' | 'DOWN' | 'UNKNOWN';
  type: 'physical' | 'virtual' | 'loopback';
}

export interface NetworkInterfaceResponse {
  success: boolean;
  message: string;
  data: NetworkInterface[];
} 
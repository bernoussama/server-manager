import type { DhcpConfiguration, DhcpConfigFormValues } from '../types/dhcp';

// Helper function to parse comma-separated strings into arrays
export const parseStringToArray = (input: string): string[] => {
  return input
    .split(',')
    .map(item => item.trim())
    .filter(item => item.length > 0);
};

// Helper function to convert arrays to comma-separated strings
export const arrayToCommaString = (arr: string[] = []): string => {
  return arr.join(', ');
};

// Transform UI form data to API format
export const transformDhcpFormToApi = (formData: DhcpConfigFormValues): DhcpConfiguration => {
  return {
    dhcpServerStatus: formData.dhcpServerStatus,
    domainName: formData.domainName,
    domainNameServers: parseStringToArray(formData.domainNameServers),
    defaultLeaseTime: parseInt(formData.defaultLeaseTime, 10),
    maxLeaseTime: parseInt(formData.maxLeaseTime, 10),
    authoritative: formData.authoritative,
    ddnsUpdateStyle: formData.ddnsUpdateStyle as 'interim' | 'standard' | 'none',
    listenInterface: formData.listenInterface,
    
    subnets: formData.subnets.map(subnet => ({
      id: subnet.id,
      network: subnet.network,
      netmask: subnet.netmask,
      range: {
        start: subnet.rangeStart,
        end: subnet.rangeEnd
      },
      defaultGateway: subnet.defaultGateway,
      domainNameServers: parseStringToArray(subnet.domainNameServers),
      broadcastAddress: subnet.broadcastAddress || undefined,
      subnetMask: subnet.subnetMask || undefined,
      pools: [], // Will be extended in future versions
      options: [] // Will be extended in future versions
    })),
    
    hostReservations: formData.hostReservations.map(host => ({
      id: host.id,
      hostname: host.hostname,
      macAddress: host.macAddress,
      fixedAddress: host.fixedAddress,
      options: [] // Will be extended in future versions
    })),
    
    globalOptions: formData.globalOptions.map(option => ({
      id: option.id,
      name: option.name,
      value: option.value
    }))
  };
};

// Transform API data to UI form format
export const transformDhcpApiToForm = (apiData: DhcpConfiguration): DhcpConfigFormValues => {
  return {
    dhcpServerStatus: apiData.dhcpServerStatus,
    domainName: apiData.domainName || '',
    domainNameServers: arrayToCommaString(apiData.domainNameServers),
    defaultLeaseTime: (apiData.defaultLeaseTime || 86400).toString(),
    maxLeaseTime: (apiData.maxLeaseTime || 604800).toString(),
    authoritative: apiData.authoritative !== false, // Default to true if undefined
    ddnsUpdateStyle: apiData.ddnsUpdateStyle || 'none',
    listenInterface: apiData.listenInterface || '',
    
    subnets: apiData.subnets.map(subnet => ({
      id: subnet.id,
      network: subnet.network,
      netmask: subnet.netmask,
      rangeStart: subnet.range?.start || '',
      rangeEnd: subnet.range?.end || '',
      defaultGateway: subnet.defaultGateway || '',
      domainNameServers: arrayToCommaString(subnet.domainNameServers),
      broadcastAddress: subnet.broadcastAddress || '',
      subnetMask: subnet.subnetMask || ''
    })),
    
    hostReservations: apiData.hostReservations.map(host => ({
      id: host.id,
      hostname: host.hostname,
      macAddress: host.macAddress,
      fixedAddress: host.fixedAddress
    })),
    
    globalOptions: (apiData.globalOptions || []).map(option => ({
      id: option.id,
      name: option.name,
      value: option.value
    }))
  };
};

// Validation helpers for transformers
export const validateFormData = (formData: DhcpConfigFormValues): string[] => {
  const errors: string[] = [];
  
  // Check for duplicate subnet networks
  const networkAddresses = formData.subnets.map(subnet => subnet.network);
  const duplicateNetworks = networkAddresses.filter((network, index) => 
    networkAddresses.indexOf(network) !== index
  );
  
  if (duplicateNetworks.length > 0) {
    errors.push(`Duplicate network addresses found: ${duplicateNetworks.join(', ')}`);
  }
  
  // Check for duplicate MAC addresses in host reservations
  const macAddresses = formData.hostReservations.map(host => host.macAddress.toLowerCase());
  const duplicateMacs = macAddresses.filter((mac, index) => 
    macAddresses.indexOf(mac) !== index
  );
  
  if (duplicateMacs.length > 0) {
    errors.push(`Duplicate MAC addresses found: ${duplicateMacs.join(', ')}`);
  }
  
  // Check for duplicate fixed IP addresses in host reservations
  const fixedAddresses = formData.hostReservations.map(host => host.fixedAddress);
  const duplicateIps = fixedAddresses.filter((ip, index) => 
    fixedAddresses.indexOf(ip) !== index
  );
  
  if (duplicateIps.length > 0) {
    errors.push(`Duplicate fixed IP addresses found: ${duplicateIps.join(', ')}`);
  }
  
  // Check for duplicate hostnames in host reservations
  const hostnames = formData.hostReservations.map(host => host.hostname.toLowerCase());
  const duplicateHostnames = hostnames.filter((hostname, index) => 
    hostnames.indexOf(hostname) !== index
  );
  
  if (duplicateHostnames.length > 0) {
    errors.push(`Duplicate hostnames found: ${duplicateHostnames.join(', ')}`);
  }
  
  return errors;
};

// Generate a default DHCP configuration
export const generateDefaultDhcpConfig = (): DhcpConfiguration => {
  return {
    dhcpServerStatus: false,
    domainName: 'local',
    domainNameServers: ['8.8.8.8', '8.8.4.4'],
    defaultLeaseTime: 86400, // 24 hours
    maxLeaseTime: 604800, // 7 days
    authoritative: true,
    ddnsUpdateStyle: 'none',
    listenInterface: '',
    subnets: [],
    hostReservations: [],
    globalOptions: []
  };
};

// Calculate network broadcast address from network and netmask
export const calculateBroadcastAddress = (network: string, netmask: string): string => {
  try {
    const networkOctets = network.split('.').map(Number);
    const maskOctets = netmask.split('.').map(Number);
    
    const broadcastOctets = networkOctets.map((octet, index) => {
      return octet | (255 - maskOctets[index]);
    });
    
    return broadcastOctets.join('.');
  } catch (error) {
    return '';
  }
};

// Calculate the network address from an IP and netmask
export const calculateNetworkAddress = (ip: string, netmask: string): string => {
  try {
    const ipOctets = ip.split('.').map(Number);
    const maskOctets = netmask.split('.').map(Number);
    
    const networkOctets = ipOctets.map((octet, index) => {
      return octet & maskOctets[index];
    });
    
    return networkOctets.join('.');
  } catch (error) {
    return '';
  }
};

// Suggest a default IP range for a given network
export const suggestIpRange = (network: string, netmask: string): { start: string; end: string } => {
  try {
    const networkOctets = network.split('.').map(Number);
    const maskOctets = netmask.split('.').map(Number);
    
    // Find the first octet that's not fully masked
    let rangeOctetIndex = 3;
    for (let i = 0; i < 4; i++) {
      if (maskOctets[i] !== 255) {
        rangeOctetIndex = i;
        break;
      }
    }
    
    // Calculate available range
    const hostBits = 8 - Math.log2(256 - maskOctets[rangeOctetIndex]);
    const maxHosts = Math.pow(2, hostBits) - 2; // Subtract network and broadcast
    
    // Suggest using 50% of the range starting from .100 if possible
    const startOctets = [...networkOctets];
    const endOctets = [...networkOctets];
    
    if (rangeOctetIndex === 3) {
      // Class C or similar - start from .100 if possible
      const suggestedStart = Math.max(100, networkOctets[3] + 1);
      const suggestedEnd = Math.min(200, networkOctets[3] + maxHosts);
      
      startOctets[3] = suggestedStart;
      endOctets[3] = suggestedEnd;
    } else {
      // Larger networks - use a reasonable range
      startOctets[rangeOctetIndex] = networkOctets[rangeOctetIndex] + 1;
      endOctets[rangeOctetIndex] = networkOctets[rangeOctetIndex] + Math.min(100, maxHosts);
    }
    
    return {
      start: startOctets.join('.'),
      end: endOctets.join('.')
    };
  } catch (error) {
    return { start: '', end: '' };
  }
}; 
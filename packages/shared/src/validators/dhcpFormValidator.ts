import { z } from 'zod';

// Validation helpers
export const isValidIpAddress = (ip: string): boolean => {
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  if (!ipv4Regex.test(ip)) return false;
  
  const octets = ip.split('.');
  return octets.every(octet => {
    const num = parseInt(octet, 10);
    return num >= 0 && num <= 255;
  });
};

export const isValidMacAddress = (mac: string): boolean => {
  const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
  return macRegex.test(mac);
};

export const isValidNetmask = (netmask: string): boolean => {
  if (!isValidIpAddress(netmask)) return false;
  
  // Convert to binary and check if it's a valid subnet mask
  const octets = netmask.split('.').map(octet => parseInt(octet, 10));
  const binary = octets.map(octet => octet.toString(2).padStart(8, '0')).join('');
  
  // Valid subnet mask should have consecutive 1s followed by consecutive 0s
  return /^1*0*$/.test(binary);
};

export const isValidHostname = (hostname: string): boolean => {
  // RFC 1123 compliant hostname validation
  const hostnameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;
  return hostnameRegex.test(hostname) && hostname.length <= 63;
};

export const isValidDomainName = (domain: string): boolean => {
  // Basic domain name validation
  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return domainRegex.test(domain) && domain.length <= 253;
};

export const isValidLeaseTime = (time: string): boolean => {
  const num = parseInt(time, 10);
  return !isNaN(num) && num > 0 && num <= 2147483647; // Max 32-bit signed integer
};

// Network calculation helpers
export const isIpInNetwork = (ip: string, network: string, netmask: string): boolean => {
  if (!isValidIpAddress(ip) || !isValidIpAddress(network) || !isValidNetmask(netmask)) {
    return false;
  }
  
  const ipOctets = ip.split('.').map(Number);
  const networkOctets = network.split('.').map(Number);
  const maskOctets = netmask.split('.').map(Number);
  
  for (let i = 0; i < 4; i++) {
    if ((ipOctets[i] & maskOctets[i]) !== (networkOctets[i] & maskOctets[i])) {
      return false;
    }
  }
  
  return true;
};

export const isValidIpRange = (startIp: string, endIp: string): boolean => {
  if (!isValidIpAddress(startIp) || !isValidIpAddress(endIp)) {
    return false;
  }
  
  const startOctets = startIp.split('.').map(Number);
  const endOctets = endIp.split('.').map(Number);
  
  // Convert to 32-bit integers for comparison
  const startInt = (startOctets[0] << 24) + (startOctets[1] << 16) + (startOctets[2] << 8) + startOctets[3];
  const endInt = (endOctets[0] << 24) + (endOctets[1] << 16) + (endOctets[2] << 8) + endOctets[3];
  
  return startInt <= endInt;
};

// Schema for DHCP options
export const dhcpOptionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, "Option name is required"),
  value: z.string().min(1, "Option value is required"),
  code: z.number().int().min(1).max(254).optional(),
});

// Schema for host reservations
export const hostReservationSchema = z.object({
  id: z.string().uuid(),
  hostname: z.string().min(1, "Hostname is required").refine(isValidHostname, {
    message: "Invalid hostname format"
  }),
  macAddress: z.string().refine(isValidMacAddress, {
    message: "Invalid MAC address format (use format: XX:XX:XX:XX:XX:XX or XX-XX-XX-XX-XX-XX)"
  }),
  fixedAddress: z.string().refine(isValidIpAddress, {
    message: "Invalid IP address"
  }),
});

// Schema for subnets
export const subnetSchema = z.object({
  id: z.string().uuid(),
  network: z.string().refine(isValidIpAddress, {
    message: "Invalid network address"
  }),
  netmask: z.string().refine(isValidNetmask, {
    message: "Invalid subnet mask"
  }),
  rangeStart: z.string().refine(isValidIpAddress, {
    message: "Invalid start IP address"
  }),
  rangeEnd: z.string().refine(isValidIpAddress, {
    message: "Invalid end IP address"
  }),
  defaultGateway: z.string().refine(isValidIpAddress, {
    message: "Invalid gateway IP address"
  }),
  domainNameServers: z.string().min(1, "At least one DNS server is required"),
  broadcastAddress: z.string().refine((val) => {
    return val === '' || isValidIpAddress(val);
  }, {
    message: "Invalid broadcast address"
  }),
  subnetMask: z.string().refine((val) => {
    return val === '' || isValidNetmask(val);
  }, {
    message: "Invalid subnet mask"
  }),
}).superRefine((data, ctx) => {
  // Validate IP range
  if (!isValidIpRange(data.rangeStart, data.rangeEnd)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['rangeEnd'],
      message: 'End IP must be greater than or equal to start IP'
    });
  }
  
  // Validate that range IPs are in the network
  if (!isIpInNetwork(data.rangeStart, data.network, data.netmask)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['rangeStart'],
      message: 'Start IP must be within the subnet'
    });
  }
  
  if (!isIpInNetwork(data.rangeEnd, data.network, data.netmask)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['rangeEnd'],
      message: 'End IP must be within the subnet'
    });
  }
  
  // Validate that gateway is in the network
  if (!isIpInNetwork(data.defaultGateway, data.network, data.netmask)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['defaultGateway'],
      message: 'Gateway must be within the subnet'
    });
  }
  
  // Validate DNS servers format
  const dnsServers = data.domainNameServers.split(',').map(s => s.trim()).filter(s => s.length > 0);
  for (const dns of dnsServers) {
    if (!isValidIpAddress(dns)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['domainNameServers'],
        message: `Invalid DNS server IP address: ${dns}`
      });
      break;
    }
  }
});

// Main DHCP configuration schema
export const dhcpConfigSchema = z.object({
  dhcpServerStatus: z.boolean(),
  domainName: z.string().min(1, "Domain name is required").refine(isValidDomainName, {
    message: "Invalid domain name format"
  }),
  domainNameServers: z.string().min(1, "At least one DNS server is required").refine((val) => {
    const servers = val.split(',').map(s => s.trim()).filter(s => s.length > 0);
    return servers.length > 0 && servers.every(server => isValidIpAddress(server));
  }, {
    message: "Invalid DNS server format. Use comma-separated IP addresses."
  }),
  defaultLeaseTime: z.string().regex(/^\d+$/, {
    message: "Default lease time must be a number"
  }).refine(isValidLeaseTime, {
    message: "Default lease time must be between 1 and 2147483647 seconds"
  }),
  maxLeaseTime: z.string().regex(/^\d+$/, {
    message: "Max lease time must be a number"
  }).refine(isValidLeaseTime, {
    message: "Max lease time must be between 1 and 2147483647 seconds"
  }),
  authoritative: z.boolean().default(true),
  ddnsUpdateStyle: z.enum(['interim', 'standard', 'none']).default('none'),
  
  subnets: z.array(subnetSchema).min(1, "At least one subnet is required"),
  hostReservations: z.array(hostReservationSchema).default([]),
  globalOptions: z.array(dhcpOptionSchema).default([]),
}).superRefine((data, ctx) => {
  // Validate that default lease time is less than max lease time
  const defaultTime = parseInt(data.defaultLeaseTime);
  const maxTime = parseInt(data.maxLeaseTime);
  
  if (defaultTime > maxTime) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['maxLeaseTime'],
      message: 'Max lease time must be greater than or equal to default lease time'
    });
  }
  
  // Validate that host reservations don't conflict with subnet ranges
  for (const reservation of data.hostReservations) {
    const reservationIp = reservation.fixedAddress;
    
    for (const subnet of data.subnets) {
      if (isIpInNetwork(reservationIp, subnet.network, subnet.netmask)) {
        // Check if reservation IP is within the dynamic range
        if (isValidIpRange(subnet.rangeStart, reservationIp) && 
            isValidIpRange(reservationIp, subnet.rangeEnd)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['hostReservations'],
            message: `Host reservation ${reservation.hostname} (${reservationIp}) conflicts with dynamic range ${subnet.rangeStart}-${subnet.rangeEnd}`
          });
        }
      }
    }
  }
});

export type DhcpConfigFormValues = z.infer<typeof dhcpConfigSchema>; 
export interface MemoryUsage {
  total: number;
  free: number;
  used: number;
  unit: string;
}

export interface CpuUsage {
  currentLoad: number;
  cores: number;
}

export interface DiskUsage {
  filesystem: string;
  size: string;
  used: string;
  available: string;
  usagePercentage: string;
  mountPath: string;
}

export interface ActiveService {
  name: string;
  status: string;
  description: string;
}

export interface SystemMetricsResponse {
  uptime: string;
  memory: MemoryUsage;
  cpu: CpuUsage;
  disk: DiskUsage[];
  activeServices: ActiveService[];
}

export interface SystemMetricsApiResponse {
  success: boolean;
  data: SystemMetricsResponse;
  message?: string;
  error?: string;
} 
# System Metrics - Immediate Implementation Steps

## Quick Start Guide

The system metrics backend is **already complete**! We just need to connect the frontend to display live data.

## Current Status
- ✅ Backend API working at `/api/system-metrics`
- ✅ System metrics collection (CPU, RAM, disk, uptime, services)
- ✅ UI components exist but show static data
- ❌ Frontend not connected to live data

## Immediate Tasks (Priority Order)

### 1. Create Shared Types (15 minutes)
Create the file `packages/shared/src/types/systemMetrics.ts`:

```typescript
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
```

Then export it in `packages/shared/src/index.ts`.

### 2. Create Frontend API Client (15 minutes)
Create `apps/ui/src/lib/api/systemMetrics.ts`:

```typescript
import apiClient from '../api';
import type { SystemMetricsResponse } from '@server-manager/shared';

export const systemMetricsApi = {
  getSystemMetrics(): Promise<SystemMetricsResponse> {
    return apiClient.get('/system-metrics');
  },
};
```

### 3. Update UI Component with Live Data (45 minutes)
Update `apps/ui/src/features/dashboard/components/SystemStats.tsx` to:
- Fetch data from API on component mount
- Auto-refresh every 5 seconds
- Show loading and error states
- Display real metrics instead of static data

### 4. Test and Polish (15 minutes)
- Test the auto-refresh functionality
- Verify error handling
- Check mobile responsiveness

## Expected Result
After completing these tasks:
- Dashboard will show live system metrics
- Data updates automatically every 5 seconds
- CPU, memory, uptime, and disk usage display real values
- Error states handled gracefully

## Commands to Test

1. **Check backend API is working:**
```bash
curl http://localhost:3000/api/system-metrics
```

2. **Start the development servers:**
```bash
# In root directory
pnpm dev
```

3. **Verify metrics display:**
- Open http://localhost:5173
- Navigate to Dashboard
- Check if metrics update automatically

## Quick Win Implementation Order

1. **Types** (15 min) → Enable TypeScript support
2. **API Client** (15 min) → Connect to backend  
3. **Live UI** (45 min) → Show real data
4. **Polish** (15 min) → Handle edge cases

**Total Time: ~90 minutes for fully functional live system metrics**

## Files to Modify

1. `packages/shared/src/types/systemMetrics.ts` (new)
2. `packages/shared/src/index.ts` (add export)
3. `apps/ui/src/lib/api/systemMetrics.ts` (new)
4. `apps/ui/src/features/dashboard/components/SystemStats.tsx` (update)

That's it! The backend is ready, we just need to wire up the frontend. 
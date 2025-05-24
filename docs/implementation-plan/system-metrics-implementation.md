# System Metrics Feature Implementation Plan

## Overview
Based on the current codebase analysis, the system metrics feature is **already partially implemented** in the backend but lacks full frontend integration and real-time data display. This plan outlines the steps to complete the implementation with CPU, RAM, disk usage, and uptime metrics.

## Current State Analysis

### ✅ Already Implemented
- **Backend**: Complete system metrics library (`apps/backend/src/lib/systemMetrics.ts`)
- **Backend**: System metrics controller (`apps/backend/src/controllers/systemMetricsController.ts`)
- **Backend**: System metrics routes (`apps/backend/src/routes/systemMetricsRoutes.ts`)
- **Backend**: Unit tests for system metrics
- **Frontend**: Basic UI components with static data (`apps/ui/src/features/dashboard/components/SystemStats.tsx`)
- **API Endpoint**: `/api/system-metrics` is registered and functional

### ❌ Missing/Incomplete
- **Shared Types**: System metrics types not defined in `packages/shared`
- **Frontend API Client**: No API client for system metrics in UI
- **Real-time Data**: Frontend shows static data instead of live metrics
- **Auto-refresh**: No periodic updates for metrics
- **Disk Usage Display**: UI doesn't show disk usage details
- **Error Handling**: Limited error states in UI

## Implementation Tasks

### Phase 1: Shared Types and API Foundation
**Branch**: `feature/system-metrics-integration`

#### Task 1.1: Define Shared Types
**File**: `packages/shared/src/types/systemMetrics.ts`
```typescript
// System metrics interfaces for consistent typing across backend and frontend
export interface MemoryUsage {
  total: number;
  free: number;
  used: number;
  unit: string;
  percentage: number;
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
```

#### Task 1.2: Export Types from Shared Package
**File**: `packages/shared/src/types/index.ts`
- Add `export * from './systemMetrics';`

**File**: `packages/shared/src/index.ts`
- Add system metrics types to exports

### Phase 2: Frontend API Integration

#### Task 2.1: Create System Metrics API Client
**File**: `apps/ui/src/lib/api/systemMetrics.ts`
```typescript
import apiClient from '../api';
import type { SystemMetricsApiResponse } from '@server-manager/shared';

export const systemMetricsApi = {
  /**
   * Get current system metrics
   */
  getSystemMetrics(): Promise<SystemMetricsApiResponse> {
    return apiClient.get('/system-metrics');
  },
};
```

#### Task 2.2: Add to API Index
**File**: `apps/ui/src/lib/api/index.ts`
- Export `systemMetricsApi`

### Phase 3: Enhanced UI Components

#### Task 3.1: Real-time System Stats Component
**File**: `apps/ui/src/features/dashboard/components/SystemStats.tsx`

Features to implement:
- Replace static data with live API calls
- Add loading states and error handling
- Implement auto-refresh every 5 seconds
- Add progress bars for memory and CPU usage
- Format disk usage in a readable table/grid
- Show memory percentage calculation
- Add refresh button for manual updates

#### Task 3.2: Detailed System Metrics View
**File**: `apps/ui/src/features/dashboard/components/DetailedSystemMetrics.tsx`

Features:
- Expandable disk usage table
- Service status indicators
- Uptime breakdown (days, hours, minutes)
- Historical metrics (if needed in future)
- System information display

#### Task 3.3: Error and Loading States
- Loading skeleton components
- Error boundary for metrics failure
- Offline/connection error handling
- Graceful degradation when metrics unavailable

### Phase 4: Enhanced Backend (Optional Improvements)

#### Task 4.1: Memory Percentage Calculation
**File**: `apps/backend/src/lib/systemMetrics.ts`
- Add percentage calculation to MemoryUsage interface
- Ensure consistent data format

#### Task 4.2: Response Standardization
**File**: `apps/backend/src/controllers/systemMetricsController.ts`
- Standardize API response format to match other endpoints
- Add proper error responses

### Phase 5: UI/UX Enhancements

#### Task 5.1: Dashboard Integration
**File**: `apps/ui/src/pages/DashboardView.tsx`
- Better layout for system metrics
- Add charts/graphs for trends
- Responsive design improvements

#### Task 5.2: Dedicated System Stats Page
- Enhance `/stats` route with detailed metrics
- Add historical data visualization
- Include system information (OS, kernel, etc.)

## Detailed Implementation Steps

### Step 1: Setup and Types (Estimated: 1 hour)
1. Create system metrics types in shared package
2. Update exports in shared package
3. Test type compilation across packages

### Step 2: Frontend API Client (Estimated: 1 hour)
1. Create `systemMetricsApi` with proper error handling
2. Add API client tests
3. Integrate with existing API infrastructure

### Step 3: Live Data Integration (Estimated: 3 hours)
1. Update `SystemStats.tsx` component:
   - Add React hooks for data fetching
   - Implement loading and error states
   - Add auto-refresh with cleanup
   - Format data display (percentages, units)
   - Add manual refresh functionality

### Step 4: Enhanced UI Components (Estimated: 2 hours)
1. Create disk usage table/grid component
2. Add progress bars for memory and CPU
3. Implement service status indicators
4. Add responsive design considerations

### Step 5: Testing and Polish (Estimated: 1 hour)
1. Test real-time updates
2. Test error scenarios
3. Verify responsive behavior
4. Add component tests

## Success Criteria

### Functional Requirements
- [x] Backend API returns system metrics
- [ ] Frontend displays live CPU usage percentage
- [ ] Frontend displays memory usage with total/used/free
- [ ] Frontend shows formatted uptime
- [ ] Frontend displays disk usage for all mounted filesystems
- [ ] Auto-refresh every 5 seconds
- [ ] Manual refresh capability
- [ ] Proper error handling and loading states

### Non-Functional Requirements
- [ ] Response time < 2 seconds for metrics API
- [ ] UI updates smoothly without flicker
- [ ] Memory leaks prevented (proper cleanup)
- [ ] Responsive design on mobile/tablet
- [ ] Accessible components (ARIA labels)

## Technical Considerations

### Performance
- Implement proper React cleanup for intervals
- Use React.memo for expensive components
- Consider WebSocket for real-time updates (future enhancement)

### Error Handling
- Network failure scenarios
- Backend service unavailable
- Partial data scenarios
- Permission denied (if auth is required)

### Security
- Rate limiting on backend API (if needed)
- Authentication/authorization (currently disabled)
- Input validation for any future parameters

## Future Enhancements (Out of Scope)
- Historical metrics storage and visualization
- Alerts and thresholds
- WebSocket real-time streaming
- Performance monitoring integration
- Network interface statistics
- Process monitoring
- Custom metrics configuration

## Testing Strategy

### Unit Tests
- [ ] API client functions
- [ ] Data formatting utilities
- [ ] Component rendering

### Integration Tests
- [ ] API endpoint responses
- [ ] Component data integration
- [ ] Error scenarios

### E2E Tests
- [ ] Full dashboard functionality
- [ ] Auto-refresh behavior
- [ ] Error recovery

## Dependencies

### No New Dependencies Required
- Existing React hooks for state management
- Existing API client infrastructure
- Existing UI component library

### Potential Future Dependencies
- Chart.js or similar for visualizations
- Socket.io for real-time updates
- Date manipulation library for uptime formatting

## Risk Mitigation

### High Risk
- **Backend system commands fail**: Handled with try-catch and fallback values
- **Frontend infinite loops**: Proper cleanup in useEffect hooks

### Medium Risk  
- **High CPU usage from polling**: Reasonable refresh intervals and cleanup
- **Memory leaks**: Proper component unmounting

### Low Risk
- **Cross-browser compatibility**: Modern browser support already established
- **Mobile responsiveness**: Existing UI framework handles this

## Timeline Estimate
**Total Estimated Time: 8 hours**

- Phase 1 (Types): 1 hour
- Phase 2 (API Client): 1 hour  
- Phase 3 (UI Integration): 3 hours
- Phase 4 (Backend Polish): 1 hour
- Phase 5 (Testing): 2 hours

## Acceptance Criteria

The feature will be considered complete when:
1. Dashboard shows live system metrics updating every 5 seconds
2. CPU, memory, disk, and uptime display correctly formatted data
3. Error states are handled gracefully
4. Manual refresh works correctly
5. No memory leaks or performance issues
6. All tests pass
7. Code is documented and follows project conventions

---

**Status**: Ready for implementation
**Priority**: High
**Complexity**: Medium
**Dependencies**: None 
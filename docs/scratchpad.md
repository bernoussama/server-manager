# Scratchpad

## Project status board

### Todo

 - [ ] make system resources page have actual data updated regularly

### In Progress

 - [ ] Implement dns configuration feature

### Done

 - [X] Implement dns configuration UI

## Current Task
Documentation and Review for System Metrics Library

## Current Role
Executor

## Implementation Plan Reference
[./implementation-plan/system-metrics-library.md](./implementation-plan/system-metrics-library.md)

## Current Status / Progress Tracking
- Unit tests for `systemMetrics.ts` created in `packages/backend/src/lib/__tests__/systemMetrics.test.ts`.
- Integration test for `/api/system-metrics` endpoint created in `packages/backend/src/controllers/__tests__/systemMetricsController.test.ts`.
- `supertest` and its types installed.
- Ready for documentation and review.

## Executor's Feedback or Assistance Requests
- None.

## Lessons Learned
- [2024-07-26] Parsing command outputs requires careful attention to potential variations and error states.
- [2024-07-26] For CPU usage, `/proc/stat` provides detailed counters. `os.loadavg()` is simpler for system load averages. The load average is not a direct CPU percentage but can be used to approximate it: `(loadavg[0] / cores) * 100` (capped at 100%).
- [2024-07-26] `systemctl` provides comprehensive service information on modern Linux systems. Using `--plain --no-legend` flags with `systemctl list-units` simplifies output parsing.
- [2024-07-26] The `uptime -p` command provides a user-friendly uptime string.
- [2024-07-26] The `free -m` command output needs careful parsing; splitting by `\s+` handles variable spacing.
- [2024-07-26] The `df -h` output parsing needs to account for potential spaces in filesystem names by joining initial parts and taking fixed-position elements from the end.
- [2024-07-26] When installing dependencies in a pnpm monorepo, use `pnpm add --filter <package-name> <dependency>` to target the correct workspace package.
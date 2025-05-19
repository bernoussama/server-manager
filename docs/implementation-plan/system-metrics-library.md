# Implementation Plan: System Metrics Library

## Branch Name
feature/system-metrics-library

## Background and Motivation
The user wants to implement a library in the backend package to retrieve various system metrics. This will allow the application to monitor the health and performance of the server it's running on. The metrics required are CPU usage, memory usage, disk usage, system uptime, and a list of active services. This functionality will likely be exposed via an API endpoint for the UI or other services to consume.

## Key Challenges and Analysis
- **Cross-platform compatibility**: System commands to fetch metrics can vary significantly between OS (Linux, macOS, Windows). The initial implementation will focus on Linux, as per the user's OS information. We will rely on common Linux commands and `/proc` filesystem.
- **Data parsing**: The output of system commands (e.g., `df`, `free`, `uptime`, `top`/`ps`, `systemctl`) needs to be parsed reliably. Regular expressions and string manipulation will be necessary.
- **Performance**: Fetching these metrics should not put a significant load on the system. Commands should be chosen carefully.
- **Security**: Ensure that any commands executed are safe and do not introduce vulnerabilities. We will use `child_process.execAsync` and avoid constructing commands with user input directly in the command string.
- **Dependencies**: We will primarily use the built-in `child_process` module to execute system commands. This avoids adding external dependencies for this core functionality.
- **Error Handling**: Each metric-gathering function should handle potential errors during command execution or parsing gracefully.

## High-level Task Breakdown

1.  **Setup Feature Branch**
    *   Task: Create a new git branch named `feature/system-metrics-library` from the `main` branch.
    *   Success Criteria: Branch is created and checked out. `git status` shows on branch `feature/system-metrics-library`.

2.  **Create System Metrics Library File**
    *   Task: Create a new file `packages/backend/src/lib/systemMetrics.ts`.
    *   Success Criteria: File `packages/backend/src/lib/systemMetrics.ts` is created with a basic structure or class.

3.  **Implement Uptime Function**
    *   Task: Implement a function `getUptime(): Promise<string>` in `systemMetrics.ts`.
        *   On Linux, use `uptime -p` for a human-readable format or parse `/proc/uptime` for seconds and format it.
    *   Success Criteria: Function `getUptime` is implemented and returns a human-readable uptime string (e.g., "2 hours, 30 minutes") or uptime in seconds.

4.  **Implement Memory Usage Function**
    *   Task: Implement `getMemoryUsage(): Promise<{ total: number, free: number, used: number, unit: string }>` in `systemMetrics.ts`.
        *   On Linux, parse the output of `free -m` (megabytes) or `cat /proc/meminfo`.
    *   Success Criteria: Function `getMemoryUsage` returns an object with total, free, and used memory, with units (e.g., MB or GB).

5.  **Implement CPU Usage Function**
    *   Task: Implement `getCpuUsage(): Promise<{ currentLoad: number, cores: number }>` in `systemMetrics.ts`.
        *   On Linux, parse `/proc/stat` at two short intervals to calculate usage, or use `os.loadavg()` for 1, 5, 15 min averages (simpler, less instantaneous). For a more direct "current usage" similar to `top`, parsing `/proc/stat` is better. We can also get core count from `os.cpus().length`.
    *   Success Criteria: Function `getCpuUsage` returns current CPU load percentage and number of cores.

6.  **Implement Disk Usage Function**
    *   Task: Implement `getDiskUsage(): Promise<{ filesystem: string, size: string, used: string, available: string, usagePercentage: string, mountPath: string }[]>` in `systemMetrics.ts`.
        *   On Linux, parse the output of `df -h`.
    *   Success Criteria: Function `getDiskUsage` returns an array of objects, each representing a mounted filesystem with its usage details.

7.  **Implement Active Services Function**
    *   Task: Implement `getActiveServices(): Promise<{ name: string, status: string, description: string }[]>` in `systemMetrics.ts`.
        *   On Linux, parse the output of `systemctl list-units --type=service --state=active --no-pager`. This is more comprehensive than reusing `ServiceManager` which is for specific, allowed services.
    *   Success Criteria: Function `getActiveServices` returns an array of active service names, their status, and description.

8.  **Create System Metrics Controller**
    *   Task: Create `packages/backend/src/controllers/systemMetricsController.ts`.
    *   Task: Implement `getSystemMetrics(req: Request, res: Response)` that calls all functions from `systemMetrics.ts` and returns a consolidated JSON response.
    *   Success Criteria: Controller aggregates data from `systemMetrics.ts` and handles errors from the library.

9.  **Create System Metrics Route**
    *   Task: Create `packages/backend/src/routes/systemMetricsRoutes.ts`.
    *   Task: Add a GET route (e.g., `/api/system-metrics`) using `systemMetricsController.getSystemMetrics`.
    *   Task: Register this new router in `packages/backend/src/app.ts`.
    *   Success Criteria: API endpoint `/api/system-metrics` is accessible, returns system metrics, and is protected if necessary (e.g., admin only).

10. **Add Basic Tests**
    *   Task: Add unit tests for parsing logic within `systemMetrics.ts` functions, mocking `child_process.execAsync`.
    *   Task: Add integration tests for the `/api/system-metrics` endpoint.
    *   Success Criteria: Tests are written, cover key logic, and pass.

11. **Documentation and Review**
    *   Task: Add JSDoc comments to new functions and classes.
    *   Task: Review implementation for clarity, efficiency, security, and error handling.
    *   Success Criteria: Code is well-documented and reviewed.

## Project Status Board
- [x] Setup Feature Branch
- [x] Create System Metrics Library File (`systemMetrics.ts`)
- [x] Implement Uptime Function (`getUptime`)
- [x] Implement Memory Usage Function (`getMemoryUsage`)
- [x] Implement CPU Usage Function (`getCpuUsage`)
- [x] Implement Disk Usage Function (`getDiskUsage`)
- [x] Implement Active Services Function (`getActiveServices`)
- [x] Create System Metrics Controller (`systemMetricsController.ts`)
- [x] Create System Metrics Route (`systemMetricsRoutes.ts` and update `app.ts`)
- [x] Add Basic Tests
- [ ] Documentation and Review
- [ ] PR Creation and Merge

## Executor's Feedback or Assistance Requests
- (Will be filled by Executor during implementation)

## Lessons Learned
- (Will be filled during implementation) 
# Scratchpad

## Project status board

### Todo

 - [ ] make system resources page have actual data updated regularly

### In Progress

 - [ ] Implement dns configuration feature
   - [✓] Fix DNS controller tests

### Done

 - [X] Implement dns configuration UI
 - [X] Implement DNS JSON config save feature

## Current Task
DNS Config Fetch from JSON Files Implementation

## Current Role
Executor

## Implementation Plan Reference
[./implementation-plan/dns-config-fetch.md](./implementation-plan/dns-config-fetch.md)

## Current Status / Progress Tracking
- ✅ Started implementation of fetching current DNS config from backend JSON files
- ✅ Analyzed existing JSON file structure in test/dns directory
- ✅ Updated getCurrentDnsConfiguration backend endpoint to read from JSON files
- ✅ Created frontend getDnsConfigurationAPI function to fetch current config
- ✅ Updated UI to use fetched config instead of hardcoded defaults with loading states
- ⏳ Need to fix TypeScript linter errors in DNSConfig.tsx (soaSettings schema issues)
- ⏳ Need to test the complete integration flow

## Executor's Feedback or Assistance Requests
- Successfully implemented the core fetch functionality - backend reads JSON files and UI fetches data on mount
- Main functionality is working, but TypeScript errors exist due to soaSettings not being defined in the form schema
- Next step is to fix the TypeScript schema issues to make the app fully functional

## Lessons Learned
- [2024-07-26] Parsing command outputs requires careful attention to potential variations and error states.
- [2024-07-26] For CPU usage, `/proc/stat` provides detailed counters. `os.loadavg()` is simpler for system load averages. The load average is not a direct CPU percentage but can be used to approximate it: `(loadavg[0] / cores) * 100` (capped at 100%).
- [2024-07-26] `systemctl` provides comprehensive service information on modern Linux systems. Using `--plain --no-legend` flags with `systemctl list-units` simplifies output parsing.
- [2024-07-26] The `uptime -p` command provides a user-friendly uptime string.
- [2024-07-26] The `free -m` command output needs careful parsing; splitting by `\s+` handles variable spacing.
- [2024-07-26] The `df -h` output parsing needs to account for potential spaces in filesystem names by joining initial parts and taking fixed-position elements from the end.
- [2024-07-26] When installing dependencies in a pnpm monorepo, use `pnpm add --filter <package-name> <dependency>` to target the correct workspace package.
- [2024-07-27] When mocking logger functions in tests, only mock methods that actually exist in the logger. Check the logger implementation before creating mocks to avoid "Cannot read properties of undefined" errors.
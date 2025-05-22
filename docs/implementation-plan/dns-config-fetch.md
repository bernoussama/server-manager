# DNS Config Fetch Implementation Plan

## Background and Motivation

The user wants the UI to fetch the current DNS configuration from the backend instead of showing hardcoded default values on page load. The backend should read the current configuration from JSON config files that are already being created alongside BIND configuration files.

## Current State Analysis

- ✅ JSON companion files are already being created during DNS config save
- ✅ getCurrentDnsConfiguration endpoint exists but returns 501 (not implemented)
- ❌ UI currently uses hardcoded default values
- ❌ Backend doesn't read from existing JSON files
- ❌ TypeScript linter errors in DNSConfig.tsx need fixing

## Key Challenges and Analysis

1. **JSON File Structure Mapping**: Need to map from the JSON file format to the UI form format
2. **Multiple JSON Files**: Configuration is split across multiple files (named.conf.json, zones/*.json)
3. **Data Transformation**: JSON format differs from UI form expectations (arrays vs semicolon-separated strings)
4. **Error Handling**: Handle cases where JSON files don't exist or are malformed
5. **TypeScript Issues**: Fix linter errors in DNSConfig.tsx for soaSettings

## High-level Task Breakdown

### Task 1: Update Backend to Read JSON Configuration Files
**Branch Name**: `feature/dns-config-fetch`
**Success Criteria**: 
- Backend reads from named.conf.json and zone JSON files
- Returns properly formatted configuration for UI consumption
- Handles missing files gracefully
- All tests pass

### Task 2: Add Frontend API Function for Fetching Config
**Success Criteria**:
- Create getDnsConfigurationAPI function
- Handle API errors properly
- TypeScript types are correct

### Task 3: Update UI to Fetch Config on Mount
**Success Criteria**:
- UI calls fetch API on component mount
- Loading state is shown while fetching
- Error handling for failed requests
- Form is populated with fetched data

### Task 4: Fix TypeScript Linter Errors
**Success Criteria**:
- All linter errors in DNSConfig.tsx are resolved
- soaSettings types are properly defined
- Form validation works correctly

### Task 5: Integration Testing
**Success Criteria**:
- End-to-end flow works (save config → reload page → see saved config)
- Error cases are handled properly
- Performance is acceptable

## Project Status Board

### Todo
- [ ] Task 4: Fix TypeScript linter errors
- [ ] Task 5: Integration testing

### In Progress
- [ ] Currently finishing Task 3

### Done
- [x] Analysis of current JSON file structure
- [x] Task 1: Update backend getCurrentDnsConfiguration
- [x] Task 2: Add frontend getDnsConfigurationAPI  
- [x] Task 3: Update UI to fetch on mount

## Executor's Feedback or Assistance Requests

Need to start with Task 1 - updating the backend endpoint to actually read from the JSON files.

## Lessons Learned

- [2025-05-22] JSON companion files are already created with proper structure, just need to read them back 
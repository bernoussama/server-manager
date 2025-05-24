# HTTP Configuration Implementation Plan

## Overview
This document outlines the implementation plan for HTTP configuration management functionality in the ts-node-express project. The feature will allow users to configure Apache/HTTP server settings through a web interface.

## Current State Analysis

### ✅ Already Implemented
- HTTP types and interfaces in `packages/shared/src/types/http.ts`
- Form validators and transformers in `packages/shared/src/validators/httpFormValidator.ts` and `httpTransformers.ts`
- Basic UI scaffolding in `apps/ui/src/features/configuration/http/HTTPConfig.tsx`
- HTTP config view page in `apps/ui/src/pages/HTTPConfigView.tsx`

### ❌ Missing Implementation
- Backend HTTP configuration controller
- HTTP service management integration
- HTTP configuration file reading/writing
- Full-featured frontend form with validation
- API endpoints for HTTP config CRUD operations
- Integration with system service management

## Implementation Plan

### Phase 1: Backend Core Implementation

#### 1.1 HTTP Configuration Controller
**File**: `apps/backend/src/controllers/httpController.ts`

**Responsibilities**:
- Get current HTTP configuration
- Update HTTP configuration
- Validate configuration syntax
- Backup and restore configurations
- Integrate with service management

**Key Methods**:
```typescript
- getCurrentHttpConfiguration()
- updateHttpConfiguration()
- validateHttpConfiguration()
- restartHttpService()
- getHttpServiceStatus()
```

#### 1.2 HTTP Configuration Service
**File**: `apps/backend/src/lib/HttpConfigService.ts`

**Responsibilities**:
- Read/write Apache configuration files
- Parse and generate httpd.conf and virtual host configs
- Backup management
- Configuration validation

#### 1.3 HTTP Routes
**File**: `apps/backend/src/routes/httpRoutes.ts`

**Endpoints**:
```
GET    /api/http/config          - Get current configuration
PUT    /api/http/config          - Update configuration
POST   /api/http/validate        - Validate configuration
GET    /api/http/status          - Get service status
POST   /api/http/service/:action - Control service (start/stop/restart)
```

#### 1.4 Configuration File Management

**Target Files**:
- `/etc/httpd/conf/httpd.conf` (main config)
- `/etc/httpd/conf.d/*.conf` (virtual hosts)
- Backup directory: `/etc/httpd/conf/backups/`

**Features**:
- Atomic file updates with backup/rollback
- Configuration syntax validation before applying
- JSON metadata storage for UI state

### Phase 2: Frontend Implementation

#### 2.1 Enhanced HTTP Configuration Form
**File**: `apps/ui/src/features/configuration/http/HTTPConfig.tsx`

**Improvements**:
- Replace basic form with react-hook-form integration
- Add comprehensive form validation using shared validators
- Implement dynamic virtual host management
- Add SSL certificate configuration
- Include custom directives editor
- Real-time configuration preview

#### 2.2 Virtual Host Management Component
**File**: `apps/ui/src/features/configuration/http/VirtualHostConfig.tsx`

**Features**:
- Add/remove virtual hosts dynamically
- Per-virtual-host SSL configuration
- Directory configuration options
- Custom logging settings
- Redirect and rewrite rules

#### 2.3 HTTP Service Status Component
**File**: `apps/ui/src/features/configuration/http/HttpServiceStatus.tsx`

**Features**:
- Real-time service status
- Service control buttons (start/stop/restart)
- Configuration test results
- Error log display

#### 2.4 API Integration
**File**: `apps/ui/src/lib/api/http.ts`

**Methods**:
```typescript
- getHttpConfiguration()
- updateHttpConfiguration() 
- validateHttpConfiguration()
- getHttpServiceStatus()
- controlHttpService()
```

### Phase 3: Integration and Testing

#### 3.1 Service Integration
- Integrate HTTP service control with existing `ServiceManager`
- Add HTTP service to allowed services list
- Update service status monitoring

#### 3.2 Testing Strategy

**Backend Tests**:
- Unit tests for HTTP controller methods
- Integration tests for file operations
- Service management tests
- Configuration validation tests

**Frontend Tests**:
- Component testing for form interactions
- API integration tests
- Form validation tests
- Error handling tests

**End-to-End Tests**:
- Complete configuration workflow
- Service management workflow
- Error scenarios and recovery

### Phase 4: Security and Production Readiness

#### 4.1 Security Measures
- Input sanitization for all configuration values
- File path validation to prevent directory traversal
- Permission checks for configuration files
- Audit logging for configuration changes

#### 4.2 Error Handling
- Graceful handling of invalid configurations
- Automatic rollback on failed updates
- User-friendly error messages
- Configuration backup management

#### 4.3 Documentation
- API documentation
- User guide for HTTP configuration
- Troubleshooting guide
- Security best practices

## Implementation Timeline

### Week 1: Backend Foundation
- [ ] Create HttpController with basic CRUD operations
- [ ] Implement HttpConfigService for file operations
- [ ] Set up HTTP routes and middleware
- [ ] Basic configuration file parsing

### Week 2: Backend Completion
- [ ] Configuration validation and backup system
- [ ] Service management integration
- [ ] Error handling and logging
- [ ] Backend unit tests

### Week 3: Frontend Enhancement
- [ ] Enhanced HTTPConfig component with form validation
- [ ] Virtual host management component
- [ ] Service status component
- [ ] API integration layer

### Week 4: Integration and Testing
- [ ] End-to-end integration
- [ ] Comprehensive testing suite
- [ ] Security review and hardening
- [ ] Documentation completion

## Technical Considerations

### Configuration File Structure
```
/etc/httpd/
├── conf/
│   ├── httpd.conf              # Main configuration
│   ├── backups/                # Configuration backups
│   └── metadata/               # JSON metadata for UI
└── conf.d/
    ├── vhost-*.conf           # Virtual host configurations
    └── ssl.conf               # SSL configuration
```

### Service Management
- Use existing `ServiceManager` class
- Add 'httpd' to `AllowedService` type
- Implement configuration testing before service restart

### Error Recovery
- Automatic backup before configuration changes
- Rollback mechanism for failed updates
- Configuration validation before applying
- Service health checks after restart

### Performance Considerations
- Lazy loading of configuration data
- Efficient file parsing and generation
- Minimal service restarts
- Background configuration validation

## Risk Mitigation

### High-Risk Areas
1. **Configuration File Corruption**: Implement atomic writes and backups
2. **Service Downtime**: Validate before restart, quick rollback
3. **Security Vulnerabilities**: Input validation, file permissions
4. **Data Loss**: Comprehensive backup strategy

### Monitoring and Alerting
- Configuration change audit logs
- Service health monitoring
- Failed configuration attempt alerts
- Backup integrity checks

## Success Criteria

### Functional Requirements
- [ ] Users can view current HTTP configuration
- [ ] Users can modify global HTTP settings
- [ ] Users can manage virtual hosts (add/edit/delete)
- [ ] Users can configure SSL settings
- [ ] Users can control HTTP service (start/stop/restart)
- [ ] Configuration changes are validated before applying
- [ ] Automatic backup and recovery system

### Non-Functional Requirements
- [ ] Configuration updates complete within 30 seconds
- [ ] Zero data loss during configuration updates
- [ ] Comprehensive error handling and user feedback
- [ ] Secure handling of sensitive configuration data
- [ ] 95% test coverage for HTTP configuration code

## Dependencies

### External Dependencies
- Apache HTTP Server installed and configured
- Proper file system permissions for configuration directories
- Service management capabilities (systemctl)

### Internal Dependencies
- Existing ServiceManager functionality
- Shared validation and type libraries
- Authentication and authorization middleware
- Logging and error handling infrastructure

## Post-Implementation

### Monitoring
- Configuration change tracking
- Service uptime monitoring
- Performance metrics collection
- User interaction analytics

### Maintenance
- Regular backup cleanup
- Configuration file optimization
- Security updates and patches
- User feedback incorporation 
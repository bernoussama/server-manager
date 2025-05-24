# HTTP Configuration Implementation Checklist

## Immediate Next Steps

### 1. Backend Setup (Priority: High)

#### Add HTTP service to allowed services
- [x] Update `packages/shared/src/types/services.ts`:
  ```typescript
  export type AllowedService = 'named' | 'dhcpd' | 'httpd';
  ```

#### Create HTTP Controller
- [x] `apps/backend/src/controllers/httpController.ts`
- [x] Methods: `getCurrentHttpConfiguration`, `updateHttpConfiguration`, `validateHttpConfiguration`
- [x] Use existing patterns from `dnsController.ts`

#### Create HTTP Routes  
- [x] `apps/backend/src/routes/httpRoutes.ts`
- [x] 5 main endpoints (GET config, PUT config, POST validate, GET status, POST service action)
- [x] Add to main app routing

#### HTTP Configuration Service
- [x] `apps/backend/src/lib/HttpConfigService.ts` (integrated into controller)
- [x] File operations for `/etc/httpd/conf/httpd.conf` and `/etc/httpd/conf.d/*.conf`
- [x] Backup/restore functionality

### 2. Frontend Enhancement (Priority: Medium)

#### Enhanced HTTP Config Form
- [x] Replace basic form in `apps/ui/src/features/configuration/http/HTTPConfig.tsx`
- [x] Use react-hook-form with shared validators
- [x] Dynamic virtual host management

#### API Integration
- [x] `apps/ui/src/lib/api/http.ts`
- [x] Methods for all HTTP endpoints
- [x] Error handling and types

#### Virtual Host Management
- [x] New component: `apps/ui/src/features/configuration/http/VirtualHostConfig.tsx` (integrated into main component)
- [x] Add/remove virtual hosts
- [x] SSL configuration per virtual host

### 3. Testing (Priority: Medium)

#### Backend Tests
- [ ] Controller unit tests
- [ ] Service integration tests
- [ ] Configuration validation tests

#### Frontend Tests
- [ ] Component tests
- [ ] Form validation tests
- [ ] API integration tests

## Quick Start Implementation

### Step 1: Add HTTP Service Support (30 minutes)
```bash
# 1. Update services type
# Edit packages/shared/src/types/services.ts

# 2. Update ServiceManager if needed
# Check apps/backend/src/lib/ServiceManager.ts
```

### Step 2: Create Basic HTTP Controller (2 hours)
```typescript
// apps/backend/src/controllers/httpController.ts
export class HttpController {
  async getCurrentHttpConfiguration(req: AuthRequest, res: Response) {
    // Read from /etc/httpd/conf/httpd.conf
    // Parse configuration
    // Return HttpConfiguration
  }

  async updateHttpConfiguration(req: AuthRequest, res: Response) {
    // Validate input
    // Backup current config
    // Write new configuration
    // Test configuration
    // Restart service if valid
  }
}
```

### Step 3: Create HTTP Routes (30 minutes)
```typescript
// apps/backend/src/routes/httpRoutes.ts
router.get('/config', httpController.getCurrentHttpConfiguration);
router.put('/config', httpController.updateHttpConfiguration);
router.post('/validate', httpController.validateHttpConfiguration);
router.get('/status', httpController.getHttpServiceStatus);
router.post('/service/:action', httpController.controlHttpService);
```

### Step 4: Basic Form Enhancement (1 hour)
```typescript
// Replace apps/ui/src/features/configuration/http/HTTPConfig.tsx
// with react-hook-form and shared validators
```

## File Structure After Implementation

```
apps/backend/src/
├── controllers/
│   └── httpController.ts          # ✅ New
├── lib/
│   └── HttpConfigService.ts       # ✅ New
└── routes/
    └── httpRoutes.ts              # ✅ New

apps/ui/src/
├── features/configuration/http/
│   ├── HTTPConfig.tsx             # ✅ Enhanced
│   ├── VirtualHostConfig.tsx      # ✅ New
│   └── HttpServiceStatus.tsx      # ✅ New
└── lib/api/
    └── http.ts                    # ✅ New

packages/shared/src/
├── types/
│   ├── services.ts                # ✅ Updated
│   └── http.ts                    # ✅ Already done
└── validators/
    ├── httpFormValidator.ts       # ✅ Already done
    └── httpTransformers.ts        # ✅ Already done
```

## Configuration Examples

### Sample httpd.conf structure:
```apache
ServerRoot "/etc/httpd"
Listen 80
Listen 443 ssl

ServerName example.com
ServerAdmin admin@example.com

# Virtual Hosts
<VirtualHost *:80>
    ServerName example.com
    DocumentRoot "/var/www/html"
    ErrorLog "logs/error_log"
    CustomLog "logs/access_log" combined
</VirtualHost>

<VirtualHost *:443>
    ServerName example.com
    DocumentRoot "/var/www/html"
    SSLEngine on
    SSLCertificateFile "/etc/ssl/certs/example.crt"
    SSLCertificateKeyFile "/etc/ssl/private/example.key"
</VirtualHost>
```

## Testing Strategy

### Manual Testing Workflow:
1. Start with basic GET /api/http/config endpoint
2. Test configuration parsing and response format
3. Implement PUT endpoint with simple configuration
4. Test service restart integration
5. Add frontend form integration
6. Test end-to-end workflow

### Automated Testing:
1. Mock file system operations for unit tests
2. Use test configuration files
3. Mock service management calls
4. Test validation logic extensively

## Security Considerations

### File Permissions:
```bash
# Ensure proper permissions for HTTP config files
sudo chown -R apache:apache /etc/httpd/conf
sudo chmod 644 /etc/httpd/conf/httpd.conf
sudo chmod 755 /etc/httpd/conf.d/
```

### Input Validation:
- Validate all file paths to prevent directory traversal
- Sanitize configuration directives
- Validate virtual host names and paths
- Check SSL certificate file permissions

## Troubleshooting

### Common Issues:
1. **Permission denied**: Check file ownership and permissions
2. **Service restart fails**: Validate configuration syntax first
3. **Configuration not applied**: Check Apache reload status
4. **SSL errors**: Verify certificate files exist and are readable

### Debug Commands:
```bash
# Test Apache configuration
sudo httpd -t

# Check service status
sudo systemctl status httpd

# View error logs
sudo tail -f /var/log/httpd/error_log
``` 
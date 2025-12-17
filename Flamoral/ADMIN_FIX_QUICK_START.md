# Admin Dashboard - Quick Fix Guide
## Apply Fixes in 5 Minutes

---

## Quick Fix Steps

### Step 1: Apply Automated Fixes (Choose One)

#### Option A: Bash Script (Git Bash / WSL)
```bash
cd C:/Users/citad/OneDrive/Documents/Dating/Flamoral
chmod +x fix-admin.sh
./fix-admin.sh
```

#### Option B: Node.js Script
```bash
cd C:/Users/citad/OneDrive/Documents/Dating/Flamoral
node fix-admin-dashboard.js
```

#### Option C: PowerShell Script
```powershell
cd C:\Users\citad\OneDrive\Documents\Dating\Flamoral

# Fix 1: Add AdminController to controllers.module.ts
$file = "backend\services\api-gateway\src\controllers\controllers.module.ts"
$content = Get-Content $file -Raw
if (-not $content.Contains("AdminController")) {
    $content = $content -replace "import { SafetyController } from './safety.controller';", "import { SafetyController } from './safety.controller';`nimport { AdminController } from './admin.controller';"
    $content = $content -replace "    SafetyController,", "    SafetyController,`n    AdminController,"
    Set-Content $file $content
    Write-Host "✅ AdminController added" -ForegroundColor Green
}

# Fix 2: Add adminService to configuration.ts
$file = "backend\services\api-gateway\src\config\configuration.ts"
$content = Get-Content $file -Raw
if (-not $content.Contains("adminService:")) {
    $content = $content -replace "advertisingService: process.env.ADVERTISING_SERVICE_URL \|\| 'http://localhost:3010',", "advertisingService: process.env.ADVERTISING_SERVICE_URL || 'http://localhost:3011',`n    adminService: process.env.ADMIN_SERVICE_URL || 'http://localhost:3010',"
    Set-Content $file $content
    Write-Host "✅ adminService added to config" -ForegroundColor Green
}

# Fix 3: Fix admin controller paths
$file = "backend\services\api-gateway\src\controllers\admin.controller.ts"
$content = Get-Content $file -Raw
$content = $content -replace "/api/admin/", "/"
Set-Content $file $content
Write-Host "✅ Admin controller paths fixed" -ForegroundColor Green

Write-Host "`n🎉 All fixes applied!" -ForegroundColor Cyan
```

---

### Step 2: Rebuild API Gateway

```bash
cd backend/services/api-gateway
npm run build
```

---

### Step 3: Restart Services

```bash
# Terminal 1: Admin Service
cd backend/services/admin-service
npm run dev

# Terminal 2: API Gateway
cd backend/services/api-gateway
npm run dev
```

---

### Step 4: Test Admin Endpoints

```bash
# Test users endpoint
curl http://localhost:4000/api/v1/api/admin/users \
  -H "Authorization: Bearer YOUR_TOKEN"

# Expected: 200 OK with user list
```

---

## What Was Fixed?

### ❌ Before
- AdminController existed but wasn't registered → **404 errors**
- adminService not in configuration → **Proxy couldn't find service**
- Double /api prefix in paths → **Confusing routes**
- Port conflict with advertising service → **Service collision**

### ✅ After
- AdminController registered in module → **Routes work**
- adminService in configuration → **Proxy routes correctly**
- Clean API paths → **Clear routing**
- Admin service on port 3010 → **No conflicts**

---

## API Endpoints Now Available

```
Base URL: /api/v1/api/admin

User Management:
  GET    /users                    - List users
  GET    /users/:id                - Get user details
  POST   /users/:id/ban            - Ban user
  POST   /users/:id/unban          - Unban user
  POST   /users/:id/verify         - Verify user
  DELETE /users/:id                - Delete user

Dashboard:
  GET    /dashboard                - Get dashboard stats

System Health:
  GET    /health                   - Get system health
  GET    /health/services/:name/logs  - Get service logs

A/B Tests:
  GET    /ab-tests                 - List A/B tests
  POST   /ab-tests                 - Create A/B test
  GET    /ab-tests/:id             - Get test details

Support:
  GET    /tickets                  - List support tickets
  GET    /tickets/:id              - Get ticket details
  POST   /tickets/:id/messages     - Add ticket message

Audit:
  GET    /audit-logs               - Query audit logs
```

---

## Verify Installation

### Check 1: Controller Registered
```bash
# Should contain "AdminController"
grep -r "AdminController" backend/services/api-gateway/src/controllers/controllers.module.ts
```

### Check 2: Service in Config
```bash
# Should contain "adminService:"
grep -r "adminService:" backend/services/api-gateway/src/config/configuration.ts
```

### Check 3: Paths Fixed
```bash
# Should NOT contain "/api/admin/" (should be just "/")
grep -r "/api/admin/" backend/services/api-gateway/src/controllers/admin.controller.ts
```

### Check 4: Services Running
```bash
# Should show processes on ports 3010 and 4000
netstat -ano | findstr :3010
netstat -ano | findstr :4000
```

---

## Troubleshooting

### Script Fails?
**Manual fix steps in:** [ADMIN_DASHBOARD_FIX_REPORT.md](./ADMIN_DASHBOARD_FIX_REPORT.md)

### Still Getting 404?
1. Check API Gateway logs
2. Verify controller registration
3. Restart API Gateway

### Can't Connect to Admin Service?
1. Check if admin service is running: `netstat -ano | findstr :3010`
2. Check admin service logs
3. Verify database connection

### Authentication Errors?
1. Verify JWT token is valid
2. Check user has admin role
3. Review auth service configuration

---

## Next Steps

1. ✅ Test all admin endpoints
2. ✅ Verify admin UI pages load
3. ✅ Test role-based access
4. ✅ Check audit logging
5. 📋 Deploy to staging
6. 📋 Deploy to production

---

## Need Help?

- **Full Report:** [ADMIN_DASHBOARD_FIX_REPORT.md](./ADMIN_DASHBOARD_FIX_REPORT.md)
- **Implementation Details:** [ADMIN_DASHBOARD_COMPLETE.md](./ADMIN_DASHBOARD_COMPLETE.md)
- **Admin Service README:** [backend/services/admin-service/README.md](./backend/services/admin-service/README.md)

---

**Last Updated:** 2025-12-15

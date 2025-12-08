# Azure DevOps Pipeline Failure - Missing package-lock.json Files

## Issue Summary

The Azure DevOps CI pipeline is failing because **package-lock.json files are missing** for all 11 backend Node.js microservices.

## Root Cause

The pipeline template (`pipelines/templates/node-build.yml`) at **line 33** uses package-lock.json for cache keys:

```yaml
- task: Cache@2
  inputs:
    key: 'npm | "$(Agent.OS)" | ${{ parameters.serviceDirectory }}/package-lock.json'
```

When package-lock.json doesn't exist, the Cache task fails, causing the entire pipeline to fail.

## Affected Services

The following 11 backend services are missing package-lock.json:

| Service | Directory | Status |
|---------|-----------|--------|
| 1. advertising-service | `backend/services/advertising-service` | ❌ Missing |
| 2. analytics-service | `backend/services/analytics-service` | ❌ Missing |
| 3. api-gateway | `backend/services/api-gateway` | ❌ Missing |
| 4. auth-service | `backend/services/auth-service` | ❌ Missing |
| 5. matching-service | `backend/services/matching-service` | ❌ Missing |
| 6. media-service | `backend/services/media-service` | ❌ Missing |
| 7. messaging-service | `backend/services/messaging-service` | ❌ Missing |
| 8. moderation-service | `backend/services/moderation-service` | ❌ Missing |
| 9. notification-service | `backend/services/notification-service` | ❌ Missing |
| 10. payment-service | `backend/services/payment-service` | ❌ Missing |
| 11. user-service | `backend/services/user-service` | ❌ Missing |

## Services NOT Affected

- **realtime-service**: Go service (uses `go.mod`, not npm)
- **ai-services subdirectories**: Python services (use `requirements.txt`, not npm)

## Solution

### ⚡ QUICKEST FIX - Automated Scripts

I've created **3 automated scripts** to generate all package-lock.json files at once:

#### 1. PowerShell (Windows - Recommended)

```powershell
cd C:\Users\citad\OneDrive\Documents\Dating\DatingPlatform
.\generate-package-locks.ps1
```

**File location:** `C:\Users\citad\OneDrive\Documents\Dating\DatingPlatform\generate-package-locks.ps1`

#### 2. Node.js Script (Cross-platform)

```bash
cd C:\Users\citad\OneDrive\Documents\Dating\DatingPlatform
node generate-locks.js
```

**File location:** `C:\Users\citad\OneDrive\Documents\Dating\DatingPlatform\generate-locks.js`

#### 3. Batch File (Windows CMD)

```cmd
cd C:\Users\citad\OneDrive\Documents\Dating\DatingPlatform
generate-package-locks.bat
```

**File location:** `C:\Users\citad\OneDrive\Documents\Dating\DatingPlatform\generate-package-locks.bat`

#### 4. Bash Script (Git Bash/WSL)

```bash
cd /c/Users/citad/OneDrive/Documents/Dating/DatingPlatform
chmod +x generate-package-locks.sh
./generate-package-locks.sh
```

**File location:** `C:\Users\citad\OneDrive\Documents\Dating\DatingPlatform\generate-package-locks.sh`

### 🔧 Manual Fix (If Scripts Don't Work)

Run npm install in each service directory:

```bash
cd C:\Users\citad\OneDrive\Documents\Dating\DatingPlatform

# 1. Advertising Service
cd backend/services/advertising-service
npm install
cd ../../..

# 2. Analytics Service
cd backend/services/analytics-service
npm install
cd ../../..

# 3. API Gateway
cd backend/services/api-gateway
npm install
cd ../../..

# 4. Auth Service
cd backend/services/auth-service
npm install
cd ../../..

# 5. Matching Service
cd backend/services/matching-service
npm install
cd ../../..

# 6. Media Service
cd backend/services/media-service
npm install
cd ../../..

# 7. Messaging Service
cd backend/services/messaging-service
npm install
cd ../../..

# 8. Moderation Service
cd backend/services/moderation-service
npm install
cd ../../..

# 9. Notification Service
cd backend/services/notification-service
npm install
cd ../../..

# 10. Payment Service
cd backend/services/payment-service
npm install
cd ../../..

# 11. User Service
cd backend/services/user-service
npm install
cd ../../..
```

### ✅ Verification

After running the scripts, verify that all package-lock.json files were created:

#### PowerShell:
```powershell
Get-ChildItem -Path backend\services\*\package-lock.json -Recurse | Select-Object Name, Directory
```

#### Bash:
```bash
find backend/services -maxdepth 2 -name "package-lock.json" -type f
```

#### Expected Output (11 files):
```
backend/services/advertising-service/package-lock.json
backend/services/analytics-service/package-lock.json
backend/services/api-gateway/package-lock.json
backend/services/auth-service/package-lock.json
backend/services/matching-service/package-lock.json
backend/services/media-service/package-lock.json
backend/services/messaging-service/package-lock.json
backend/services/moderation-service/package-lock.json
backend/services/notification-service/package-lock.json
backend/services/payment-service/package-lock.json
backend/services/user-service/package-lock.json
```

## Committing Changes to Git

Once all package-lock.json files are generated:

```bash
# Stage all package-lock.json files
git add backend/services/*/package-lock.json

# Commit with descriptive message
git commit -m "Add missing package-lock.json files for all backend services

- Generated package-lock.json for 11 Node.js microservices
- Fixes Azure DevOps CI pipeline Cache task failures
- Ensures reproducible builds across all environments
- Services: advertising, analytics, api-gateway, auth, matching, media, messaging, moderation, notification, payment, user"

# Push to remote
git push
```

## Why This Is Critical

### 1. **Pipeline Failure Prevention**
The Azure DevOps Cache task (line 33 in `node-build.yml`) requires package-lock.json to exist.

### 2. **Build Reproducibility**
package-lock.json locks exact dependency versions across all environments (dev, staging, prod).

### 3. **Performance**
`npm ci` (used in pipelines) is **much faster** than `npm install` and requires package-lock.json.

### 4. **Security**
Prevents supply chain attacks by locking down exact package versions with checksums.

### 5. **Consistency**
Ensures all developers and CI/CD systems use identical dependency versions.

## Pipeline Behavior

The `node-build.yml` template (lines 41-48) handles both scenarios:

```yaml
- script: |
    cd ${{ parameters.serviceDirectory }}
    if [ -f "package-lock.json" ]; then
      npm ci                    # Fast, clean install (requires lock file)
    else
      npm install              # Slower, may have version drift
    fi
```

**However**, the Cache task fails BEFORE reaching this step because it can't find the lock file.

## Next Steps

1. **Run one of the automated scripts** (PowerShell recommended)
2. **Verify** all 11 package-lock.json files were created
3. **Commit and push** the changes to your repository
4. **Re-run** the Azure DevOps pipeline
5. **Confirm** the pipeline passes successfully

## Troubleshooting

### Issue: "npm: command not found"
**Solution:** Install Node.js from https://nodejs.org/

### Issue: "PowerShell scripts are disabled"
**Solution:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Issue: "EACCES: permission denied"
**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Delete any existing node_modules
rm -rf backend/services/*/node_modules

# Try again
```

### Issue: "Script hangs or takes too long"
**Possible causes:**
- Slow network connection
- npm registry issues
- Antivirus scanning node_modules

**Solutions:**
- Use a VPN or different network
- Configure npm registry: `npm config set registry https://registry.npmjs.org/`
- Temporarily disable antivirus during install

## Files Created

The following helper files have been created in the project root:

1. **generate-package-locks.ps1** - PowerShell script (recommended for Windows)
2. **generate-package-locks.bat** - Windows batch file
3. **generate-package-locks.sh** - Bash script (Git Bash/WSL/Linux/Mac)
4. **generate-locks.js** - Node.js script (cross-platform)
5. **PACKAGE_LOCK_ISSUE_SUMMARY.md** - This document
6. **GENERATE_PACKAGE_LOCKS_INSTRUCTIONS.md** - Detailed instructions

## Summary

- **Problem:** 11 backend services missing package-lock.json
- **Impact:** Azure DevOps CI pipeline failing
- **Solution:** Run one of the 4 provided scripts
- **Time:** ~5-10 minutes total (depending on internet speed)
- **Result:** Pipeline will pass, builds will be reproducible

## Questions?

If you encounter any issues:
1. Check Node.js is installed: `node --version`
2. Check npm is installed: `npm --version`
3. Verify you're in the correct directory
4. Try the manual approach if scripts fail
5. Check npm logs: `npm config get cache` then inspect log files

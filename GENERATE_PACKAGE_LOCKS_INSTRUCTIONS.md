# Generating package-lock.json Files for Backend Services

## Problem
The Azure DevOps pipeline is failing because package-lock.json files are missing for several backend services.

## Services Requiring package-lock.json

The following 11 backend services have package.json files but are missing package-lock.json:

1. ✗ backend/services/advertising-service
2. ✗ backend/services/analytics-service
3. ✗ backend/services/api-gateway
4. ✗ backend/services/auth-service
5. ✗ backend/services/matching-service
6. ✗ backend/services/media-service
7. ✗ backend/services/messaging-service
8. ✗ backend/services/moderation-service
9. ✗ backend/services/notification-service
10. ✗ backend/services/payment-service
11. ✗ backend/services/user-service

## Services That Don't Need package-lock.json

- **realtime-service**: This is a Go service (uses go.mod), not a Node.js service
- **ai-services**: Contains Python-based services, not Node.js services

## Solution

Three automated scripts have been created to generate all missing package-lock.json files:

### Option 1: PowerShell (Recommended for Windows)

```powershell
cd C:\Users\citad\OneDrive\Documents\Dating\DatingPlatform
.\generate-package-locks.ps1
```

### Option 2: Batch File (Windows Command Prompt)

```cmd
cd C:\Users\citad\OneDrive\Documents\Dating\DatingPlatform
generate-package-locks.bat
```

### Option 3: Bash Script (Git Bash or WSL)

```bash
cd /c/Users/citad/OneDrive/Documents/Dating/DatingPlatform
chmod +x generate-package-locks.sh
./generate-package-locks.sh
```

### Manual Option (If Scripts Fail)

If the automated scripts don't work, you can manually generate package-lock.json for each service:

```bash
cd backend/services/advertising-service && npm install && cd ../../..
cd backend/services/analytics-service && npm install && cd ../../..
cd backend/services/api-gateway && npm install && cd ../../..
cd backend/services/auth-service && npm install && cd ../../..
cd backend/services/matching-service && npm install && cd ../../..
cd backend/services/media-service && npm install && cd ../../..
cd backend/services/messaging-service && npm install && cd ../../..
cd backend/services/moderation-service && npm install && cd ../../..
cd backend/services/notification-service && npm install && cd ../../..
cd backend/services/payment-service && npm install && cd ../../..
cd backend/services/user-service && npm install && cd ../../..
```

## Verification

After running the scripts, verify that package-lock.json files were created:

### PowerShell

```powershell
Get-ChildItem -Path backend\services\*\package-lock.json -Recurse | Select-Object FullName
```

### Bash

```bash
find backend/services -name "package-lock.json" -type f
```

### Expected Output

You should see 11 package-lock.json files:

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

## Committing the Changes

After generating the package-lock.json files, commit them to your repository:

```bash
git add backend/services/*/package-lock.json
git commit -m "Add missing package-lock.json files for backend services"
git push
```

## Why This Matters

1. **Build Reproducibility**: package-lock.json ensures that the exact same dependency versions are installed across all environments
2. **CI/CD Pipeline**: Azure DevOps pipelines require package-lock.json for faster and more reliable builds
3. **Security**: Locks down dependency versions to prevent supply chain attacks
4. **Performance**: npm ci uses package-lock.json for faster, cleaner installs in CI environments

## Troubleshooting

### Error: npm not found
- Install Node.js from https://nodejs.org/
- Restart your terminal after installation

### Error: Permission denied
- Run the script as Administrator (Windows)
- Use sudo on Linux/Mac: `sudo ./generate-package-locks.sh`

### Error: Scripts disabled in PowerShell
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Error: EACCES permission errors during npm install
- Clear npm cache: `npm cache clean --force`
- Delete node_modules folders: `rm -rf backend/services/*/node_modules`
- Try again

## Next Steps

1. Run one of the provided scripts to generate all package-lock.json files
2. Verify the files were created successfully
3. Commit and push the changes to your repository
4. Re-run the Azure DevOps pipeline
5. The pipeline should now pass successfully

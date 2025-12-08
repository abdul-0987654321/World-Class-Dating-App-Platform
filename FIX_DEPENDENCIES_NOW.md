# Fix Dependencies NOW - Quick Start

## TL;DR - Just run this:

```bash
cd C:/Users/citad/OneDrive/Documents/Dating/DatingPlatform
node update-dependencies.js
npm install
```

## What This Fixes

Your CI pipeline is failing because 11 backend services are missing dependencies:
- All services missing `@flamoral/shared` workspace reference
- messaging-service, media-service, user-service missing `axios`
- messaging-service, analytics-service, auth-service missing `knex`

## Quick Fix (Choose ONE method)

### Method 1: Node.js (Recommended)
```bash
cd C:/Users/citad/OneDrive/Documents/Dating/DatingPlatform
node update-dependencies.js
```

### Method 2: PowerShell
```powershell
cd C:\Users\citad\OneDrive\Documents\Dating\DatingPlatform
.\update-dependencies.ps1
```

### Method 3: Bash
```bash
cd /c/Users/citad/OneDrive/Documents/Dating/DatingPlatform
bash update-dependencies.sh
```

## After Running Script

1. Install dependencies:
   ```bash
   npm install
   ```

2. Test locally:
   ```bash
   npm run build
   npm test
   ```

3. Commit and push:
   ```bash
   git add .
   git commit -m "fix: Add missing dependencies to backend services"
   git push
   ```

## What Gets Changed

The script will update 11 package.json files in `backend/services/`:
- ✅ messaging-service → +@flamoral/shared, +axios, +knex
- ✅ advertising-service → +@flamoral/shared
- ✅ analytics-service → +@flamoral/shared, +knex
- ✅ api-gateway → +@flamoral/shared
- ✅ auth-service → +@flamoral/shared, +knex
- ✅ matching-service → +@flamoral/shared
- ✅ media-service → +@flamoral/shared, +axios
- ✅ moderation-service → +@flamoral/shared
- ✅ notification-service → +@flamoral/shared
- ✅ payment-service → +@flamoral/shared
- ✅ user-service → +@flamoral/shared, +axios

## Need More Details?

See these files for comprehensive documentation:
- `DEPENDENCY_FIX_COMPLETE_REPORT.md` - Full analysis and changes
- `MANUAL_DEPENDENCY_UPDATES.md` - Manual update instructions
- `DEPENDENCY_UPDATES_SUMMARY.md` - Summary of all changes

## Troubleshooting

**Script fails?**
- Make sure you're in the DatingPlatform root directory
- Check Node.js is installed: `node --version`
- Try manual updates: see `MANUAL_DEPENDENCY_UPDATES.md`

**npm install fails?**
- Delete `node_modules` and `package-lock.json`
- Run `npm install` again

**CI still failing?**
- Verify all package.json files were updated
- Check `git status` to ensure changes are committed
- Review build logs for other errors

---

**⚡ Quick Action Required**: Run the script now to fix your CI pipeline!

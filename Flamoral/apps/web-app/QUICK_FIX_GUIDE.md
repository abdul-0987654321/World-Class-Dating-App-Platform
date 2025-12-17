# Quick Fix Guide - Flamoral Web App

## Critical Issue: Duplicate API Prefixes

### Problem
All service files use `/api/` prefix in their endpoint paths, but `VITE_API_URL` already includes `/api/v1`. This causes incorrect URLs like:
```
❌ https://api.flamoral.com/api/v1/api/auth/login
```

### Solution
Run the provided fix script to automatically correct all 94+ instances.

---

## How to Fix (Choose One Method)

### Method 1: PowerShell (Windows)
```powershell
cd C:\Users\citad\OneDrive\Documents\Dating\Flamoral\apps\web-app
powershell.exe -ExecutionPolicy Bypass -File fix-api-endpoints.ps1
```

### Method 2: Git Bash / WSL (Windows with Bash)
```bash
cd /c/Users/citad/OneDrive/Documents/Dating/Flamoral/apps/web-app
chmod +x fix-api-endpoints.sh
./fix-api-endpoints.sh
```

### Method 3: Manual Find & Replace (Any Editor)

**In VS Code:**
1. Open `apps/web-app/src/services` folder
2. Press `Ctrl+Shift+H` (Find in Files)
3. Find: `'/api/`
4. Replace: `'/`
5. Click "Replace All in Folder"

**Repeat for:**
- Find: `"/api/` → Replace: `"/`
- Find: `` `/api/`` → Replace: `` `/``

### Method 4: Command Line (One-liner)

**PowerShell:**
```powershell
Get-ChildItem -Path .\src\services -Filter *.ts -Recurse | ForEach-Object { (Get-Content $_.FullName -Raw) -replace "(['\`\"])\/api\/", '$1/' | Set-Content $_.FullName -NoNewline }
```

**Bash:**
```bash
find ./src/services -name "*.ts" -type f -exec sed -i "s|['\"]\/api\/|'/|g" {} \;
```

---

## Verification

After running the fix, verify it worked:

```bash
# Should return 0 (no matches)
grep -r "'/api/" src/services --include="*.ts" | wc -l
```

If the number is 0, you're good! If not, run the fix again or check manually.

---

## Quick Test

After fixing, try building:

```bash
npm run build
```

Should complete without errors.

---

## What Files Get Fixed?

The script fixes all service files in `src/services/`:
- auth.service.ts ✓ (Already fixed manually)
- profile.service.ts
- matching.service.ts
- messaging.service.ts
- discovery.service.ts
- subscription.service.ts
- payment.service.ts
- gamification.service.ts
- communities.service.ts
- speed-dating.service.ts
- referral.service.ts
- boost.service.ts
- coin.service.ts
- safety.service.ts
- moderation.service.ts
- report.service.ts
- block.service.ts
- privacy.service.ts
- usage-limit.service.ts
- policy.service.ts
- media.service.ts
- admin-user.service.ts
- And more...

---

## Need Help?

See full documentation: `FRONTEND_FIXES_APPLIED.md`

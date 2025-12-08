# 🚀 QUICK FIX - Azure Pipeline Failure

## ⚡ Run This Command Now (Choose One)

### Option 1: PowerShell (Recommended for Windows)
```powershell
cd C:\Users\citad\OneDrive\Documents\Dating\DatingPlatform
.\generate-package-locks.ps1
```

### Option 2: Node.js Script
```bash
cd C:\Users\citad\OneDrive\Documents\Dating\DatingPlatform
node generate-locks.js
```

### Option 3: Git Bash
```bash
cd /c/Users/citad/OneDrive/Documents/Dating/DatingPlatform
chmod +x generate-package-locks.sh
./generate-package-locks.sh
```

---

## ✅ Then Commit & Push

```bash
git add backend/services/*/package-lock.json
git commit -m "Add missing package-lock.json files for backend services"
git push
```

---

## 🎯 What This Does

Generates **11 missing package-lock.json files** for:
- advertising-service
- analytics-service
- api-gateway
- auth-service
- matching-service
- media-service
- messaging-service
- moderation-service
- notification-service
- payment-service
- user-service

---

## 📚 More Details

See: **PACKAGE_LOCK_ISSUE_SUMMARY.md** for complete documentation

---

## ⏱️ Time Required

~5-10 minutes depending on internet speed

---

## ❓ Troubleshooting

**Issue:** npm not found
**Fix:** Install Node.js from https://nodejs.org/

**Issue:** PowerShell scripts disabled
**Fix:** `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

**Issue:** Permission denied
**Fix:** Run as Administrator

---

## 🔍 Verify Success

```bash
find backend/services -name "package-lock.json"
```

Should show 11 files.

# Guide: Remove Mock/Demo Modes from Production Services

## Overview
This document provides step-by-step instructions to remove or guard mock/demo modes from production services in the Flamoral dating platform.

## Goal
Ensure that if the API is not configured, the app fails clearly rather than silently using fake data.

## Files to Modify

### 1. Backend: package.json

**File:** `backend/package.json`

**Change:** Remove the "demo" script

**Before:**
```json
"scripts": {
  "dev": "nodemon --watch src --exec ts-node src/server.ts",
  "demo": "ts-node src/demo-server.ts",
  "build": "tsc && tsc-alias",
```

**After:**
```json
"scripts": {
  "dev": "nodemon --watch src --exec ts-node src/server.ts",
  "build": "tsc && tsc-alias",
```

---

### 2. Frontend Services: Pattern to Follow

For ALL service files in `apps/web-app/src/services/`, apply the following pattern:

#### Step 1: Replace the isMock property

**Before:**
```typescript
class SomeService {
  private isMock = !import.meta.env.VITE_API_URL;
```

**After:**
```typescript
class SomeService {
  private ensureApiConfigured(): void {
    if (!import.meta.env.VITE_API_URL) {
      throw new Error('API URL is not configured. Please set VITE_API_URL environment variable.');
    }
  }
```

#### Step 2: Remove mock conditional logic in each method

**Before:**
```typescript
async someMethod(): Promise<SomeType> {
  if (this.isMock) {
    return this.getMockData();
  }

  const response = await apiClient.get('/api/some-endpoint');
  return response.data;
}
```

**After:**
```typescript
async someMethod(): Promise<SomeType> {
  this.ensureApiConfigured();

  const response = await apiClient.get('/api/some-endpoint');
  return response.data;
}
```

#### Step 3: Remove mock imports

**Remove lines like:**
```typescript
const { mockApi } = await import('../mocks/mockApi');
```

#### Step 4: Remove getMock* helper methods

**Remove all private methods like:**
```typescript
private getMockVerificationStatus(): VerificationStatus { ... }
private getMockSecuritySettings(): SecuritySettings { ... }
// etc.
```

---

## Service Files to Update

### apps/web-app/src/services/

1. **auth.service.ts**
   - Methods to clean: login, register, logout, getCurrentUser, forgotPassword, resetPassword, verifyEmail, resendVerificationEmail
   - Remove: Mock user creation logic, mock API imports

2. **safety.service.ts**
   - Methods to clean: ALL methods (25+ methods)
   - Remove: getMockVerificationStatus, getMockSecuritySettings, getMockPrivacySettings, getMockSafetyTips, getMockCrisisResources
   - Remove: Mock Data section at end of file

3. **matching.service.ts**
   - Methods to clean: getMatches, getLikes, unmatch, reportMatch, blockUser, unblockUser, getBlockedUsers
   - Remove: Mock API imports and mock data transformations

4. **profile.service.ts**
   - Methods to clean: getProfile, updateProfile, updateSettings, uploadPhoto, deletePhoto, reorderPhotos, addPrompt, updatePrompt, deletePrompt, requestVerification, deleteAccount
   - Remove: Mock localStorage checks, mock profile data

5. **subscription.service.ts**
   - Methods to clean: getCurrentSubscription, upgradePlan, cancelSubscription
   - Remove: getMockSubscription helper function
   - Note: getPlans() can stay as-is (returns static plan data)

6. **discovery.service.ts**
   - Methods to clean: getRecommendations, swipe, getStats
   - Remove: Mock API imports and mock profile transformations

7. **usage-limit.service.ts**
   - Methods to clean: getLimits, checkLimit, incrementUsage, getUserLimits
   - Remove: Mock limit data generation

8. **report.service.ts**
   - Methods to clean: createReport, getMyReports, getReportStatus
   - Remove: Mock report data
   - Note: getCategories() can stay as-is (returns static category data)

9. **Check other services:**
   - messaging.service.ts
   - moderation.service.ts
   - privacy.service.ts
   - block.service.ts
   - boost.service.ts
   - coin.service.ts
   - admin-user.service.ts
   - ai/photoAnalysis.service.ts

---

## Example: Complete Before/After for auth.service.ts

### Before (with mocks):
```typescript
class AuthService {
  private isMock = !import.meta.env.VITE_API_URL;

  async login(email: string, password: string): Promise<LoginResponse> {
    if (this.isMock) {
      const { mockApi } = await import('../mocks/mockApi');
      return mockApi.login(email, password);
    }

    const response = await apiClient.post<{ success: boolean; data: { user: User; accessToken: string; refreshToken: string } }>(
      '/api/auth/login',
      { email, password },
      { skipAuth: true }
    );

    const loginResponse: LoginResponse = {
      user: response.data.user,
      token: response.data.accessToken,
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
    };

    this.saveSession(loginResponse);
    return loginResponse;
  }

  async forgotPassword(email: string): Promise<void> {
    if (this.isMock) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return;
    }

    await apiClient.post('/api/auth/forgot-password', { email }, { skipAuth: true });
  }
}
```

### After (without mocks):
```typescript
class AuthService {
  private ensureApiConfigured(): void {
    if (!import.meta.env.VITE_API_URL) {
      throw new Error('API URL is not configured. Please set VITE_API_URL environment variable.');
    }
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    this.ensureApiConfigured();

    const response = await apiClient.post<{ success: boolean; data: { user: User; accessToken: string; refreshToken: string } }>(
      '/api/auth/login',
      { email, password },
      { skipAuth: true }
    );

    const loginResponse: LoginResponse = {
      user: response.data.user,
      token: response.data.accessToken,
      accessToken: response.data.accessToken,
      refreshToken: response.data.refreshToken,
    };

    this.saveSession(loginResponse);
    return loginResponse;
  }

  async forgotPassword(email: string): Promise<void> {
    this.ensureApiConfigured();

    await apiClient.post('/api/auth/forgot-password', { email }, { skipAuth: true });
  }
}
```

---

## Automated Script (Optional)

You can use this bash/sed script to automatically clean a service file:

```bash
#!/bin/bash
# clean-service.sh - Remove mock modes from a TypeScript service file

FILE="$1"

if [ ! -f "$FILE" ]; then
    echo "Usage: $0 <service-file.ts>"
    exit 1
fi

# Create backup
cp "$FILE" "$FILE.bak"

# Replace isMock property with ensureApiConfigured method
sed -i 's/private isMock = !import\.meta\.env\.VITE_API_URL;/private ensureApiConfigured(): void {\n    if (!import.meta.env.VITE_API_URL) {\n      throw new Error('\''API URL is not configured. Please set VITE_API_URL environment variable.'\'');\n    }\n  }/g' "$FILE"

echo "✓ Cleaned $FILE (backup: $FILE.bak)"
```

**Note:** Manual review is still recommended after running automated scripts.

---

## Validation

After making changes:

1. **Check for remaining mock patterns:**
   ```bash
   grep -r "isMock" apps/web-app/src/services/
   grep -r "mockApi" apps/web-app/src/services/
   grep -r "getMock" apps/web-app/src/services/
   ```

2. **Check backend:**
   ```bash
   grep "demo" backend/package.json
   ```

3. **Test the application:**
   - Without VITE_API_URL set: Should show clear error message
   - With VITE_API_URL set: Should make real API calls

---

## Checklist

- [ ] Remove "demo" script from backend/package.json
- [ ] Clean auth.service.ts
- [ ] Clean safety.service.ts
- [ ] Clean matching.service.ts
- [ ] Clean profile.service.ts
- [ ] Clean subscription.service.ts
- [ ] Clean discovery.service.ts
- [ ] Clean usage-limit.service.ts
- [ ] Clean report.service.ts
- [ ] Check messaging.service.ts
- [ ] Check moderation.service.ts
- [ ] Check privacy.service.ts
- [ ] Check block.service.ts
- [ ] Check boost.service.ts
- [ ] Check coin.service.ts
- [ ] Check admin-user.service.ts
- [ ] Run validation grep commands
- [ ] Test application behavior

---

## Notes

- The pattern is consistent across all files
- Always add `this.ensureApiConfigured()` at the start of each public async method
- Remove all mock-related code completely
- Keep static data methods (like `getPlans()` or `getCategories()`) as they don't depend on API mocking

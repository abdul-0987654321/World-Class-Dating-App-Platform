# Files to Clean - Complete List

## Summary
Based on grep search results, the following files contain mock patterns and need to be cleaned:

## Files with Mock Patterns (Ordered by severity)

### Critical (High number of mock references):
1. **safety.service.ts** - 45 occurrences
   - Location: `apps/web-app/src/services/safety.service.ts`
   - Priority: HIGH
   - Impact: Safety, privacy, security features

2. **auth.service.ts** - 18 occurrences
   - Location: `apps/web-app/src/services/auth.service.ts`
   - Priority: HIGH
   - Impact: Authentication, login, registration

3. **profile.service.ts** - 15 occurrences
   - Location: `apps/web-app/src/services/profile.service.ts`
   - Priority: HIGH
   - Impact: User profile management

4. **matching.service.ts** - 14 occurrences
   - Location: `apps/web-app/src/services/matching.service.ts`
   - Priority: HIGH
   - Impact: Matches and likes

5. **messaging.service.ts** - 14 occurrences
   - Location: `apps/web-app/src/services/messaging.service.ts`
   - Priority: HIGH
   - Impact: Chat and messaging

6. **admin-user.service.ts** - 13 occurrences
   - Location: `apps/web-app/src/services/admin-user.service.ts`
   - Priority: MEDIUM
   - Impact: Admin functionality

### Medium Priority:
7. **discovery.service.ts** - 11 occurrences
   - Location: `apps/web-app/src/services/discovery.service.ts`
   - Priority: MEDIUM
   - Impact: Profile discovery, recommendations

8. **moderation.service.ts** - 9 occurrences
   - Location: `apps/web-app/src/services/moderation.service.ts`
   - Priority: MEDIUM
   - Impact: Content moderation

### Lower Priority:
9. **usage-limit.service.ts** - 6 occurrences
   - Location: `apps/web-app/src/services/usage-limit.service.ts`
   - Priority: MEDIUM
   - Impact: Daily limits, usage tracking

10. **report.service.ts** - 6 occurrences
    - Location: `apps/web-app/src/services/report.service.ts`
    - Priority: MEDIUM
    - Impact: User reporting

11. **coin.service.ts** - 6 occurrences
    - Location: `apps/web-app/src/services/coin.service.ts`
    - Priority: LOW
    - Impact: Virtual currency

12. **boost.service.ts** - 6 occurrences
    - Location: `apps/web-app/src/services/boost.service.ts`
    - Priority: LOW
    - Impact: Profile boost feature

13. **block.service.ts** - 5 occurrences
    - Location: `apps/web-app/src/services/block.service.ts`
    - Priority: MEDIUM
    - Impact: User blocking

14. **privacy.service.ts** - 4 occurrences
    - Location: `apps/web-app/src/services/privacy.service.ts`
    - Priority: MEDIUM
    - Impact: Privacy settings

15. **subscription.service.ts** - 2 occurrences
    - Location: `apps/web-app/src/services/subscription.service.ts`
    - Priority: HIGH (critical business logic)
    - Impact: Subscription management

## Backend Files:
16. **package.json** - 1 "demo" script
    - Location: `backend/package.json`
    - Priority: LOW
    - Impact: Remove demo script reference

## Total Impact
- **Frontend Services:** 15 files
- **Backend Configuration:** 1 file
- **Total Files:** 16
- **Total Mock Occurrences:** 174+

## Execution Order (Recommended)

### Phase 1: Authentication & Core Services
1. auth.service.ts
2. profile.service.ts
3. subscription.service.ts

### Phase 2: Social Features
4. matching.service.ts
5. messaging.service.ts
6. discovery.service.ts

### Phase 3: Safety & Moderation
7. safety.service.ts
8. moderation.service.ts
9. privacy.service.ts
10. block.service.ts

### Phase 4: Secondary Features
11. report.service.ts
12. usage-limit.service.ts
13. coin.service.ts
14. boost.service.ts
15. admin-user.service.ts

### Phase 5: Backend
16. backend/package.json

## Automation Command

Run the Python script to clean all files at once:

```bash
cd C:/Users/citad/OneDrive/Documents/Dating
python remove_mocks.py
```

This will:
- Process all 16 files
- Create backups (.bak)
- Remove all mock patterns
- Provide detailed report

## Verification Command

After cleaning, verify no mocks remain:

```bash
# Check for remaining mocks in services
grep -r "isMock" apps/web-app/src/services/ | wc -l
# Should output: 0

grep -r "mockApi" apps/web-app/src/services/ | wc -l
# Should output: 0

grep -r "getMock" apps/web-app/src/services/ | wc -l
# Should output: 0

# Check backend
grep "demo" backend/package.json
# Should not find the demo script
```

## Estimated Time
- **Automated:** 2-3 minutes (using Python script)
- **Manual:** 3-4 hours (doing all files by hand)
- **Review:** 30-45 minutes (checking diffs)

## Success Criteria
- [ ] All 174+ mock occurrences removed
- [ ] All `isMock` properties replaced with `ensureApiConfigured()`
- [ ] All `getMock*()` methods deleted
- [ ] Demo script removed from package.json
- [ ] Grep commands return 0 results
- [ ] App throws clear error when VITE_API_URL not set
- [ ] App works correctly when VITE_API_URL is set

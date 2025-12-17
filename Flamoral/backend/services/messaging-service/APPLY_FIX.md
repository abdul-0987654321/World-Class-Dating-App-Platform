# Quick Fix Guide for Messaging Service

## Problem
Enhanced messaging routes are not registered, causing 404 errors for reactions, search, GIFs, etc.

## Solution (Choose One)

### Option 1: Automatic Fix (Recommended)
```bash
cd backend/services/messaging-service
node fix-routes.js
npm run build
npm restart
```

### Option 2: Manual Fix

**File to Edit:** `src/api/routes/index.ts`

**Step 1:** Add import at the top (line 7):
```typescript
import enhancedMessagingRoutes from './enhanced-messaging.routes';
```

**Step 2:** Add route registration after line 25 (after moderation routes):
```typescript
// Mount enhanced messaging routes (reactions, pinning, search, GIFs, icebreakers)
router.use('/', enhancedMessagingRoutes);
```

**Step 3:** Rebuild and restart:
```bash
npm run build
npm restart
```

### Option 3: Using Git Patch
```bash
cd backend/services/messaging-service

# Create patch file
cat > fix-routes.patch << 'EOF'
--- a/src/api/routes/index.ts
+++ b/src/api/routes/index.ts
@@ -4,6 +4,7 @@ import messageRoutes from './message.routes';
 import encryptionKeysRoutes from './encryption-keys.routes';
 import giftsRoutes from './gifts.routes';
 import moderationRoutes from './moderation.routes';
+import enhancedMessagingRoutes from './enhanced-messaging.routes';
 import { messageController } from '../controllers/message.controller';
 import { authenticate } from '../middleware/auth.middleware';

@@ -22,6 +23,9 @@ router.use('/gifts', giftsRoutes);
 // Mount moderation routes (safety features)
 router.use('/moderation', moderationRoutes);

+// Mount enhanced messaging routes (reactions, pinning, search, GIFs, icebreakers)
+router.use('/', enhancedMessagingRoutes);
+
 // Add conversation messages route (REST convention: /conversations/:id/messages)
 router.get(
   '/conversations/:conversationId/messages',
EOF

# Apply patch
git apply fix-routes.patch

# Rebuild
npm run build
npm restart
```

## Verify Fix

Test enhanced endpoints:
```bash
# Test GIF search (replace TOKEN with actual JWT)
curl https://api.flamoral.com/api/v1/api/gifs/search?query=happy \
  -H "Authorization: Bearer TOKEN"

# Test icebreakers
curl https://api.flamoral.com/api/v1/api/icebreakers/random \
  -H "Authorization: Bearer TOKEN"
```

## Expected Result
- All enhanced messaging endpoints return 200 (with auth) or 401 (without auth)
- No more 404 errors
- Circuit breaker failure count should decrease

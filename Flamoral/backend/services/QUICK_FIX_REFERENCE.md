# Quick Fix Reference - Missing Routes

## Problem
10 route files exist but aren't registered → 60 endpoints are inaccessible

## Solution (3 Steps)

### Step 1: Add Imports
Location: `user-service/dist/index.js` (after line 33)

```javascript
const video_chat_routes_1 = __importDefault(require("./api/routes/video-chat.routes"));
const gamification_routes_1 = __importDefault(require("./api/routes/gamification.routes"));
const settings_routes_1 = __importDefault(require("./api/routes/settings.routes"));
const security_routes_1 = __importDefault(require("./api/routes/security.routes"));
const mode_routes_1 = __importDefault(require("./api/routes/mode.routes"));
const opening_move_routes_1 = __importDefault(require("./api/routes/opening-move.routes"));
const travel_mode_routes_1 = __importDefault(require("./api/routes/travel-mode.routes"));
const photo_verification_routes_1 = __importDefault(require("./api/routes/photo-verification.routes"));
```

### Step 2: Register Routes
Location: `user-service/dist/index.js` (after line 141)

```javascript
app.use('/api/video-chat', video_chat_routes_1.default);
app.use('/api/gamification', gamification_routes_1.default);
app.use('/api/settings', settings_routes_1.default);
app.use('/api/security', security_routes_1.default);
app.use('/api/modes', mode_routes_1.default);
app.use('/api/opening-moves', opening_move_routes_1.default);
app.use('/api/travel', travel_mode_routes_1.default);
app.use('/api/photo-verification', photo_verification_routes_1.default);
```

### Step 3: Update Docs
Location: `user-service/dist/index.js` (add to endpoints object around line 113)

```javascript
videoChat: '/api/video-chat',
gamification: '/api/gamification',
settings: '/api/settings',
security: '/api/security',
modes: '/api/modes',
openingMoves: '/api/opening-moves',
travel: '/api/travel',
photoVerification: '/api/photo-verification',
```

### Step 4: Restart Service
```bash
cd backend/services/user-service
npm run build  # If using TypeScript
npm restart    # Or your restart command
```

## Test Endpoints

```bash
# Video Chat
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/video-chat/history

# Gamification
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/gamification/dashboard

# Settings
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/settings

# Security
curl -H "Authorization: Bearer $TOKEN" http://localhost:3001/api/security/sessions
```

## Impact
✅ Enables video/audio calling
✅ Enables gamification dashboard
✅ Enables user settings management
✅ Enables security/session management
✅ Enables opening moves feature
✅ Enables modes (Date/Friends/Network)
✅ Enables travel mode
✅ Enables photo verification

## Files
- Full audit: `BACKEND_API_AUDIT_REPORT.md`
- Complete fix: `FIX_MISSING_ROUTES.md`
- Summary: `AUDIT_SUMMARY.md`
- This card: `QUICK_FIX_REFERENCE.md`

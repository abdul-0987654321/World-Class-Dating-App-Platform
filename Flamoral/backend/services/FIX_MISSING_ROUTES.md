# Fix Missing Route Registrations

## Issue
10 route files exist in `user-service/dist/api/routes/` but are not registered in the main `index.js` file, making them inaccessible.

## Solution

### Step 1: Add Missing Imports

Add these imports after line 33 in `user-service/dist/index.js`:

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

Add these route registrations after line 141 (after `app.use('/api/internal', internal_routes_1.default);`):

```javascript
// Video chat routes
app.use('/api/video-chat', video_chat_routes_1.default);

// Gamification routes (additional)
app.use('/api/gamification', gamification_routes_1.default);

// User settings & security
app.use('/api/settings', settings_routes_1.default);
app.use('/api/security', security_routes_1.default);

// Modes & features
app.use('/api/modes', mode_routes_1.default);
app.use('/api/opening-moves', opening_move_routes_1.default);
app.use('/api/travel', travel_mode_routes_1.default);

// Verification
app.use('/api/photo-verification', photo_verification_routes_1.default);
```

### Step 3: Update Root Endpoint Documentation

Replace the `endpoints` object in the root route (lines 89-114) with:

```javascript
endpoints: {
    health: '/health',
    docs: '/api-docs',
    docsJson: '/api-docs.json',
    auth: '/api/auth',
    profile: '/api/profile',
    verification: '/api/verification',
    phone: '/api/phone',
    passwordReset: '/api/password-reset',
    photos: '/api/photos',
    prompts: '/api/prompts',
    swipes: '/api/swipes',
    matches: '/api/matches',
    discovery: '/api/discovery',
    messages: '/api/messages',
    subscriptions: '/api/subscriptions',
    coins: '/api/coins',
    boosts: '/api/boosts',
    privacy: '/api/privacy',
    blocks: '/api/blocks',
    reports: '/api/reports',
    usageLimits: '/api/usage-limits',
    internal: '/api/internal',
    badges: '/api/badges',
    achievements: '/api/achievements',
    // Newly registered routes
    videoChat: '/api/video-chat',
    gamification: '/api/gamification',
    settings: '/api/settings',
    security: '/api/security',
    modes: '/api/modes',
    openingMoves: '/api/opening-moves',
    travel: '/api/travel',
    photoVerification: '/api/photo-verification',
},
```

## Complete Updated File

Here's the complete updated `index.js` file:

```javascript
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const logger_1 = __importDefault(require("./utils/logger"));
const auth_routes_1 = __importDefault(require("./api/routes/auth.routes"));
const profile_routes_1 = __importDefault(require("./api/routes/profile.routes"));
const verification_routes_1 = __importDefault(require("./api/routes/verification.routes"));
const phone_verification_routes_1 = __importDefault(require("./api/routes/phone-verification.routes"));
const password_reset_routes_1 = __importDefault(require("./api/routes/password-reset.routes"));
const photo_routes_1 = __importDefault(require("./api/routes/photo.routes"));
const prompt_routes_1 = __importDefault(require("./api/routes/prompt.routes"));
const swipe_routes_1 = __importDefault(require("./api/routes/swipe.routes"));
const match_routes_1 = __importDefault(require("./api/routes/match.routes"));
const discovery_routes_1 = __importDefault(require("./api/routes/discovery.routes"));
const messaging_routes_1 = __importDefault(require("./api/routes/messaging.routes"));
const subscription_routes_1 = __importDefault(require("./api/routes/subscription.routes"));
const coin_routes_1 = __importDefault(require("./api/routes/coin.routes"));
const boost_routes_1 = __importDefault(require("./api/routes/boost.routes"));
const privacy_routes_1 = __importDefault(require("./api/routes/privacy.routes"));
const block_routes_1 = __importDefault(require("./api/routes/block.routes"));
const report_routes_1 = __importDefault(require("./api/routes/report.routes"));
const usage_limit_routes_1 = __importDefault(require("./api/routes/usage-limit.routes"));
const internal_routes_1 = __importDefault(require("./api/routes/internal.routes"));
const achievements_routes_1 = __importDefault(require("./api/routes/achievements.routes"));
const interestIntentionBadge_routes_1 = __importDefault(require("./api/routes/interestIntentionBadge.routes"));
const video_chat_routes_1 = __importDefault(require("./api/routes/video-chat.routes"));
const gamification_routes_1 = __importDefault(require("./api/routes/gamification.routes"));
const settings_routes_1 = __importDefault(require("./api/routes/settings.routes"));
const security_routes_1 = __importDefault(require("./api/routes/security.routes"));
const mode_routes_1 = __importDefault(require("./api/routes/mode.routes"));
const opening_move_routes_1 = __importDefault(require("./api/routes/opening-move.routes"));
const travel_mode_routes_1 = __importDefault(require("./api/routes/travel-mode.routes"));
const photo_verification_routes_1 = __importDefault(require("./api/routes/photo-verification.routes"));
const rate_limit_middleware_1 = require("./api/middleware/rate-limit.middleware");
const swagger_config_1 = __importDefault(require("./config/swagger.config"));
const upload_service_1 = require("./infrastructure/storage/upload.service");
const socket_config_1 = require("./infrastructure/websocket/socket.config");
const encryption_1 = require("./utils/encryption");
// Load environment variables
dotenv_1.default.config();
// Initialize encryption key for TOTP/2FA
try {
    (0, encryption_1.initializeEncryptionKey)();
    logger_1.default.info('TOTP encryption key initialized');
}
catch (error) {
    logger_1.default.error('Failed to initialize TOTP encryption key:', error);
    logger_1.default.error('TOTP/2FA functionality will not work. Please set TOTP_ENCRYPTION_MASTER_KEY and TOTP_ENCRYPTION_KEY_SALT in environment variables.');
}
// Create Express app
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.CORS_ORIGINS?.split(',') || '*',
    credentials: true,
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Rate limiting
app.use(rate_limit_middleware_1.generalLimiter);
// Health check endpoint
app.get('/health', (_req, res) => {
    res.status(200).json({
        status: 'healthy',
        service: 'user-service',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});
// Swagger Documentation
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_config_1.default, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Flamoral User Service API Documentation',
}));
// Swagger JSON endpoint
app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swagger_config_1.default);
});
// Root endpoint
app.get('/', (_req, res) => {
    res.json({
        service: 'Flamoral User Service',
        version: '1.0.0',
        status: 'running',
        documentation: '/api-docs',
        endpoints: {
            health: '/health',
            docs: '/api-docs',
            docsJson: '/api-docs.json',
            auth: '/api/auth',
            profile: '/api/profile',
            verification: '/api/verification',
            phone: '/api/phone',
            passwordReset: '/api/password-reset',
            photos: '/api/photos',
            prompts: '/api/prompts',
            swipes: '/api/swipes',
            matches: '/api/matches',
            discovery: '/api/discovery',
            messages: '/api/messages',
            subscriptions: '/api/subscriptions',
            coins: '/api/coins',
            boosts: '/api/boosts',
            privacy: '/api/privacy',
            blocks: '/api/blocks',
            reports: '/api/reports',
            usageLimits: '/api/usage-limits',
            internal: '/api/internal',
            badges: '/api/badges',
            achievements: '/api/achievements',
            // Newly registered routes
            videoChat: '/api/video-chat',
            gamification: '/api/gamification',
            settings: '/api/settings',
            security: '/api/security',
            modes: '/api/modes',
            openingMoves: '/api/opening-moves',
            travel: '/api/travel',
            photoVerification: '/api/photo-verification',
        },
    });
});
// API Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/profile', profile_routes_1.default);
app.use('/api/verification', verification_routes_1.default);
app.use('/api/phone', phone_verification_routes_1.default);
app.use('/api/password-reset', password_reset_routes_1.default);
app.use('/api/photos', photo_routes_1.default);
app.use('/api/prompts', prompt_routes_1.default);
app.use('/api/swipes', swipe_routes_1.default);
app.use('/api/matches', match_routes_1.default);
app.use('/api/discovery', discovery_routes_1.default);
app.use('/api/messages', messaging_routes_1.default);
// Phase 1 monetization & safety routes
app.use('/api/subscriptions', subscription_routes_1.default);
app.use('/api/coins', coin_routes_1.default);
app.use('/api/boosts', boost_routes_1.default);
app.use('/api/privacy', privacy_routes_1.default);
app.use('/api/blocks', block_routes_1.default);
app.use('/api/reports', report_routes_1.default);
app.use('/api/usage-limits', usage_limit_routes_1.default);
app.use('/api/badges', interestIntentionBadge_routes_1.default);
// Gamification routes
app.use('/api/achievements', achievements_routes_1.default);
app.use('/api/gamification', gamification_routes_1.default);
// Internal service-to-service routes (no rate limiting)
app.use('/api/internal', internal_routes_1.default);
// Video chat routes
app.use('/api/video-chat', video_chat_routes_1.default);
// User settings & security
app.use('/api/settings', settings_routes_1.default);
app.use('/api/security', security_routes_1.default);
// Modes & features
app.use('/api/modes', mode_routes_1.default);
app.use('/api/opening-moves', opening_move_routes_1.default);
app.use('/api/travel', travel_mode_routes_1.default);
// Verification
app.use('/api/photo-verification', photo_verification_routes_1.default);
// 404 handler
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
    });
});
// Error handler
app.use((err, _req, res, _next) => {
    logger_1.default.error('Unhandled error:', err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});
// Create HTTP server
const httpServer = (0, http_1.createServer)(app);
// Initialize Socket.IO
(0, socket_config_1.initializeSocket)(httpServer);
// Start server
httpServer.listen(PORT, async () => {
    logger_1.default.info(`User Service running on port ${PORT}`);
    logger_1.default.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger_1.default.info(`API endpoints available at http://localhost:${PORT}/api`);
    logger_1.default.info(`WebSocket server initialized for real-time messaging`);
    // Initialize upload service (Azure Blob Storage)
    try {
        await upload_service_1.uploadService.initialize();
        logger_1.default.info('Upload service initialized successfully');
    }
    catch (error) {
        logger_1.default.warn('Upload service initialization failed - photo uploads may not work');
        logger_1.default.warn('Make sure Azure Storage credentials are configured in .env');
    }
});
// Graceful shutdown
process.on('SIGTERM', () => {
    logger_1.default.info('SIGTERM signal received: closing HTTP server');
    process.exit(0);
});
process.on('SIGINT', () => {
    logger_1.default.info('SIGINT signal received: closing HTTP server');
    process.exit(0);
});
exports.default = app;
```

## Verification

After applying these changes, test the following endpoints:

1. **Video Chat:**
   - POST http://localhost:3001/api/video-chat/initiate
   - POST http://localhost:3001/api/video-chat/accept/:callId
   - POST http://localhost:3001/api/video-chat/end/:callId
   - GET http://localhost:3001/api/video-chat/history

2. **Gamification:**
   - GET http://localhost:3001/api/gamification/dashboard
   - GET http://localhost:3001/api/gamification/experience
   - GET http://localhost:3001/api/gamification/streaks

3. **Settings:**
   - GET http://localhost:3001/api/settings
   - PATCH http://localhost:3001/api/settings/account
   - PATCH http://localhost:3001/api/settings/privacy
   - PATCH http://localhost:3001/api/settings/notifications

4. **Security:**
   - GET http://localhost:3001/api/security/sessions
   - POST http://localhost:3001/api/security/sessions/revoke/:sessionId
   - GET http://localhost:3001/api/security/login-attempts

5. **Modes:**
   - GET http://localhost:3001/api/modes
   - PUT http://localhost:3001/api/modes/:mode
   - POST http://localhost:3001/api/modes/switch

6. **Opening Moves:**
   - GET http://localhost:3001/api/opening-moves/users/me/opening-moves
   - POST http://localhost:3001/api/opening-moves/users/me/opening-moves
   - GET http://localhost:3001/api/opening-move-templates

7. **Travel Mode:**
   - GET http://localhost:3001/api/travel/mode
   - POST http://localhost:3001/api/travel/mode/enable
   - POST http://localhost:3001/api/travel/mode/disable

8. **Photo Verification:**
   - POST http://localhost:3001/api/photo-verification/start
   - POST http://localhost:3001/api/photo-verification/submit

## Notes

- All endpoints require Bearer token authentication (except some auth endpoints)
- Make sure to restart the user-service after applying changes
- Check logs for any import errors
- All routes have proper error handling and validation middleware

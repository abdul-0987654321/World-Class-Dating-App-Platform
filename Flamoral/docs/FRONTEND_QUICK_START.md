# Flamoral Platform - Frontend Quick Start Guide

## Get Started in 5 Minutes

This guide will help you set up and run the Flamoral frontend applications quickly.

---

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- Git

For mobile development:
- Expo CLI
- iOS Simulator (Mac) or Android Studio

---

## Web App Setup

### 1. Navigate to Web App Directory
```bash
cd apps/web-app
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
```

### 3. Configure Environment
```bash
# Copy the development environment file
cp .env.development .env

# Or create your own
cat > .env << EOF
VITE_API_URL=http://localhost:4000
VITE_WS_URL=ws://localhost:5000
VITE_SOCKET_URL=ws://localhost:5000
VITE_APP_NAME=Flamoral
VITE_APP_ENV=development
VITE_ENABLE_DEBUG=true
EOF
```

### 4. Start Development Server
```bash
npm run dev
# or
yarn dev
```

### 5. Open Browser
```
http://localhost:3000
```

**That's it! Your web app is running.**

---

## Mobile App Setup

### 1. Navigate to Mobile App Directory
```bash
cd apps/mobile-app
```

### 2. Install Dependencies
```bash
npm install
# or
yarn install
```

### 3. Configure Environment
```bash
# Copy the example environment file
cp .env.example .env

# Edit with your local settings
nano .env
```

**Minimal .env for development:**
```env
API_BASE_URL=http://localhost:4000
WEBSOCKET_URL=ws://localhost:4000
ENABLE_SSL_PINNING=false
DEBUG_MODE=true
LOG_LEVEL=debug
```

### 4. Start Expo
```bash
npm start
# or
yarn start
```

### 5. Run on Device/Simulator

**iOS Simulator:**
```bash
Press 'i' in the terminal
```

**Android Emulator:**
```bash
Press 'a' in the terminal
```

**Physical Device:**
- Install Expo Go app
- Scan QR code from terminal

**That's it! Your mobile app is running.**

---

## Backend Setup (Optional)

If you need to run the backend locally:

### 1. Navigate to Backend Directory
```bash
cd backend
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Start Services
```bash
# Start all services with Docker
docker-compose up -d

# Or start individual services
npm run start:api-gateway
npm run start:auth-service
npm run start:messaging-service
```

### 4. Verify Backend is Running
```bash
curl http://localhost:4000/health
# Should return: { "status": "ok" }
```

---

## Testing Connectivity

### Quick Test (Web App)
```bash
cd apps/web-app
npm run dev
```

Open browser console and run:
```javascript
// Test API connection
fetch('http://localhost:4000/health')
  .then(r => r.json())
  .then(console.log);
```

### Quick Test (Mobile App)
The app will display connection status on the home screen.

### Automated Testing
```bash
# Linux/Mac
chmod +x scripts/test-connectivity.sh
./scripts/test-connectivity.sh development

# Windows
scripts\test-connectivity.bat development
```

---

## Common Issues & Quick Fixes

### Issue: "Cannot connect to API"

**Quick Fix:**
1. Check backend is running: `curl http://localhost:4000/health`
2. Verify `.env` file has correct `API_URL`
3. Check no firewall is blocking port 4000

### Issue: "WebSocket connection failed"

**Quick Fix:**
1. Check WebSocket server is running on port 5000
2. Verify `.env` has correct WebSocket URL
3. Try fallback to polling (Socket.IO handles this automatically)

### Issue: "CORS error" (Web App)

**Quick Fix:**
1. Check API Gateway CORS settings
2. Ensure `credentials: 'include'` is set in API client
3. Verify frontend URL is in `CORS_ORIGINS`

### Issue: "Environment variables not loading"

**Web App:**
```bash
# Must prefix with VITE_
VITE_API_URL=http://localhost:4000

# Restart dev server
npm run dev
```

**Mobile App:**
```bash
# Clear Metro cache
expo start -c
```

### Issue: "Module not found" errors

**Quick Fix:**
```bash
# Delete node_modules and reinstall
rm -rf node_modules
npm install

# For mobile, also clear watchman
watchman watch-del-all
```

---

## Environment Configuration Reference

### Development URLs
```env
API: http://localhost:4000
WebSocket: ws://localhost:5000
```

### Staging URLs
```env
API: https://api-staging.flamoral.com
WebSocket: wss://api-staging.flamoral.com
```

### Production URLs
```env
API: https://api.flamoral.com
WebSocket: wss://api.flamoral.com
```

---

## Essential Commands

### Web App
```bash
# Start development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm run test

# Type check
npm run type-check

# Lint
npm run lint
```

### Mobile App
```bash
# Start Expo
npm start

# Start with cache clear
expo start -c

# Build iOS
eas build --platform ios

# Build Android
eas build --platform android

# Run tests
npm run test
```

---

## API Testing

### Using curl
```bash
# Health check
curl http://localhost:4000/health

# Login (replace with actual credentials)
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Get user profile (replace TOKEN)
curl http://localhost:4000/api/v1/users/me \
  -H "Authorization: Bearer TOKEN"
```

### Using Postman
1. Import collection from `dating-platform.postman_collection.json`
2. Set environment to `Development`
3. Run collection tests

---

## Next Steps

1. **Read the Full Documentation**
   - [Frontend Connectivity Guide](./FRONTEND_CONNECTIVITY_GUIDE.md)
   - [API Endpoints Map](./API_ENDPOINTS_MAP.md)

2. **Explore the Codebase**
   - Web App: `apps/web-app/src/`
   - Mobile App: `apps/mobile-app/src/`
   - Backend: `backend/services/`

3. **Run Tests**
   ```bash
   # Web app tests
   cd apps/web-app && npm test

   # Mobile app tests
   cd apps/mobile-app && npm test
   ```

4. **Start Building Features**
   - Check `PRODUCT_SPECIFICATION.md` for feature requirements
   - Follow coding standards in `DEV_GUIDE.md`
   - Create feature branch from `develop`

---

## Getting Help

### Documentation
- `docs/FRONTEND_CONNECTIVITY_GUIDE.md` - Detailed connectivity guide
- `docs/API_ENDPOINTS_MAP.md` - Complete API reference
- `ARCHITECTURE.md` - System architecture overview
- `QUICK_REFERENCE.md` - Command reference

### Support
- GitHub Issues: Report bugs and request features
- Team Chat: Ask questions in #flamoral-dev
- Email: dev-support@flamoral.com

---

## Useful Links

- [Main README](../README.md)
- [Architecture Documentation](../ARCHITECTURE.md)
- [Security Guide](../SECURITY_IMPLEMENTATION_SUMMARY.md)
- [Testing Guide](../TESTING_GUIDE.md)
- [Deployment Guide](../DEPLOYMENT_CHECKLIST.md)

---

**Happy Coding! 🚀**

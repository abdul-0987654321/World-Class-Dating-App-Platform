# Installation Instructions

## For End Users

### Mobile Apps

#### iOS (iPhone/iPad)
1. Open App Store on your device
2. Search for "ConnectSphere"
3. Tap "Get" then "Install"
4. Open app and create account

**Requirements**: iOS 13.0 or later

#### Android
1. Open Google Play Store
2. Search for "ConnectSphere"
3. Tap "Install"
4. Open app and create account

**Requirements**: Android 6.0 or later

### Web App
1. Visit https://connectsphere.com
2. Click "Sign Up"
3. Create account
4. Start matching!

**Supported Browsers**: Chrome, Firefox, Safari, Edge (latest versions)

---

## For Developers

### Prerequisites
- Node.js 20+
- Yarn 1.22+
- Docker & Docker Compose
- Git

### Local Development Setup

```bash
# 1. Clone repository
git clone https://github.com/oks-citadel/World-Class-Dating-App-Platform.git
cd World-Class-Dating-App-Platform

# 2. Install dependencies
yarn install

# 3. Build shared packages
yarn build:all

# 4. Create environment file
cp .env.example .env
# Edit .env with your credentials

# 5. Start databases
docker-compose up -d

# 6. Run migrations
cd backend
yarn migrate
cd ..

# 7. Seed test data
yarn seed

# 8. Start development servers

# Terminal 1 - Backend
yarn dev:backend

# Terminal 2 - Web app
yarn dev:web

# Terminal 3 - Mobile app (optional)
yarn dev:mobile
```

### Access Applications

- **Web App**: http://localhost:5173
- **Backend API**: http://localhost:3000
- **API Docs**: http://localhost:3000/api-docs
- **Admin Dashboard**: http://localhost:5174

### Test Accounts

| Email | Password | Type |
|-------|----------|------|
| demo@connectsphere.com | Demo123! | Standard User |
| premium@connectsphere.com | Premium123! | Premium User |
| admin@connectsphere.com | Admin123! | Administrator |

### Mobile Development

#### iOS Setup
```bash
cd apps/mobile

# Install iOS dependencies
cd ios
pod install
cd ..

# Run on iOS simulator
yarn ios

# Run on specific device
yarn ios --device "iPhone 15 Pro"
```

**Requirements**:
- macOS
- Xcode 16+
- CocoaPods

#### Android Setup
```bash
cd apps/mobile

# Run on Android emulator
yarn android

# Run on specific device
yarn android --deviceId <device_id>
```

**Requirements**:
- Android Studio
- Android SDK
- ANDROID_HOME environment variable

### Running Tests

```bash
# All tests
yarn test:all

# Specific test suites
yarn test:unit
yarn test:integration
yarn test:e2e

# Watch mode
yarn test:watch
```

### Building for Production

#### Web App
```bash
cd apps/web
yarn build
# Output in dist/
```

#### Backend
```bash
cd backend
yarn build
# Output in dist/
```

#### Mobile Apps

**iOS**:
```bash
cd apps/mobile
cd ios
xcodebuild -workspace ConnectSphere.xcworkspace \
  -scheme ConnectSphere \
  -configuration Release \
  -archivePath build/ConnectSphere.xcarchive \
  archive
```

**Android**:
```bash
cd apps/mobile/android
./gradlew bundleRelease
# Output: app/build/outputs/bundle/release/app-release.aab
```

---

## For System Administrators

### Production Deployment

See [DEPLOYMENT_GUIDE.md](deployment/DEPLOYMENT_GUIDE.md) for complete production deployment instructions.

Quick overview:

```bash
# 1. Configure Azure/AWS credentials
az login

# 2. Deploy infrastructure
cd infrastructure/terraform
terraform init
terraform apply

# 3. Deploy to Kubernetes
kubectl apply -f infrastructure/kubernetes/

# 4. Configure DNS
# Point domains to load balancer IP

# 5. Verify deployment
kubectl get pods -n connectsphere
```

### Admin Dashboard Access

1. Visit https://admin.connectsphere.com
2. Login with admin credentials
3. Access user management, moderation, analytics

**Default Admin**:
- Email: admin@connectsphere.com
- Password: (Set during deployment)

---

## Troubleshooting

### Common Issues

**Dependencies won't install**:
```bash
rm -rf node_modules yarn.lock
yarn install
```

**Database connection fails**:
```bash
docker-compose down -v
docker-compose up -d
```

**Mobile app won't build**:
```bash
# iOS
cd ios && pod deintegrate && pod install && cd ..

# Android
cd android && ./gradlew clean && cd ..
```

**Tests failing**:
```bash
yarn clean
yarn install
yarn build:all
yarn test
```

### Getting Help

- **Documentation**: See `docs/` directory
- **GitHub Issues**: https://github.com/oks-citadel/World-Class-Dating-App-Platform/issues
- **Email Support**: support@connectsphere.com

---

*Need more help? Check out our complete documentation!*

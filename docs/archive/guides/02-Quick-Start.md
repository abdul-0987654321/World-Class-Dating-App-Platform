# Flamoral - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Prerequisites
- Node.js 20+
- Yarn
- Docker & Docker Compose

### Setup

```bash
# 1. Install dependencies
yarn install

# 2. Build shared packages
cd packages/shared/types && yarn build && cd ../../..
cd packages/shared/constants && yarn build && cd ../../..
cd packages/shared/utils && yarn build && cd ../../..
cd packages/shared/validators && yarn build && cd ../../..
cd packages/shared/api-client && yarn build && cd ../../..

# 3. Start infrastructure
docker-compose up -d

# 4. Seed database (optional)
yarn seed
```

### Development

**Run All in Separate Terminals:**

```bash
# Terminal 1: Backend
yarn dev:backend

# Terminal 2: Web
yarn dev:web

# Terminal 3: Mobile
yarn dev:mobile
```

### Access

- **Web App:** http://localhost:5173
- **Backend API:** http://localhost:3000
- **API Docs:** http://localhost:3000/api-docs

### Test Accounts

| Email | Password | Type |
|-------|----------|------|
| sarah.johnson@example.com | password123 | Premium User |
| admin@flamoral.com | admin123 | Admin |

---

## 📱 Mobile Development

### iOS

```bash
cd apps/mobile
yarn pod-install
yarn ios
```

### Android

```bash
cd apps/mobile
yarn android
```

---

## 📦 Project Structure

```
.
├── packages/shared/    # Shared code
│   ├── api-client/    # API client
│   ├── types/         # TypeScript types
│   ├── utils/         # Utilities
│   ├── constants/     # Constants
│   └── validators/    # Validation
├── apps/
│   ├── web/           # React web app
│   └── mobile/        # React Native app
├── backend/           # Node.js API
└── fixtures/          # Test data
```

---

## 🔧 Common Commands

```bash
# Install all
yarn install

# Build all
yarn build:all

# Test all
yarn test:all

# Clean all
yarn clean

# Seed DB
yarn seed
```

---

## 📚 Documentation

- Full README: [README_NEW_STRUCTURE.md](README_NEW_STRUCTURE.md)
- Reorganization: [REORGANIZATION_COMPLETE.md](REORGANIZATION_COMPLETE.md)
- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

---

## 🆘 Troubleshooting

**Build errors?**
```bash
yarn clean
yarn install
yarn build:all
```

**Database issues?**
```bash
docker-compose down -v
docker-compose up -d
yarn seed
```

**Mobile not starting?**
```bash
cd apps/mobile
# iOS
cd ios && pod install && cd ..
yarn ios

# Android
cd android && ./gradlew clean && cd ..
yarn android
```

---

## 🎯 Next Steps

1. ✅ Read [README_NEW_STRUCTURE.md](README_NEW_STRUCTURE.md)
2. ✅ Review [REORGANIZATION_COMPLETE.md](REORGANIZATION_COMPLETE.md)
3. ✅ Explore the codebase
4. ✅ Start developing!

---

**Happy Coding! 🎉**

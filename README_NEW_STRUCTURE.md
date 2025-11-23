# ConnectSphere - Dating App Platform

> Modern, scalable dating application with web and mobile support

[![Node.js](https://img.shields.io/badge/Node.js-20.x-green)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-61dafb)](https://reactjs.org/)
[![React Native](https://img.shields.io/badge/React_Native-0.73-61dafb)](https://reactnative.dev/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Development](#development)
- [Deployment](#deployment)
- [Documentation](#documentation)

---

## 🎯 Overview

ConnectSphere is a world-class dating application platform featuring:

- **Web Application** - React-based progressive web app
- **Mobile Apps** - Native iOS and Android apps built with React Native
- **Unified Backend** - Platform-agnostic REST + GraphQL + WebSocket APIs
- **Shared Packages** - Reusable business logic across all platforms
- **Production Ready** - Complete DevOps setup with Docker, Kubernetes, and CI/CD

**Current Status:** ~70% Complete | Mobile apps initialized, core features implemented

---

## ✨ Features

### Implemented ✅

#### Core Dating Features
- User authentication (email, phone, JWT)
- Profile management with photos
- Location-based discovery
- Swipe matching interface
- Real-time messaging (WebSocket)
- Match system

#### Safety & Moderation
- NSFW content detection
- User reporting & blocking
- Admin moderation queue
- Progressive suspension system
- Photo verification infrastructure

#### Monetization
- Subscription tiers (Free, Premium, Premium+)
- Virtual coins system
- Profile boosts
- Super likes

#### Infrastructure
- Docker containerization
- Kubernetes orchestration
- Terraform IaC (Azure + AWS)
- CI/CD pipelines
- Monitoring (Prometheus + Grafana)

### In Progress 🚧

- Mobile app UI/UX implementation
- Video/voice chat (Agora SDK)
- Advanced filters
- Photo verification UI
- Push notifications

### Planned 📝

- GIF support in messages
- Profile verification badges
- Multi-language support
- AR filters
- Video profiles

---

## 🏗️ Architecture

### Monorepo Structure

```
World-Class-Dating-App-Platform/
├── packages/           # Shared packages
│   ├── shared/         # Platform-agnostic code
│   │   ├── api-client  # API client library
│   │   ├── types       # TypeScript types
│   │   ├── utils       # Utility functions
│   │   ├── constants   # App constants
│   │   └── validators  # Validation schemas
│   └── ui-components/  # Shared React logic
│
├── apps/               # Platform-specific apps
│   ├── web/            # React web app
│   └── mobile/         # React Native app
│
├── backend/            # Unified backend
├── infrastructure/     # DevOps configs
├── fixtures/           # Development seed data
├── scripts/            # Build & setup scripts
└── docs/               # Documentation
```

### Technology Stack

**Frontend**
- React 18 (Web)
- React Native 0.73 (Mobile)
- Redux Toolkit (State management)
- TypeScript

**Backend**
- Node.js 20
- Express.js
- GraphQL (Apollo)
- Socket.io (WebSocket)
- TypeScript

**Databases**
- PostgreSQL 15 (Primary)
- MongoDB 7 (Messages)
- Redis 7 (Cache, sessions)
- Elasticsearch (Search)

**Cloud & Infrastructure**
- Azure (Primary cloud)
- Docker + Kubernetes
- NGINX (API Gateway)
- RabbitMQ (Message queue)

**External Services**
- Stripe (Payments)
- Twilio (SMS)
- SendGrid (Email)
- Azure Blob Storage (Media)
- Azure Content Moderator

---

## 📁 Project Structure

### Shared Packages

All platforms share common code through npm workspaces:

```typescript
// Import shared packages in any app
import { AuthApi, UserApi } from '@connectsphere/api-client';
import type { User, Profile } from '@connectsphere/types';
import { calculateAge, formatDistance } from '@connectsphere/utils';
import { API_BASE_URL, APP_NAME } from '@connectsphere/constants';
```

**Benefits:**
- Write once, use everywhere
- Type-safe across all platforms
- Consistent business logic
- Easier testing and maintenance

### Applications

**Web App** (`apps/web/`)
- Vite build system
- React Router navigation
- Responsive design
- PWA support

**Mobile App** (`apps/mobile/`)
- React Navigation
- Platform-specific UI
- Native modules integration
- iOS & Android builds

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 20.0.0
- Yarn >= 1.22.0
- Docker & Docker Compose
- Git

**For Mobile Development:**
- Xcode 14+ (iOS)
- Android Studio (Android)
- CocoaPods (iOS)

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/connectsphere.git
cd connectsphere

# Run setup script
chmod +x scripts/setup.sh
./scripts/setup.sh

# Start services
docker-compose up -d

# Start development
yarn dev:web      # Web app on http://localhost:5173
yarn dev:mobile   # Mobile app Metro bundler
yarn dev:backend  # Backend API on http://localhost:3000
```

### Test Accounts

After seeding, use these accounts:

| Email | Password | Type | Features |
|-------|----------|------|----------|
| sarah.johnson@example.com | password123 | User | Premium subscription |
| mike.chen@example.com | password123 | User | Free tier |
| admin@connectsphere.com | admin123 | Admin | Full access |

---

## 💻 Development

### Workspace Commands

```bash
# Install all dependencies
yarn install

# Build all packages
yarn build:all

# Run tests
yarn test:all

# Lint all code
yarn lint:all

# Clean all node_modules
yarn clean
```

### Platform-Specific Commands

**Web Development**
```bash
cd apps/web
yarn dev          # Start dev server
yarn build        # Production build
yarn preview      # Preview production build
```

**Mobile Development**
```bash
cd apps/mobile

# iOS
yarn ios          # Run on iOS simulator
yarn pod-install  # Install CocoaPods dependencies

# Android
yarn android      # Run on Android emulator

# Both
yarn start        # Start Metro bundler
```

**Backend Development**
```bash
cd backend
yarn dev          # Start with nodemon
yarn build        # Build TypeScript
yarn test         # Run tests
```

### Adding New Features

When adding features that work across platforms:

1. **Add types** to `packages/shared/types/`
2. **Add API methods** to `packages/shared/api-client/`
3. **Add utils** to `packages/shared/utils/` if needed
4. **Implement UI** separately in `apps/web/` and `apps/mobile/`
5. **Add backend logic** to `backend/src/`

### Code Organization

```
apps/web/src/
├── components/     # React components
├── pages/          # Route pages
├── hooks/          # Custom hooks
├── store/          # Redux slices
└── styles/         # CSS/styled-components

apps/mobile/src/
├── components/     # React Native components
├── screens/        # App screens
├── navigation/     # React Navigation setup
├── hooks/          # Custom hooks
└── store/          # Redux slices
```

---

## 🧪 Testing

### Run Tests

```bash
# All tests
yarn test:all

# Specific platform
yarn test:web
yarn test:mobile
yarn test:backend

# Watch mode
cd apps/web && yarn test --watch
```

### Test Coverage

```bash
yarn test:all --coverage
```

Current coverage: **3%** (Testing in progress)

Goal: **80%+**

---

## 🚢 Deployment

### Docker Build

```bash
# Build all services
docker-compose build

# Build specific service
docker-compose build backend
docker-compose build frontend
```

### Production Deployment

**Backend API**
```bash
cd backend
yarn build
docker build -t connectsphere/backend:latest .
docker push connectsphere/backend:latest
```

**Web Frontend**
```bash
cd apps/web
yarn build
docker build -t connectsphere/web:latest .
docker push connectsphere/web:latest
```

**Mobile Apps**
```bash
# iOS
cd apps/mobile/ios
xcodebuild -workspace ConnectSphere.xcworkspace -scheme ConnectSphere -configuration Release

# Android
cd apps/mobile/android
./gradlew assembleRelease
```

### Kubernetes Deployment

```bash
# Apply configurations
kubectl apply -f infrastructure/kubernetes/base/

# Or use Helm
helm install connectsphere infrastructure/kubernetes/helm/dating-app/

# Check status
kubectl get pods -n connectsphere
```

### CI/CD

GitHub Actions workflows automatically:
- Run tests on PR
- Build Docker images
- Deploy to staging on merge to `develop`
- Deploy to production on merge to `main`

---

## 📚 Documentation

Comprehensive documentation available in `/docs/`:

- [Architecture Overview](docs/architecture/ARCHITECTURE.md)
- [API Documentation](docs/api/)
- [Deployment Guides](docs/deployment/)
- [Feature Documentation](docs/features/)
- [Security Guidelines](docs/SECURITY_AUDIT_CHECKLIST.md)
- [Contributing Guide](CONTRIBUTING.md)

### Key Documents

- **[Tech Stack](docs/Tech-Stack.md)** - Technology decisions
- **[Platform Requirements](docs/Platform-Requirements.md)** - Feature requirements
- **[Implementation Roadmap](docs/IMPLEMENTATION-ROADMAP.md)** - Development plan
- **[Project Status](docs/PROJECT-STATUS.md)** - Current progress

---

## 🔧 Configuration

### Environment Variables

**Backend** (`.env`)
```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://localhost:5432/connectsphere
MONGODB_URL=mongodb://localhost:27017/connectsphere
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
STRIPE_SECRET_KEY=sk_test_...
TWILIO_ACCOUNT_SID=...
SENDGRID_API_KEY=...
AZURE_STORAGE_CONNECTION_STRING=...
```

**Web** (`.env`)
```env
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_WS_URL=http://localhost:3000
REACT_APP_STRIPE_PUBLIC_KEY=pk_test_...
```

**Mobile** (`.env`)
```env
API_URL=http://localhost:3000/api
WS_URL=http://localhost:3000
```

---

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Run tests (`yarn test:all`)
5. Commit (`git commit -m 'Add amazing feature'`)
6. Push (`git push origin feature/amazing-feature`)
7. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file.

---

## 🆘 Support

- **Documentation:** [/docs](/docs)
- **Issues:** [GitHub Issues](https://github.com/yourusername/connectsphere/issues)
- **Discussions:** [GitHub Discussions](https://github.com/yourusername/connectsphere/discussions)
- **Email:** support@connectsphere.com

---

## 🗺️ Roadmap

### Q4 2025
- ✅ Core dating features
- ✅ Web application
- ✅ Backend API
- 🚧 Mobile applications
- 🚧 Video/voice chat

### Q1 2026
- Advanced matching algorithm
- AI-powered recommendations
- Enhanced moderation
- Performance optimization

### Q2 2026
- Multi-language support
- Video profiles
- AR filters
- Social features

---

## 👥 Team

- **Project Lead:** Your Name
- **Backend:** Development Team
- **Frontend:** Development Team
- **Mobile:** Development Team
- **DevOps:** Infrastructure Team

---

## 🙏 Acknowledgments

- React Team for amazing frameworks
- Azure for cloud infrastructure
- All open-source contributors

---

**Built with ❤️ by the ConnectSphere Team**

# Flamoral - World-Class Dating Platform

**Version 2.0.0** | **Production Ready** | **flamoral.com**

[![CI/CD](https://github.com/oks-citadel/World-Class-Dating-App-Platform/actions/workflows/flamoral-pipeline.yml/badge.svg)](https://github.com/oks-citadel/World-Class-Dating-App-Platform/actions/workflows/flamoral-pipeline.yml)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## Overview

Production-ready dating application platform featuring web app, mobile apps (iOS/Android), scalable microservices backend, and Azure cloud infrastructure.

---

## Project Structure

```
flamoral/
├── .github/workflows/     # CI/CD Pipelines
│   └── flamoral-pipeline.yml  # Master pipeline (dev/staging/prod)
├── apps/                  # Frontend Applications
│   ├── web-app/          # React Web App (flamoral.com)
│   ├── mobile-app/       # React Native (iOS/Android)
│   └── branding/         # Brand assets & design system
├── backend/              # Backend Services
│   └── services/         # Microservices
│       ├── api-gateway/  # API Gateway (Port 4000)
│       ├── auth-service/ # Authentication
│       ├── user-service/ # User management
│       ├── matching-service/  # Match algorithm
│       ├── messaging-service/ # Real-time chat
│       ├── payment-service/   # Stripe payments
│       └── ...           # Other services
├── packages/             # Shared Packages
│   ├── shared/           # Common utilities
│   └── i18n/            # Internationalization
├── infrastructure/       # Infrastructure as Code
│   ├── terraform/        # Azure infrastructure
│   ├── kubernetes/       # K8s manifests
│   ├── docker/          # Dockerfiles
│   └── scripts/         # Deployment scripts
├── config/              # Environment Configs
│   ├── dev/             # Development
│   ├── staging/         # Staging
│   └── production/      # Production
├── docs/                # Documentation
│   ├── architecture/    # System architecture
│   ├── deployment/      # Deployment guides
│   ├── api/            # API documentation
│   └── runbooks/       # Operational runbooks
└── tests/               # E2E & Integration Tests
```

---

## Quick Start

```bash
# Clone repository
git clone https://github.com/oks-citadel/World-Class-Dating-App-Platform.git
cd World-Class-Dating-App-Platform

# Install dependencies
npm install

# Start development
docker-compose up -d          # Start databases
npm run dev:backend           # Backend API
npm run dev:web              # Web app at http://localhost:5173
```

---

## Environments

| Environment | URL | Branch | Deployment |
|-------------|-----|--------|------------|
| Development | dev.flamoral.com | `develop` | Auto on push |
| Staging | staging.flamoral.com | `release/*` | Auto on push |
| Production | flamoral.com | `main` | Auto on push |

---

## CI/CD Pipeline

The master pipeline (`flamoral-pipeline.yml`) handles all environments:

```
Push to develop  → Build → Test → Deploy to DEV
Push to release/* → Build → Test → Deploy to STAGING
Push to main     → Build → Test → Deploy to PRODUCTION
```

### Pipeline Jobs

1. **Setup** - Detect changes & determine environment
2. **Quality** - Linting & TypeScript checks
3. **Security** - Vulnerability & secret scanning
4. **Test** - Unit & integration tests
5. **Build** - Docker images to ACR
6. **Deploy** - Kubernetes deployment
7. **Verify** - Health checks
8. **Rollback** - Automatic on failure

### Manual Deployment

```bash
# Via GitHub Actions UI or CLI
gh workflow run flamoral-pipeline.yml -f environment=production
```

---

## Azure Resources

| Resource | Dev | Staging | Production |
|----------|-----|---------|------------|
| Resource Group | flamoral-rg-dev | flamoral-rg-staging | flamoral-rg |
| AKS Cluster | flamoral-aks-dev | flamoral-aks-staging | flamoral-aks |
| Key Vault | flamoral-kv-dev | flamoral-kv-staging | flamoral-kv-prod |
| ACR | flamoralacr | flamoralacr | flamoralacr |
| Front Door | flamoral-fd | flamoral-fd | flamoral-fd |

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, React Native 0.73, TypeScript, Tailwind |
| Backend | Node.js 20, Express, Socket.io, TypeScript |
| Database | PostgreSQL 15, MongoDB 7, Redis 7 |
| Infrastructure | Azure AKS, Front Door, Key Vault, ACR |
| CI/CD | GitHub Actions |

---

## Features

- User authentication (email/social/phone)
- Profile creation with photo galleries
- Location-based matching algorithm
- Real-time messaging with WebSocket
- Video/voice calling (Agora)
- Stripe payment integration
- Push notifications
- AI content moderation

---

## Configuration

Environment variables are organized by environment in the `config/` folder:

```
config/
├── dev/.env.example
├── staging/.env.example
└── production/.env.example
```

Secrets are stored in Azure Key Vault and injected via External Secrets Operator.

---

## Troubleshooting

### Check Deployment Status

```bash
# Get AKS credentials
az aks get-credentials -g flamoral-rg -n flamoral-aks

# Check pods
kubectl get pods -n flamoral-prod

# Check logs
kubectl logs -f deployment/api-gateway -n flamoral-prod

# Check services
kubectl get svc -n flamoral-prod
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Pod CrashLoopBackOff | Check logs, verify secrets |
| Image pull error | Verify ACR credentials |
| Health check fail | Check service ports |
| Database connection | Verify connection strings in Key Vault |

### Rollback

```bash
# Rollback to previous deployment
kubectl rollout undo deployment/api-gateway -n flamoral-prod

# Check rollout status
kubectl rollout status deployment/api-gateway -n flamoral-prod

# View rollout history
kubectl rollout history deployment/api-gateway -n flamoral-prod
```

---

## Documentation

| Topic | Location |
|-------|----------|
| Architecture | [docs/architecture/](docs/architecture/) |
| Deployment | [docs/deployment/](docs/deployment/) |
| API | [docs/api/](docs/api/) |
| Runbooks | [docs/runbooks/](docs/runbooks/) |
| Security | [docs/security/](docs/security/) |

---

## License

MIT License - see [LICENSE](LICENSE)

---

**Flamoral** | flamoral.com | Built for Production

# Docker Compose Migration Summary

## Overview

This document summarizes the migration of docker-compose files to comply with the **Azure-Only Runtime Rule**. Docker Compose is now clearly designated as **LOCAL DEVELOPMENT ONLY**, with all production deployments running on Azure Kubernetes Service (AKS).

## Changes Made

### 1. Created New Directory Structure

Created `infrastructure/local-dev/` to house all docker-compose files for local development.

```
infrastructure/local-dev/
├── README.md                              # Comprehensive guide
├── docker-compose.yml                      # Main development stack
├── docker-compose.dev.yml                  # Development environment
├── docker-compose.test.yml                 # Test environment
├── docker-compose.staging.yml              # Staging simulation
├── docker-compose.prod.yml                 # Production-like (LOCAL ONLY)
├── docker-compose.hub.yml                  # Hub services
├── docker-compose.infrastructure.yml       # Infrastructure services
├── docker-compose.services.yml             # Backend microservices
├── docker-compose.monitoring.yml           # Monitoring stack
├── docker-compose.production.yml           # Production simulation
└── BACKEND_SERVICES_TODO.md               # Migration guide for remaining files
```

### 2. Moved Docker Compose Files

#### From Root Directory
- `docker-compose.yml` → `infrastructure/local-dev/docker-compose.yml`
- `docker-compose.dev.yml` → `infrastructure/local-dev/docker-compose.dev.yml`
- `docker-compose.test.yml` → `infrastructure/local-dev/docker-compose.test.yml`
- `docker-compose.staging.yml` → `infrastructure/local-dev/docker-compose.staging.yml`
- `docker-compose.prod.yml` → `infrastructure/local-dev/docker-compose.prod.yml`
- `docker-compose.hub.yml` → `infrastructure/local-dev/docker-compose.hub.yml`

#### From infrastructure/docker/
- `infrastructure/docker/docker-compose.yml` → `infrastructure/local-dev/docker-compose.infrastructure.yml`
- `infrastructure/docker/docker-compose.production.yml` → `infrastructure/local-dev/docker-compose.production.yml`
- `infrastructure/docker/backend/docker-compose.services.yml` → `infrastructure/local-dev/docker-compose.services.yml`
- `infrastructure/docker/monitoring/docker-compose.monitoring.yml` → `infrastructure/local-dev/docker-compose.monitoring.yml`

### 3. Documentation Created

#### infrastructure/local-dev/README.md
Comprehensive guide explaining:
- LOCAL DEVELOPMENT ONLY usage
- Production runs on Azure AKS
- Available compose files and their purposes
- Usage instructions
- Security notes
- CI/CD pipeline information

#### infrastructure/local-dev/BACKEND_SERVICES_TODO.md
Migration guide for remaining backend service docker-compose files with:
- List of remaining files
- Recommended migration options
- Next steps

### 4. CI/CD Validation Added

#### .github/scripts/check-docker-compose.sh
Bash script that checks:
- No docker-compose files in root directory
- Warns about files in backend/services
- Warns about files in infrastructure/docker
- Enforces Azure-only production deployment

#### .github/workflows/validate-docker-compose.yml
GitHub Actions workflow that:
- Runs on all PRs and pushes to main/develop
- Executes the check script
- Verifies Kubernetes manifests exist
- Verifies Helm charts exist
- Posts helpful comments on failed PRs

### 5. Package.json Updates Needed

The following scripts need to be updated to reference the new docker-compose locations. Helper scripts have been created to automate this:

**Files Created:**
- `update-package-json.sh` - Bash script to update package.json
- `update-package-json.js` - Node.js script to update package.json

**Required Changes:**
```json
{
  "scripts": {
    "setup:dev": "yarn install && docker-compose -f infrastructure/local-dev/docker-compose.yml up -d",
    "docker:up": "docker-compose -f infrastructure/local-dev/docker-compose.yml up -d",
    "docker:down": "docker-compose -f infrastructure/local-dev/docker-compose.yml down",
    "docker:rebuild": "docker-compose -f infrastructure/local-dev/docker-compose.yml down && docker-compose -f infrastructure/local-dev/docker-compose.yml build && docker-compose -f infrastructure/local-dev/docker-compose.yml up -d",
    "docker:test:up": "docker-compose -f infrastructure/local-dev/docker-compose.test.yml up -d --wait",
    "docker:test:down": "docker-compose -f infrastructure/local-dev/docker-compose.test.yml down -v",
    "docker:test:logs": "docker-compose -f infrastructure/local-dev/docker-compose.test.yml logs -f"
  }
}
```

**To Apply Updates:**
```bash
# Option 1: Using Node.js
node update-package-json.js

# Option 2: Using Bash
bash update-package-json.sh

# Then delete the helper scripts
rm update-package-json.js update-package-json.sh
```

## Remaining Items

### Backend Service Docker Compose Files

The following files still exist in backend service directories:
1. `backend/services/ai-services/dating-coach-service/docker-compose.dating-coach.yml`
2. `backend/services/api-gateway/docker-compose.dev.yml`
3. `backend/services/automation-service/docker-compose.yml`
4. `backend/services/realtime-service/docker-compose.yml`
5. `backend/services/workflow-engine/docker-compose.yml`

**See `infrastructure/local-dev/BACKEND_SERVICES_TODO.md` for migration options.**

## Production Deployment

### Azure AKS Runtime
All production deployments use:
- **Azure Kubernetes Service (AKS)** for container orchestration
- **Azure Container Registry (ACR)** for container images
- **Kubernetes manifests** in `infrastructure/kubernetes/`
- **Helm charts** in `infrastructure/helm/`
- **Terraform** in `infrastructure/terraform/` for infrastructure

### Docker Compose Is Never Used in Production
- Docker Compose is ONLY for local development
- Production deployments go through CI/CD to AKS
- No docker-compose commands in production workflows
- Kubernetes handles orchestration in all environments (dev, staging, production on Azure)

## Benefits of This Migration

1. **Clear Separation**: Development vs Production tools clearly separated
2. **Azure-Only Production**: Enforces Azure AKS as the only production runtime
3. **Better Organization**: All local dev configs in one location
4. **CI/CD Protection**: Automated checks prevent misuse
5. **Developer Clarity**: README explains proper usage
6. **Maintainability**: Easier to find and update compose files

## Testing Local Development

After applying package.json updates, test that local development still works:

```bash
# Start development environment
npm run docker:up

# Start test environment
npm run docker:test:up

# Stop services
npm run docker:down

# Rebuild and restart
npm run docker:rebuild
```

## Questions or Issues?

- Local development: See `infrastructure/local-dev/README.md`
- Production deployment: See `infrastructure/kubernetes/README.md` and `infrastructure/helm/README.md`
- CI/CD pipeline: See `.github/workflows/`
- Azure infrastructure: See `infrastructure/terraform/`

## Related Documentation

- [Infrastructure Overview](infrastructure/README.md)
- [Local Development Guide](infrastructure/local-dev/README.md)
- [Kubernetes Deployment](infrastructure/kubernetes/README.md)
- [Helm Charts](infrastructure/helm/README.md)
- [Terraform Configuration](infrastructure/terraform/README.md)

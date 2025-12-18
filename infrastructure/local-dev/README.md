# Local Development Docker Compose Files

## IMPORTANT: LOCAL DEVELOPMENT ONLY

This directory contains Docker Compose files that are **exclusively for local development purposes**. These files must **NEVER** be used for production deployment.

## Production Runtime

**Flamoral runs on Azure Kubernetes Service (AKS) in production.**

All production deployments use:
- Azure Kubernetes Service (AKS) for container orchestration
- Azure Container Registry (ACR) for container images
- Kubernetes manifests in `infrastructure/kubernetes/`
- Helm charts in `infrastructure/helm/`
- Terraform configurations in `infrastructure/terraform/`

## Available Docker Compose Files

### Main Development Files

- **docker-compose.yml** - Main development stack with all core services and infrastructure
- **docker-compose.dev.yml** - Development environment configuration
- **docker-compose.test.yml** - Test environment with test databases
- **docker-compose.staging.yml** - Staging environment simulation
- **docker-compose.prod.yml** - Production-like environment (LOCAL ONLY - not actual production)
- **docker-compose.hub.yml** - Hub services configuration

### Additional Configurations

- **docker-compose.infrastructure.yml** - Infrastructure services only (databases, caching, messaging)
- **docker-compose.services.yml** - Backend microservices
- **docker-compose.monitoring.yml** - Monitoring stack (Prometheus, Grafana, etc.)
- **docker-compose.production.yml** - Production simulation for testing

## Usage

### Starting the Development Environment

From the project root:

```bash
# Start all services
npm run docker:up

# Start test environment
npm run docker:test:up

# Stop all services
npm run docker:down

# Rebuild and restart
npm run docker:rebuild
```

### Using Specific Compose Files

```bash
# Use the main development compose file
docker-compose -f infrastructure/local-dev/docker-compose.yml up -d

# Use the test environment
docker-compose -f infrastructure/local-dev/docker-compose.test.yml up -d

# Use multiple compose files together
docker-compose -f infrastructure/local-dev/docker-compose.yml \
               -f infrastructure/local-dev/docker-compose.monitoring.yml \
               up -d
```

## What These Files Provide

### Infrastructure Services
- PostgreSQL database
- MongoDB
- Redis cache
- Elasticsearch
- RabbitMQ message queue

### Backend Services
- API Gateway
- Auth Service
- User Service
- Matching Service
- Messaging Service
- Media Service
- Speed Dating Service
- Community Service
- Gamification Service
- Referral Service
- A/B Testing Service

### Monitoring (when using monitoring compose)
- Prometheus
- Grafana
- Alertmanager

## Security Notes

These files contain:
- Development credentials (NOT for production)
- Simplified networking (NOT production-grade)
- Debug configurations (NOT secure for production)
- Exposed ports for local access (NOT exposed in production)

**Never commit production secrets to these files.**

## CI/CD Pipeline

The CI/CD pipeline enforces the Azure-only deployment rule:
1. Builds container images
2. Pushes to Azure Container Registry
3. Deploys to AKS using Kubernetes manifests
4. **Does NOT use docker-compose for deployment**

## Questions?

If you need to:
- Deploy to production → Use `infrastructure/kubernetes/` and `infrastructure/helm/`
- Set up local dev → Use the docker-compose files in this directory
- Configure infrastructure → Use `infrastructure/terraform/` for Azure resources
- Monitor production → Use Azure Monitor, Application Insights, and Log Analytics

## Related Documentation

- [Infrastructure Overview](../README.md)
- [Kubernetes Deployment](../kubernetes/README.md)
- [Helm Charts](../helm/README.md)
- [Terraform Configuration](../terraform/README.md)
- [CI/CD Pipeline](../../.github/workflows/README.md)

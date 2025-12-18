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

## Azure-Only Infrastructure Rule

This project follows an **Azure-only infrastructure policy**:

- Production, staging, and testing environments run on Azure services
- Docker Compose files are ONLY for local development
- No docker-compose files should exist in the project root
- All infrastructure is provisioned via Terraform
- All deployments use Kubernetes (AKS)

## Available Docker Compose Files

### Development Files

- **docker-compose.dev.yml** - Development infrastructure (PostgreSQL, Redis, MongoDB, RabbitMQ, Elasticsearch)
- **docker-compose.test.yml** - Test environment with isolated test databases and services (MinIO, Mailhog)

These files provide local infrastructure services only. Backend services should be run directly using npm/yarn scripts.

## Usage

### Starting the Development Environment

From the project root:

```bash
# Start development infrastructure
npm run docker:dev:up

# Start test environment
npm run docker:test:up

# Stop development services
npm run docker:dev:down

# Stop test services
npm run docker:test:down
```

### Using Docker Compose Directly

```bash
# Start development infrastructure
docker-compose -f infrastructure/local-dev/docker-compose.dev.yml up -d

# Start test environment
docker-compose -f infrastructure/local-dev/docker-compose.test.yml up -d

# Stop services
docker-compose -f infrastructure/local-dev/docker-compose.dev.yml down
docker-compose -f infrastructure/local-dev/docker-compose.test.yml down
```

## What These Files Provide

### Development Infrastructure (docker-compose.dev.yml)
- PostgreSQL database (port 5432)
- MongoDB (port 27017)
- Redis cache (port 6379)
- Elasticsearch (port 9200)
- RabbitMQ message queue (ports 5672, 15672 for management UI)

### Test Infrastructure (docker-compose.test.yml)
- PostgreSQL test database (port 5433)
- MongoDB test database (port 27018)
- Redis test cache (port 6380)
- Elasticsearch test (port 9201)
- RabbitMQ test (ports 5673, 15673)
- MinIO (S3-compatible storage) (ports 9000, 9001)
- Mailhog (email testing) (ports 1025 SMTP, 8025 Web UI)

### Backend Services

Backend microservices are NOT run via Docker Compose. Run them directly:

```bash
# Run all backend services
npm run dev:backend

# Or run specific services
cd backend/services/api-gateway && npm run dev
cd backend/services/auth-service && npm run dev
```

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
2. Pushes to Azure Container Registry (ACR)
3. Deploys to AKS using Kubernetes manifests and Helm charts
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

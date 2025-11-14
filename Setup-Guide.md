# Setup Guide - ConnectSphere Dating Platform

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Development Environment Setup](#development-environment-setup)
3. [Local Development](#local-development)
4. [Azure Infrastructure Setup](#azure-infrastructure-setup)
5. [Database Configuration](#database-configuration)
6. [Service Configuration](#service-configuration)
7. [Frontend Setup](#frontend-setup)
8. [Mobile App Setup](#mobile-app-setup)
9. [Testing](#testing)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

| Software | Version | Purpose | Installation |
|----------|---------|---------|--------------|
| **Node.js** | 20.x LTS | Backend runtime | [nodejs.org](https://nodejs.org) |
| **Python** | 3.11+ | ML services | [python.org](https://python.org) |
| **Docker** | 24.x+ | Containerization | [docker.com](https://docker.com) |
| **Docker Compose** | 2.x+ | Local orchestration | Included with Docker |
| **PostgreSQL** | 15+ | Primary database | [postgresql.org](https://postgresql.org) |
| **Redis** | 7.x+ | Caching | [redis.io](https://redis.io) |
| **Kubectl** | Latest | Kubernetes CLI | [kubernetes.io](https://kubernetes.io) |
| **Terraform** | 1.6+ | Infrastructure as Code | [terraform.io](https://terraform.io) |
| **Azure CLI** | Latest | Azure management | [docs.microsoft.com](https://docs.microsoft.com) |
| **Git** | 2.x+ | Version control | [git-scm.com](https://git-scm.com) |

### Optional Tools

- **VS Code** with extensions:
  - ESLint
  - Prettier
  - Docker
  - Kubernetes
  - Terraform
- **Postman** or **Insomnia** for API testing
- **MongoDB Compass** for Cosmos DB
- **RedisInsight** for Redis management

### System Requirements

#### Development Machine
- **OS:** Windows 10/11, macOS 12+, or Linux (Ubuntu 22.04+)
- **CPU:** 4+ cores (8+ recommended)
- **RAM:** 16GB minimum (32GB recommended)
- **Storage:** 50GB free space (SSD recommended)
- **Network:** Stable internet connection

---

## Development Environment Setup

### 1. Install Core Tools

#### macOS (using Homebrew)

```bash
# Install Homebrew if not installed
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js
brew install node@20

# Install Python
brew install python@3.11

# Install Docker Desktop
brew install --cask docker

# Install PostgreSQL
brew install postgresql@15

# Install Redis
brew install redis

# Install Kubernetes tools
brew install kubectl helm

# Install Terraform
brew install terraform

# Install Azure CLI
brew install azure-cli
```

#### Ubuntu/Debian Linux

```bash
# Update package list
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install Python 3.11
sudo apt install -y python3.11 python3.11-venv python3-pip

# Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

# Install PostgreSQL 15
sudo apt install -y postgresql-15 postgresql-client-15

# Install Redis
sudo apt install -y redis-server

# Install kubectl
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

# Install Terraform
wget -O- https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
sudo apt update && sudo apt install terraform

# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash
```

#### Windows (using Chocolatey)

```powershell
# Install Chocolatey if not installed
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install tools
choco install nodejs-lts -y
choco install python311 -y
choco install docker-desktop -y
choco install postgresql15 -y
choco install redis -y
choco install kubernetes-cli -y
choco install terraform -y
choco install azure-cli -y
choco install git -y
```

### 2. Verify Installations

```bash
# Check versions
node --version        # Should be v20.x.x
npm --version         # Should be 10.x.x
python3 --version     # Should be 3.11.x
docker --version      # Should be 24.x.x
psql --version        # Should be 15.x
redis-cli --version   # Should be 7.x
kubectl version --client
terraform --version   # Should be 1.6.x
az --version
```

---

## Local Development

### 1. Clone Repository

```bash
# Clone the repository
git clone https://github.com/connectsphere/platform.git
cd platform

# Create feature branch
git checkout -b feature/your-feature-name
```

### 2. Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env  # or use your preferred editor
```

#### Sample .env File

```bash
# Application
NODE_ENV=development
PORT=4000
API_VERSION=v1

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=connectsphere_dev
DATABASE_USER=postgres
DATABASE_PASSWORD=your_secure_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT
JWT_SECRET=your_jwt_secret_key_min_32_characters
JWT_EXPIRATION=24h
JWT_REFRESH_EXPIRATION=7d

# Azure Storage (for local development, use Azurite)
AZURE_STORAGE_CONNECTION_STRING=UseDevelopmentStorage=true
AZURE_STORAGE_ACCOUNT_NAME=devstoreaccount1
AZURE_STORAGE_ACCOUNT_KEY=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==

# Cosmos DB (local emulator)
COSMOS_DB_ENDPOINT=https://localhost:8081
COSMOS_DB_KEY=C2y6yDjf5/R+ob0N8A7Cgv30VRDJIWEHLM+4QDU5DE2nQ9nDuVTqobD4b8mGGyPMbIZnqyMsEcaGQy67XIw/Jw==

# External Services
STRIPE_SECRET_KEY=sk_test_your_stripe_key
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
SENDGRID_API_KEY=your_sendgrid_key

# Feature Flags
ENABLE_ML_MATCHING=true
ENABLE_VIDEO_CHAT=true
ENABLE_PREMIUM_FEATURES=true
```

### 3. Install Dependencies

```bash
# Install root dependencies
npm install

# Install all service dependencies
npm run install:all

# Or install individually
cd backend/services/user-service && npm install
cd backend/services/matching-service && npm install
# ... repeat for each service

# Install frontend dependencies
cd frontend/web && npm install
cd frontend/mobile && npm install
```

### 4. Start Infrastructure Dependencies

```bash
# Start PostgreSQL, Redis, and other services
docker-compose up -d

# Verify services are running
docker-compose ps

# Check logs
docker-compose logs -f
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: connectsphere-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: your_secure_password
      POSTGRES_DB: connectsphere_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: connectsphere-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  azurite:
    image: mcr.microsoft.com/azure-storage/azurite
    container_name: connectsphere-azurite
    ports:
      - "10000:10000"  # Blob service
      - "10001:10001"  # Queue service
      - "10002:10002"  # Table service
    volumes:
      - azurite_data:/data

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.11.0
    container_name: connectsphere-elasticsearch
    environment:
      - discovery.type=single-node
      - "ES_JAVA_OPTS=-Xms512m -Xmx512m"
      - xpack.security.enabled=false
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data

volumes:
  postgres_data:
  redis_data:
  azurite_data:
  elasticsearch_data:
```

### 5. Database Setup

```bash
# Run migrations
npm run migrate

# Seed database with test data
npm run seed

# Or manually:
cd backend/services/user-service
npx typeorm migration:run
npx typeorm migration:revert  # to rollback
```

### 6. Start Development Servers

#### Option A: Start All Services (Recommended)

```bash
# Start all backend services and frontend
npm run dev
```

#### Option B: Start Services Individually

```bash
# Terminal 1: API Gateway
cd backend/services/api-gateway
npm run dev

# Terminal 2: User Service
cd backend/services/user-service
npm run dev

# Terminal 3: Matching Service
cd backend/services/matching-service
npm run dev

# Terminal 4: Messaging Service
cd backend/services/messaging-service
npm run dev

# Terminal 5: Web Frontend
cd frontend/web
npm start

# Terminal 6: Mobile Frontend
cd frontend/mobile
npm start
```

### 7. Verify Setup

```bash
# Health check
curl http://localhost:4000/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2025-11-14T...",
#   "services": {
#     "database": "connected",
#     "redis": "connected",
#     "storage": "connected"
#   }
# }

# Test API
curl http://localhost:4000/api/v1/users

# Access GraphQL Playground
open http://localhost:4000/graphql

# Access Web App
open http://localhost:3000
```

---

## Azure Infrastructure Setup

### 1. Azure Account Setup

```bash
# Login to Azure
az login

# Set default subscription
az account set --subscription "Your-Subscription-Name"

# Verify current subscription
az account show

# Create service principal for Terraform
az ad sp create-for-rbac \
  --name "connectsphere-terraform" \
  --role="Contributor" \
  --scopes="/subscriptions/YOUR_SUBSCRIPTION_ID"

# Save the output (clientId, clientSecret, tenantId)
```

### 2. Terraform State Storage

```bash
# Create resource group for Terraform state
az group create \
  --name connectsphere-tfstate-rg \
  --location eastus

# Create storage account
az storage account create \
  --name connectspheretfstate \
  --resource-group connectsphere-tfstate-rg \
  --location eastus \
  --sku Standard_LRS \
  --encryption-services blob

# Get storage account key
ACCOUNT_KEY=$(az storage account keys list \
  --resource-group connectsphere-tfstate-rg \
  --account-name connectspheretfstate \
  --query '[0].value' -o tsv)

# Create container for state
az storage container create \
  --name tfstate \
  --account-name connectspheretfstate \
  --account-key $ACCOUNT_KEY
```

### 3. Initialize Terraform

```bash
cd infrastructure/terraform

# Initialize Terraform
terraform init \
  -backend-config="environments/development/backend.hcl"

# Validate configuration
terraform validate

# Plan infrastructure
terraform plan \
  -var-file="environments/development/terraform.tfvars" \
  -out=tfplan

# Apply infrastructure
terraform apply tfplan
```

### 4. Configure kubectl

```bash
# Get AKS credentials
az aks get-credentials \
  --resource-group connectsphere-core-dev-rg \
  --name connectsphere-aks-dev

# Verify connection
kubectl get nodes

# Install NGINX Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.9.4/deploy/static/provider/cloud/deploy.yaml

# Verify ingress controller
kubectl get pods -n ingress-nginx
```

---

## Database Configuration

### PostgreSQL Setup

```sql
-- Connect to PostgreSQL
psql -U postgres -h localhost

-- Create databases
CREATE DATABASE connectsphere_dev;
CREATE DATABASE connectsphere_test;
CREATE DATABASE users_db;
CREATE DATABASE matches_db;
CREATE DATABASE messages_db;

-- Create user with permissions
CREATE USER connectsphere WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE connectsphere_dev TO connectsphere;
GRANT ALL PRIVILEGES ON DATABASE users_db TO connectsphere;
GRANT ALL PRIVILEGES ON DATABASE matches_db TO connectsphere;
GRANT ALL PRIVILEGES ON DATABASE messages_db TO connectsphere;

-- Enable required extensions
\c connectsphere_dev
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Verify
\l
\du
```

### Run Migrations

```bash
# User Service
cd backend/services/user-service
npm run migration:run

# Matching Service
cd backend/services/matching-service
npm run migration:run

# Messaging Service
cd backend/services/messaging-service
npm run migration:run

# Payment Service
cd backend/services/payment-service
npm run migration:run
```

---

## Service Configuration

### User Service

```bash
cd backend/services/user-service

# Create .env file
cat > .env << EOF
DATABASE_URL=postgresql://connectsphere:password@localhost:5432/users_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=your_jwt_secret
PORT=4001
EOF

# Start service
npm run dev
```

### Matching Service

```bash
cd backend/services/matching-service

# Create .env file
cat > .env << EOF
DATABASE_URL=postgresql://connectsphere:password@localhost:5432/matches_db
REDIS_URL=redis://localhost:6379
ML_MODEL_PATH=./ml/models/compatibility-model.pkl
PORT=4002
EOF

# Train ML model (first time only)
cd ml/training
python train.py

# Start service
npm run dev
```

### Messaging Service

```bash
cd backend/services/messaging-service

# Create .env file
cat > .env << EOF
DATABASE_URL=postgresql://connectsphere:password@localhost:5432/messages_db
REDIS_URL=redis://localhost:6379
WEBSOCKET_PORT=4003
EOF

# Start service
npm run dev
```

---

## Frontend Setup

### Web Application

```bash
cd frontend/web

# Install dependencies
npm install

# Create .env.local
cat > .env.local << EOF
REACT_APP_API_URL=http://localhost:4000
REACT_APP_WEBSOCKET_URL=ws://localhost:4003
REACT_APP_STRIPE_PUBLIC_KEY=pk_test_your_key
EOF

# Start development server
npm start

# Build for production
npm run build

# Run tests
npm test
```

### Component Development

```bash
# Start Storybook for component development
npm run storybook

# Build Storybook
npm run build-storybook
```

---

## Mobile App Setup

### React Native Environment

#### iOS Setup (macOS only)

```bash
# Install CocoaPods
sudo gem install cocoapods

# Install iOS dependencies
cd frontend/mobile/ios
pod install
cd ..

# Start Metro bundler
npm start

# Run on iOS simulator
npm run ios

# Or specific simulator
npm run ios -- --simulator="iPhone 15 Pro"
```

#### Android Setup

```bash
# Install Android dependencies
cd frontend/mobile/android
./gradlew clean

# Start Metro bundler
cd ..
npm start

# Run on Android emulator
npm run android

# Or specific device
adb devices
npm run android -- --deviceId=<device-id>
```

### Mobile Configuration

```bash
cd frontend/mobile

# Create .env
cat > .env << EOF
API_URL=http://localhost:4000
WEBSOCKET_URL=ws://localhost:4003
STRIPE_PUBLIC_KEY=pk_test_your_key
GOOGLE_MAPS_API_KEY=your_google_maps_key
EOF
```

---

## Testing

### Unit Tests

```bash
# Run all unit tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific service tests
npm test --scope=@connectsphere/user-service

# Watch mode
npm test -- --watch
```

### Integration Tests

```bash
# Run integration tests
npm run test:integration

# Specific service
cd backend/services/user-service
npm run test:integration
```

### End-to-End Tests

```bash
# Install Playwright
cd tests/e2e/playwright
npm install

# Run E2E tests
npm run test:e2e

# Run in headed mode
npm run test:e2e -- --headed

# Run specific test
npm run test:e2e -- auth.spec.ts
```

### Load Testing

```bash
# Install k6
brew install k6  # macOS
choco install k6  # Windows

# Run load tests
cd tests/load-testing/k6
k6 run api-load-test.js

# With custom parameters
k6 run --vus 100 --duration 5m api-load-test.js
```

---

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Find process using port
lsof -i :4000  # macOS/Linux
netstat -ano | findstr :4000  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

#### Database Connection Failed

```bash
# Check PostgreSQL status
brew services list | grep postgresql  # macOS
sudo systemctl status postgresql  # Linux
sc query postgresql  # Windows

# Restart PostgreSQL
brew services restart postgresql  # macOS
sudo systemctl restart postgresql  # Linux
net start postgresql  # Windows

# Test connection
psql -U postgres -h localhost -p 5432
```

#### Docker Issues

```bash
# Restart Docker
docker-compose down
docker-compose up -d

# Clean up Docker
docker system prune -a
docker volume prune

# Check Docker logs
docker-compose logs -f <service-name>
```

#### Node Modules Issues

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Or use npm ci for clean install
npm ci
```

#### Redis Connection Failed

```bash
# Check Redis status
redis-cli ping

# Restart Redis
brew services restart redis  # macOS
sudo systemctl restart redis  # Linux

# Clear Redis cache
redis-cli FLUSHALL
```

### Getting Help

1. **Documentation**: Check [docs.connectsphere.com](https://docs.connectsphere.com)
2. **GitHub Issues**: [github.com/connectsphere/platform/issues](https://github.com/connectsphere/platform/issues)
3. **Community Forum**: [community.connectsphere.com](https://community.connectsphere.com)
4. **Slack**: Join our developer Slack channel
5. **Email**: engineering@connectsphere.com

---

## Next Steps

1. ✅ Complete environment setup
2. ✅ Run all services locally
3. ✅ Verify health checks
4. 📖 Read [Tech Stack](./Tech-Stack.md) documentation
5. 📖 Review [Project Structure](./Project-Structure.md)
6. 🔨 Start developing features!

---

**Document Version:** 1.0.0  
**Last Updated:** November 14, 2025  
**Maintained By:** DevOps Team

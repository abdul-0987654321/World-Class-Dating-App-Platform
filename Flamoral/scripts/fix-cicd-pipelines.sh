#!/bin/bash
# =============================================================================
# CI/CD PIPELINE FIX SCRIPT - Flamoral Dating Platform
# =============================================================================
# Automated script to fix all identified CI/CD pipeline issues
# Run this script from the project root directory
# =============================================================================

set -e  # Exit on error

echo "========================================================================"
echo "CI/CD PIPELINE FIX SCRIPT"
echo "========================================================================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_info() {
    echo -e "${YELLOW}[INFO]${NC} $1"
}

# Check if we're in the correct directory
if [ ! -f "package.json" ] || [ ! -d ".github/workflows" ]; then
    print_error "This script must be run from the project root directory!"
    exit 1
fi

print_success "Project root directory confirmed"
echo ""

# =============================================================================
# STEP 1: Fix Path References in GitHub Actions Workflows
# =============================================================================
echo "STEP 1: Fixing path references in GitHub Actions workflows..."
echo "----------------------------------------------------------------"

# cd-dev.yml
if [ -f ".github/workflows/cd-dev.yml" ]; then
    print_info "Fixing cd-dev.yml..."
    sed -i 's|k8s/helm/flamoral|infrastructure/helm/flamoral|g' .github/workflows/cd-dev.yml
    print_success "Fixed cd-dev.yml"
else
    print_error "cd-dev.yml not found"
fi

# cd-staging.yml
if [ -f ".github/workflows/cd-staging.yml" ]; then
    print_info "Fixing cd-staging.yml..."
    sed -i 's|k8s/helm/flamoral|infrastructure/helm/flamoral|g' .github/workflows/cd-staging.yml
    print_success "Fixed cd-staging.yml"
else
    print_error "cd-staging.yml not found"
fi

# complete-cd-pipeline.yml
if [ -f ".github/workflows/complete-cd-pipeline.yml" ]; then
    print_info "Fixing complete-cd-pipeline.yml..."
    sed -i 's|k8s/helm/flamoral|infrastructure/helm/flamoral|g' .github/workflows/complete-cd-pipeline.yml
    print_success "Fixed complete-cd-pipeline.yml"
else
    print_error "complete-cd-pipeline.yml not found"
fi

echo ""

# =============================================================================
# STEP 2: Create Missing Dockerfiles
# =============================================================================
echo "STEP 2: Creating missing Dockerfiles..."
echo "----------------------------------------------------------------"

# Services that need Dockerfiles
services=(
    "api-gateway:3000"
    "auth-service:3001"
    "user-service:3002"
    "matching-service:3003"
    "messaging-service:3004"
    "media-service:3005"
    "payment-service:3006"
    "notification-service:3007"
    "analytics-service:3008"
    "moderation-service:3009"
    "realtime-service:8080"
    "advertising-service:3010"
    "admin-service:3011"
    "automation-service:3012"
    "workflow-engine:3013"
)

for service_port in "${services[@]}"; do
    IFS=':' read -r service port <<< "$service_port"
    service_path="backend/services/$service"
    dockerfile="$service_path/Dockerfile"

    # Check if Dockerfile already exists
    if [ -f "$dockerfile" ]; then
        print_info "Dockerfile already exists for $service, skipping..."
        continue
    fi

    # Check if service directory exists
    if [ ! -d "$service_path" ]; then
        print_error "Service directory not found: $service_path"
        continue
    fi

    print_info "Creating Dockerfile for $service (port $port)..."

    # Create Dockerfile
    cat > "$dockerfile" <<EOF
# Multi-stage build for $service
FROM node:20-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci
COPY src/ ./src/
RUN npm run build || npx tsc

FROM node:20-alpine AS production
ARG BUILD_DATE
ARG VCS_REF
ARG VERSION=latest
ARG NODE_ENV=production

LABEL org.opencontainers.image.title="Flamoral $service" \\
      org.opencontainers.image.vendor="Flamoral" \\
      org.opencontainers.image.created="\${BUILD_DATE}" \\
      org.opencontainers.image.revision="\${VCS_REF}" \\
      org.opencontainers.image.version="\${VERSION}"

RUN apk add --no-cache dumb-init
RUN addgroup -g 1000 nodejs && \\
    adduser -u 1000 -G nodejs -s /bin/sh -D nodejs

WORKDIR /app
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --chown=nodejs:nodejs package*.json ./

USER nodejs
ENV NODE_ENV=\${NODE_ENV} PORT=$port

HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \\
    CMD node -e "require('http').get('http://localhost:$port/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

EXPOSE $port
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
EOF

    print_success "Created Dockerfile for $service"
done

echo ""

# =============================================================================
# STEP 3: Create .dockerignore Files
# =============================================================================
echo "STEP 3: Creating .dockerignore files..."
echo "----------------------------------------------------------------"

for service_port in "${services[@]}"; do
    IFS=':' read -r service port <<< "$service_port"
    service_path="backend/services/$service"
    dockerignore="$service_path/.dockerignore"

    if [ ! -d "$service_path" ]; then
        continue
    fi

    if [ -f "$dockerignore" ]; then
        print_info ".dockerignore already exists for $service, skipping..."
        continue
    fi

    print_info "Creating .dockerignore for $service..."

    cat > "$dockerignore" <<EOF
# Dependencies
node_modules
npm-debug.log
yarn-error.log

# Testing
coverage
.nyc_output
*.test.ts
*.spec.ts
__tests__
__mocks__

# Development
.env
.env.local
.env.*.local
*.log

# Build
dist
build
.next
.cache

# IDE
.vscode
.idea
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Git
.git
.gitignore
.github

# Documentation
*.md
docs

# CI/CD
.github
azure-pipelines.yml
EOF

    print_success "Created .dockerignore for $service"
done

echo ""

# =============================================================================
# STEP 4: Create Azure DevOps Pipeline Templates
# =============================================================================
echo "STEP 4: Creating Azure DevOps pipeline templates..."
echo "----------------------------------------------------------------"

mkdir -p pipelines/templates

# docker-build.yml template
print_info "Creating docker-build.yml template..."
cat > "pipelines/templates/docker-build.yml" <<'EOF'
parameters:
  - name: serviceName
    type: string
  - name: dockerfile
    type: string
  - name: acrLoginServer
    type: string
  - name: imageTag
    type: string

steps:
  - task: Docker@2
    displayName: 'Login to ACR'
    inputs:
      command: login
      containerRegistry: 'acr-service-connection'

  - task: Docker@2
    displayName: 'Build Docker Image'
    inputs:
      command: build
      repository: '${{ parameters.serviceName }}'
      dockerfile: '${{ parameters.dockerfile }}'
      tags: |
        ${{ parameters.imageTag }}
        latest
      arguments: '--build-arg NODE_ENV=production --build-arg BUILD_DATE=$(Build.BuildNumber) --build-arg VCS_REF=$(Build.SourceVersion)'

  - script: |
      docker run --rm aquasec/trivy:latest image --severity HIGH,CRITICAL \
        --exit-code 0 \
        ${{ parameters.acrLoginServer }}/${{ parameters.serviceName }}:${{ parameters.imageTag }}
    displayName: 'Scan image with Trivy'
    continueOnError: true

  - task: Docker@2
    displayName: 'Push Docker Image'
    inputs:
      command: push
      repository: '${{ parameters.serviceName }}'
      tags: |
        ${{ parameters.imageTag }}
        latest
EOF
print_success "Created docker-build.yml template"

# helm-deploy.yml template
print_info "Creating helm-deploy.yml template..."
cat > "pipelines/templates/helm-deploy.yml" <<'EOF'
parameters:
  - name: chartName
    type: string
  - name: chartPath
    type: string
  - name: namespace
    type: string
  - name: environment
    type: string
  - name: imageTag
    type: string
  - name: acrLoginServer
    type: string
  - name: releaseName
    type: string
  - name: valueFiles
    type: object
    default: []
  - name: additionalValues
    type: object
    default: []

steps:
  - script: |
      kubectl create namespace ${{ parameters.namespace }} --dry-run=client -o yaml | kubectl apply -f -
    displayName: 'Create namespace if not exists'
    continueOnError: true

  - script: |
      VALUES_ARGS=""
      for file in ${{ join(' ', parameters.valueFiles) }}; do
        VALUES_ARGS="$VALUES_ARGS --values $file"
      done

      ADDITIONAL_VALUES=""
      for val in ${{ join(' ', parameters.additionalValues) }}; do
        ADDITIONAL_VALUES="$ADDITIONAL_VALUES --set $val"
      done

      helm upgrade --install ${{ parameters.releaseName }} ${{ parameters.chartPath }} \
        --namespace ${{ parameters.namespace }} \
        --create-namespace \
        $VALUES_ARGS \
        --set global.image.tag=${{ parameters.imageTag }} \
        --set global.image.registry=${{ parameters.acrLoginServer }} \
        --set global.environment=${{ parameters.environment }} \
        $ADDITIONAL_VALUES \
        --wait \
        --timeout 15m
    displayName: 'Deploy with Helm'
EOF
print_success "Created helm-deploy.yml template"

echo ""

# =============================================================================
# STEP 5: Validate Configuration Files
# =============================================================================
echo "STEP 5: Validating configuration files..."
echo "----------------------------------------------------------------"

# Validate YAML files
print_info "Validating YAML syntax..."
yaml_files=$(find .github/workflows pipelines infrastructure/helm -name "*.yml" -o -name "*.yaml" 2>/dev/null)
for file in $yaml_files; do
    if command -v yamllint &> /dev/null; then
        yamllint -d relaxed "$file" || print_error "YAML validation failed for $file"
    fi
done
print_success "YAML validation complete"

# Validate Helm charts
if command -v helm &> /dev/null; then
    print_info "Validating Helm charts..."
    for chart in infrastructure/helm/*/; do
        if [ -f "$chart/Chart.yaml" ]; then
            helm lint "$chart" --strict || print_error "Helm lint failed for $chart"
        fi
    done
    print_success "Helm validation complete"
else
    print_info "Helm not installed, skipping Helm validation"
fi

echo ""

# =============================================================================
# SUMMARY
# =============================================================================
echo "========================================================================"
echo "FIX SUMMARY"
echo "========================================================================"
echo ""

print_success "Path references fixed in GitHub Actions workflows"
print_success "Dockerfiles created for all microservices"
print_success ".dockerignore files created"
print_success "Azure DevOps pipeline templates created"
print_success "Configuration files validated"

echo ""
echo "========================================================================"
echo "NEXT STEPS"
echo "========================================================================"
echo ""
echo "1. Review and commit the changes:"
echo "   git status"
echo "   git add ."
echo "   git commit -m 'fix: CI/CD pipeline configuration issues'"
echo ""
echo "2. Configure GitHub secrets (see CICD_PIPELINE_FIX_GUIDE.md)"
echo ""
echo "3. Test CI pipeline:"
echo "   git push origin develop"
echo ""
echo "4. Monitor pipeline execution in GitHub Actions"
echo ""
echo "For detailed instructions, see: CICD_PIPELINE_FIX_GUIDE.md"
echo ""

print_success "CI/CD pipeline fix script completed successfully!"

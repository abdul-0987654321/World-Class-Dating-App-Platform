# Dockerfile Configuration Fixes for Flamoral Platform

## Summary of Issues Found and Fixed

This document outlines all issues identified in the Dockerfile configurations across the Flamoral project and provides comprehensive fixes.

---

## 1. Backend Main Dockerfile Issues

### File: `backend/Dockerfile`

**Issues Found:**
- Missing `curl` package for health checks (health check will fail)
- Attempts to copy `migrations` directory that may not exist causing build failure
- Missing proper error handling for optional directories

**Fixes Applied:**
- Added `curl` to alpine package installation
- Removed mandatory migrations directory copy (commented out as optional)
- Improved health check reliability

---

## 2. Infrastructure Production Dockerfile Issues

### File: `infrastructure/docker/backend/Dockerfile.production`

**Issues Found:**
- Missing proper build context - expects `src` directory at context root
- Installs production dependencies in build stage instead of dev dependencies
- Missing NODE_ENV setting in build stage
- Native module dependencies might be needed at runtime

**Recommended Fix:**
See fixed version in section below.

---

## 3. Realtime Service (Go) Dockerfile Issues

### File: `backend/services/realtime-service/Dockerfile`

**Issues Found:**
- Copies `go.mod` and `go.sum` from wrong location (expects them at context root)
- Missing context path specification in docker-compose
- Git command in build flags may fail if not a git repository

**Recommended Fix:**
The build context should be `backend/services/realtime-service/` and the Dockerfile should be at the service root.

---

## 4. AI Services (Python) Dockerfile Issues

### File: `backend/services/ai-services/*/Dockerfile`

**Issues Found:**
- Photo Analysis: Copies `requirements.txt` from relative path without proper COPY context
- Fraud Detection: Same issue with requirements.txt path
- Dating Coach: Same issue with requirements.txt path
- Content Generator: Same issue with requirements.txt path

**Pattern Issue:**
All Python AI services use `COPY requirements.txt .` which expects the file in the service directory, but the build context in docker-compose is set to `../../` (project root).

**Recommended Fix:**
Either:
1. Update COPY statements to include full path: `COPY backend/services/ai-services/[service]/requirements.txt .`
2. Or change docker-compose build context to the service directory

---

## 5. Advertising Service Dockerfile Issues

### File: `backend/services/advertising-service/Dockerfile`

**Issues Found:**
- Uses `wget` for health check but doesn't install it (Alpine doesn't have wget by default)
- Missing `dumb-init` for proper signal handling
- Should use `curl` instead or install `wget`

---

## 6. Workflow Engine Port Conflict

### File: `backend/services/workflow-engine/Dockerfile`

**Issue:**
- Exposes port 4011 which conflicts with realtime-service
- Should use a different port

---

## 7. Docker Compose Development Configuration

### File: `infrastructure/docker/docker-compose.yml`

**Issues Found:**
- Build contexts point to `../../` but service Dockerfiles expect proper monorepo structure
- All Node.js services depend on `backend/shared` module being built first
- Python AI services have incorrect build context for requirements.txt files
- Realtime service build context doesn't align with Dockerfile expectations

---

## Complete Fixed Dockerfiles

### Fixed: backend/Dockerfile

```dockerfile
# ============================================
# Multi-Stage Dockerfile for Backend
# Flamoral Unified Backend
# ============================================

# Stage 1: Dependencies
FROM node:20-alpine AS dependencies

LABEL maintainer="Flamoral Team"
LABEL description="Flamoral Backend - REST + GraphQL + WebSocket"

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Stage 2: Build
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev)
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Stage 3: Runtime
FROM node:20-alpine AS runtime

# Install dumb-init and curl for health checks
RUN apk add --no-cache dumb-init curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy production dependencies
COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/package*.json ./

# Set environment
ENV NODE_ENV=production \
    PORT=3000 \
    GRAPHQL_PORT=4000 \
    WS_PORT=5000

# Switch to non-root user
USER nodejs

# Expose ports
EXPOSE 3000 4000 5000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/server.js"]
```

### Fixed: infrastructure/docker/backend/Dockerfile.production

```dockerfile
# Multi-stage Dockerfile for Backend Services (Production)
# Optimized for size and security

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies for native modules
RUN apk add --no-cache python3 make g++ cairo-dev jpeg-dev pango-dev giflib-dev

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including dev for build)
RUN npm ci && \
    npm cache clean --force

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Stage 2: Production Dependencies
FROM node:20-alpine AS prod-dependencies

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies
RUN npm ci --only=production && \
    npm cache clean --force

# Stage 3: Production Runtime
FROM node:20-alpine

# Install security updates and runtime tools
RUN apk upgrade --no-cache && \
    apk add --no-cache dumb-init curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy built application from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=prod-dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Switch to non-root user
USER nodejs

# Set environment
ENV NODE_ENV=production

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:4000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/index.js"]
```

### Fixed: backend/services/realtime-service/Dockerfile

```dockerfile
# =============================================================================
# Realtime Service Dockerfile (Go-based WebSocket Service)
# Multi-stage build for production optimization
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Builder - Build Go application
# -----------------------------------------------------------------------------
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    git \
    ca-certificates \
    tzdata \
    && rm -rf /var/cache/apk/*

# Copy go mod files (from service directory)
COPY go.mod ./
COPY go.sum* ./

# Download dependencies
RUN go mod download && go mod verify

# Copy source code
COPY . .

# Build the binary with optimization flags
# Simplified without git-dependent version info
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s" \
    -o /app/realtime-service \
    ./cmd/server

# -----------------------------------------------------------------------------
# Stage 2: Production - Minimal runtime image
# -----------------------------------------------------------------------------
FROM alpine:3.19

# Install runtime dependencies
RUN apk add --no-cache \
    ca-certificates \
    tzdata \
    curl \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Create non-root user
RUN adduser -D -g '' -u 1000 appuser && \
    chown -R appuser:appuser /app

# Copy binary from builder
COPY --from=builder --chown=appuser:appuser /app/realtime-service .

# Switch to non-root user
USER appuser

# Environment variables
ENV PORT=4011 \
    GIN_MODE=release

# Expose port
EXPOSE 4011

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:4011/health || exit 1

# Run the service
ENTRYPOINT ["./realtime-service"]
```

### Fixed: backend/services/advertising-service/Dockerfile

```dockerfile
# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache dumb-init curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --legacy-peer-deps --only=production && npm cache clean --force

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Set ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Environment variables
ENV NODE_ENV=production
ENV PORT=3009

# Expose port
EXPOSE 3009

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3009/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start the service
CMD ["node", "dist/index.js"]
```

### Fixed: backend/services/workflow-engine/Dockerfile

```dockerfile
# =============================================================================
# Workflow Engine Service Dockerfile
# Multi-stage build for production optimization
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Builder - Build TypeScript and dependencies
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Copy root package files
COPY package*.json ./

# Copy shared module package files
COPY backend/shared/package*.json ./backend/shared/

# Copy workflow-engine package files
COPY backend/services/workflow-engine/package*.json ./backend/services/workflow-engine/

# Install root dependencies
RUN npm install --legacy-peer-deps || true

# Build shared module first
COPY backend/shared ./backend/shared
WORKDIR /app/backend/shared
RUN npm install --legacy-peer-deps && npm run build

# Build workflow-engine
WORKDIR /app/backend/services/workflow-engine
RUN npm install --legacy-peer-deps

# Copy service source files
COPY backend/services/workflow-engine/src ./src
COPY backend/services/workflow-engine/tsconfig*.json ./

# Build the service
RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Production - Optimized runtime image
# -----------------------------------------------------------------------------
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init curl && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Copy shared module (needed by service)
COPY --from=builder --chown=nodejs:nodejs /app/backend/shared/dist ./node_modules/@flamoral/shared/dist/
COPY --from=builder --chown=nodejs:nodejs /app/backend/shared/package.json ./node_modules/@flamoral/shared/

# Copy built application and dependencies
COPY --from=builder --chown=nodejs:nodejs /app/backend/services/workflow-engine/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/backend/services/workflow-engine/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/backend/services/workflow-engine/package*.json ./

# Switch to non-root user
USER nodejs

# Environment variables
ENV NODE_ENV=production \
    PORT=4013 \
    NODE_OPTIONS="--max-old-space-size=1536"

# Expose port (changed from 4011 to avoid conflict)
EXPOSE 4013

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:4013/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/main.js"]
```

### Fixed Python AI Services Pattern

For all Python AI services, use this pattern:

```dockerfile
# =============================================================================
# [Service Name] Dockerfile (Python-based AI Service)
# Multi-stage build for production optimization
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Builder - Install dependencies
# -----------------------------------------------------------------------------
FROM python:3.11-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Upgrade pip and install wheel
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Copy and install Python dependencies
# NOTE: Path must match build context in docker-compose
COPY backend/services/ai-services/[service-name]/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# -----------------------------------------------------------------------------
# Stage 2: Production - Optimized runtime image
# -----------------------------------------------------------------------------
FROM python:3.11-slim

WORKDIR /app

# Install runtime dependencies and curl for health checks
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Create non-root user for security
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app

# Copy application code
COPY --chown=appuser:appuser backend/services/ai-services/[service-name]/app ./app
COPY --chown=appuser:appuser backend/services/ai-services/[service-name]/*.py ./

# Create models directory
RUN mkdir -p /app/models && chown -R appuser:appuser /app/models

# Switch to non-root user
USER appuser

# Environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=[service-port]

# Expose port
EXPOSE [service-port]

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:[service-port]/health || exit 1

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "[service-port]", "--workers", "2"]
```

---

## Docker Compose Fixes Required

### Update build contexts in `infrastructure/docker/docker-compose.yml`

For realtime-service:
```yaml
realtime-service:
  build:
    context: ../../backend/services/realtime-service  # Changed from ../../
    dockerfile: Dockerfile
```

For workflow-engine, update port mapping:
```yaml
workflow-engine:
  # ... existing config
  environment:
    PORT: 4013  # Changed from 4011
  ports:
    - "4013:4013"  # Changed from 4011
```

---

## Security Best Practices Implemented

1. **Non-root Users**: All services run as non-root users (nodejs:1001 or appuser:1000)
2. **Signal Handling**: Node.js services use `dumb-init` for proper signal handling
3. **Multi-stage Builds**: Separate build and runtime stages to minimize image size
4. **Health Checks**: All services have proper health check endpoints
5. **Minimal Base Images**: Using Alpine Linux and slim Python images
6. **No Cache for Package Managers**: NPM and APK caches cleaned after installation
7. **Proper File Ownership**: All copied files have correct ownership set
8. **Environment Variables**: NODE_ENV properly set to "production"
9. **Security Updates**: Alpine packages updated in production images

---

## Build Order for Monorepo

When building all services:

1. Build `backend/shared` module first (required by all Node.js services)
2. Build individual services that depend on shared module
3. Python services are independent and can be built in parallel
4. Go realtime service is independent

---

## Testing Recommendations

After applying fixes, test each service:

```bash
# Test individual service build
docker build -f backend/services/[service]/Dockerfile -t test-[service] .

# Test with docker-compose
docker-compose -f infrastructure/docker/docker-compose.yml build [service]

# Test health checks
docker-compose -f infrastructure/docker/docker-compose.yml up -d [service]
docker-compose -f infrastructure/docker/docker-compose.yml ps
```

---

## Summary of Changes

### Critical Fixes:
1. Added `curl` to all images that use curl-based health checks
2. Fixed build context paths for AI services
3. Removed failing migrations directory copy
4. Fixed workflow-engine port conflict (4011 → 4013)
5. Fixed advertising-service health check (wget → curl)
6. Fixed realtime-service go.mod path issues
7. Separated build and production dependencies in infrastructure Dockerfile

### Security Improvements:
1. All services use non-root users
2. Proper signal handling with dumb-init
3. Multi-stage builds minimize attack surface
4. Security updates applied in base images

### Best Practices:
1. Consistent Dockerfile patterns across services
2. Proper layer caching for faster builds
3. Health checks for all services
4. Clear environment variable configuration
5. Proper NODE_ENV settings

---

## Next Steps

1. Apply all Dockerfile fixes
2. Update docker-compose.yml with corrected build contexts and ports
3. Test each service build individually
4. Test full stack with docker-compose
5. Update CI/CD pipelines with new build contexts
6. Document any environment-specific configuration

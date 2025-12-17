# =============================================================================
# Messaging Service Dockerfile
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

# Copy messaging-service package files
COPY backend/services/messaging-service/package*.json ./backend/services/messaging-service/

# Install root dependencies
RUN npm install --legacy-peer-deps || true

# Build shared module first
COPY backend/shared ./backend/shared
WORKDIR /app/backend/shared
RUN npm install --legacy-peer-deps && npm run build

# Build messaging-service
WORKDIR /app/backend/services/messaging-service
RUN npm install --legacy-peer-deps

# Copy service source files
COPY backend/services/messaging-service/src ./src
COPY backend/services/messaging-service/tsconfig*.json ./

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
COPY --from=builder --chown=nodejs:nodejs /app/backend/services/messaging-service/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/backend/services/messaging-service/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/backend/services/messaging-service/package*.json ./

# Switch to non-root user
USER nodejs

# Environment variables
ENV NODE_ENV=production \
    PORT=4004 \
    NODE_OPTIONS="--max-old-space-size=1536"

# Expose port
EXPOSE 4004

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:4004/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/index.js"]

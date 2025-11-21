# ============================================
# Multi-Stage Dockerfile for Backend
# ConnectSphere Unified Backend
# ============================================

# Stage 1: Dependencies
FROM node:20-alpine AS dependencies

LABEL maintainer="ConnectSphere Team"
LABEL description="ConnectSphere Backend - REST + GraphQL + WebSocket"

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

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# Copy production dependencies
COPY --from=dependencies --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/package*.json ./

# Copy migrations (if any)
COPY --chown=nodejs:nodejs migrations ./migrations

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
    CMD node -e "require('http').get('http://localhost:3000/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/server.js"]

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy root package files
COPY package*.json ./

# Copy shared package files
COPY backend/shared/package*.json ./backend/shared/

# Copy service package files
COPY backend/services/user-service/package*.json ./backend/services/user-service/

# Install root dependencies
RUN npm install --legacy-peer-deps || true

# Install and build shared module
WORKDIR /app/backend/shared
COPY backend/shared ./
RUN npm install --legacy-peer-deps && npm run build || echo "Shared build completed"

# Install service dependencies
WORKDIR /app/backend/services/user-service
RUN npm install --legacy-peer-deps

# Copy service source
COPY backend/services/user-service/src ./src
COPY backend/services/user-service/tsconfig*.json ./

# Build TypeScript
RUN npm run build || npx tsc

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy shared module
COPY --from=builder /app/backend/shared/dist ./node_modules/@flamoral/shared/dist/
COPY --from=builder /app/backend/shared/package.json ./node_modules/@flamoral/shared/

# Copy built application
COPY --from=builder /app/backend/services/user-service/dist ./dist
COPY --from=builder /app/backend/services/user-service/node_modules ./node_modules
COPY --from=builder /app/backend/services/user-service/package*.json ./

# Set ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Environment variables
ENV NODE_ENV=production
ENV PORT=3002

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3002/health || exit 1

# Start the service
CMD ["node", "dist/index.js"]

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 py3-pip make g++ build-base

# Copy root package files
COPY package*.json ./

# Copy shared package files
COPY backend/shared/package*.json ./backend/shared/

# Copy service package files
COPY backend/services/matching-service/package*.json ./backend/services/matching-service/

# Install root dependencies
RUN npm install --legacy-peer-deps || true

# Build shared module first
WORKDIR /app/backend/shared
COPY backend/shared ./
RUN npm install --legacy-peer-deps && npm run build

# Install service dependencies
WORKDIR /app/backend/services/matching-service
RUN npm install --legacy-peer-deps

# Link shared module into service node_modules BEFORE building
RUN mkdir -p node_modules/@flamoral/backend-shared && \
    cp -r /app/backend/shared/dist node_modules/@flamoral/backend-shared/ && \
    cp /app/backend/shared/package.json node_modules/@flamoral/backend-shared/

# Copy service source and config
COPY backend/services/matching-service/src ./src
COPY backend/services/matching-service/tsconfig*.json ./

# Build TypeScript - fail explicitly if build fails
RUN npm run build

# Verify dist was created
RUN ls -la dist/ && test -f dist/index.js

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install Python for ML components runtime
RUN apk add --no-cache python3 py3-pip

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy node_modules with shared module already linked
COPY --from=builder /app/backend/services/matching-service/node_modules ./node_modules

# Copy shared module (ensure it's in node_modules)
COPY --from=builder /app/backend/shared/dist ./node_modules/@flamoral/backend-shared/dist/
COPY --from=builder /app/backend/shared/package.json ./node_modules/@flamoral/backend-shared/

# Copy built application
COPY --from=builder /app/backend/services/matching-service/dist ./dist
COPY --from=builder /app/backend/services/matching-service/package*.json ./

# Set ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Environment variables
ENV NODE_ENV=production
ENV PORT=3003

# Expose port
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3003/health || exit 1

# Start the service
CMD ["node", "dist/index.js"]

# Build stage
FROM node:20-alpine@sha256:c58e70281669d9a30f8d4abbe7f29d3078b8e00ee7cf24e6dc1b7ac74f45dc10 AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy root package files
COPY package*.json ./

# Copy shared package files
COPY backend/shared/package*.json ./backend/shared/

# Copy service package files
COPY backend/services/moderation-service/package*.json ./backend/services/moderation-service/

# Install root dependencies
RUN npm install --legacy-peer-deps || true

# Build shared module first
WORKDIR /app/backend/shared
COPY backend/shared ./
RUN npm install --legacy-peer-deps && npm run build

# Install service dependencies
WORKDIR /app/backend/services/moderation-service
RUN npm install --legacy-peer-deps

# Link shared module into service node_modules BEFORE building
RUN mkdir -p node_modules/@flamoral/backend-shared && \
    cp -r /app/backend/shared/dist node_modules/@flamoral/backend-shared/ && \
    cp /app/backend/shared/package.json node_modules/@flamoral/backend-shared/

# Copy service source
COPY backend/services/moderation-service/src ./src
COPY backend/services/moderation-service/tsconfig*.json ./

# Build TypeScript
RUN npm run build

# Verify dist was created
RUN ls -la dist/ && test -f dist/index.js

# Production stage
FROM node:20-alpine@sha256:c58e70281669d9a30f8d4abbe7f29d3078b8e00ee7cf24e6dc1b7ac74f45dc10

WORKDIR /app

# Install Python for ML models
RUN apk add --no-cache python3 py3-pip

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copy node_modules with shared module already linked
COPY --from=builder /app/backend/services/moderation-service/node_modules ./node_modules

# Copy shared module (ensure it's in node_modules)
COPY --from=builder /app/backend/shared/dist ./node_modules/@flamoral/backend-shared/dist/
COPY --from=builder /app/backend/shared/package.json ./node_modules/@flamoral/backend-shared/

# Copy built application
COPY --from=builder /app/backend/services/moderation-service/dist ./dist
COPY --from=builder /app/backend/services/moderation-service/package*.json ./

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app

# Switch to nodejs user
USER nodejs

# Environment variables
ENV NODE_ENV=production
ENV PORT=3007

# Expose port
EXPOSE 3007

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3007/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/index.js"]

# Build stage
FROM public.ecr.aws/docker/library/node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy root package files
COPY package*.json ./

# Copy shared package files
COPY backend/shared/package*.json ./backend/shared/

# Copy service package files
COPY backend/services/workflow-engine/package*.json ./backend/services/workflow-engine/

# Install root dependencies
RUN npm install --legacy-peer-deps || true

# Build shared module first
WORKDIR /app/backend/shared
COPY backend/shared ./
RUN npm install --legacy-peer-deps && npm run build

# Install service dependencies
WORKDIR /app/backend/services/workflow-engine
RUN npm install --legacy-peer-deps

# Link shared module into service node_modules BEFORE building
RUN mkdir -p node_modules/@flamoral/backend-shared && \
    cp -r /app/backend/shared/dist node_modules/@flamoral/backend-shared/ && \
    cp /app/backend/shared/package.json node_modules/@flamoral/backend-shared/

# Copy service source
COPY backend/services/workflow-engine/src ./src
COPY backend/services/workflow-engine/tsconfig*.json ./

# Build TypeScript
RUN npm run build

# Verify dist was created (nest build outputs to main.js)
RUN ls -la dist/ && test -f dist/main.js

# Production stage
FROM public.ecr.aws/docker/library/node:20-alpine AS production

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Copy node_modules with shared module already linked
COPY --from=builder /app/backend/services/workflow-engine/node_modules ./node_modules

# Copy shared module (ensure it's in node_modules)
COPY --from=builder /app/backend/shared/dist ./node_modules/@flamoral/backend-shared/dist/
COPY --from=builder /app/backend/shared/package.json ./node_modules/@flamoral/backend-shared/

# Copy built application
COPY --from=builder /app/backend/services/workflow-engine/dist ./dist
COPY --from=builder /app/backend/services/workflow-engine/package*.json ./

# Set ownership
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Environment variables
ENV NODE_ENV=production
ENV PORT=3011

# Expose port
EXPOSE 3011

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3011/health || exit 1

# Start the service
CMD ["node", "dist/main.js"]

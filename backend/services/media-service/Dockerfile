# Build stage - Standalone build without monorepo workspace
FROM public.ecr.aws/docker/library/node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++ vips-dev fftw-dev build-base

# First, build the shared module
WORKDIR /app/shared
COPY backend/shared/package*.json ./
COPY backend/shared/tsconfig*.json ./
COPY backend/shared/types ./types
COPY backend/shared/utils ./utils
COPY backend/shared/constants ./constants
COPY backend/shared/config ./config
COPY backend/shared/src ./src
COPY backend/shared/errors ./errors
COPY backend/shared/middleware ./middleware
COPY backend/shared/cache ./cache
COPY backend/shared/database ./database
COPY backend/shared/index.ts ./

# Install shared dependencies and build
RUN npm install --legacy-peer-deps && npm run build

# Now build the media-service
WORKDIR /app/service

# Copy package.json and modify to remove file: reference
COPY backend/services/media-service/package*.json ./

# Remove the file: dependency and install dependencies
RUN sed -i 's|"@flamoral/backend-shared": "file:../../shared",||' package.json && \
    npm install --legacy-peer-deps

# Link the built shared module
RUN mkdir -p node_modules/@flamoral/backend-shared && \
    cp -r /app/shared/dist node_modules/@flamoral/backend-shared/ && \
    cp /app/shared/package.json node_modules/@flamoral/backend-shared/

# Copy source files
COPY backend/services/media-service/src ./src
COPY backend/services/media-service/tsconfig*.json ./

# Build the service
RUN npm run build

# Verify build output
RUN ls -la dist/ && test -f dist/index.js

# Production stage
FROM public.ecr.aws/docker/library/node:20-alpine

WORKDIR /app

# Install runtime image processing dependencies
RUN apk add --no-cache vips-dev fftw-dev python3

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copy production dependencies
COPY --from=builder /app/service/node_modules ./node_modules

# Copy shared module
COPY --from=builder /app/shared/dist ./node_modules/@flamoral/backend-shared/dist/
COPY --from=builder /app/shared/package.json ./node_modules/@flamoral/backend-shared/

# Copy built application
COPY --from=builder /app/service/dist ./dist

# Set ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

# Environment
ENV NODE_ENV=production
ENV PORT=3006

EXPOSE 3006

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3006/health || exit 1

CMD ["node", "dist/index.js"]

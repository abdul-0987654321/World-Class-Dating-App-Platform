# Build stage - Standalone build without monorepo workspace
FROM node:20-alpine AS builder

WORKDIR /build

# Install build dependencies
RUN apk add --no-cache python3 make g++

# First, build the shared module
WORKDIR /build/shared
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

# Now build the api-gateway service
WORKDIR /build/service

# Copy package.json and modify to remove file: reference
COPY backend/services/api-gateway/package*.json ./

# Remove the file: dependency, install dependencies, and add missing types
RUN sed -i 's|"@flamoral/backend-shared": "file:../../shared",||' package.json && \
    npm install --legacy-peer-deps && \
    npm install --save-dev @types/multer --legacy-peer-deps

# Merge shared module's node_modules into service's node_modules
RUN cp -rn /build/shared/node_modules/* ./node_modules/ 2>/dev/null || true

# Link the built shared module
RUN mkdir -p node_modules/@flamoral/backend-shared && \
    cp -r /build/shared/dist node_modules/@flamoral/backend-shared/ && \
    cp /build/shared/package.json node_modules/@flamoral/backend-shared/

# Copy source files
COPY backend/services/api-gateway/src ./src
COPY backend/services/api-gateway/tsconfig*.json ./
COPY backend/services/api-gateway/nest-cli.json ./

# Build the service
RUN npm run build

# Verify build output
RUN ls -la dist/ && test -f dist/main.js

# Production stage - Use Debian slim for better Railway compatibility
FROM node:20-slim

WORKDIR /home/node/app

# Copy production dependencies
COPY --from=builder /build/service/node_modules ./node_modules

# Copy shared module
COPY --from=builder /build/shared/dist ./node_modules/@flamoral/backend-shared/dist/
COPY --from=builder /build/shared/package.json ./node_modules/@flamoral/backend-shared/

# Copy built application
COPY --from=builder /build/service/dist ./dist

# Verify files exist in production stage
RUN ls -la /home/node/app/dist/ && test -f /home/node/app/dist/main.js && which node

# Set ownership to node user (built-in user in node images)
RUN chown -R node:node /home/node/app

USER node

# Environment
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Use exec form with absolute path
CMD ["/usr/local/bin/node", "/home/node/app/dist/main.js"]

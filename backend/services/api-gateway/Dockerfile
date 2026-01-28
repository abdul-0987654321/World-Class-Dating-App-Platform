# Build stage
FROM node:20-bookworm AS builder

WORKDIR /build

# Install build dependencies
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

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

RUN npm install --legacy-peer-deps && npm run build

# Now build the api-gateway service
WORKDIR /build/service
COPY backend/services/api-gateway/package*.json ./

RUN sed -i 's|"@flamoral/backend-shared": "file:../../shared",||' package.json && \
    npm install --legacy-peer-deps && \
    npm install --save-dev @types/multer --legacy-peer-deps

RUN cp -rn /build/shared/node_modules/* ./node_modules/ 2>/dev/null || true

RUN mkdir -p node_modules/@flamoral/backend-shared && \
    cp -r /build/shared/dist node_modules/@flamoral/backend-shared/ && \
    cp /build/shared/package.json node_modules/@flamoral/backend-shared/

COPY backend/services/api-gateway/src ./src
COPY backend/services/api-gateway/tsconfig*.json ./
COPY backend/services/api-gateway/nest-cli.json ./

RUN npm run build
RUN ls -la dist/ && test -f dist/main.js

# Production stage - Use full Debian for maximum compatibility
FROM node:20-bookworm-slim

# Create app directory
RUN mkdir -p /opt/app && chown -R node:node /opt/app
WORKDIR /opt/app

# Copy as node user
USER node

# Copy built files
COPY --chown=node:node --from=builder /build/service/node_modules ./node_modules
COPY --chown=node:node --from=builder /build/shared/dist ./node_modules/@flamoral/backend-shared/dist/
COPY --chown=node:node --from=builder /build/shared/package.json ./node_modules/@flamoral/backend-shared/
COPY --chown=node:node --from=builder /build/service/dist ./dist

# Verify everything is in place
RUN ls -la && ls -la dist/ && node --version

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Simple healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start the application
ENTRYPOINT ["node"]
CMD ["dist/main.js"]

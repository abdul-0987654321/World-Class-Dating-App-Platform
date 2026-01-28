# Build stage - Alpine is fine for compilation
FROM node:20-alpine AS builder

WORKDIR /build

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

# First, build the shared module
WORKDIR /build/shared
COPY --chown=node:node backend/shared/package*.json ./
COPY --chown=node:node backend/shared/tsconfig*.json ./
COPY --chown=node:node backend/shared/types ./types
COPY --chown=node:node backend/shared/utils ./utils
COPY --chown=node:node backend/shared/constants ./constants
COPY --chown=node:node backend/shared/config ./config
COPY --chown=node:node backend/shared/src ./src
COPY --chown=node:node backend/shared/errors ./errors
COPY --chown=node:node backend/shared/middleware ./middleware
COPY --chown=node:node backend/shared/cache ./cache
COPY --chown=node:node backend/shared/database ./database
COPY --chown=node:node backend/shared/index.ts ./

RUN npm install --legacy-peer-deps && npm run build

# Now build the api-gateway service
WORKDIR /build/service
COPY --chown=node:node backend/services/api-gateway/package*.json ./

RUN sed -i 's|"@flamoral/backend-shared": "file:../../shared",||' package.json && \
    npm install --legacy-peer-deps && \
    npm install --save-dev @types/multer --legacy-peer-deps

RUN cp -rn /build/shared/node_modules/* ./node_modules/ 2>/dev/null || true

RUN mkdir -p node_modules/@flamoral/backend-shared && \
    cp -r /build/shared/dist node_modules/@flamoral/backend-shared/ && \
    cp /build/shared/package.json node_modules/@flamoral/backend-shared/

COPY --chown=node:node backend/services/api-gateway/src ./src
COPY --chown=node:node backend/services/api-gateway/tsconfig*.json ./
COPY --chown=node:node backend/services/api-gateway/nest-cli.json ./

RUN npm run build
RUN ls -la dist/ && test -f dist/main.js

# Production stage - must match builder base (Alpine) for native module compatibility
FROM node:20-alpine

WORKDIR /home/node/app

# Copy built files with proper ownership
COPY --chown=node:node --from=builder /build/service/node_modules ./node_modules
COPY --chown=node:node --from=builder /build/shared/dist ./node_modules/@flamoral/backend-shared/dist/
COPY --chown=node:node --from=builder /build/shared/package.json ./node_modules/@flamoral/backend-shared/
COPY --chown=node:node --from=builder /build/service/dist ./dist

# Switch to non-root user
USER node

# Verify everything is in place
RUN ls -la && ls -la dist/ && node --version

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Start the application
CMD ["node", "dist/main.js"]

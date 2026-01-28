# Build stage - Standalone build without monorepo workspace
FROM node:20-alpine AS builder

WORKDIR /srv/app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# First, build the shared module
WORKDIR /srv/app/shared
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

# Now build the auth-service
WORKDIR /srv/app/service

# Copy package.json and modify to remove file: reference
COPY backend/services/auth-service/package*.json ./

# Remove the file: dependency and install dependencies
RUN sed -i 's|"@flamoral/backend-shared": "file:../../shared",||' package.json && \
    npm install --legacy-peer-deps

# Merge shared module's node_modules into service's node_modules
RUN cp -rn /srv/app/shared/node_modules/* ./node_modules/ 2>/dev/null || true

# Link the built shared module
RUN mkdir -p node_modules/@flamoral/backend-shared && \
    cp -r /srv/app/shared/dist node_modules/@flamoral/backend-shared/ && \
    cp /srv/app/shared/package.json node_modules/@flamoral/backend-shared/

# Copy source files
COPY backend/services/auth-service/src ./src
COPY backend/services/auth-service/tsconfig*.json ./

# Build the service
RUN npm run build

# Verify build output
RUN ls -la dist/ && test -f dist/index.js

# Production stage
FROM node:20-slim

WORKDIR /home/node/app

# Copy production dependencies (includes merged shared deps)
COPY --chown=node:node --from=builder /srv/app/service/node_modules ./node_modules

# Copy shared module
COPY --chown=node:node --from=builder /srv/app/shared/dist ./node_modules/@flamoral/backend-shared/dist/
COPY --chown=node:node --from=builder /srv/app/shared/package.json ./node_modules/@flamoral/backend-shared/

# Copy built application
COPY --chown=node:node --from=builder /srv/app/service/dist ./dist

USER node

# Environment
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

CMD ["node", "dist/index.js"]

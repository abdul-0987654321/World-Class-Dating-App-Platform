# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy all package files first
COPY package*.json ./
COPY backend/shared/package*.json ./backend/shared/
COPY backend/services/api-gateway/package*.json ./backend/services/api-gateway/

# Install root dependencies
RUN npm install --legacy-peer-deps || true

# Build shared module first
WORKDIR /app/backend/shared
COPY backend/shared ./
RUN npm install --legacy-peer-deps && npm run build

# Install service dependencies
WORKDIR /app/backend/services/api-gateway
RUN npm install --legacy-peer-deps

# Link shared module into service node_modules BEFORE building
RUN mkdir -p node_modules/@flamoral/backend-shared && \
    cp -r /app/backend/shared/dist node_modules/@flamoral/backend-shared/ && \
    cp /app/backend/shared/package.json node_modules/@flamoral/backend-shared/

# Copy service source
COPY backend/services/api-gateway/src ./src
COPY backend/services/api-gateway/tsconfig*.json ./
COPY backend/services/api-gateway/nest-cli.json ./

# Build service
RUN npm run build

# Verify dist was created
RUN ls -la dist/ && test -f dist/main.js

# Production stage
FROM node:20-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copy node_modules with shared module already linked
COPY --from=builder /app/backend/services/api-gateway/node_modules ./node_modules

# Copy shared module (ensure it's in node_modules)
COPY --from=builder /app/backend/shared/dist ./node_modules/@flamoral/backend-shared/dist/
COPY --from=builder /app/backend/shared/package.json ./node_modules/@flamoral/backend-shared/

# Copy built application
COPY --from=builder /app/backend/services/api-gateway/dist ./dist

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app

# Switch to nodejs user
USER nodejs

# Environment
ENV NODE_ENV=production
ENV PORT=4000

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/main.js"]

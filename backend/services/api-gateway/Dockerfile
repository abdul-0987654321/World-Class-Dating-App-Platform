# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files and tsconfig
COPY ../../package*.json ./
COPY ../../tsconfig.json ./

# Copy shared package
COPY ../shared ./backend/shared

# Copy service package files
COPY package*.json ./backend/services/api-gateway/
COPY tsconfig.json ./backend/services/api-gateway/

# Install dependencies for shared package
WORKDIR /app/backend/shared
RUN npm install && npm run build

# Install dependencies and build service
WORKDIR /app/backend/services/api-gateway
RUN npm install

# Copy service source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copy shared package dist
COPY --from=builder /app/backend/shared/dist ./node_modules/@connectsphere/shared/dist
COPY --from=builder /app/backend/shared/package.json ./node_modules/@connectsphere/shared/

# Copy service package files and install production dependencies
COPY package*.json ./
RUN npm install --production && npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/backend/services/api-gateway/dist ./dist

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app

# Switch to nodejs user
USER nodejs

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/index.js"]

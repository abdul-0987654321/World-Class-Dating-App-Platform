# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package files for workspace
COPY package*.json ./
COPY backend/shared/package*.json ./backend/shared/
COPY backend/services/api-gateway/package*.json ./backend/services/api-gateway/

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy shared source and build
COPY backend/shared ./backend/shared
RUN cd backend/shared && npm run build || echo "Shared build skipped"

# Copy service source
COPY backend/services/api-gateway ./backend/services/api-gateway

# Build service
WORKDIR /app/backend/services/api-gateway
RUN npm run build || (npm install typescript --save-dev && npx tsc)

# Production stage
FROM node:20-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copy package files
COPY backend/services/api-gateway/package*.json ./

# Install production dependencies only
RUN npm install --production --legacy-peer-deps && npm cache clean --force

# Copy built application
COPY --from=builder /app/backend/services/api-gateway/dist ./dist

# Copy shared dist if exists
COPY --from=builder /app/backend/shared/dist ./node_modules/@flamoral/shared/dist/
COPY --from=builder /app/backend/shared/package.json ./node_modules/@flamoral/shared/

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

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Install Python for ML components build
RUN apk add --no-cache python3 py3-pip build-base

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install Python for ML components runtime
RUN apk add --no-cache python3 py3-pip

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps --only=production && npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Copy ML models and Python files
COPY src/ml ./src/ml
COPY requirements.txt ./requirements.txt 2>/dev/null || true
RUN pip3 install --no-cache-dir -r requirements.txt 2>/dev/null || true

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app

# Switch to nodejs user
USER nodejs

# Environment variables
ENV NODE_ENV=production
ENV PORT=3003

# Expose port (updated from 3002 to 3003 to match messaging service port allocation)
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3003/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/index.js"]

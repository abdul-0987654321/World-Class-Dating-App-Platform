# Production stage - using pre-compiled dist folder
FROM node:20-alpine

WORKDIR /app

# Install Python for ML components
RUN apk add --no-cache python3 py3-pip

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --production && npm cache clean --force

# Copy pre-compiled application
COPY dist ./dist

# Copy ML models and Python files
COPY src/ml ./src/ml
RUN pip3 install --no-cache-dir -r requirements.txt || true

# Change ownership to nodejs user
RUN chown -R nodejs:nodejs /app

# Switch to nodejs user
USER nodejs

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3002/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start application
CMD ["node", "dist/index.js"]

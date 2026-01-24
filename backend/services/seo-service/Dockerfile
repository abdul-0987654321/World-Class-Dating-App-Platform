# Build stage - SEO Service
FROM public.ecr.aws/docker/library/node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy package.json
COPY backend/services/seo-service/package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source files
COPY backend/services/seo-service/src ./src
COPY backend/services/seo-service/tsconfig*.json ./

# Build the service
RUN npm run build

# Verify build output
RUN ls -la dist/ && test -f dist/index.js

# Production stage
FROM public.ecr.aws/docker/library/node:20-alpine

WORKDIR /app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Copy production dependencies
COPY --from=builder /app/node_modules ./node_modules

# Copy built application
COPY --from=builder /app/dist ./dist

# Set ownership
RUN chown -R nodejs:nodejs /app

USER nodejs

# Environment
ENV NODE_ENV=production
ENV PORT=3027

EXPOSE 3027

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3027/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/index.js"]

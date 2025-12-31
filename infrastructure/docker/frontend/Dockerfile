# Multi-stage Dockerfile for Frontend (Production)

# Stage 1: Build
FROM public.ecr.aws/docker/library/node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache python3 make g++

# Copy root package files for workspace resolution
COPY package.json yarn.lock ./
COPY apps/web-app/package.json ./apps/web-app/
COPY packages/ ./packages/

# Install dependencies with yarn workspaces
RUN yarn install --frozen-lockfile || yarn install

# Copy web app source
COPY apps/web-app ./apps/web-app

# Build the web app
RUN yarn workspace @flamoral/web build

# Stage 2: Production with Nginx
FROM public.ecr.aws/docker/library/nginx:alpine

# Copy custom nginx configuration
COPY infrastructure/docker/nginx/nginx.conf /etc/nginx/nginx.conf
COPY infrastructure/docker/nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy built application from builder
COPY --from=builder /app/apps/web-app/dist /usr/share/nginx/html

# Create non-root user
RUN adduser -D -g 'nginx' -u 1001 nginx && \
    chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chmod -R 755 /usr/share/nginx/html

# Use non-root user
USER nginx

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:8080/health || exit 1

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]

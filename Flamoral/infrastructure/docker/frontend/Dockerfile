# =============================================================================
# Frontend Dockerfile (React Application)
# Multi-stage build for production optimization
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Builder - Build React application
# -----------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git && rm -rf /var/cache/apk/*

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci && \
    npm cache clean --force

# Copy source code
COPY . .

# Build application for production
ARG VITE_API_URL
ARG VITE_WS_URL
ARG VITE_GRAPHQL_URL
ARG VITE_ENVIRONMENT=production

ENV VITE_API_URL=${VITE_API_URL} \
    VITE_WS_URL=${VITE_WS_URL} \
    VITE_GRAPHQL_URL=${VITE_GRAPHQL_URL} \
    VITE_ENVIRONMENT=${VITE_ENVIRONMENT}

RUN npm run build

# -----------------------------------------------------------------------------
# Stage 2: Production - Nginx server
# -----------------------------------------------------------------------------
FROM nginx:1.25-alpine

# Install curl for health checks
RUN apk add --no-cache curl && rm -rf /var/cache/apk/*

# Copy custom nginx configuration
COPY infrastructure/docker/frontend/nginx.conf /etc/nginx/nginx.conf
COPY infrastructure/docker/frontend/default.conf /etc/nginx/conf.d/default.conf

# Copy built application from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Create nginx user directories with proper permissions
RUN mkdir -p /var/cache/nginx/client_temp && \
    mkdir -p /var/cache/nginx/proxy_temp && \
    mkdir -p /var/cache/nginx/fastcgi_temp && \
    mkdir -p /var/cache/nginx/uwsgi_temp && \
    mkdir -p /var/cache/nginx/scgi_temp && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:8080/ || exit 1

# Start Nginx (runs as root but workers run as nginx user)
CMD ["nginx", "-g", "daemon off;"]

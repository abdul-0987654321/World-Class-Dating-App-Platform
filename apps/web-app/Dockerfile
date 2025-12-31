# Multi-stage Dockerfile for Flamoral Web App
FROM node:20-alpine AS builder

# Cache buster - increment to force full rebuild
ARG CACHE_BUST=v3

# CRITICAL: Vite requires environment variables at BUILD time, not runtime
# These are inlined into the JavaScript bundle during compilation
ARG VITE_API_URL=https://api.flamoral.com
ARG VITE_WS_URL=wss://api.flamoral.com
ARG VITE_APP_NAME=Flamoral
ARG VITE_APP_ENV=production

# Set environment variables for Vite build
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_WS_URL=${VITE_WS_URL}
ENV VITE_APP_NAME=${VITE_APP_NAME}
ENV VITE_APP_ENV=${VITE_APP_ENV}

WORKDIR /app

# Force cache bust at earliest layer
RUN echo "Build version: $CACHE_BUST - $(date)" > /tmp/build-version.txt

# Copy package files first (for better caching when deps don't change)
COPY package*.json ./

# Install dependencies
RUN npm cache clean --force && npm install --legacy-peer-deps

# Install vite globally
RUN npm install -g vite

# Copy source code (AFTER npm install to leverage caching)
COPY . .

# Remove any pre-existing dist folder to ensure fresh build
RUN rm -rf dist

# Build application with environment variables
RUN echo "Building with VITE_API_URL=${VITE_API_URL}" && vite build

# Verify build output
RUN ls -la dist/assets/ && cat dist/index.html | head -20

# Stage 2: Production with Nginx
FROM nginx:alpine@sha256:a45ee5d042aaa9e81e013f97ae40c3dda26fbe98f22b6251acdf28e579560d55

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy built application from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Create health endpoint
RUN echo "OK" > /usr/share/nginx/html/health

# Expose port
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]

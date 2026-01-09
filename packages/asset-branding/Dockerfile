# Flamoral Brand Assets - Static Asset Server
#
# This Dockerfile creates a lightweight container for serving
# Flamoral brand assets via HTTP/HTTPS.

# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json ./

# Install dependencies (if any build steps needed)
RUN npm install --production=false

# Copy source files
COPY . .

# Production stage - using nginx for static file serving
FROM nginx:1.25-alpine AS production

# Add labels for container identification
LABEL org.opencontainers.image.title="Flamoral Brand Assets"
LABEL org.opencontainers.image.description="Static asset server for Flamoral design system"
LABEL org.opencontainers.image.vendor="Flamoral"
LABEL org.opencontainers.image.version="1.0.0"

# Create non-root user for security
RUN addgroup -g 1001 -S flamoral && \
    adduser -u 1001 -S flamoral -G flamoral

# Create directory for assets
RUN mkdir -p /usr/share/nginx/html/assets && \
    chown -R flamoral:flamoral /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy brand assets
COPY --from=builder /app/tokens.json /usr/share/nginx/html/assets/
COPY --from=builder /app/theme.css /usr/share/nginx/html/assets/
COPY --from=builder /app/tailwind.preset.js /usr/share/nginx/html/assets/

# Set proper permissions
RUN chown -R flamoral:flamoral /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

# Run nginx
CMD ["nginx", "-g", "daemon off;"]

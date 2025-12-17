# =============================================================================
# Realtime Service Dockerfile (Go-based WebSocket Service)
# Multi-stage build for production optimization
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1: Builder - Build Go application
# -----------------------------------------------------------------------------
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    git \
    ca-certificates \
    tzdata \
    && rm -rf /var/cache/apk/*

# Copy go mod files
COPY backend/services/realtime-service/go.mod ./

# Download dependencies (skip go.sum verification if it doesn't exist)
RUN go mod download

# Copy source code
COPY backend/services/realtime-service/ .

# Build the binary with optimization flags
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s" \
    -o /app/realtime-service \
    ./cmd/server

# -----------------------------------------------------------------------------
# Stage 2: Production - Minimal runtime image
# -----------------------------------------------------------------------------
FROM alpine:3.19

# Install runtime dependencies
RUN apk add --no-cache \
    ca-certificates \
    tzdata \
    curl \
    && rm -rf /var/cache/apk/*

WORKDIR /app

# Create non-root user
RUN adduser -D -g '' -u 1000 appuser && \
    chown -R appuser:appuser /app

# Copy binary from builder
COPY --from=builder --chown=appuser:appuser /app/realtime-service .

# Switch to non-root user
USER appuser

# Environment variables
ENV PORT=4011 \
    GIN_MODE=release

# Expose port
EXPOSE 4011

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:4011/health || exit 1

# Run the service
ENTRYPOINT ["./realtime-service"]

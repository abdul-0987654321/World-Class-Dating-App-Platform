# Nginx Configuration Fixes - Flamoral Dating Platform

## Overview
This document describes the fixes applied to all nginx configurations in the Flamoral project to properly support:
- API Gateway proxying
- WebSocket connections (Socket.IO)
- All backend microservices
- Proper security headers
- SSL/TLS configuration
- Static asset caching
- CORS policies

## Files Fixed

### 1. apps/web-app/nginx.conf
**Location:** `C:\Users\citad\OneDrive\Documents\Dating\Flamoral\apps\web-app\nginx.conf`
**Fixed Version:** `C:\Users\citad\OneDrive\Documents\Dating\Flamoral\apps\web-app\nginx.conf.fixed`

**Changes Made:**
- Added WebSocket upgrade map for Socket.IO support
- Added `upstream api_gateway` definition pointing to `api-gateway:4000`
- Added `/socket.io/` location block with proper WebSocket headers
- Added `/api/` location block to proxy all API requests to API Gateway
- Configured proper timeouts (10s connect, 60s send/read)
- Added connection reuse with keepalive
- Maintained existing security headers and CORS configuration
- Maintained existing static asset caching rules

**Key Features:**
```nginx
# WebSocket support
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

# API Gateway upstream
upstream api_gateway {
    server api-gateway:4000;
    keepalive 32;
    keepalive_requests 100;
    keepalive_timeout 60s;
}

# WebSocket location (must come before /api/)
location /socket.io/ {
    proxy_pass http://api_gateway;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_read_timeout 86400s;  # 24 hours
    proxy_send_timeout 86400s;  # 24 hours
    # ... more headers
}

# API proxying
location /api/ {
    proxy_pass http://api_gateway;
    proxy_http_version 1.1;
    proxy_connect_timeout 10s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
    # ... proxy headers
}
```

### 2. infrastructure/docker/nginx/nginx.conf
**Location:** `C:\Users\citad\OneDrive\Documents\Dating\Flamoral\infrastructure\docker\nginx\nginx.conf`
**Fixed Version:** `C:\Users\citad\OneDrive\Documents\Dating\Flamoral\infrastructure\docker\nginx\nginx.conf.fixed`

**Changes Made:**
- Added complete upstream definitions for ALL backend services:
  - `api_gateway` (port 4000)
  - `user_service` (port 4001)
  - `matching_service` (port 4002)
  - `media_service` (port 4003)
  - `messaging_service` (port 4004)
  - `notification_service` (port 4005)
  - `frontend` (port 3000)
- Added WebSocket rate limiting zone (`zone=websocket`)
- Configured load balancing with `least_conn` algorithm
- Set health checks with `max_fails=3 fail_timeout=30s`
- Optimized keepalive connections for each upstream

**Key Features:**
```nginx
# All backend services defined
upstream api_gateway {
    least_conn;
    server api-gateway:4000 max_fails=3 fail_timeout=30s;
    keepalive 32;
    keepalive_requests 100;
    keepalive_timeout 60s;
}

upstream user_service {
    least_conn;
    server user-service:4001 max_fails=3 fail_timeout=30s;
    keepalive 16;
}

# ... all other services

# Rate limiting zones
limit_req_zone $binary_remote_addr zone=general:10m rate=20r/s;
limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;
limit_req_zone $binary_remote_addr zone=api:10m rate=100r/s;
limit_req_zone $binary_remote_addr zone=websocket:10m rate=10r/s;
```

### 3. infrastructure/docker/nginx/default.conf
**Location:** `C:\Users\citad\OneDrive\Documents\Dating\Flamoral\infrastructure\docker\nginx\default.conf`
**Fixed Version:** `C:\Users\citad\OneDrive\Documents\Dating\Flamoral\infrastructure\docker\nginx\default.conf.fixed`

**Changes Made:**
- Complete SSL/TLS configuration with modern ciphers (TLS 1.2 & 1.3)
- OCSP stapling for better SSL performance
- Enhanced security headers (CSP, HSTS with 2-year max-age, etc.)
- WebSocket location block with proper rate limiting
- Authentication endpoints with stricter rate limiting (5 req/min)
- API error handling with custom error pages
- Static file caching with proper CORS headers
- Media file handling with range requests for video seeking
- Comprehensive location blocks for all routes

**Key Features:**
```nginx
# Modern SSL configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:...';
ssl_stapling on;
ssl_stapling_verify on;

# WebSocket with rate limiting
location /socket.io/ {
    limit_req zone=websocket burst=10 nodelay;
    proxy_pass http://api_backend;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection $connection_upgrade;
    proxy_read_timeout 86400s;  # 24 hours
}

# Auth endpoints with strict limits
location ~ ^/api/(auth|login|register|password-reset|verify) {
    limit_req zone=auth burst=5 nodelay;
    proxy_pass http://api_backend;
}

# API endpoints
location /api/ {
    limit_req zone=api burst=50 nodelay;
    proxy_pass http://api_backend;
    error_page 502 503 504 = @api_error;
}
```

## Routing Matrix

| Path | Destination | Rate Limit | Timeout | Notes |
|------|------------|------------|---------|-------|
| `/health` | Direct | None | N/A | Health check endpoint |
| `/socket.io/*` | API Gateway | 10 req/s | 24 hours | WebSocket connections |
| `/api/(auth\|login\|register)` | API Gateway | 5 req/min | 30s | Authentication |
| `/api/*` | API Gateway | 100 req/s | 60s | General API |
| `/static/*` | Nginx | 200 req/s | N/A | Static files |
| `/robots.txt` | Nginx | None | N/A | SEO |
| `/sitemap.xml` | Nginx | None | N/A | SEO |
| `/*` | Frontend | 20 req/s | 30s | SPA application |

## Backend Service Ports

| Service | Port | Upstream Name | Purpose |
|---------|------|---------------|---------|
| API Gateway | 4000 | `api_gateway` | Main API entry point |
| User Service | 4001 | `user_service` | User management |
| Matching Service | 4002 | `matching_service` | Recommendations |
| Media Service | 4003 | `media_service` | Image/video processing |
| Messaging Service | 4004 | `messaging_service` | Real-time chat |
| Notification Service | 4005 | `notification_service` | Push notifications |
| Frontend | 3000 | `frontend` | Web application |

## How to Apply the Fixes

### Option 1: Manually rename files
```bash
# Backup originals
cp apps/web-app/nginx.conf apps/web-app/nginx.conf.backup
cp infrastructure/docker/nginx/nginx.conf infrastructure/docker/nginx/nginx.conf.backup
cp infrastructure/docker/nginx/default.conf infrastructure/docker/nginx/default.conf.backup

# Apply fixes
mv apps/web-app/nginx.conf.fixed apps/web-app/nginx.conf
mv infrastructure/docker/nginx/nginx.conf.fixed infrastructure/docker/nginx/nginx.conf
mv infrastructure/docker/nginx/default.conf.fixed infrastructure/docker/nginx/default.conf
```

### Option 2: Use the apply script
```bash
chmod +x apply-nginx-fixes.sh
./apply-nginx-fixes.sh
```

## SSL Certificate Setup

For production deployment, update the SSL certificate paths in `default.conf`:

```nginx
ssl_certificate /etc/nginx/ssl/cert.pem;
ssl_certificate_key /etc/nginx/ssl/key.pem;
ssl_trusted_certificate /etc/nginx/ssl/chain.pem;
```

You can use Let's Encrypt with certbot:
```bash
certbot certonly --webroot -w /var/www/certbot -d flamoral.com -d www.flamoral.com
```

## Testing the Configuration

### 1. Validate nginx syntax
```bash
nginx -t
```

### 2. Reload nginx
```bash
nginx -s reload
# or
systemctl reload nginx
```

### 3. Test WebSocket connection
```bash
wscat -c ws://localhost/socket.io/?EIO=4&transport=websocket
```

### 4. Test API proxying
```bash
curl -i http://localhost/api/health
```

### 5. Test rate limiting
```bash
# Should return 429 after limits exceeded
for i in {1..100}; do curl http://localhost/api/test; done
```

## Performance Optimizations

The configurations include several performance optimizations:

1. **Connection Reuse:** Keepalive connections to upstreams reduce connection overhead
2. **Gzip Compression:** Reduces bandwidth for text-based content
3. **Static Asset Caching:** Long-lived cache headers for immutable assets
4. **Rate Limiting:** Protects backend services from abuse
5. **Load Balancing:** `least_conn` algorithm distributes load efficiently
6. **Health Checks:** Automatic failover with `max_fails` and `fail_timeout`

## Security Features

1. **HSTS:** 2-year max-age with includeSubDomains and preload
2. **CSP:** Content Security Policy prevents XSS attacks
3. **X-Frame-Options:** Prevents clickjacking
4. **X-Content-Type-Options:** Prevents MIME sniffing
5. **SSL/TLS:** Modern protocols and cipher suites only
6. **Rate Limiting:** Multiple zones for different endpoints
7. **Hidden File Protection:** Denies access to .git, .env, etc.

## Troubleshooting

### WebSocket connections failing
- Check that `/socket.io/` location comes BEFORE `/api/` location
- Verify `proxy_set_header Upgrade` and `Connection` headers are set
- Check timeout values are long enough (24 hours for WebSocket)

### 502 Bad Gateway errors
- Verify backend services are running
- Check upstream server addresses and ports
- Review error logs: `tail -f /var/log/nginx/error.log`

### Rate limit 429 errors
- Adjust `burst` parameter in `limit_req` directives
- Increase rate in `limit_req_zone` definitions
- Check if legitimate traffic is being blocked

### SSL certificate errors
- Verify certificate paths exist
- Check certificate is not expired
- Ensure private key permissions are correct (600)

## Next Steps

1. Apply the fixed configurations
2. Test in development environment
3. Configure SSL certificates for production
4. Set up monitoring for nginx metrics
5. Configure log aggregation (ELK stack or similar)
6. Set up automated SSL renewal with certbot
7. Consider adding nginx caching layer for API responses

## References

- [Nginx Official Documentation](https://nginx.org/en/docs/)
- [Mozilla SSL Configuration Generator](https://ssl-config.mozilla.org/)
- [WebSocket Proxying with Nginx](https://nginx.org/en/docs/http/websocket.html)
- [Nginx Rate Limiting](https://www.nginx.com/blog/rate-limiting-nginx/)

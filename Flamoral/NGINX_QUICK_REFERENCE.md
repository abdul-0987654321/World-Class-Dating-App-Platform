# Nginx Quick Reference - Flamoral Dating Platform

## Configuration Files

| File | Purpose | Key Features |
|------|---------|--------------|
| `apps/web-app/nginx.conf` | Frontend nginx config | API proxy, WebSocket, SPA routing |
| `infrastructure/docker/nginx/nginx.conf` | Main nginx config | Upstreams, rate limiting, global settings |
| `infrastructure/docker/nginx/default.conf` | Server configuration | SSL, routing, security headers |

## Service Upstreams

```nginx
api-gateway:4000       # Main API entry point (WebSocket + REST)
user-service:4001      # User management & profiles
matching-service:4002  # Recommendation engine
media-service:4003     # Image/video processing
messaging-service:4004 # Real-time chat
notification-service:4005 # Push notifications
frontend:3000          # React web app
```

## Routing Rules

```
/health              → Direct response (200 OK)
/socket.io/*         → api-gateway:4000 (WebSocket, 24hr timeout)
/api/auth/*          → api-gateway:4000 (5 req/min rate limit)
/api/login           → api-gateway:4000 (5 req/min rate limit)
/api/register        → api-gateway:4000 (5 req/min rate limit)
/api/*               → api-gateway:4000 (100 req/s rate limit)
/static/*            → Nginx (1 year cache)
/assets/*            → Nginx (1 year cache)
/*.js, /*.css        → Nginx (1 year cache)
/*.jpg, /*.png, etc  → Nginx (30 day cache)
/robots.txt          → Nginx (1 hour cache)
/sitemap.xml         → Nginx (1 hour cache)
/*                   → frontend:3000 (SPA routing)
```

## Rate Limits

| Zone | Rate | Burst | Applies To |
|------|------|-------|-----------|
| `auth` | 5/min | 5 | /api/auth, /api/login, /api/register |
| `api` | 100/s | 50 | /api/* (general) |
| `websocket` | 10/s | 10 | /socket.io/* |
| `general` | 20/s | 30 | /* (frontend) |

## Timeouts

| Type | WebSocket | API | Frontend |
|------|-----------|-----|----------|
| Connect | 60s | 10s | 10s |
| Send | 24h | 60s | 30s |
| Read | 24h | 60s | 30s |

## Security Headers

```nginx
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Content-Security-Policy: default-src 'self'; ...
Permissions-Policy: geolocation=(self), microphone=(), camera=(self), ...
```

## Cache Headers

| Content Type | Cache Duration | Headers |
|--------------|----------------|---------|
| Static assets (/assets/*, .js, .css) | 1 year | `public, immutable` |
| Images (.jpg, .png, .webp) | 30 days | `public, max-age=2592000, immutable` |
| Fonts (.woff, .woff2, .ttf) | 1 year | `public, max-age=31536000, immutable` |
| Videos (.mp4, .webm) | 30 days | `public, max-age=2592000` |
| HTML/index.html | No cache | `no-cache, no-store, must-revalidate` |
| robots.txt, sitemap.xml | 1 hour | `public, max-age=3600, must-revalidate` |

## Common Commands

### Validate Configuration
```bash
nginx -t
```

### Reload Configuration (graceful)
```bash
nginx -s reload
systemctl reload nginx
docker-compose exec nginx nginx -s reload
```

### Restart Nginx
```bash
systemctl restart nginx
docker-compose restart nginx
```

### View Logs
```bash
# Access logs
tail -f /var/log/nginx/access.log
docker-compose logs -f nginx

# Error logs
tail -f /var/log/nginx/error.log
docker-compose logs -f nginx | grep error
```

### Test Endpoints
```bash
# Health check
curl http://localhost/health

# API health check
curl http://localhost/api/health

# WebSocket test (requires wscat)
wscat -c ws://localhost/socket.io/?EIO=4&transport=websocket

# Check headers
curl -I http://localhost/

# Test rate limiting
for i in {1..10}; do curl http://localhost/api/test; done
```

## SSL/TLS Configuration

### Certificate Paths (Production)
```nginx
ssl_certificate /etc/nginx/ssl/cert.pem;
ssl_certificate_key /etc/nginx/ssl/key.pem;
ssl_trusted_certificate /etc/nginx/ssl/chain.pem;
```

### Let's Encrypt Setup
```bash
# Install certbot
apt-get install certbot python3-certbot-nginx

# Get certificate
certbot certonly --webroot -w /var/www/certbot \
    -d flamoral.com -d www.flamoral.com

# Auto-renewal
certbot renew --dry-run
```

### SSL Test
```bash
# Test SSL configuration
openssl s_client -connect flamoral.com:443 -servername flamoral.com

# Check certificate expiry
echo | openssl s_client -servername flamoral.com -connect flamoral.com:443 2>/dev/null | openssl x509 -noout -dates
```

## WebSocket Configuration

### Critical Settings
```nginx
# MUST be in http block
map $http_upgrade $connection_upgrade {
    default upgrade;
    ''      close;
}

# MUST be in location block
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection $connection_upgrade;
proxy_buffering off;
proxy_read_timeout 86400s;  # 24 hours
proxy_send_timeout 86400s;  # 24 hours
```

### WebSocket Order
```nginx
# CRITICAL: /socket.io/ MUST come BEFORE /api/
location /socket.io/ { ... }  # Specific WebSocket path
location /api/ { ... }         # General API path
```

## Troubleshooting

### 502 Bad Gateway
```bash
# Check if backend services are running
docker-compose ps
systemctl status api-gateway

# Check nginx error logs
tail -f /var/log/nginx/error.log

# Verify upstream connectivity
docker-compose exec nginx curl http://api-gateway:4000/health
```

### WebSocket Connection Failed
```bash
# Verify upgrade headers in logs
tail -f /var/log/nginx/access.log | grep Upgrade

# Check location block order (socket.io before api)
nginx -T | grep -A 10 "location /socket.io"

# Test WebSocket directly to backend
wscat -c ws://api-gateway:4000/socket.io/?EIO=4&transport=websocket
```

### 429 Too Many Requests
```bash
# Check rate limit zones
nginx -T | grep limit_req_zone

# Adjust burst in location
# limit_req zone=api burst=50 nodelay;

# Or increase rate
# limit_req_zone $binary_remote_addr zone=api:10m rate=200r/s;
```

### CORS Errors
```bash
# Check CORS headers in response
curl -H "Origin: http://localhost:3000" -I http://localhost/api/health

# Verify allowed origins in config
nginx -T | grep cors_origin
```

## Performance Tuning

### Worker Connections
```nginx
events {
    worker_connections 4096;  # Increase for high traffic
    use epoll;                # Linux optimization
    multi_accept on;          # Accept multiple connections
}
```

### Keepalive Optimization
```nginx
upstream api_gateway {
    server api-gateway:4000;
    keepalive 32;             # Connection pool size
    keepalive_requests 100;   # Requests per connection
    keepalive_timeout 60s;    # Connection idle timeout
}
```

### Buffer Optimization
```nginx
client_body_buffer_size 128k;      # Request body buffer
client_max_body_size 50m;          # Max upload size
proxy_buffer_size 4k;              # Proxy buffer
proxy_buffers 8 4k;                # Number of buffers
```

## Monitoring

### Key Metrics to Monitor
- Request rate (requests/second)
- Response time (upstream_response_time)
- Error rate (5xx responses)
- Connection count (active connections)
- Rate limit hits (429 responses)
- WebSocket connections (active)

### Log Analysis
```bash
# Top 10 request paths
awk '{print $7}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head -10

# Response time analysis
awk '{print $NF}' /var/log/nginx/access.log | sort -n | tail -100

# Error rate
grep " 5[0-9][0-9] " /var/log/nginx/access.log | wc -l

# Rate limit hits
grep " 429 " /var/log/nginx/access.log | wc -l
```

## Best Practices

1. Always validate configuration before reloading: `nginx -t`
2. Use graceful reload instead of restart: `nginx -s reload`
3. Monitor error logs after changes: `tail -f /var/log/nginx/error.log`
4. Test in development before deploying to production
5. Keep backup copies of working configurations
6. Document any custom changes made
7. Review security headers regularly
8. Update SSL certificates before expiry
9. Monitor rate limit effectiveness
10. Use health checks to verify backend availability

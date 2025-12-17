# Kubernetes Ingress Configuration Fixes for flamoral.com

## Summary

All Kubernetes Ingress configurations for flamoral.com have been comprehensively fixed. This document outlines all changes made and the locations of the fixed files.

## Date Fixed
December 15, 2025

## Critical Issues Fixed

### 1. Service Name Mismatches
**Problem:** Ingress rules referenced incorrect service names
- ❌ Old: `web`, `web-app`
- ✅ Fixed: `flamoral-web`

### 2. API Gateway Port Issues
**Problem:** Ingress rules used incorrect port for API Gateway
- ❌ Old: port 80
- ✅ Fixed: port 4000 (actual API Gateway service port)

### 3. Missing api.flamoral.com Support
**Problem:** Many ingress files didn't include api.flamoral.com subdomain
- ✅ Fixed: All ingress files now include api.flamoral.com routing

### 4. Incomplete CORS Configuration
**Problem:** Missing or incomplete CORS headers
- ✅ Fixed: Comprehensive CORS configuration with:
  - Proper allow-methods
  - Credentials support
  - Expose headers
  - Max-age caching
  - Complete allow-headers list

### 5. Missing Health Check Paths
**Problem:** Health check annotations and routes were missing or incomplete
- ✅ Fixed: Added `/health` endpoints with proper routing

### 6. WebSocket Configuration
**Problem:** Incomplete WebSocket support
- ✅ Fixed: Proper WebSocket ingress with:
  - Sticky sessions (cookie affinity)
  - Extended timeouts (3600s)
  - Connection upgrade headers
  - Support for ws.flamoral.com subdomain

### 7. TLS/SSL Configuration Issues
**Problem:** Incomplete SSL configuration and missing certificates
- ✅ Fixed: Complete TLS configuration with:
  - TLS 1.2 and 1.3 support
  - Strong cipher suites
  - Separate certificates for subdomains
  - Cert-manager ClusterIssuer consistency

### 8. Missing Security Headers
**Problem:** Incomplete or missing security headers
- ✅ Fixed: Comprehensive security headers:
  - HSTS (Strict-Transport-Security)
  - X-Frame-Options
  - X-Content-Type-Options
  - X-XSS-Protection
  - Referrer-Policy
  - Content-Security-Policy
  - Server header removal

## Fixed Files

### Main Production Ingress
- **Location:** `Flamoral/infrastructure/kubernetes/production/ingress-FIXED.yaml`
- **Description:** Comprehensive production ingress with all services
- **Includes:**
  - Main ingress for flamoral.com, www.flamoral.com, api.flamoral.com
  - WebSocket ingress for ws.flamoral.com
  - Media ingress for media.flamoral.com with caching
  - Admin ingress for admin.flamoral.com with stricter security

### Base Ingress (Updated in Place)
- **Location:** `Flamoral/infrastructure/kubernetes/base/ingress.yaml`
- **Changes:**
  - Fixed service names (web → flamoral-web)
  - Fixed API Gateway port (80 → 4000)
  - Added comprehensive CORS headers
  - Added health check configuration
  - Added connection settings
  - Fixed WebSocket support

### Deploy Ingress (Updated in Place)
- **Location:** `Flamoral/infrastructure/kubernetes/deploy/ingress.yaml`
- **Changes:**
  - Fixed API Gateway port to 4000
  - Added comprehensive annotations
  - Added CORS configuration
  - Added security headers
  - Added WebSocket and API routing on main domain

### K8s Production Ingress
- **Location:** `Flamoral/infrastructure/k8s/production-ingress-FIXED.yaml`
- **Changes:**
  - Fixed service names
  - Fixed API Gateway port
  - Added routing for /api and /ws on main domain
  - Added comprehensive annotations

### Root TLS Ingress
- **Location:** `Dating/flamoral-ingress-tls-FIXED.yaml`
- **Changes:**
  - Added api.flamoral.com support
  - Fixed service names and ports
  - Added comprehensive CORS and security

### Ingress NGINX Configuration
- **Location:** `Flamoral/infrastructure/kubernetes/ingress/ingress-nginx-FIXED.yaml`
- **Changes:**
  - Fixed namespace (dating-app → flamoral)
  - Fixed service names and ports
  - Separated WebSocket and media ingresses
  - Added comprehensive configuration

## Certificate Fixes

### Let's Encrypt Issuer
- **Location:** `Flamoral/infrastructure/kubernetes/deploy/letsencrypt-issuer-FIXED.yaml`
- **Changes:**
  - Consistent issuer name: `letsencrypt-prod`
  - Added staging issuer for testing
  - Added both `class` and `ingressClassName` for compatibility

### Certificate Definitions
- **Location:** `Flamoral/infrastructure/kubernetes/production/flamoral-certificate-FIXED.yaml`
- **Includes:**
  - Main certificate for flamoral.com, www.flamoral.com, api.flamoral.com
  - Separate certificate for ws.flamoral.com
  - Separate certificate for media.flamoral.com
  - Separate certificate for admin.flamoral.com

## Service Port Reference

### Confirmed Service Ports
Based on `Flamoral/infrastructure/kubernetes/production/services/all-services.yaml`:

| Service | Port | Purpose |
|---------|------|---------|
| flamoral-web | 80 | Frontend web application |
| api-gateway | 4000 | API Gateway |
| auth-service | 3001 | Authentication |
| user-service | 3002 | User management |
| messaging-service | 3004 | Chat/messaging |
| payment-service | 3005 | Payments |
| media-service | 3006 | Media uploads/storage |
| analytics-service | 3007 | Analytics |
| moderation-service | 3008 | Content moderation |
| matching-service | 3009 | User matching |
| admin-service | 3010 | Admin dashboard |
| advertising-service | 3011 | Advertisements |
| notification-service | 3012 | Notifications |
| workflow-engine | 3013 | Workflow automation |
| realtime-service | 8081 | WebSocket/real-time |

## Routing Structure

### flamoral.com
- `/api` → api-gateway:4000
- `/ws` → realtime-service:8081
- `/health` → api-gateway:4000
- `/` → flamoral-web:80 (catch-all)

### www.flamoral.com
- `/` → flamoral-web:80

### api.flamoral.com
- `/api/v1/auth` → auth-service:3001
- `/api/v1/users` → user-service:3002
- `/api/v1/matches` → matching-service:3009
- `/api/v1/swipes` → matching-service:3009
- `/api/v1/messages` → messaging-service:3004
- `/api/v1/conversations` → messaging-service:3004
- `/api/v1/payments` → payment-service:3005
- `/api/v1/subscriptions` → payment-service:3005
- `/api/v1/media` → media-service:3006
- `/api/v1/upload` → media-service:3006
- `/api/v1/analytics` → analytics-service:3007
- `/api/v1/moderation` → moderation-service:3008
- `/api/v1/reports` → moderation-service:3008
- `/api/v1/admin` → admin-service:3010
- `/api/v1/ads` → advertising-service:3011
- `/api/v1/notifications` → notification-service:3012
- `/api/v1/workflows` → workflow-engine:3013
- `/health` → api-gateway:4000
- `/` → api-gateway:4000 (catch-all)

### ws.flamoral.com
- `/socket.io` → realtime-service:8081
- `/ws` → realtime-service:8081
- `/` → realtime-service:8081

### media.flamoral.com
- `/` → media-service:3006
- Caching enabled (1 year)
- CORS allow-origin: "*"

### admin.flamoral.com
- `/` → admin-service:3010
- Stricter rate limiting (5 RPS, 10 connections)
- IP whitelist capability (commented out)

## CORS Configuration

All ingresses now include comprehensive CORS support:

```yaml
nginx.ingress.kubernetes.io/enable-cors: "true"
nginx.ingress.kubernetes.io/cors-allow-methods: "GET, POST, PUT, DELETE, PATCH, OPTIONS"
nginx.ingress.kubernetes.io/cors-allow-origin: "https://flamoral.com,https://www.flamoral.com"
nginx.ingress.kubernetes.io/cors-allow-credentials: "true"
nginx.ingress.kubernetes.io/cors-allow-headers: "DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Authorization,X-Request-ID,X-Correlation-ID,Accept,Accept-Encoding,Accept-Language,Origin"
nginx.ingress.kubernetes.io/cors-max-age: "86400"
nginx.ingress.kubernetes.io/cors-expose-headers: "Content-Length,Content-Range,X-Request-ID,X-Correlation-ID"
```

## Rate Limiting

Standard configuration across all ingresses:
- Rate limit: 100 requests per window
- RPS limit: 20 requests per second
- Max connections: 50
- Burst multiplier: 5x
- Whitelist for internal networks: 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16

Admin ingress has stricter limits:
- RPS limit: 5 requests per second
- Max connections: 10

## SSL/TLS Configuration

All ingresses enforce strong SSL/TLS:
- Protocols: TLSv1.2, TLSv1.3
- Cipher suites: ECDHE-RSA-AES128-GCM-SHA256, ECDHE-RSA-AES256-GCM-SHA384, ECDHE-ECDSA-AES128-GCM-SHA256, ECDHE-ECDSA-AES256-GCM-SHA384
- Force SSL redirect enabled
- HSTS enabled (max-age=31536000, includeSubDomains, preload)

## Health Checks

All ingresses configured with:
- Health check path: `/health`
- Check interval: 30 seconds
- Routes to appropriate services

## WebSocket Configuration

Dedicated WebSocket ingress includes:
- Extended timeouts: 3600 seconds (1 hour)
- Connection upgrade headers
- Sticky sessions with cookie affinity
- Session cookie: `flamoral-ws-route`
- Cookie max-age: 3600 seconds
- Support for /socket.io, /ws, and root paths

## Deployment Instructions

### Option 1: Replace Existing Files
To use the fixed configurations, replace the original files with the -FIXED versions:

```bash
# Production ingress (comprehensive)
kubectl apply -f Flamoral/infrastructure/kubernetes/production/ingress-FIXED.yaml

# OR use the simpler k8s version
kubectl apply -f Flamoral/infrastructure/k8s/production-ingress-FIXED.yaml

# Apply certificates
kubectl apply -f Flamoral/infrastructure/kubernetes/production/flamoral-certificate-FIXED.yaml

# Apply Let's Encrypt issuer
kubectl apply -f Flamoral/infrastructure/kubernetes/deploy/letsencrypt-issuer-FIXED.yaml
```

### Option 2: Use Updated In-Place Files
The following files were updated in place and can be applied directly:

```bash
# Base ingress (already fixed)
kubectl apply -f Flamoral/infrastructure/kubernetes/base/ingress.yaml

# Deploy ingress (already fixed)
kubectl apply -f Flamoral/infrastructure/kubernetes/deploy/ingress.yaml
```

### Verification

After applying, verify the ingress configurations:

```bash
# Check ingress resources
kubectl get ingress -n flamoral

# Check ingress details
kubectl describe ingress flamoral-main-ingress -n flamoral

# Check certificates
kubectl get certificate -n flamoral

# Check certificate status
kubectl describe certificate flamoral-tls -n flamoral

# Test endpoints
curl -I https://flamoral.com
curl -I https://www.flamoral.com
curl -I https://api.flamoral.com/health
curl -I https://ws.flamoral.com
```

## Namespace

All ingress resources are configured for the `flamoral` namespace. Ensure:
1. The namespace exists: `kubectl create namespace flamoral`
2. All services are deployed in the `flamoral` namespace
3. Cert-manager is installed and the ClusterIssuer is created

## Next Steps

1. **Review IP Whitelisting:** Update admin ingress with actual admin IP addresses
2. **Monitor Certificates:** Ensure cert-manager successfully issues certificates
3. **Test Endpoints:** Verify all routes work correctly
4. **Update DNS:** Ensure all subdomains point to the ingress controller
5. **Monitor Logs:** Check nginx ingress controller logs for any issues

## Troubleshooting

### Certificate Issues
```bash
# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager

# Check certificate challenges
kubectl get challenges -n flamoral

# Describe certificate for details
kubectl describe certificate flamoral-tls -n flamoral
```

### Ingress Issues
```bash
# Check ingress controller logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller

# Check ingress events
kubectl get events -n flamoral --sort-by='.lastTimestamp'

# Test specific route
kubectl run test-pod --rm -it --image=curlimages/curl -- curl -I http://api-gateway.flamoral.svc.cluster.local:4000/health
```

### CORS Issues
- Verify the origin matches exactly (protocol + domain)
- Check browser developer console for CORS errors
- Ensure preflight OPTIONS requests are allowed

### WebSocket Issues
- Verify sticky sessions are working
- Check timeout settings
- Ensure upgrade headers are present
- Test with a WebSocket client tool

## Files Modified/Created

### Modified In-Place
1. ✅ `Flamoral/infrastructure/kubernetes/base/ingress.yaml`
2. ✅ `Flamoral/infrastructure/kubernetes/deploy/ingress.yaml`

### New Fixed Versions Created
1. ✅ `Flamoral/infrastructure/kubernetes/production/ingress-FIXED.yaml` (COMPREHENSIVE - USE THIS)
2. ✅ `Flamoral/infrastructure/k8s/production-ingress-FIXED.yaml`
3. ✅ `Dating/flamoral-ingress-tls-FIXED.yaml`
4. ✅ `Flamoral/infrastructure/kubernetes/ingress/ingress-nginx-FIXED.yaml`
5. ✅ `Flamoral/infrastructure/kubernetes/deploy/letsencrypt-issuer-FIXED.yaml`
6. ✅ `Flamoral/infrastructure/kubernetes/production/flamoral-certificate-FIXED.yaml`

## Recommended Primary Configuration

**Use this file as your main ingress:**
`Flamoral/infrastructure/kubernetes/production/ingress-FIXED.yaml`

This file includes:
- Main ingress for all primary routes
- Separate WebSocket ingress with optimized settings
- Media ingress with caching
- Admin ingress with enhanced security
- All fixes and best practices

## Configuration Highlights

### All Ingress Files Include:
✅ Correct service names (flamoral-web)
✅ Correct API Gateway port (4000)
✅ Complete domain support (flamoral.com, www, api, ws, media, admin)
✅ Comprehensive CORS configuration
✅ Security headers (HSTS, CSP, X-Frame-Options, etc.)
✅ Rate limiting
✅ Health check paths
✅ WebSocket support with sticky sessions
✅ TLS/SSL with strong ciphers
✅ Connection optimization (keepalive)
✅ Proper path routing priority
✅ Cert-manager integration

## Contact

For issues or questions regarding these ingress configurations, refer to the Kubernetes documentation or contact the DevOps team.

---

**Document Version:** 1.0
**Last Updated:** December 15, 2025
**Status:** All Critical Issues Fixed ✅

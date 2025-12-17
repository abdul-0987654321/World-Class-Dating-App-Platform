# Quick Deployment Guide - Fixed Ingress Configurations

## TL;DR - Deploy Fixed Ingresses Now

### 1. Deploy Let's Encrypt Issuer (Do This First!)
```bash
kubectl apply -f Flamoral/infrastructure/kubernetes/deploy/letsencrypt-issuer-FIXED.yaml
```

### 2. Deploy Certificates
```bash
kubectl apply -f Flamoral/infrastructure/kubernetes/production/flamoral-certificate-FIXED.yaml
```

### 3. Deploy Main Ingress (RECOMMENDED)
```bash
kubectl apply -f Flamoral/infrastructure/kubernetes/production/ingress-FIXED.yaml
```

**This file includes:**
- ✅ Main ingress for flamoral.com, www.flamoral.com, api.flamoral.com
- ✅ WebSocket ingress for ws.flamoral.com
- ✅ Media ingress for media.flamoral.com
- ✅ Admin ingress for admin.flamoral.com
- ✅ All services with correct ports
- ✅ Complete CORS, security headers, rate limiting

### 4. Verify Deployment
```bash
# Check ingresses
kubectl get ingress -n flamoral

# Check certificates
kubectl get certificate -n flamoral

# Wait for certificates to be issued (may take 1-2 minutes)
kubectl describe certificate flamoral-tls -n flamoral

# Test endpoints
curl -I https://flamoral.com
curl -I https://api.flamoral.com/health
```

## What Was Fixed?

### Critical Fixes Applied:
1. ✅ **Service Names:** `web` → `flamoral-web`
2. ✅ **API Gateway Port:** `80` → `4000`
3. ✅ **Added api.flamoral.com** routing
4. ✅ **Complete CORS** configuration
5. ✅ **Security Headers** (HSTS, CSP, X-Frame-Options, etc.)
6. ✅ **WebSocket Support** with sticky sessions
7. ✅ **Health Checks** on /health endpoints
8. ✅ **TLS/SSL** with strong ciphers (TLS 1.2, 1.3)
9. ✅ **Rate Limiting** (20 RPS, 50 connections)
10. ✅ **Cert-Manager** integration

## Files Summary

### ✅ FIXED and Ready to Deploy
| File | Purpose | Status |
|------|---------|--------|
| `production/ingress-FIXED.yaml` | **Main production ingress** | ✅ USE THIS |
| `production/flamoral-certificate-FIXED.yaml` | TLS certificates | ✅ Ready |
| `deploy/letsencrypt-issuer-FIXED.yaml` | Cert-manager issuer | ✅ Ready |
| `k8s/production-ingress-FIXED.yaml` | Simpler alternative | ✅ Ready |
| `ingress/ingress-nginx-FIXED.yaml` | Full NGINX config | ✅ Ready |
| `Dating/flamoral-ingress-tls-FIXED.yaml` | Root directory config | ✅ Ready |

### ✅ Already Fixed In-Place
| File | Changes | Status |
|------|---------|--------|
| `base/ingress.yaml` | Service names, ports, CORS | ✅ Updated |
| `deploy/ingress.yaml` | API port, annotations | ✅ Updated |

## Service Port Reference

**Critical Ports to Remember:**
- `flamoral-web`: **80**
- `api-gateway`: **4000** ⚠️ (was incorrectly 80)
- `realtime-service`: **8081**
- All microservices: 3001-3013

## Routing Quick Reference

### flamoral.com
```
/api → api-gateway:4000
/ws → realtime-service:8081
/ → flamoral-web:80
```

### api.flamoral.com
```
/api/v1/auth → auth-service:3001
/api/v1/users → user-service:3002
/api/v1/matches → matching-service:3009
/api/v1/messages → messaging-service:3004
/api/v1/payments → payment-service:3005
/api/v1/media → media-service:3006
/ → api-gateway:4000
```

### ws.flamoral.com
```
/socket.io → realtime-service:8081
/ws → realtime-service:8081
/ → realtime-service:8081
```

## Troubleshooting

### Certificate Not Issuing?
```bash
# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager -f

# Check challenges
kubectl get challenges -n flamoral

# Check certificate details
kubectl describe certificate flamoral-tls -n flamoral
```

### 404 Errors?
- Check service names match: `kubectl get svc -n flamoral`
- Verify service ports: `kubectl get svc api-gateway -n flamoral -o yaml | grep port:`
- Check ingress rules: `kubectl get ingress flamoral-main-ingress -n flamoral -o yaml`

### CORS Errors?
- Origin must match exactly: `https://flamoral.com` (no trailing slash)
- Check browser console for specific error
- Verify annotation: `kubectl get ingress -n flamoral -o yaml | grep cors`

### API Gateway 503?
- API Gateway port **must be 4000**, not 80
- Verify: `kubectl get svc api-gateway -n flamoral`
- Port should show: `4000/TCP`

## Pre-Deployment Checklist

Before deploying, ensure:

- [ ] Cert-manager is installed: `kubectl get pods -n cert-manager`
- [ ] NGINX Ingress Controller is installed: `kubectl get pods -n ingress-nginx`
- [ ] Namespace exists: `kubectl get namespace flamoral`
- [ ] Services are deployed: `kubectl get svc -n flamoral`
- [ ] DNS records point to ingress controller external IP
- [ ] All service names match those in ingress (especially `flamoral-web`)
- [ ] API Gateway service listens on port 4000

## DNS Configuration Required

Ensure these DNS A records point to your ingress controller IP:

```
flamoral.com → [INGRESS_IP]
www.flamoral.com → [INGRESS_IP]
api.flamoral.com → [INGRESS_IP]
ws.flamoral.com → [INGRESS_IP]
media.flamoral.com → [INGRESS_IP]
admin.flamoral.com → [INGRESS_IP]
```

Get ingress IP:
```bash
kubectl get svc -n ingress-nginx ingress-nginx-controller
```

## Complete Deployment Script

```bash
#!/bin/bash
set -e

echo "🚀 Deploying Fixed Flamoral Ingress Configurations"

# 1. Deploy cert-manager issuer
echo "📜 Deploying Let's Encrypt ClusterIssuer..."
kubectl apply -f Flamoral/infrastructure/kubernetes/deploy/letsencrypt-issuer-FIXED.yaml

# 2. Deploy certificates
echo "🔐 Deploying TLS Certificates..."
kubectl apply -f Flamoral/infrastructure/kubernetes/production/flamoral-certificate-FIXED.yaml

# 3. Deploy main ingress
echo "🌐 Deploying Main Ingress Configuration..."
kubectl apply -f Flamoral/infrastructure/kubernetes/production/ingress-FIXED.yaml

# 4. Wait for certificates
echo "⏳ Waiting for certificates to be issued (this may take 1-2 minutes)..."
kubectl wait --for=condition=Ready certificate/flamoral-tls -n flamoral --timeout=300s

# 5. Verify
echo "✅ Verifying deployment..."
kubectl get ingress -n flamoral
kubectl get certificate -n flamoral

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Test your endpoints:"
echo "  curl -I https://flamoral.com"
echo "  curl -I https://api.flamoral.com/health"
echo "  curl -I https://www.flamoral.com"
```

Save as `deploy-ingress.sh`, make executable, and run:
```bash
chmod +x deploy-ingress.sh
./deploy-ingress.sh
```

## Need Help?

See the comprehensive guide: `INGRESS_FIXES_SUMMARY.md`

---
**Status:** All fixes applied ✅
**Ready to deploy:** YES ✅
**Date:** December 15, 2025

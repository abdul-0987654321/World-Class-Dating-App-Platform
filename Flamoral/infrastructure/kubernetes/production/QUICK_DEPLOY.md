# Flamoral Services - Quick Deploy Guide

## One-Command Deployment

```bash
cd infrastructure/kubernetes/production
./deploy-services.sh deploy
```

## Service Ports Reference

| Service | Port | Endpoint |
|---------|------|----------|
| api-gateway | 4000 | http://api-gateway:4000 |
| auth-service | 3001 | http://auth-service:3001 |
| user-service | 3002 | http://user-service:3002 |
| matching-service | 3009 | http://matching-service:3009 |
| messaging-service | 3004 | http://messaging-service:3004 |
| payment-service | 3005 | http://payment-service:3005 |
| media-service | 3006 | http://media-service:3006 |
| analytics-service | 3007 | http://analytics-service:3007 |
| moderation-service | 3008 | http://moderation-service:3008 |
| admin-service | 3010 | http://admin-service:3010 |
| advertising-service | 3011 | http://advertising-service:3011 |
| notification-service | 3012 | http://notification-service:3012 |
| workflow-engine | 3013 | http://workflow-engine:3013 |
| realtime-service | 8081 | http://realtime-service:8081 |

## Common Commands

```bash
# Deploy all services
./deploy-services.sh deploy

# Check status
kubectl get pods -n flamoral
kubectl get deployments -n flamoral
kubectl get services -n flamoral

# View logs
kubectl logs -n flamoral deployment/<service-name> -f

# Restart a service
kubectl rollout restart deployment/<service-name> -n flamoral

# Scale a service
kubectl scale deployment/<service-name> --replicas=3 -n flamoral

# Port forward for testing
kubectl port-forward -n flamoral service/<service-name> 8080:<port>

# Delete a service
kubectl delete deployment <service-name> -n flamoral
```

## Health Checks

All services expose `/health` endpoint:

```bash
# Check from within cluster
kubectl run -it --rm debug --image=busybox --restart=Never -n flamoral -- sh
wget -O- http://auth-service:3001/health
```

## Ingress URLs

- **API**: https://api.flamoral.com
- **WebSocket**: wss://ws.flamoral.com
- **Media**: https://media.flamoral.com
- **Admin**: https://admin.flamoral.com

## Troubleshooting

```bash
# Pod not starting
kubectl describe pod <pod-name> -n flamoral
kubectl logs <pod-name> -n flamoral

# Check secrets
kubectl get externalsecrets -n flamoral

# Check events
kubectl get events -n flamoral --sort-by='.lastTimestamp'

# Resource usage
kubectl top pods -n flamoral

# Rollback
./deploy-services.sh rollback
```

## API Routes

Via `api.flamoral.com`:
- `/api/v1/auth/*` → auth-service
- `/api/v1/users/*` → user-service
- `/api/v1/matches/*` → matching-service
- `/api/v1/messages/*` → messaging-service
- `/api/v1/payments/*` → payment-service
- `/api/v1/media/*` → media-service
- `/api/v1/analytics/*` → analytics-service
- `/api/v1/moderation/*` → moderation-service
- `/api/v1/admin/*` → admin-service
- `/api/v1/ads/*` → advertising-service
- `/api/v1/notifications/*` → notification-service
- `/api/v1/workflows/*` → workflow-engine

## Pre-Deployment Checklist

- [ ] Kubernetes cluster accessible
- [ ] `flamoral` namespace exists
- [ ] External Secrets deployed
- [ ] Images pushed to ACR
- [ ] DNS records configured

## Post-Deployment Validation

```bash
# All pods running
kubectl get pods -n flamoral | grep Running

# All health checks passing
./deploy-services.sh validate

# Ingress has external IP
kubectl get ingress -n flamoral

# TLS certificates issued
kubectl get certificates -n flamoral
```

# Flamoral Helm Charts - Quick Reference Guide

## Service Port Reference

| Service | Port | URL Pattern |
|---------|------|-------------|
| API Gateway | 4000 | `http://flamoral-api-gateway:4000` |
| Auth Service | 3001 | `http://flamoral-auth-service:3001` |
| User Service | 3002 | `http://flamoral-user-service:3002` |
| Messaging Service | 3004 | `http://flamoral-messaging-service:3004` |
| Payment Service | 3005 | `http://flamoral-payment-service:3005` |
| Media Service | 3006 | `http://flamoral-media-service:3006` |
| Analytics Service | 3007 | `http://flamoral-analytics-service:3007` |
| Moderation Service | 3008 | `http://flamoral-moderation-service:3008` |
| Matching Service | 3009 | `http://flamoral-matching-service:3009` |
| Admin Service | 3010 | `http://flamoral-admin-service:3010` |
| Advertising Service | 3011 | `http://flamoral-advertising-service:3011` |
| Notification Service | 3012 | `http://flamoral-notification-service:3012` |
| Policy Service | 3013 | `http://flamoral-policy-service:3013` |
| Automation Service | 3014 | `http://flamoral-automation-service:3014` |
| Workflow Engine | 3015 | `http://flamoral-workflow-engine:3015` |
| Realtime Service | 8081 | `http://flamoral-realtime-service:8081` |
| Recommendation AI | 5000 | `http://flamoral-recommendation-service:5000` |
| NLP Service | 5001 | `http://flamoral-nlp-service:5001` |
| Photo Analysis | 5002 | `http://flamoral-photo-analysis-service:5002` |
| Fraud Detection | 5003 | `http://flamoral-fraud-detection-service:5003` |
| Dating Coach | 5004 | `http://flamoral-dating-coach-service:5004` |
| Content Generator | 5005 | `http://flamoral-content-generator-service:5005` |

## Quick Deploy Commands

### Development
```bash
helm upgrade --install flamoral ./flamoral \
  -n flamoral-dev \
  -f ./flamoral/values.yaml \
  -f ./flamoral/values-dev.yaml
```

### Staging
```bash
helm upgrade --install flamoral ./flamoral \
  -n flamoral-staging \
  -f ./flamoral/values.yaml \
  -f ./flamoral/values-staging.yaml
```

### Production
```bash
helm upgrade --install flamoral ./flamoral \
  -n flamoral-prod \
  -f ./flamoral/values.yaml \
  -f ./flamoral/values-prod.yaml \
  --dry-run --debug  # Remove --dry-run when ready
```

## Quick Checks

### Check All Pods
```bash
kubectl get pods -n flamoral-prod
```

### Check Specific Service
```bash
kubectl get pods -n flamoral-prod -l app.kubernetes.io/component=api-gateway
```

### View Logs
```bash
kubectl logs -f deployment/flamoral-api-gateway -n flamoral-prod
```

### Test Health Endpoint
```bash
kubectl run -it --rm test --image=curlimages/curl --restart=Never -- \
  curl http://flamoral-api-gateway:4000/health/live
```

## Quick Troubleshooting

### Service Not Responding
```bash
# 1. Check pod status
kubectl get pods -n flamoral-prod

# 2. Check pod logs
kubectl logs <pod-name> -n flamoral-prod

# 3. Describe pod
kubectl describe pod <pod-name> -n flamoral-prod

# 4. Check service endpoints
kubectl get endpoints -n flamoral-prod
```

### Image Pull Errors
```bash
# Verify secret exists
kubectl get secret acr-secret -n flamoral-prod

# Recreate if needed
kubectl create secret docker-registry acr-secret \
  --docker-server=flamoralacr.azurecr.io \
  --docker-username=<USERNAME> \
  --docker-password=<PASSWORD> \
  -n flamoral-prod
```

### Resource Issues
```bash
# Check node resources
kubectl top nodes

# Check pod resources
kubectl top pods -n flamoral-prod

# Describe nodes
kubectl describe nodes
```

## Environment Variables Reference

### Required Secrets
- `secrets.database.password`
- `secrets.jwt.secret`
- `secrets.jwt.refreshSecret`
- `secrets.session.secret`
- `secrets.encryption.key`

### Optional But Recommended
- `secrets.oauth.google.*`
- `secrets.oauth.facebook.*`
- `secrets.storage.aws.*`
- `secrets.payment.stripe.*`
- `secrets.ai.openai.apiKey`

## Service Dependencies

### Database Services
- PostgreSQL (all Node.js services)
- Redis (caching, sessions)
- MongoDB (messaging service)

### External Services
- Azure Container Registry (images)
- SendGrid/AWS SES (email)
- Twilio (SMS)
- Stripe (payments)
- OpenAI (AI services)

## Scaling Commands

### Manual Scaling
```bash
# Scale specific service
kubectl scale deployment flamoral-api-gateway --replicas=10 -n flamoral-prod

# Via Helm
helm upgrade flamoral ./flamoral \
  --set apiGateway.replicaCount=10 \
  --reuse-values \
  -n flamoral-prod
```

### Check HPA Status
```bash
kubectl get hpa -n flamoral-prod
```

## Rollback

```bash
# List releases
helm list -n flamoral-prod

# View history
helm history flamoral -n flamoral-prod

# Rollback
helm rollback flamoral <revision> -n flamoral-prod
```

## Documentation Links

- **Full Configuration:** `HELM_CONFIGURATION_COMPLETE.md`
- **Fixes Applied:** `HELM_FIXES_APPLIED.md`
- **Architecture:** `../../ARCHITECTURE.md`
- **Service Docs:** `../../backend/services/<service-name>/README.md`

---

**Quick Tip:** Always run `helm upgrade` with `--dry-run --debug` first to preview changes before applying them!

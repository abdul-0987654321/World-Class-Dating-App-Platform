# Flamoral Frontend Quick Reference

## Web App Deployment

### Build and Deploy
```bash
# Navigate to web app directory
cd C:/Users/citad/OneDrive/Documents/Dating/DatingPlatform/apps/web-app

# Build Docker image
docker build -t flamoral-web:latest .

# Tag for ACR
docker tag flamoral-web:latest flamoralacr.azurecr.io/flamoral-web:latest

# Login to ACR
az acr login --name flamoralacr

# Push to ACR
docker push flamoralacr.azurecr.io/flamoral-web:latest

# Deploy to Kubernetes
kubectl apply -f ../../infrastructure/k8s/web-app-deployment.yaml
kubectl apply -f ../../infrastructure/k8s/production-ingress.yaml
```

### Check Status
```bash
# Check deployment status
kubectl get deployments -n flamoral | grep web-app

# Check pods
kubectl get pods -n flamoral | grep web-app

# Check service
kubectl get svc -n flamoral | grep web-app

# Check ingress
kubectl get ingress -n flamoral

# View logs
kubectl logs -n flamoral deployment/web-app --tail=50

# Follow logs
kubectl logs -n flamoral deployment/web-app -f
```

### Scale Web App
```bash
# Scale to 5 replicas
kubectl scale deployment web-app -n flamoral --replicas=5

# Scale to 1 replica
kubectl scale deployment web-app -n flamoral --replicas=1
```

### Update Web App
```bash
# After building new version (e.g., v1.0.1)
kubectl set image deployment/web-app web-app=flamoralacr.azurecr.io/flamoral-web:v1.0.1 -n flamoral

# Check rollout status
kubectl rollout status deployment/web-app -n flamoral

# Rollback if needed
kubectl rollout undo deployment/web-app -n flamoral
```

---

## Mobile App Development

### Development Setup
```bash
# Navigate to mobile app
cd C:/Users/citad/OneDrive/Documents/Dating/DatingPlatform/apps/mobile-app

# Install dependencies
npm install

# iOS development
npm run ios

# Android development
npm run android

# Start Metro bundler
npm start
```

### Environment Configuration
```bash
# Copy production example
cp .env.production.example .env.production

# Edit with your API keys
nano .env.production

# Key variables to configure:
# - API_BASE_URL=https://api.flamoral.com
# - STRIPE_PUBLISHABLE_KEY
# - FIREBASE_API_KEY
# - GOOGLE_MAPS_API_KEY
# - AGORA_APP_ID
```

### iOS Build
```bash
# Install pods
cd ios && pod install && cd ..

# Open in Xcode
open ios/Flamoral.xcworkspace

# Or build from command line
npx react-native run-ios --configuration Release
```

### Android Build
```bash
# Development build
npm run android

# Production APK
cd android
./gradlew assembleRelease

# Production AAB (for Play Store)
./gradlew bundleRelease
```

---

## URLs and Endpoints

### Production URLs
- **Web App:** https://flamoral.com
- **API Gateway:** https://api.flamoral.com
- **WebSocket:** wss://api.flamoral.com

### DNS Configuration
```dns
Type    Host              Value           TTL
A       flamoral.com      48.200.65.15    300
CNAME   www               flamoral.com    300
CNAME   api               flamoral.com    300
```

### Ingress IP
```
External IP: 48.200.65.15
```

---

## Kubernetes Resources

### Namespaces
```bash
# Production namespace
kubectl config set-context --current --namespace=flamoral

# List all namespaces
kubectl get namespaces
```

### Common Commands
```bash
# Get all resources
kubectl get all -n flamoral

# Describe deployment
kubectl describe deployment web-app -n flamoral

# Get pod logs
kubectl logs <pod-name> -n flamoral

# Execute command in pod
kubectl exec -it <pod-name> -n flamoral -- /bin/sh

# Port forward to local
kubectl port-forward deployment/web-app 8080:80 -n flamoral
```

### Secrets and ConfigMaps
```bash
# List secrets
kubectl get secrets -n flamoral

# List configmaps
kubectl get configmaps -n flamoral

# Create secret from file
kubectl create secret generic app-secrets --from-file=.env.production -n flamoral
```

---

## SSL/TLS

### Certificate Status
```bash
# Check certificate
kubectl get certificate -n flamoral

# Describe certificate
kubectl describe certificate flamoral-tls -n flamoral

# Check certificate secret
kubectl get secret flamoral-tls -n flamoral -o yaml
```

### Generate SSL Pins for Mobile
```bash
cd apps/mobile-app/scripts

# Generate pins for api.flamoral.com
./generate-ssl-pins.sh api.flamoral.com

# Copy pins to .env.production
# SSL_PINS_API_FLAMORAL=sha256/xxxxx=,sha256/yyyyy=
```

---

## Monitoring

### Health Checks
```bash
# Web app health (once DNS configured)
curl https://flamoral.com/health

# API health
curl https://api.flamoral.com/health

# Direct pod health
kubectl exec -it <pod-name> -n flamoral -- curl localhost/health
```

### Resource Usage
```bash
# Pod resource usage
kubectl top pods -n flamoral

# Node resource usage
kubectl top nodes

# Deployment status
kubectl get deployment web-app -n flamoral -o wide
```

### Logs
```bash
# Real-time logs
kubectl logs -f deployment/web-app -n flamoral

# Last 100 lines
kubectl logs deployment/web-app -n flamoral --tail=100

# Logs from all pods
kubectl logs -l app=web-app -n flamoral

# Logs with timestamps
kubectl logs deployment/web-app -n flamoral --timestamps
```

---

## Troubleshooting

### Web App Not Loading
```bash
# Check pod status
kubectl get pods -n flamoral | grep web-app

# Check pod logs
kubectl logs deployment/web-app -n flamoral

# Check service
kubectl get svc web-app -n flamoral

# Check ingress
kubectl describe ingress flamoral-ingress -n flamoral
```

### Pod CrashLoopBackOff
```bash
# View pod logs
kubectl logs <pod-name> -n flamoral

# View previous pod logs (if restarted)
kubectl logs <pod-name> -n flamoral --previous

# Describe pod for events
kubectl describe pod <pod-name> -n flamoral
```

### DNS Issues
```bash
# Check DNS resolution
nslookup flamoral.com
dig flamoral.com

# Check from inside cluster
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup web-app.flamoral.svc.cluster.local
```

### Certificate Issues
```bash
# Check cert-manager logs
kubectl logs -n cert-manager deployment/cert-manager

# Check certificate request
kubectl get certificaterequest -n flamoral

# Check challenge
kubectl get challenge -n flamoral
```

---

## Development Workflow

### Local Development
```bash
# Web app local dev server
cd apps/web-app
npm run dev
# Access at http://localhost:5173

# Mobile app
cd apps/mobile-app
npm start
```

### Testing
```bash
# Web app tests
cd apps/web-app
npm test

# E2E tests
npm run test:e2e

# Mobile app tests
cd apps/mobile-app
npm test
```

### Linting
```bash
# Web app
cd apps/web-app
npm run lint
npm run lint:fix

# Mobile app
cd apps/mobile-app
npm run lint
```

---

## Quick Deploy Script

Save this as `deploy-web.sh`:

```bash
#!/bin/bash
set -e

echo "Building web app..."
cd apps/web-app
docker build -t flamoral-web:latest .

echo "Tagging image..."
docker tag flamoral-web:latest flamoralacr.azurecr.io/flamoral-web:latest

echo "Logging in to ACR..."
az acr login --name flamoralacr

echo "Pushing to ACR..."
docker push flamoralacr.azurecr.io/flamoral-web:latest

echo "Deploying to Kubernetes..."
kubectl apply -f ../../infrastructure/k8s/web-app-deployment.yaml

echo "Checking deployment status..."
kubectl rollout status deployment/web-app -n flamoral

echo "Deployment complete!"
kubectl get pods -n flamoral | grep web-app
```

Make executable: `chmod +x deploy-web.sh`

---

## Important Files

### Web App
- `apps/web-app/Dockerfile` - Container definition
- `apps/web-app/nginx.conf` - Web server config
- `apps/web-app/.env.production` - Production environment
- `apps/web-app/vite.config.ts` - Build configuration

### Mobile App
- `apps/mobile-app/app.json` - App metadata
- `apps/mobile-app/.env.production` - Production environment
- `apps/mobile-app/ios/Info.plist` - iOS configuration
- `apps/mobile-app/android/app/build.gradle` - Android build

### Infrastructure
- `infrastructure/k8s/web-app-deployment.yaml` - Web app K8s
- `infrastructure/k8s/production-ingress.yaml` - Ingress routing
- `infrastructure/k8s/production-deployments.yaml` - Backend services

---

## Emergency Procedures

### Rollback Deployment
```bash
# Rollback to previous version
kubectl rollout undo deployment/web-app -n flamoral

# Rollback to specific revision
kubectl rollout undo deployment/web-app -n flamoral --to-revision=2

# Check rollout history
kubectl rollout history deployment/web-app -n flamoral
```

### Scale Down (Emergency)
```bash
# Scale to 0 (stop all pods)
kubectl scale deployment web-app -n flamoral --replicas=0

# Scale back to 2
kubectl scale deployment web-app -n flamoral --replicas=2
```

### Delete and Recreate
```bash
# Delete deployment (keeps service)
kubectl delete deployment web-app -n flamoral

# Recreate from manifest
kubectl apply -f infrastructure/k8s/web-app-deployment.yaml
```

---

## Contacts

- **DevOps Lead:** [Your Name]
- **Platform:** Azure Kubernetes Service
- **Registry:** flamoralacr.azurecr.io
- **Cluster:** flamoral-prod-aks
- **Namespace:** flamoral

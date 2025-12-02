# Dating App Deployment Guide

## Quick Deployment Checklist

- [ ] Kubernetes cluster provisioned
- [ ] kubectl configured
- [ ] Helm installed
- [ ] Secrets prepared
- [ ] Domain DNS configured
- [ ] Container images built
- [ ] Database backed up (for updates)

## Deployment Environments

### Development
- **Purpose**: Local development and testing
- **Method**: Docker Compose
- **Command**: `docker-compose up`

### Staging
- **Purpose**: Pre-production testing
- **Method**: Blue-Green deployment on Kubernetes
- **URL**: https://staging.datingapp.com
- **Auto-deploy**: On push to `develop` branch

### Production
- **Purpose**: Live environment
- **Method**: Canary deployment on Kubernetes
- **URL**: https://datingapp.com
- **Auto-deploy**: On push to `main` branch (with approval)

## First-Time Deployment

### Step 1: Prepare Kubernetes Cluster

#### Option A: Azure AKS

```bash
# Create resource group
az group create --name dating-app-rg --location eastus

# Create AKS cluster
az aks create \
  --resource-group dating-app-rg \
  --name dating-app-cluster \
  --node-count 3 \
  --node-vm-size Standard_D4s_v3 \
  --enable-addons monitoring \
  --generate-ssh-keys

# Get credentials
az aks get-credentials --resource-group dating-app-rg --name dating-app-cluster
```

#### Option B: AWS EKS

```bash
# Create cluster (using eksctl)
eksctl create cluster \
  --name dating-app-cluster \
  --region us-east-1 \
  --nodegroup-name standard-workers \
  --node-type t3.xlarge \
  --nodes 3 \
  --nodes-min 3 \
  --nodes-max 10 \
  --managed

# Update kubeconfig
aws eks update-kubeconfig --region us-east-1 --name dating-app-cluster
```

#### Option C: Google GKE

```bash
# Create cluster
gcloud container clusters create dating-app-cluster \
  --zone us-central1-a \
  --num-nodes 3 \
  --machine-type n1-standard-4 \
  --enable-autoscaling \
  --min-nodes 3 \
  --max-nodes 10

# Get credentials
gcloud container clusters get-credentials dating-app-cluster --zone us-central1-a
```

### Step 2: Install Core Components

```bash
# Run the setup script
chmod +x infrastructure/scripts/setup-cluster.sh
./infrastructure/scripts/setup-cluster.sh
```

This script will:
1. Create namespaces
2. Install NGINX Ingress
3. Install Cert Manager
4. Install Metrics Server
5. Install Prometheus Operator (optional)

### Step 3: Configure Secrets

#### Update Secret Values

1. Copy the secret template:
```bash
cp infrastructure/kubernetes/security/advanced-secrets.yaml infrastructure/kubernetes/security/secrets.yaml
```

2. Update all `CHANGE_ME_*` values in `secrets.yaml`

3. For production, use Sealed Secrets or External Secrets:

**Using Sealed Secrets:**
```bash
# Install sealed-secrets controller
kubectl apply -f https://github.com/bitnami-labs/sealed-secrets/releases/download/v0.24.0/controller.yaml

# Seal your secrets
kubeseal --format=yaml < secrets.yaml > sealed-secrets.yaml

# Apply sealed secrets
kubectl apply -f sealed-secrets.yaml
```

**Using External Secrets Operator:**
```bash
# Install external-secrets
helm repo add external-secrets https://charts.external-secrets.io
helm install external-secrets external-secrets/external-secrets -n external-secrets-system --create-namespace

# Apply SecretStore and ExternalSecret configurations
kubectl apply -f infrastructure/kubernetes/security/advanced-secrets.yaml
```

### Step 4: Configure DNS

Point your domains to the Ingress LoadBalancer:

```bash
# Get LoadBalancer IP/hostname
kubectl get svc ingress-nginx-controller -n ingress-nginx
```

Create DNS records:
- `datingapp.com` → LoadBalancer IP
- `www.datingapp.com` → LoadBalancer IP
- `api.datingapp.com` → LoadBalancer IP
- `ws.datingapp.com` → LoadBalancer IP
- `media.datingapp.com` → LoadBalancer IP

### Step 5: Deploy Monitoring Stack

```bash
# Deploy Prometheus
kubectl apply -f infrastructure/monitoring/prometheus/prometheus-complete.yaml

# Deploy Grafana
kubectl apply -f infrastructure/monitoring/grafana/grafana-complete.yaml

# Verify
kubectl get pods -n monitoring
```

### Step 6: Deploy Logging Stack

```bash
# Deploy Elasticsearch
kubectl apply -f infrastructure/logging/elasticsearch/elasticsearch-complete.yaml

# Wait for Elasticsearch to be ready (3-5 minutes)
kubectl wait --for=condition=ready pod -l app=elasticsearch -n logging --timeout=600s

# Deploy Logstash and Filebeat
kubectl apply -f infrastructure/logging/logstash/logstash-complete.yaml

# Deploy Kibana
kubectl apply -f infrastructure/logging/kibana/kibana-complete.yaml

# Verify
kubectl get pods -n logging
```

### Step 7: Deploy Application

```bash
# Apply ConfigMaps
kubectl apply -f infrastructure/kubernetes/config/advanced-configmaps.yaml

# Deploy databases
kubectl apply -f infrastructure/kubernetes/base/postgres-deployment.yaml
kubectl apply -f infrastructure/kubernetes/base/redis-deployment.yaml

# Wait for databases to be ready
kubectl wait --for=condition=ready pod -l app=postgres -n dating-app --timeout=300s
kubectl wait --for=condition=ready pod -l app=redis -n dating-app --timeout=300s

# Run database migrations
kubectl apply -f infrastructure/kubernetes/jobs/db-migration-job.yaml

# Deploy all microservices
for service in api-gateway user-service matching-service media-service messaging-service notification-service websocket-service frontend; do
  kubectl apply -f apps/$service/k8s/
done

# Apply network policies
kubectl apply -f infrastructure/kubernetes/security/network-policies.yaml

# Apply HPA
kubectl apply -f infrastructure/kubernetes/autoscaling/hpa.yaml

# Apply ingress
kubectl apply -f infrastructure/kubernetes/ingress/ingress-nginx.yaml
```

### Step 8: Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n dating-app

# Check services
kubectl get svc -n dating-app

# Check ingress
kubectl get ingress -n dating-app

# Run smoke tests
./tests/smoke-tests.sh https://api.datingapp.com
```

## CI/CD Automated Deployment

### GitHub Actions Setup

1. **Add Repository Secrets**

Go to GitHub Settings → Secrets and Variables → Actions

Add these secrets:
```
KUBE_CONFIG_STAGING: <base64 encoded kubeconfig for staging>
KUBE_CONFIG_PRODUCTION: <base64 encoded kubeconfig for production>
DOCKER_USERNAME: <your Docker Hub username>
DOCKER_PASSWORD: <your Docker Hub password>
SNYK_TOKEN: <Snyk API token>
SONAR_TOKEN: <SonarQube token>
SONAR_HOST_URL: <SonarQube URL>
SLACK_WEBHOOK: <Slack webhook URL>
EMAIL_USERNAME: <email for notifications>
EMAIL_PASSWORD: <email password>
STAGING_API_URL: https://staging.datingapp.com
STAGING_DATABASE_URL: <staging database connection string>
```

2. **Trigger Deployment**

The CI/CD pipeline automatically runs on:
- Push to `develop` → Deploys to staging
- Push to `main` → Deploys to production (with approval)
- Pull requests → Runs tests and security scans only

## Blue-Green Deployment

### Deploy to Green Environment

```bash
# Update green deployment with new image
kubectl set image deployment/api-gateway-green \
  api-gateway=ghcr.io/datingapp/api-gateway:v1.2.0 \
  -n dating-app

# For all services
for service in user-service matching-service media-service messaging-service notification-service websocket-service; do
  kubectl set image deployment/${service}-green \
    ${service}=ghcr.io/datingapp/${service}:v1.2.0 \
    -n dating-app
done

# Wait for rollout to complete
kubectl rollout status deployment/api-gateway-green -n dating-app
```

### Test Green Environment

```bash
# Run smoke tests against green
./tests/smoke-tests.sh https://green.api.datingapp.com

# Run integration tests
npm run test:integration -- --baseUrl=https://green.api.datingapp.com

# Check metrics
./scripts/check-deployment-health.sh green
```

### Switch Traffic to Green

```bash
# Switch main service to green
kubectl patch service api-gateway -n dating-app \
  -p '{"spec":{"selector":{"version":"green"}}}'

# Switch all services
for service in user-service matching-service media-service messaging-service notification-service websocket-service; do
  kubectl patch service ${service} -n dating-app \
    -p '{"spec":{"selector":{"version":"green"}}}'
done

# Monitor for 30 minutes
watch -n 30 './scripts/check-deployment-health.sh green'
```

### Rollback to Blue (if needed)

```bash
# Immediately switch back
kubectl patch service api-gateway -n dating-app \
  -p '{"spec":{"selector":{"version":"blue"}}}'

# For all services
for service in user-service matching-service media-service messaging-service notification-service websocket-service; do
  kubectl patch service ${service} -n dating-app \
    -p '{"spec":{"selector":{"version":"blue"}}}'
done
```

### Finalize Blue-Green Swap

```bash
# After 24 hours of stable green operation:

# Update blue with current version (becomes new standby)
kubectl set image deployment/api-gateway-blue \
  api-gateway=ghcr.io/datingapp/api-gateway:v1.1.0 \
  -n dating-app

# Scale down blue to save resources
kubectl scale deployment api-gateway-blue --replicas=1 -n dating-app
```

## Canary Deployment

### Automated Canary Rollout

```bash
# Use the automated script
cd infrastructure/kubernetes/deployments
chmod +x canary-rollout.sh
./canary-rollout.sh
```

### Manual Canary Rollout

#### Stage 1: Deploy Canary (10% traffic)

```bash
# Deploy canary version
kubectl set image deployment/api-gateway-canary \
  api-gateway=ghcr.io/datingapp/api-gateway:v1.2.0 \
  -n dating-app

# Set canary replicas (10% of stable)
STABLE_REPLICAS=$(kubectl get deployment api-gateway-stable -n dating-app -o jsonpath='{.spec.replicas}')
CANARY_REPLICAS=$(( STABLE_REPLICAS / 10 ))
kubectl scale deployment api-gateway-canary --replicas=$CANARY_REPLICAS -n dating-app

# Set traffic weight to 10%
kubectl patch ingress api-gateway-canary-ingress -n dating-app \
  -p '{"metadata":{"annotations":{"nginx.ingress.kubernetes.io/canary-weight":"10"}}}'

# Wait 5 minutes and monitor
sleep 300
./scripts/check-canary-metrics.sh
```

#### Stage 2: Increase to 25%

```bash
# Increase canary replicas
CANARY_REPLICAS=$(( STABLE_REPLICAS / 4 ))
kubectl scale deployment api-gateway-canary --replicas=$CANARY_REPLICAS -n dating-app

# Increase traffic weight to 25%
kubectl patch ingress api-gateway-canary-ingress -n dating-app \
  -p '{"metadata":{"annotations":{"nginx.ingress.kubernetes.io/canary-weight":"25"}}}'

# Monitor
sleep 300
./scripts/check-canary-metrics.sh
```

#### Stage 3: Increase to 50%

```bash
# Increase to 50% replicas
CANARY_REPLICAS=$(( STABLE_REPLICAS / 2 ))
kubectl scale deployment api-gateway-canary --replicas=$CANARY_REPLICAS -n dating-app

# Increase traffic to 50%
kubectl patch ingress api-gateway-canary-ingress -n dating-app \
  -p '{"metadata":{"annotations":{"nginx.ingress.kubernetes.io/canary-weight":"50"}}}'

# Monitor
sleep 300
./scripts/check-canary-metrics.sh
```

#### Stage 4: Promote to Stable

```bash
# Update stable deployment with canary image
CANARY_IMAGE=$(kubectl get deployment api-gateway-canary -n dating-app -o jsonpath='{.spec.template.spec.containers[0].image}')
kubectl set image deployment/api-gateway-stable \
  api-gateway=$CANARY_IMAGE \
  -n dating-app

# Wait for stable rollout
kubectl rollout status deployment/api-gateway-stable -n dating-app

# Remove canary traffic
kubectl patch ingress api-gateway-canary-ingress -n dating-app \
  -p '{"metadata":{"annotations":{"nginx.ingress.kubernetes.io/canary-weight":"0"}}}'

# Scale down canary
kubectl scale deployment api-gateway-canary --replicas=0 -n dating-app
```

### Canary Rollback

```bash
# If canary metrics are bad at any stage:

# Remove all canary traffic
kubectl patch ingress api-gateway-canary-ingress -n dating-app \
  -p '{"metadata":{"annotations":{"nginx.ingress.kubernetes.io/canary-weight":"0"}}}'

# Scale down canary
kubectl scale deployment api-gateway-canary --replicas=0 -n dating-app

# Clean up canary pods
kubectl delete pods -l track=canary -n dating-app
```

## Database Migrations

### Run Migrations

```bash
# Using migration job
kubectl apply -f infrastructure/kubernetes/jobs/db-migration-job.yaml

# Check job status
kubectl get jobs -n dating-app
kubectl logs job/db-migration -n dating-app

# Manually run migrations
kubectl run migration-runner --rm -it \
  --image=ghcr.io/datingapp/api-gateway:latest \
  --restart=Never \
  -n dating-app \
  -- npm run migrate:up
```

### Rollback Migrations

```bash
# Rollback last migration
kubectl run migration-rollback --rm -it \
  --image=ghcr.io/datingapp/api-gateway:latest \
  --restart=Never \
  -n dating-app \
  -- npm run migrate:down

# Check migration status
kubectl run migration-status --rm -it \
  --image=ghcr.io/datingapp/api-gateway:latest \
  --restart=Never \
  -n dating-app \
  -- npm run migrate:status
```

## Scaling

### Manual Scaling

```bash
# Scale a specific deployment
kubectl scale deployment api-gateway --replicas=10 -n dating-app

# Scale multiple deployments
for service in user-service matching-service messaging-service; do
  kubectl scale deployment $service --replicas=5 -n dating-app
done
```

### Auto-scaling

HPA (Horizontal Pod Autoscaler) is already configured and will automatically scale based on:
- CPU utilization (70%)
- Memory utilization (80%)
- Custom metrics (requests per second)

Check HPA status:
```bash
kubectl get hpa -n dating-app
kubectl describe hpa api-gateway-hpa -n dating-app
```

## Monitoring Deployment

### Check Deployment Status

```bash
# Watch deployment progress
kubectl rollout status deployment/api-gateway -n dating-app

# View rollout history
kubectl rollout history deployment/api-gateway -n dating-app

# Check pod status
kubectl get pods -l app=api-gateway -n dating-app
```

### View Metrics in Grafana

1. Access Grafana: https://grafana.datingapp.com
2. Navigate to Dashboards → Dating App
3. Check:
   - Request rate changes
   - Error rate (should remain < 1%)
   - Response times (p95, p99)
   - Resource usage

### View Logs in Kibana

1. Access Kibana: https://kibana.datingapp.com
2. Go to Discover
3. Select index pattern: `dating-app-logs-*`
4. Filter by deployment version to compare old vs new

## Troubleshooting Deployments

### Deployment Stuck

```bash
# Check deployment events
kubectl describe deployment api-gateway -n dating-app

# Check pod events
kubectl describe pod <pod-name> -n dating-app

# Check pod logs
kubectl logs <pod-name> -n dating-app

# Force delete stuck pods
kubectl delete pod <pod-name> --force --grace-period=0 -n dating-app
```

### Rollout Failed

```bash
# Rollback to previous version
kubectl rollout undo deployment/api-gateway -n dating-app

# Rollback to specific revision
kubectl rollout undo deployment/api-gateway --to-revision=2 -n dating-app
```

### Image Pull Errors

```bash
# Check image pull secrets
kubectl get secrets -n dating-app

# Create Docker registry secret (if missing)
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=$GITHUB_USERNAME \
  --docker-password=$GITHUB_TOKEN \
  -n dating-app
```

## Post-Deployment Checklist

- [ ] All pods are running and ready
- [ ] Health checks passing
- [ ] Ingress accessible from internet
- [ ] SSL certificates valid
- [ ] Monitoring dashboards showing data
- [ ] Logs appearing in Kibana
- [ ] Smoke tests passed
- [ ] Database migrations completed
- [ ] Performance metrics acceptable
- [ ] Error rate < 1%
- [ ] Response times within SLA

## Rollback Procedure

### Emergency Rollback

```bash
# Quick rollback all services
for deployment in $(kubectl get deployments -n dating-app -o name); do
  kubectl rollout undo $deployment -n dating-app
done

# Verify rollback
kubectl get pods -n dating-app
```

### Planned Rollback

1. Review rollout history
2. Identify target revision
3. Test target version (if possible)
4. Execute rollback
5. Monitor metrics
6. Verify application functionality

## Support and Escalation

**During Deployment Issues:**
1. Check Grafana and Kibana
2. Review pod logs
3. Check recent changes
4. Contact on-call engineer via PagerDuty
5. Escalate to DevOps lead if unresolved in 15 minutes

**Contact:**
- DevOps Team: devops@datingapp.com
- On-Call: PagerDuty
- Emergency Hotline: +1-XXX-XXX-XXXX

---

**Last Updated**: December 2024
**Version**: 1.0.0

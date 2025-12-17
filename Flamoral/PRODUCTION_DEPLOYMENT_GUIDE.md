# Flamoral Platform - Production Deployment Guide

**Version:** 2.0.0
**Last Updated:** December 13, 2025
**Platform:** Azure Kubernetes Service (AKS)
**Status:** Production Ready

---

## Executive Summary

This is the definitive guide for deploying the Flamoral dating platform to production on Azure. The deployment includes web application, mobile API backend, real-time services, databases, and CDN infrastructure.

### Platform Overview

Flamoral is a world-class dating application platform featuring:
- Native iOS and Android mobile apps
- Responsive web application
- Scalable microservices backend
- Real-time messaging and video calls
- AI-powered matching and content moderation
- Comprehensive admin dashboard

### Architecture at a Glance

```
                                    INTERNET
                                       |
                        +--------------+--------------+
                        |                             |
                 Azure Front Door              Custom Domain
                  (Global CDN)                  (flamoral.com)
                        |                             |
                        +-------------+---------------+
                                      |
                    +----------------+----------------+
                    |                                 |
              DNS Resolution                      WAF/DDoS
           (Azure DNS Zone)                   (Protection)
                    |                                 |
                    +-----------------+---------------+
                                      |
                              TLS Termination
                         (Let's Encrypt Certs)
                                      |
                         +------------+------------+
                         |                         |
                    NGINX Ingress           Load Balancer
                  (48.200.65.15)          (Health Probes)
                         |                         |
                         +------------+------------+
                                      |
              +----------+------------+------------+---------+
              |          |            |            |         |
         Web App    API Gateway  WebSocket   Messaging  Analytics
        (React)    (REST/GraphQL) (Socket.io) (Real-time) (Events)
              |          |            |            |         |
              +----------+------------+------------+---------+
                                      |
                    +-----------------+-----------------+
                    |                 |                 |
              PostgreSQL 15      MongoDB 7         Redis 7
             (User Data)      (Messages/Logs)    (Cache/Sessions)
                    |                 |                 |
                    +-----------------+-----------------+
                                      |
                         Azure Blob Storage + Key Vaults
                        (Media Files + Secrets)
```

### Key URLs and Endpoints

| Service | URL | Purpose |
|---------|-----|---------|
| Main Website | https://flamoral.com | Primary web application |
| WWW Redirect | https://www.flamoral.com | Redirects to main |
| API Gateway | https://api.flamoral.com | Mobile app + API access |
| Admin Dashboard | https://admin.flamoral.com | Platform management |
| Front Door | https://flamoral-prod-andtbkagfve5h5da.z01.azurefd.net | CDN endpoint |
| Kubernetes Ingress | https://flamoral.westus2.cloudapp.azure.com | Direct AKS access |

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment Steps](#deployment-steps)
3. [Post-Deployment Verification](#post-deployment-verification)
4. [Monitoring and Alerts](#monitoring-and-alerts)
5. [Rollback Procedures](#rollback-procedures)
6. [Troubleshooting](#troubleshooting)
7. [Contacts and Escalation](#contacts-and-escalation)

---

## Pre-Deployment Checklist

### Access and Permissions

- [ ] **Azure Subscription Access**
  - Subscription ID: `ebd1613e-fea0-4b6d-8918-7e4de6a71c44`
  - Resource Group: `flamoral-prod-rg`
  - Role Required: Contributor or Owner
  - Verify: `az account show`

- [ ] **Azure CLI Installed and Authenticated**
  ```bash
  az --version  # Should be 2.50.0+
  az login
  az account set --subscription ebd1613e-fea0-4b6d-8918-7e4de6a71c44
  ```

- [ ] **kubectl Configured for AKS**
  ```bash
  az aks get-credentials \
    --resource-group flamoral-prod-rg \
    --name flamoral-prod-aks
  kubectl cluster-info
  ```

- [ ] **DNS Registrar Access**
  - Domain: flamoral.com
  - Registrar: [Your registrar name]
  - Access to update nameservers
  - Access to create A/CNAME records

- [ ] **Docker Registry Access**
  - Registry: flamoralacr.azurecr.io
  - Login: `az acr login --name flamoralacr`
  - Push permission verified

### Environment Variables Configured

All secrets must be populated in Azure Key Vault before deployment.

#### Auth Vault (flamoralprodauthkv)
- [ ] `jwt-secret` (auto-generated)
- [ ] `jwt-access-secret` (auto-generated)
- [ ] `jwt-refresh-secret` (auto-generated)
- [ ] `session-secret` (auto-generated)

#### Payment Vault (flamoralprodpaymentkv)
- [ ] `stripe-secret-key` (from Stripe Dashboard)
- [ ] `stripe-webhook-secret` (from Stripe Webhooks)

#### Data Vault (flamoralproddatakv)
- [ ] `postgres-password` (auto-generated)
- [ ] `redis-password` (auto-generated)

#### External Services Vault (flamoralprodexternalkv)
- [ ] `sendgrid-api-key` (from SendGrid)
- [ ] `twilio-auth-token` (from Twilio)
- [ ] `firebase-private-key` (from Firebase Console)
- [ ] `agora-app-certificate` (from Agora.io)
- [ ] `sentry-dsn` (from Sentry.io)
- [ ] `openai-api-key` (from OpenAI)

#### Infrastructure Vault (flamoralprodinfrakv)
- [ ] `service-api-key` (auto-generated)
- [ ] `encryption-key` (auto-generated)
- [ ] `azure-storage-connection-string` (from Azure Storage)

**Verify all secrets:**
```bash
# Run the verification script
cd C:/Users/citad/OneDrive/Documents/Dating/DatingPlatform/scripts
./populate-prod-keyvault-secrets.sh --verify
```

### Infrastructure Prerequisites

- [ ] **AKS Cluster Running**
  ```bash
  az aks show --resource-group flamoral-prod-rg --name flamoral-prod-aks --query "powerState.code"
  # Should return: "Running"
  ```

- [ ] **Container Registry Ready**
  ```bash
  az acr show --name flamoralacr --query "loginServer"
  # Should return: "flamoralacr.azurecr.io"
  ```

- [ ] **Public IP Reserved**
  ```bash
  az network public-ip show \
    --resource-group flamoral-prod-rg \
    --name flamoral-prod-ingress-pip \
    --query "ipAddress"
  # Should return: "48.200.65.15"
  ```

- [ ] **Azure Front Door Deployed**
  ```bash
  az afd profile show \
    --profile-name flamoral-prod-afd \
    --resource-group flamoral-prod-rg
  ```

- [ ] **Databases Provisioned**
  - PostgreSQL 15: Flexible Server
  - MongoDB: Atlas or Azure Cosmos DB
  - Redis: Azure Cache for Redis

### Monitoring and Alerting

- [ ] **Application Insights Configured**
  - Instrumentation key available
  - Connected to AKS cluster

- [ ] **Log Analytics Workspace Active**
  - Workspace ID available
  - Container Insights enabled

- [ ] **Prometheus and Grafana Deployed**
  - Monitoring namespace exists
  - Dashboards imported

- [ ] **Alert Rules Configured**
  - Critical: Pod crashes, high error rates
  - Warning: High latency, resource limits
  - Info: Deployment events

---

## Deployment Steps

### Phase 1: DNS Configuration (5 min + propagation time)

**Estimated Time:** 5 minutes + 1-48 hours propagation

#### Option A: Terraform Deployment (Recommended)

```bash
# Navigate to infrastructure directory
cd C:/Users/citad/OneDrive/Documents/Dating/DatingPlatform/infrastructure/dns

# Run DNS configuration script
chmod +x configure-dns.sh
./configure-dns.sh

# Note the name servers returned
```

#### Option B: Manual Azure DNS Setup

```bash
# Create DNS zone
az network dns zone create \
  --name flamoral.com \
  --resource-group flamoral-prod-rg

# Create A records (all point to 48.200.65.15)
az network dns record-set a add-record \
  --zone-name flamoral.com \
  --resource-group flamoral-prod-rg \
  --record-set-name "@" \
  --ipv4-address 48.200.65.15 \
  --ttl 300

az network dns record-set a add-record \
  --zone-name flamoral.com \
  --resource-group flamoral-prod-rg \
  --record-set-name "www" \
  --ipv4-address 48.200.65.15 \
  --ttl 300

az network dns record-set a add-record \
  --zone-name flamoral.com \
  --resource-group flamoral-prod-rg \
  --record-set-name "api" \
  --ipv4-address 48.200.65.15 \
  --ttl 300

az network dns record-set a add-record \
  --zone-name flamoral.com \
  --resource-group flamoral-prod-rg \
  --record-set-name "admin" \
  --ipv4-address 48.200.65.15 \
  --ttl 300

# Get name servers
az network dns zone show \
  --name flamoral.com \
  --resource-group flamoral-prod-rg \
  --query "nameServers"
```

#### Update Domain Registrar

1. Log in to your domain registrar (GoDaddy, Namecheap, etc.)
2. Navigate to DNS settings for flamoral.com
3. Replace existing nameservers with Azure nameservers:
   - ns1-XX.azure-dns.com
   - ns2-XX.azure-dns.net
   - ns3-XX.azure-dns.org
   - ns4-XX.azure-dns.info
4. Save changes
5. Wait for propagation (15 min - 48 hours)

#### Verification

```bash
# Check DNS resolution (may take time to propagate)
nslookup flamoral.com
nslookup www.flamoral.com
nslookup api.flamoral.com
nslookup admin.flamoral.com

# Check from Google DNS
nslookup flamoral.com 8.8.8.8
```

---

### Phase 2: Kubernetes Namespace Setup (2 min)

**Estimated Time:** 2 minutes

```bash
# Create production namespace
kubectl apply -f - <<EOF
apiVersion: v1
kind: Namespace
metadata:
  name: flamoral
  labels:
    name: flamoral
    environment: production
    app: flamoral-platform
EOF

# Verify namespace
kubectl get namespace flamoral

# Set as default for current context
kubectl config set-context --current --namespace=flamoral
```

---

### Phase 3: External Secrets Setup (5 min)

**Estimated Time:** 5 minutes

#### Install External Secrets Operator

```bash
# Add Helm repository
helm repo add external-secrets https://charts.external-secrets.io
helm repo update

# Install External Secrets
helm install external-secrets \
  external-secrets/external-secrets \
  -n external-secrets-system \
  --create-namespace \
  --set installCRDs=true

# Verify installation
kubectl get pods -n external-secrets-system
```

#### Deploy Secret Store Configuration

```bash
# Deploy SecretStore for each Key Vault
kubectl apply -f C:/Users/citad/OneDrive/Documents/Dating/DatingPlatform/infrastructure/kubernetes/production/external-secrets/secret-store.yaml

# Deploy ExternalSecret resources
kubectl apply -f C:/Users/citad/OneDrive/Documents/Dating/DatingPlatform/infrastructure/kubernetes/production/external-secrets/

# Verify secrets are synced
kubectl get externalsecrets -n flamoral
kubectl get secrets -n flamoral
```

---

### Phase 4: TLS Certificate Setup (5-10 min)

**Estimated Time:** 5-10 minutes (cert issuance may take longer)

#### Install cert-manager

```bash
# Install cert-manager
kubectl apply -f C:/Users/citad/OneDrive/Documents/Dating/DatingPlatform/infrastructure/kubernetes/production/cert-manager.yaml

# Wait for cert-manager to be ready
kubectl wait --for=condition=Available --timeout=300s \
  deployment/cert-manager -n cert-manager
kubectl wait --for=condition=Available --timeout=300s \
  deployment/cert-manager-webhook -n cert-manager

# Verify cert-manager
kubectl get pods -n cert-manager
```

#### Deploy Let's Encrypt Issuer

```bash
# Deploy production Let's Encrypt ClusterIssuer
kubectl apply -f - <<EOF
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@flamoral.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
EOF

# Verify issuer
kubectl get clusterissuer letsencrypt-prod
```

#### Create Certificate Resource

```bash
# Deploy certificate resource
kubectl apply -f C:/Users/citad/OneDrive/Documents/Dating/DatingPlatform/infrastructure/kubernetes/production/flamoral-certificate.yaml

# Monitor certificate issuance
kubectl describe certificate flamoral-tls -n flamoral
kubectl get certificaterequest -n flamoral

# Check certificate is ready (may take 2-5 minutes)
kubectl get certificate flamoral-tls -n flamoral
```

---

### Phase 5: Azure Front Door Routing (5 min)

**Estimated Time:** 5 minutes

#### Deploy Front Door Routes

```bash
# Navigate to infrastructure directory
cd C:/Users/citad/OneDrive/Documents/Dating/infrastructure/azure

# Run deployment script
chmod +x deploy-frontdoor-routes.sh
./deploy-frontdoor-routes.sh

# Verify routes created
az afd route list \
  --endpoint-name flamoral-prod \
  --profile-name flamoral-prod-afd \
  --resource-group flamoral-prod-rg \
  --output table
```

#### Expected Routes

1. **default-route** - /* (all web traffic)
2. **api-route** - /api/*, /graphql
3. **websocket-route** - /ws/*, /socket.io/*
4. **static-route** - /static/*, /assets/*
5. **media-route** - /media/*, /uploads/*
6. **health-route** - /health, /healthz

---

### Phase 6: Backend Services Deployment (15-20 min)

**Estimated Time:** 15-20 minutes

#### Deploy Infrastructure Services

```bash
# Deploy PgBouncer (connection pooling)
kubectl apply -f C:/Users/citad/OneDrive/Documents/Dating/DatingPlatform/infrastructure/kubernetes/production/pgbouncer-optimized.yaml

# Deploy Redis configuration
kubectl apply -f C:/Users/citad/OneDrive/Documents/Dating/DatingPlatform/infrastructure/kubernetes/production/redis-config.yaml

# Verify infrastructure services
kubectl get pods -n flamoral | grep -E 'pgbouncer|redis'
```

#### Deploy Application Services

```bash
# Deploy optimized backend services
kubectl apply -f C:/Users/citad/OneDrive/Documents/Dating/DatingPlatform/infrastructure/kubernetes/production/deployments/

# Monitor deployment progress
kubectl rollout status deployment/api-gateway -n flamoral
kubectl rollout status deployment/auth-service -n flamoral
kubectl rollout status deployment/messaging-service -n flamoral

# Verify all pods are running
kubectl get pods -n flamoral
```

#### Deploy Web Application

```bash
# Deploy web app
kubectl apply -f C:/Users/citad/OneDrive/Documents/Dating/DatingPlatform/infrastructure/kubernetes/deploy/flamoral-web-deploy.yaml

# Verify web app
kubectl rollout status deployment/web-app -n flamoral
kubectl get pods -n flamoral | grep web-app
```

#### Deploy Ingress Configuration

```bash
# Deploy production ingress
kubectl apply -f C:/Users/citad/OneDrive/Documents/Dating/DatingPlatform/infrastructure/kubernetes/deploy/ingress.yaml

# Verify ingress
kubectl get ingress -n flamoral
kubectl describe ingress flamoral-ingress -n flamoral
```

#### Deploy Autoscaling

```bash
# Deploy Horizontal Pod Autoscalers
kubectl apply -f C:/Users/citad/OneDrive/Documents/Dating/DatingPlatform/infrastructure/kubernetes/production/autoscaling/hpa-configs.yaml

# Verify HPA
kubectl get hpa -n flamoral
```

#### Deploy Pod Disruption Budgets

```bash
# Deploy PDBs for high availability
kubectl apply -f C:/Users/citad/OneDrive/Documents/Dating/DatingPlatform/infrastructure/kubernetes/production/pod-disruption-budgets.yaml

# Verify PDBs
kubectl get pdb -n flamoral
```

#### Deploy Network Policies

```bash
# Deploy network security policies
kubectl apply -f C:/Users/citad/OneDrive/Documents/Dating/DatingPlatform/infrastructure/kubernetes/production/network-policies.yaml

# Verify network policies
kubectl get networkpolicies -n flamoral
```

---

### Phase 7: Verification (10 min)

**Estimated Time:** 10 minutes

#### Health Checks

```bash
# Check all pods are running
kubectl get pods -n flamoral

# Check all deployments are ready
kubectl get deployments -n flamoral

# Check services are exposed
kubectl get services -n flamoral

# Check ingress is configured
kubectl get ingress -n flamoral

# Check certificates are issued
kubectl get certificate -n flamoral
```

#### Test Internal Connectivity

```bash
# Test from a debug pod
kubectl run -it --rm debug --image=curlimages/curl --restart=Never -n flamoral -- sh

# Inside the pod:
curl http://api-gateway:3000/health
curl http://auth-service:4000/health
curl http://web-app:80/health
exit
```

#### Test External Access

```bash
# Test Front Door endpoint
curl -I https://flamoral-prod-andtbkagfve5h5da.z01.azurefd.net

# Test direct ingress (if DNS propagated)
curl -I https://flamoral.com
curl -I https://api.flamoral.com/health

# Test SSL certificate
echo | openssl s_client -servername flamoral.com -connect flamoral.com:443 2>/dev/null | openssl x509 -noout -dates
```

#### Verify Front Door Routing

```bash
# Test each route type
curl -I https://flamoral.com/                    # Default route
curl -I https://flamoral.com/api/health          # API route
curl -I https://flamoral.com/static/favicon.ico  # Static route
curl -I https://flamoral.com/health              # Health route
```

---

## Post-Deployment

### Monitoring Setup

#### Configure Application Insights

```bash
# Get Application Insights instrumentation key
az monitor app-insights component show \
  --app flamoral-prod-appinsights \
  --resource-group flamoral-prod-rg \
  --query "instrumentationKey"

# Update application configuration with instrumentation key
kubectl create secret generic app-insights \
  --from-literal=instrumentation-key="YOUR_KEY" \
  -n flamoral
```

#### Verify Prometheus Metrics

```bash
# Port-forward to Prometheus
kubectl port-forward -n monitoring svc/prometheus-server 9090:80

# Open browser to http://localhost:9090
# Verify metrics are being collected
```

#### Access Grafana Dashboards

```bash
# Port-forward to Grafana
kubectl port-forward -n monitoring svc/grafana 3000:80

# Open browser to http://localhost:3000
# Default credentials: admin/admin
# Verify dashboards are populated
```

### Alert Configuration

#### Critical Alerts (PagerDuty/Email)

- Pod crash loops (>3 restarts in 5 minutes)
- API error rate >5%
- Database connection failures
- Certificate expiration <7 days
- Disk usage >85%
- Memory usage >90%

#### Warning Alerts (Slack)

- API latency >500ms (p95)
- Pod CPU throttling
- High request queue depth
- Failed health checks
- Deployment rollout issues

#### Info Alerts (Logging Only)

- New deployment started
- Autoscaling events
- Certificate renewal
- Backup completion

#### Configure Alert Rules

```bash
# Deploy alert rules
kubectl apply -f C:/Users/citad/OneDrive/Documents/Dating/DatingPlatform/monitoring/alerting-rules.yaml

# Verify alerts are configured
kubectl get prometheusrule -n monitoring
```

### Performance Baseline

#### Capture Initial Metrics

```bash
# API response times
curl -w "@curl-format.txt" -o /dev/null -s https://api.flamoral.com/health

# Database query times
kubectl exec -it deployment/api-gateway -n flamoral -- \
  node -e "console.time('db'); /* run query */; console.timeEnd('db')"

# Frontend load time
curl -w "Total: %{time_total}s\n" -o /dev/null -s https://flamoral.com
```

#### Load Testing

```bash
# Install k6
# Run load test
k6 run C:/Users/citad/OneDrive/Documents/Dating/DatingPlatform/tests/load/api-test.js

# Monitor during load test
kubectl top pods -n flamoral
```

### Documentation Updates

- [ ] Update DNS records in documentation
- [ ] Document production endpoints
- [ ] Update architecture diagrams
- [ ] Record deployment timestamp
- [ ] Document any deviations from plan
- [ ] Update runbooks with actual values
- [ ] Share access credentials with team

---

## Rollback Procedures

### Quick Rollback (Application Only)

**Time:** 5-10 minutes

Use this if only application code needs to be reverted, infrastructure is stable.

```bash
# Rollback to previous deployment
kubectl rollout undo deployment/api-gateway -n flamoral
kubectl rollout undo deployment/auth-service -n flamoral
kubectl rollout undo deployment/messaging-service -n flamoral
kubectl rollout undo deployment/web-app -n flamoral

# Verify rollback
kubectl rollout status deployment/api-gateway -n flamoral
kubectl get pods -n flamoral
```

### Full Rollback (Infrastructure + Application)

**Time:** 15-30 minutes

Use this if infrastructure changes need to be reverted.

#### Step 1: Stop Incoming Traffic

```bash
# Scale down ingress replicas
kubectl scale deployment ingress-nginx-controller -n ingress-nginx --replicas=0

# Or update Front Door to maintenance page
az afd route update \
  --endpoint-name flamoral-prod \
  --profile-name flamoral-prod-afd \
  --resource-group flamoral-prod-rg \
  --route-name default-route \
  --enabled-state Disabled
```

#### Step 2: Restore from Backup

```bash
# Restore database backup
az postgres flexible-server restore \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-postgres-restored \
  --source-server flamoral-prod-postgres \
  --restore-time "2025-12-13T10:00:00Z"

# Restore Kubernetes resources from git
git checkout <previous-commit>
kubectl apply -f infrastructure/kubernetes/production/
```

#### Step 3: Revert Terraform Changes

```bash
# Navigate to terraform directory
cd C:/Users/citad/OneDrive/Documents/Dating/DatingPlatform/infrastructure/terraform/environments/prod

# Checkout previous state
git checkout <previous-commit>

# Apply previous configuration
terraform plan
terraform apply
```

#### Step 4: Resume Traffic

```bash
# Scale up ingress
kubectl scale deployment ingress-nginx-controller -n ingress-nginx --replicas=3

# Re-enable Front Door routes
az afd route update \
  --endpoint-name flamoral-prod \
  --profile-name flamoral-prod-afd \
  --resource-group flamoral-prod-rg \
  --route-name default-route \
  --enabled-state Enabled
```

### Data Recovery

#### PostgreSQL Point-in-Time Recovery

```bash
# List available restore points
az postgres flexible-server show \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-postgres \
  --query "backup.earliestRestoreDate"

# Perform restore to specific time
az postgres flexible-server restore \
  --resource-group flamoral-prod-rg \
  --name flamoral-prod-postgres-pitr \
  --source-server flamoral-prod-postgres \
  --restore-time "YYYY-MM-DDTHH:MM:SSZ"
```

#### MongoDB Backup Restore

```bash
# If using MongoDB Atlas, restore from Atlas UI
# If using Azure Cosmos DB:
az cosmosdb sql database restore \
  --account-name flamoral-prod-cosmos \
  --resource-group flamoral-prod-rg \
  --name flamoral-messages \
  --restore-timestamp "YYYY-MM-DDTHH:MM:SSZ"
```

---

## Troubleshooting

### Pods Not Starting

**Symptom:** Pods stuck in Pending, CrashLoopBackOff, or ImagePullBackOff

**Diagnosis:**
```bash
kubectl describe pod <pod-name> -n flamoral
kubectl logs <pod-name> -n flamoral --previous
```

**Common Causes:**
1. **Image pull errors**: Check ACR credentials
   ```bash
   kubectl get secret -n flamoral | grep acr
   ```

2. **Resource constraints**: Check node capacity
   ```bash
   kubectl describe nodes
   kubectl top nodes
   ```

3. **Missing secrets**: Verify External Secrets
   ```bash
   kubectl get externalsecrets -n flamoral
   kubectl describe externalsecret <name> -n flamoral
   ```

### DNS Not Resolving

**Symptom:** Domain names don't resolve or resolve to wrong IP

**Diagnosis:**
```bash
nslookup flamoral.com
dig flamoral.com A
whois flamoral.com | grep "Name Server"
```

**Common Causes:**
1. **Nameservers not updated**: Verify at registrar
2. **DNS propagation pending**: Wait up to 48 hours
3. **Wrong A record**: Check Azure DNS zone

**Fix:**
```bash
# Verify Azure DNS records
az network dns record-set a list \
  --zone-name flamoral.com \
  --resource-group flamoral-prod-rg

# Update if needed
az network dns record-set a update \
  --zone-name flamoral.com \
  --resource-group flamoral-prod-rg \
  --name "@" \
  --set aRecords[0].ipv4Address=48.200.65.15
```

### Certificate Issues

**Symptom:** HTTPS not working, cert-manager errors

**Diagnosis:**
```bash
kubectl describe certificate flamoral-tls -n flamoral
kubectl get certificaterequest -n flamoral
kubectl logs -n cert-manager deployment/cert-manager
```

**Common Causes:**
1. **DNS not ready**: cert-manager needs DNS resolution
2. **Rate limit**: Let's Encrypt limits (5 certs/week per domain)
3. **HTTP-01 challenge failed**: Ingress not accessible

**Fix:**
```bash
# Delete and recreate certificate
kubectl delete certificate flamoral-tls -n flamoral
kubectl apply -f infrastructure/kubernetes/production/flamoral-certificate.yaml

# Check challenge status
kubectl get challenges -n flamoral
kubectl describe challenge <challenge-name> -n flamoral
```

### Front Door 503 Errors

**Symptom:** Front Door returns 503 Service Unavailable

**Diagnosis:**
```bash
# Check origin health
az afd origin show \
  --origin-name flamoral-aks-origin \
  --origin-group-name flamoral-origin-group \
  --profile-name flamoral-prod-afd \
  --resource-group flamoral-prod-rg \
  --query "healthProbeSettings"

# Test origin directly
curl -I https://flamoral.westus2.cloudapp.azure.com/health
```

**Common Causes:**
1. **Origin unhealthy**: AKS ingress not responding
2. **Health probe failing**: /health endpoint not accessible
3. **Routing rules missing**: Front Door routes not configured

**Fix:**
```bash
# Verify ingress health
kubectl get pods -n ingress-nginx
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller

# Re-deploy Front Door routes
cd C:/Users/citad/OneDrive/Documents/Dating/infrastructure/azure
./deploy-frontdoor-routes.sh
```

### Database Connection Errors

**Symptom:** Services can't connect to PostgreSQL/MongoDB

**Diagnosis:**
```bash
kubectl logs deployment/api-gateway -n flamoral | grep -i "database\|postgres\|connection"
```

**Common Causes:**
1. **Wrong credentials**: Check Key Vault secrets
2. **Network policy blocking**: Check firewall rules
3. **Connection pool exhausted**: Check PgBouncer

**Fix:**
```bash
# Test database connectivity from pod
kubectl run -it --rm psql-test --image=postgres:15 --restart=Never -n flamoral -- \
  psql -h <postgres-host> -U <username> -d flamoral -c "SELECT version();"

# Check PgBouncer status
kubectl exec -it deployment/pgbouncer -n flamoral -- \
  psql -p 6432 -U pgbouncer pgbouncer -c "SHOW POOLS;"
```

---

## Contacts and Escalation

### On-Call Rotation

| Role | Primary | Backup | Contact |
|------|---------|--------|---------|
| Platform Lead | [Name] | [Name] | [Phone/Email] |
| DevOps Engineer | [Name] | [Name] | [Phone/Email] |
| Backend Lead | [Name] | [Name] | [Phone/Email] |
| Frontend Lead | [Name] | [Name] | [Phone/Email] |
| DBA | [Name] | [Name] | [Phone/Email] |
| Security Lead | [Name] | [Name] | [Phone/Email] |

### Escalation Matrix

#### Severity Levels

**P0 - Critical (Page Immediately)**
- Complete platform outage
- Data breach or security incident
- Payment processing down
- Database corruption

**Response Time:** 15 minutes
**Escalation:** CTO, Engineering Manager

**P1 - High (Alert On-Call)**
- Partial outage (one service down)
- Severe performance degradation
- Authentication failures
- Critical feature broken

**Response Time:** 30 minutes
**Escalation:** Engineering Manager

**P2 - Medium (Notify During Business Hours)**
- Minor feature broken
- Non-critical service degraded
- Monitoring alerts
- Certificate expiring soon

**Response Time:** 2 hours
**Escalation:** Team Lead

**P3 - Low (Create Ticket)**
- UI glitches
- Documentation updates
- Enhancement requests

**Response Time:** 1 business day
**Escalation:** Product Manager

### Communication Channels

- **Slack**: #production-incidents
- **Email**: devops@flamoral.com
- **PagerDuty**: [Integration Key]
- **Status Page**: status.flamoral.com (if configured)

### External Support

- **Azure Support**: [Support Plan] - [Phone Number]
- **Let's Encrypt Support**: Community forums
- **Stripe Support**: https://support.stripe.com
- **Twilio Support**: [Account Number]

---

## Appendix

### Deployment Artifacts

All deployment artifacts are stored in:
- **Git Repository**: DatingPlatform/infrastructure/
- **Terraform State**: Azure Storage (flamoralprodtfstate)
- **Docker Images**: flamoralacr.azurecr.io
- **Secrets**: Azure Key Vault (5 vaults)
- **Backups**: Azure Backup Vault

### Reference Documentation

- **Architecture**: `ARCHITECTURE.md`
- **Database Schema**: `DATABASE_SCHEMA.md`
- **API Documentation**: `openapi.yaml`
- **Security Compliance**: `SECURITY_COMPLIANCE.md`
- **Rollback Plan**: `ROLLBACK_PLAN.md`
- **CI/CD Guide**: `CICD_IMPLEMENTATION_SUMMARY.md`
- **Cost Optimization**: `COST_MANAGEMENT_GUIDE.md`

### Useful Commands

```bash
# Quick status check
kubectl get all -n flamoral
kubectl top nodes
kubectl top pods -n flamoral

# View logs
kubectl logs -f deployment/api-gateway -n flamoral --tail=100

# Execute command in pod
kubectl exec -it deployment/api-gateway -n flamoral -- sh

# Scale service
kubectl scale deployment api-gateway -n flamoral --replicas=5

# Update image
kubectl set image deployment/api-gateway api-gateway=flamoralacr.azurecr.io/api-gateway:v2.0.1 -n flamoral

# Restart deployment
kubectl rollout restart deployment/api-gateway -n flamoral
```

---

**Document Version:** 2.0.0
**Last Updated:** December 13, 2025
**Maintained By:** Platform Engineering Team
**Review Schedule:** Monthly

---

**End of Production Deployment Guide**

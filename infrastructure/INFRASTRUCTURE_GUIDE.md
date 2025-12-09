# Dating App Infrastructure Guide

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Kubernetes Setup](#kubernetes-setup)
- [Monitoring Stack](#monitoring-stack)
- [Logging Stack](#logging-stack)
- [CI/CD Pipeline](#cicd-pipeline)
- [Deployment Strategies](#deployment-strategies)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

## Overview

This document provides comprehensive guidance for setting up, managing, and maintaining the infrastructure for the Dating App platform.

### Infrastructure Components

- **Kubernetes Cluster**: Orchestration platform (AKS/EKS/GKE)
- **Monitoring**: Prometheus + Grafana
- **Logging**: ELK Stack (Elasticsearch, Logstash, Kibana)
- **Service Mesh**: Istio (optional, for advanced traffic management)
- **CI/CD**: GitHub Actions with security scanning
- **Container Registry**: GitHub Container Registry (GHCR)

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      External Users                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                 NGINX Ingress Controller                     │
│  - SSL/TLS Termination                                       │
│  - Rate Limiting                                             │
│  - Load Balancing                                            │
└────────────────────┬────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
┌──────────────┬──────────────┬──────────────┐
│  API Gateway │   Frontend   │  WebSocket   │
└──────┬───────┴──────────────┴──────┬───────┘
       │                              │
       ▼                              ▼
┌─────────────────────────────────────────────┐
│           Microservices Layer               │
│  - User Service                             │
│  - Matching Service                         │
│  - Media Service                            │
│  - Messaging Service                        │
│  - Notification Service                     │
└──────┬──────────────────────────────┬───────┘
       │                              │
       ▼                              ▼
┌──────────────┐              ┌──────────────┐
│  PostgreSQL  │              │    Redis     │
│   (Primary)  │◄────────────►│   (Cache)    │
└──────────────┘              └──────────────┘
```

### Network Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Kubernetes Cluster                  │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │         Ingress Namespace                   │    │
│  │  - NGINX Ingress Controller                 │    │
│  │  - Cert Manager                             │    │
│  └────────────────────────────────────────────┘    │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │      Application Namespace (dating-app)     │    │
│  │  - API Gateway                              │    │
│  │  - Microservices                            │    │
│  │  - Databases                                │    │
│  │  - Network Policies (Zero Trust)            │    │
│  └────────────────────────────────────────────┘    │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │       Monitoring Namespace                  │    │
│  │  - Prometheus                               │    │
│  │  - Grafana                                  │    │
│  │  - Alertmanager                             │    │
│  └────────────────────────────────────────────┘    │
│                                                      │
│  ┌────────────────────────────────────────────┐    │
│  │         Logging Namespace                   │    │
│  │  - Elasticsearch Cluster                    │    │
│  │  - Logstash                                 │    │
│  │  - Kibana                                   │    │
│  │  - Filebeat (DaemonSet)                     │    │
│  └────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

## Kubernetes Setup

### Prerequisites

1. **Kubernetes Cluster** (v1.25+)
   - Minimum 3 nodes
   - 4 vCPU, 16GB RAM per node
   - 100GB SSD storage per node

2. **kubectl** installed and configured

3. **Helm** v3+ installed

### Initial Setup

#### 1. Create Namespaces

```bash
kubectl create namespace dating-app
kubectl create namespace monitoring
kubectl create namespace logging
kubectl create namespace ingress-nginx
```

#### 2. Label Namespaces

```bash
kubectl label namespace dating-app name=dating-app
kubectl label namespace monitoring name=monitoring
kubectl label namespace logging name=logging
kubectl label namespace ingress-nginx name=ingress-nginx
```

#### 3. Install NGINX Ingress Controller

```bash
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update

helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --set controller.replicaCount=3 \
  --set controller.nodeSelector."kubernetes\.io/os"=linux \
  --set controller.metrics.enabled=true \
  --set controller.service.type=LoadBalancer
```

#### 4. Install Cert Manager (for SSL/TLS)

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

Create ClusterIssuer:

```yaml
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
```

### Deploy Application

#### 1. Apply Secrets (Update values first!)

```bash
kubectl apply -f infrastructure/kubernetes/security/advanced-secrets.yaml
```

#### 2. Apply ConfigMaps

```bash
kubectl apply -f infrastructure/kubernetes/config/advanced-configmaps.yaml
```

#### 3. Deploy Databases

```bash
kubectl apply -f infrastructure/kubernetes/base/postgres-deployment.yaml
kubectl apply -f infrastructure/kubernetes/base/redis-deployment.yaml
```

#### 4. Deploy Services

```bash
# Apply all service deployments
kubectl apply -f apps/api-gateway/k8s/
kubectl apply -f apps/user-service/k8s/
kubectl apply -f apps/matching-service/k8s/
kubectl apply -f apps/media-service/k8s/
kubectl apply -f apps/messaging-service/k8s/
kubectl apply -f apps/notification-service/k8s/
kubectl apply -f apps/websocket-service/k8s/
kubectl apply -f apps/frontend/k8s/
```

#### 5. Apply Network Policies

```bash
kubectl apply -f infrastructure/kubernetes/security/network-policies.yaml
```

#### 6. Apply Ingress

```bash
kubectl apply -f infrastructure/kubernetes/ingress/ingress-nginx.yaml
```

#### 7. Apply Auto-scaling

```bash
kubectl apply -f infrastructure/kubernetes/autoscaling/hpa.yaml
kubectl apply -f infrastructure/kubernetes/autoscaling/vpa.yaml
```

### Verify Deployment

```bash
# Check all pods are running
kubectl get pods -n dating-app

# Check services
kubectl get svc -n dating-app

# Check ingress
kubectl get ingress -n dating-app

# Check HPA status
kubectl get hpa -n dating-app
```

## Monitoring Stack

### Prometheus Setup

#### 1. Create Monitoring Namespace

```bash
kubectl create namespace monitoring
```

#### 2. Deploy Prometheus

```bash
kubectl apply -f infrastructure/monitoring/prometheus/prometheus-complete.yaml
```

#### 3. Deploy Alert Rules

```bash
kubectl apply -f infrastructure/monitoring/prometheus/alert-rules-complete.yaml
```

#### 4. Deploy Alertmanager (Optional)

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install alertmanager prometheus-community/alertmanager \
  --namespace monitoring \
  -f infrastructure/monitoring/alertmanager/alertmanager.yaml
```

### Grafana Setup

#### 1. Deploy Grafana

```bash
kubectl apply -f infrastructure/monitoring/grafana/grafana-complete.yaml
```

#### 2. Access Grafana

Get the admin password:
```bash
kubectl get secret grafana-secrets -n monitoring -o jsonpath="{.data.admin-password}" | base64 -d
```

Port-forward to access locally:
```bash
kubectl port-forward svc/grafana 3000:3000 -n monitoring
```

Access: http://localhost:3000

#### 3. Import Dashboards

The following dashboards are pre-configured:
- **API Gateway Dashboard**: API performance, error rates, response times
- **Database Dashboard**: PostgreSQL metrics, query performance
- **Redis & WebSocket Dashboard**: Cache hit rates, WebSocket connections

Access them at: https://grafana.flamoral.com

### Key Metrics to Monitor

#### Application Metrics
- Request rate (req/s)
- Error rate (%)
- Response time (p50, p95, p99)
- Active connections

#### Infrastructure Metrics
- CPU usage (%)
- Memory usage (%)
- Disk I/O
- Network throughput

#### Database Metrics
- Connection pool utilization
- Query performance
- Cache hit ratio
- Replication lag

## Logging Stack

### Elasticsearch Setup

#### 1. Deploy Elasticsearch Cluster

```bash
kubectl apply -f infrastructure/logging/elasticsearch/elasticsearch-complete.yaml
```

#### 2. Verify Elasticsearch

```bash
# Check cluster status
kubectl exec -it elasticsearch-0 -n logging -- \
  curl -X GET "localhost:9200/_cluster/health?pretty"
```

### Logstash Setup

#### 1. Deploy Logstash

```bash
kubectl apply -f infrastructure/logging/logstash/logstash-complete.yaml
```

#### 2. Deploy Filebeat DaemonSet

Filebeat is included in the Logstash configuration and will be deployed automatically.

### Kibana Setup

#### 1. Deploy Kibana

```bash
kubectl apply -f infrastructure/logging/kibana/kibana-complete.yaml
```

#### 2. Access Kibana

Port-forward:
```bash
kubectl port-forward svc/kibana 5601:5601 -n logging
```

Access: https://kibana.flamoral.com

#### 3. Configure Index Patterns

1. Go to Management > Stack Management > Index Patterns
2. Create pattern: `dating-app-logs-*`
3. Set time field: `@timestamp`
4. Create pattern: `dating-app-errors-*`
5. Create pattern: `dating-app-audit-*`

### Log Levels

- **DEBUG**: Detailed information for debugging
- **INFO**: General information messages
- **WARN**: Warning messages
- **ERROR**: Error events
- **FATAL**: Critical errors

### Searching Logs

#### Example Queries

Find all errors in the last hour:
```
log_level: ERROR AND @timestamp >= now-1h
```

Find slow API requests:
```
duration_ms > 1000 AND http_method: *
```

Find authentication failures:
```
message: "authentication failed" OR message: "login failed"
```

## CI/CD Pipeline

### GitHub Actions Workflow

The complete CI/CD pipeline includes:

1. **Code Quality Checks**
   - ESLint
   - Prettier
   - TypeScript type checking
   - SonarQube analysis

2. **Testing**
   - Unit tests
   - Integration tests
   - Coverage reporting (Codecov)

3. **Security Scanning**
   - npm audit
   - Snyk vulnerability scanning
   - OWASP Dependency Check
   - GitLeaks secret scanning
   - Trivy filesystem and image scanning

4. **Build & Push**
   - Multi-architecture Docker builds (amd64, arm64)
   - Push to GitHub Container Registry
   - Image tagging strategy

5. **Performance Testing**
   - k6 load tests
   - Performance analysis

6. **Deployment**
   - Blue-green deployment to staging
   - Canary deployment to production
   - Database migrations

### Security Scanning Results

All security scans must pass before deployment:
- No CRITICAL vulnerabilities
- No HIGH severity issues in dependencies
- No secrets in code
- Docker images scanned for vulnerabilities

### Performance Testing

Load tests run automatically on staging deployments:
- Ramp up to 500 concurrent users
- Response time thresholds: p95 < 500ms, p99 < 1s
- Error rate threshold: < 1%

## Deployment Strategies

### Blue-Green Deployment

Used for: **Staging environment**

#### How it Works

1. Blue environment runs current stable version
2. Green environment receives new version
3. Test green environment
4. Switch traffic to green
5. Keep blue as fallback for 24 hours

#### Deploy to Green

```bash
# Update green deployment
kubectl set image deployment/api-gateway-green \
  api-gateway=ghcr.io/datingapp/api-gateway:v1.1.0 \
  -n dating-app

# Wait for rollout
kubectl rollout status deployment/api-gateway-green -n dating-app

# Run smoke tests
./tests/smoke-tests.sh https://green.api.flamoral.com
```

#### Switch Traffic

```bash
# Switch service to green
kubectl patch service api-gateway -n dating-app \
  -p '{"spec":{"selector":{"version":"green"}}}'

# Monitor for 30 minutes
./scripts/check-deployment-health.sh green
```

#### Rollback

```bash
# Immediately switch back to blue
kubectl patch service api-gateway -n dating-app \
  -p '{"spec":{"selector":{"version":"blue"}}}'
```

### Canary Deployment

Used for: **Production environment**

#### How it Works

1. Deploy canary version with 10% traffic
2. Monitor metrics for 5 minutes
3. Increase to 25% traffic
4. Monitor for 5 minutes
5. Increase to 50% traffic
6. Monitor for 5 minutes
7. Promote to 100% if all metrics are healthy

#### Manual Canary Rollout

```bash
# Run the automated canary script
cd infrastructure/kubernetes/deployments
./canary-rollout.sh
```

#### Monitor Canary

```bash
./scripts/check-canary-metrics.sh
```

#### Rollback Canary

```bash
# Scale canary to 0
kubectl scale deployment api-gateway-canary --replicas=0 -n dating-app

# Update ingress to 0% canary traffic
kubectl patch ingress api-gateway-canary-ingress -n dating-app \
  -p '{"metadata":{"annotations":{"nginx.ingress.kubernetes.io/canary-weight":"0"}}}'
```

## Security

### Network Policies

All services implement **zero-trust networking**:
- Default deny all ingress/egress
- Explicit allow rules for required communication
- Separate policies for each service

### Secrets Management

**Production**: Use one of these:
- **External Secrets Operator** with AWS Secrets Manager
- **Sealed Secrets** for encrypted secrets in Git
- **HashiCorp Vault** for dynamic secrets

**Never commit real secrets to Git!**

### Pod Security

- Run as non-root user
- Read-only root filesystem where possible
- Drop unnecessary capabilities
- Resource limits enforced

### TLS/SSL

- All external traffic uses TLS 1.2+
- Certificates managed by cert-manager
- Auto-renewal 30 days before expiry

## Troubleshooting

### Common Issues

#### 1. Pods Not Starting

```bash
# Check pod status
kubectl describe pod <pod-name> -n dating-app

# Check logs
kubectl logs <pod-name> -n dating-app --previous
```

Common causes:
- Image pull errors
- Insufficient resources
- Missing ConfigMaps/Secrets
- Failed health checks

#### 2. High Error Rates

```bash
# Check Grafana dashboards
# Check Kibana for error logs

# View recent errors
kubectl logs -l app=api-gateway -n dating-app --tail=100 | grep ERROR
```

#### 3. Database Connection Issues

```bash
# Check PostgreSQL pod
kubectl get pod -l app=postgres -n dating-app

# Test connection
kubectl exec -it <postgres-pod> -n dating-app -- psql -U postgres

# Check connection pool
# View in Grafana: Database Dashboard
```

#### 4. Service Not Receiving Traffic

```bash
# Check service endpoints
kubectl get endpoints <service-name> -n dating-app

# Check ingress
kubectl describe ingress -n dating-app

# Check network policies
kubectl get networkpolicy -n dating-app
```

### Useful Commands

```bash
# Get all resources in namespace
kubectl get all -n dating-app

# Describe deployment
kubectl describe deployment <deployment-name> -n dating-app

# View events
kubectl get events -n dating-app --sort-by='.lastTimestamp'

# Execute command in pod
kubectl exec -it <pod-name> -n dating-app -- /bin/sh

# Copy files from pod
kubectl cp <pod-name>:/path/to/file ./local-file -n dating-app

# Check resource usage
kubectl top pods -n dating-app
kubectl top nodes
```

### Emergency Procedures

#### Complete Service Outage

1. Check Grafana for alerts
2. Check Kibana for error spikes
3. Check infrastructure (nodes, network)
4. Scale up replicas if needed
5. Rollback to previous version if recent deployment

```bash
# Emergency rollback
kubectl rollout undo deployment/api-gateway -n dating-app
```

#### Database Failure

1. Check PostgreSQL pod status
2. Check logs for errors
3. Verify persistent volume
4. Failover to replica if available
5. Contact DBA team

## Maintenance

### Regular Tasks

**Daily:**
- Check Grafana dashboards
- Review critical alerts
- Monitor resource usage

**Weekly:**
- Review application logs in Kibana
- Check security scan results
- Update dependencies

**Monthly:**
- Review and optimize resource requests/limits
- Update Kubernetes cluster
- Rotate credentials and secrets
- Backup validation

### Backup Strategy

**Databases:**
- Automated daily backups
- 30-day retention
- Stored in separate region

**Configuration:**
- All infrastructure as code in Git
- Secrets stored in AWS Secrets Manager
- Regular restore testing

## Support

For issues or questions:
- **DevOps Team**: devops@flamoral.com
- **On-call**: Use PagerDuty
- **Documentation**: https://docs.flamoral.com
- **Runbooks**: infrastructure/runbooks/

---

**Last Updated**: December 2024
**Version**: 1.0.0

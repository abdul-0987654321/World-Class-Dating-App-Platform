# Dating App Kubernetes Infrastructure

Complete Kubernetes infrastructure setup for a world-class dating app platform with enterprise-grade monitoring, logging, and deployment strategies.

## 📁 Directory Structure

```
infrastructure/
├── kubernetes/              # Kubernetes configurations
│   ├── autoscaling/        # HPA and VPA configurations
│   ├── base/               # Base deployments (postgres, redis, services)
│   ├── config/             # ConfigMaps
│   ├── deployments/        # Blue-green and canary deployment configs
│   ├── ingress/            # NGINX Ingress configurations
│   └── security/           # Secrets and network policies
│
├── monitoring/             # Monitoring stack (Prometheus + Grafana)
│   ├── prometheus/         # Prometheus config and alert rules
│   ├── grafana/           # Grafana dashboards
│   └── alertmanager/      # Alert manager configuration
│
├── logging/               # Logging stack (ELK)
│   ├── elasticsearch/     # Elasticsearch cluster configuration
│   ├── logstash/         # Logstash pipelines
│   └── kibana/           # Kibana dashboards and visualizations
│
├── scripts/              # Helper scripts
│   ├── setup-cluster.sh
│   ├── check-deployment-health.sh
│   └── check-canary-metrics.sh
│
├── ansible/              # Ansible playbooks (optional)
├── terraform/            # Terraform IaC (optional)
├── helm/                 # Helm charts
└── docs/                 # Additional documentation
```

## 🚀 Quick Start

### Prerequisites

- Kubernetes cluster (v1.25+)
- kubectl installed
- Helm 3+ installed
- Docker (for local development)

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/dating-app-platform.git
cd dating-app-platform
```

### 2. Setup Kubernetes Cluster

```bash
# Run automated setup script
chmod +x infrastructure/scripts/setup-cluster.sh
./infrastructure/scripts/setup-cluster.sh
```

### 3. Configure Secrets

```bash
# Copy and edit secrets
cp infrastructure/kubernetes/security/advanced-secrets.yaml infrastructure/kubernetes/security/secrets.yaml
# Edit secrets.yaml with your actual values
kubectl apply -f infrastructure/kubernetes/security/secrets.yaml
```

### 4. Deploy Application

```bash
# Deploy everything
kubectl apply -f infrastructure/kubernetes/config/
kubectl apply -f infrastructure/kubernetes/base/
kubectl apply -f apps/*/k8s/
kubectl apply -f infrastructure/kubernetes/ingress/
kubectl apply -f infrastructure/kubernetes/autoscaling/
```

### 5. Deploy Monitoring

```bash
kubectl apply -f infrastructure/monitoring/prometheus/
kubectl apply -f infrastructure/monitoring/grafana/
```

### 6. Deploy Logging

```bash
kubectl apply -f infrastructure/logging/elasticsearch/
kubectl apply -f infrastructure/logging/logstash/
kubectl apply -f infrastructure/logging/kibana/
```

## 📊 Features

### Kubernetes Configuration

✅ **Complete Ingress Setup**
- NGINX Ingress Controller with SSL/TLS
- Rate limiting and security headers
- WebSocket support
- Separate ingresses for API, frontend, media, and WebSocket

✅ **Auto-scaling**
- Horizontal Pod Autoscaler (HPA) for all services
- Vertical Pod Autoscaler (VPA) for databases
- Custom metrics-based scaling
- Intelligent scale-down policies

✅ **ConfigMaps & Secrets**
- Environment-specific configurations
- Feature flags management
- Service discovery configuration
- External Secrets Operator integration

✅ **Network Policies**
- Zero-trust network segmentation
- Explicit allow rules for service communication
- Separate policies for each microservice
- Monitoring and logging access controls

### Monitoring Stack

✅ **Prometheus**
- Complete scrape configurations for all services
- Kubernetes service discovery
- Database and Redis exporters
- Custom application metrics
- 30-day data retention

✅ **Grafana Dashboards**
- **API Gateway Dashboard**: Request rates, error rates, response times
- **Database Dashboard**: PostgreSQL metrics, query performance, connections
- **Redis & WebSocket Dashboard**: Cache performance, WebSocket connections
- Pre-configured alerts and annotations

✅ **Alert Rules**
- Application alerts (error rates, response times)
- Infrastructure alerts (CPU, memory, disk)
- Database alerts (connections, slow queries, replication lag)
- WebSocket alerts (connection errors, message backlog)

### Logging Stack

✅ **Elasticsearch**
- 3-node cluster for high availability
- Index lifecycle management
- 90-day retention with hot-warm-cold-delete policy
- Custom index templates for application logs

✅ **Logstash**
- Multi-input support (Beats, Syslog, HTTP, Kafka)
- Advanced filtering and parsing
- Sensitive data masking
- Separate indices for errors and audit logs

✅ **Kibana**
- Pre-configured dashboards
- Saved searches for common queries
- Index patterns for all log types
- Alert rules for critical errors

✅ **Filebeat**
- DaemonSet for collecting container logs
- Kubernetes metadata enrichment
- Automatic log shipping to Logstash

### CI/CD Pipeline

✅ **Comprehensive Pipeline**
- Code quality checks (ESLint, Prettier, TypeScript)
- Unit and integration tests
- Coverage reporting (Codecov)

✅ **Security Scanning**
- npm audit
- Snyk vulnerability scanning
- OWASP Dependency Check
- GitLeaks secret scanning
- Trivy filesystem and image scanning

✅ **Performance Testing**
- k6 load testing with multiple scenarios
- Automated performance analysis
- Response time and error rate thresholds

✅ **Deployment Strategies**
- Blue-green deployment for staging
- Canary deployment for production
- Automated rollback on failure
- Database migration integration

## 🎯 Deployment Strategies

### Blue-Green Deployment

Perfect for **staging environment** - instant rollback capability.

```bash
# Deploy to green
kubectl set image deployment/api-gateway-green \
  api-gateway=ghcr.io/datingapp/api-gateway:v1.1.0 -n dating-app

# Test green environment
./tests/smoke-tests.sh https://green.api.datingapp.com

# Switch traffic
kubectl patch service api-gateway -n dating-app \
  -p '{"spec":{"selector":{"version":"green"}}}'

# Rollback if needed
kubectl patch service api-gateway -n dating-app \
  -p '{"spec":{"selector":{"version":"blue"}}}'
```

### Canary Deployment

Perfect for **production** - gradual rollout with monitoring.

```bash
# Automated canary rollout
cd infrastructure/kubernetes/deployments
./canary-rollout.sh

# Manual control
kubectl patch ingress api-gateway-canary-ingress -n dating-app \
  -p '{"metadata":{"annotations":{"nginx.ingress.kubernetes.io/canary-weight":"10"}}}'
```

## 📈 Monitoring

### Access Dashboards

**Grafana**: https://grafana.datingapp.com
- Username: admin
- Password: Get from `kubectl get secret grafana-secrets -n monitoring`

**Prometheus**: http://prometheus.monitoring.svc.cluster.local:9090

**Kibana**: https://kibana.datingapp.com

### Key Metrics

**Application:**
- Request rate (req/s)
- Error rate (%)
- Response time (p50, p95, p99)
- Active connections

**Infrastructure:**
- CPU usage (%)
- Memory usage (%)
- Network I/O
- Disk usage

**Database:**
- Active connections
- Query latency
- Cache hit ratio
- Replication lag

## 🔒 Security

### Network Security
- Zero-trust network policies
- Service mesh ready (Istio compatible)
- mTLS between services (optional)
- Pod security policies

### Secrets Management
- External Secrets Operator support
- Sealed Secrets for GitOps
- HashiCorp Vault integration ready
- Encrypted at rest

### Image Security
- Multi-stage Docker builds
- Non-root containers
- Trivy vulnerability scanning
- Image signing with Cosign

### Application Security
- Rate limiting
- CORS configuration
- Security headers (CSP, HSTS, X-Frame-Options)
- Input validation

## 🧪 Testing

### Run Tests Locally

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Performance tests
k6 run tests/performance/load-test.js
```

### Load Testing

```bash
# Run k6 load test
k6 run --out json=results.json tests/performance/load-test.js

# Analyze results
node tests/performance/analyze-results.js results.json
```

## 📖 Documentation

- **[Infrastructure Guide](INFRASTRUCTURE_GUIDE.md)**: Complete setup and maintenance guide
- **[Deployment Guide](DEPLOYMENT_GUIDE.md)**: Deployment procedures and strategies
- **[Azure Terraform Guide](README.md)**: Azure-specific infrastructure

## 🛠️ Useful Commands

```bash
# Check cluster health
kubectl get nodes
kubectl get pods --all-namespaces

# View logs
kubectl logs -f <pod-name> -n dating-app

# Describe resources
kubectl describe pod <pod-name> -n dating-app

# Port forward for local access
kubectl port-forward svc/grafana 3000:3000 -n monitoring

# Check HPA status
kubectl get hpa -n dating-app

# View rollout history
kubectl rollout history deployment/api-gateway -n dating-app

# Health check script
./scripts/check-deployment-health.sh blue
```

## 🔧 Troubleshooting

### Pods Not Starting

```bash
kubectl describe pod <pod-name> -n dating-app
kubectl logs <pod-name> -n dating-app --previous
```

### Service Not Accessible

```bash
kubectl get ingress -n dating-app
kubectl get svc -n dating-app
kubectl get endpoints <service-name> -n dating-app
```

### High Resource Usage

Check Grafana dashboards or:
```bash
kubectl top pods -n dating-app
kubectl top nodes
```

## 📊 Metrics and SLIs

### Service Level Indicators

| Metric | Target | Critical |
|--------|--------|----------|
| Availability | 99.9% | 99.5% |
| Response Time (p95) | < 500ms | < 1000ms |
| Error Rate | < 0.1% | < 1% |
| Database Response | < 100ms | < 500ms |

### Alert Thresholds

| Alert | Warning | Critical |
|-------|---------|----------|
| Error Rate | > 1% | > 5% |
| Response Time | > 1s | > 2s |
| CPU Usage | > 80% | > 90% |
| Memory Usage | > 85% | > 95% |

## 🔄 Maintenance

### Regular Tasks

**Daily:**
- Monitor dashboards
- Review critical alerts
- Check error logs

**Weekly:**
- Review security scans
- Update dependencies
- Analyze performance trends

**Monthly:**
- Review resource allocation
- Update Kubernetes cluster
- Rotate credentials
- Test backup restoration

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## 📞 Support

- **DevOps Team**: devops@datingapp.com
- **On-Call**: PagerDuty
- **Documentation**: https://docs.datingapp.com
- **Issues**: GitHub Issues

## 📄 License

MIT License - see [LICENSE](../LICENSE) file

---

**Built with ❤️ for world-class dating experiences**

Last Updated: December 2024 | Version: 1.0.0

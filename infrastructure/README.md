# Dating App Platform - Infrastructure

This directory contains all infrastructure-as-code (IaC) configurations for deploying and managing the Dating App Platform across multiple environments.

## 📁 Directory Structure

```
infrastructure/
├── ansible/              # Configuration management and deployment automation
│   ├── inventory/        # Host inventories for different environments
│   ├── playbooks/        # Ansible playbooks for various tasks
│   └── ansible.cfg       # Ansible configuration
├── database/            # Database initialization and management scripts
│   ├── init/            # Database initialization SQL scripts
│   └── backup-restore.sh # Backup and restore utilities
├── docker/              # Docker configurations
│   ├── backend/         # Backend services Docker configurations
│   ├── frontend/        # Frontend Docker configurations
│   ├── nginx/           # Nginx reverse proxy configurations
│   └── monitoring/      # Monitoring stack Docker Compose
├── kubernetes/          # Kubernetes manifests
│   ├── base/            # Base Kubernetes resources
│   ├── helm/            # Helm charts
│   ├── monitoring/      # Monitoring stack for K8s
│   └── services/        # Service-specific configurations
├── monitoring/          # Monitoring configurations
│   ├── prometheus/      # Prometheus configuration and alerts
│   └── grafana/         # Grafana datasources and dashboards
└── terraform/           # Infrastructure provisioning
    ├── modules/         # Reusable Terraform modules
    └── environments/    # Environment-specific configurations
```

## 🚀 Quick Start

### Prerequisites

- **Ansible**: 2.14 or higher
- **Docker**: 24.0 or higher
- **Docker Compose**: 2.20 or higher
- **kubectl**: 1.28 or higher
- **Helm**: 3.12 or higher
- **Terraform**: 1.5 or higher
- **AWS CLI**: 2.x (if using AWS)

### 1. Ansible Deployment

Deploy the entire stack using Ansible:

```bash
# Navigate to Ansible directory
cd infrastructure/ansible

# Run the complete deployment playbook
ansible-playbook -i inventory/hosts.yml playbooks/site.yml --limit=production

# Or deploy specific components
ansible-playbook -i inventory/hosts.yml playbooks/setup-docker.yml --limit=staging
ansible-playbook -i inventory/hosts.yml playbooks/setup-database.yml --limit=dev
```

### 2. Docker Deployment

#### Local Development with Docker Compose

```bash
cd infrastructure/docker

# Start all services
docker-compose -f backend/docker-compose.services.yml up -d

# Start monitoring stack
docker-compose -f monitoring/docker-compose.monitoring.yml up -d

# View logs
docker-compose logs -f api-gateway

# Stop services
docker-compose down
```

### 3. Kubernetes Deployment

#### Deploy to Kubernetes Cluster

```bash
cd infrastructure/kubernetes

# Create namespace
kubectl apply -f base/namespace.yaml

# Apply base configurations
kubectl apply -f base/configmap.yaml
kubectl apply -f base/secrets.yaml

# Deploy database and cache
kubectl apply -f base/postgres-deployment.yaml
kubectl apply -f base/redis-deployment.yaml

# Deploy application services
kubectl apply -f base/api-gateway-deployment.yaml

# Deploy ingress
kubectl apply -f base/ingress.yaml

# Check deployment status
kubectl get pods -n dating-app
kubectl get services -n dating-app
```

#### Using Helm Charts

```bash
cd infrastructure/kubernetes/helm

# Install the dating-app chart
helm install dating-app ./dating-app \
  --namespace dating-app \
  --create-namespace \
  --values ./dating-app/values.yaml

# Upgrade release
helm upgrade dating-app ./dating-app \
  --namespace dating-app \
  --values ./dating-app/values.yaml

# Uninstall
helm uninstall dating-app --namespace dating-app
```

### 4. Terraform Infrastructure Provisioning

#### Initialize and Apply

```bash
cd infrastructure/terraform/environments/production

# Initialize Terraform
terraform init

# Plan the infrastructure changes
terraform plan -out=tfplan

# Apply the changes
terraform apply tfplan

# View outputs
terraform output
```

#### For Different Environments

```bash
# Development
cd infrastructure/terraform/environments/dev
terraform init
terraform apply -var-file=terraform.tfvars

# Staging
cd infrastructure/terraform/environments/staging
terraform init
terraform apply -var-file=terraform.tfvars

# Production
cd infrastructure/terraform/environments/production
terraform init
terraform apply
```

## 📊 Monitoring Setup

### Prometheus

Access Prometheus at: `http://prometheus.yourdomain.com:9090`

Prometheus scrapes metrics from:
- Kubernetes API Server
- Application services (Node.js apps)
- PostgreSQL Exporter
- Redis Exporter
- Node Exporter (system metrics)

### Grafana

Access Grafana at: `http://grafana.yourdomain.com:3001`

Default credentials:
- Username: `admin`
- Password: Set via `GRAFANA_ADMIN_PASSWORD` environment variable

Pre-configured dashboards for:
- Application performance metrics
- Database performance
- Redis metrics
- Kubernetes cluster monitoring
- Infrastructure monitoring

### Alerting

Alertmanager handles alerts and sends notifications via:
- Email
- Slack
- PagerDuty
- Webhooks

Alert rules are defined in `monitoring/prometheus/alerts/`

## 🗄️ Database Management

### Initialize Databases

```bash
cd infrastructure/database

# Run initialization scripts
psql -h <host> -U postgres -f init/01-init-databases.sql
psql -h <host> -U postgres -f init/02-configure-replication.sql
```

### Backup and Restore

```bash
cd infrastructure/database

# Create backup
./backup-restore.sh backup production

# List available backups
./backup-restore.sh list production

# Restore from backup
./backup-restore.sh restore /path/to/backup.sql.gz production

# Create point-in-time recovery backup
./backup-restore.sh pitr production
```

## 🔒 Security

### Secrets Management

**Production**: Secrets should NEVER be committed to version control. Use:
- AWS Secrets Manager
- HashiCorp Vault
- Kubernetes Sealed Secrets
- External Secrets Operator

### SSL/TLS Certificates

Certificates are managed by:
- cert-manager (Kubernetes)
- Let's Encrypt (via Certbot)

### Network Security

- VPC with public, private, and database subnets
- Security groups configured for least privilege access
- NAT Gateways for private subnet internet access
- Network ACLs for additional layer of defense

## 📈 Scaling

### Horizontal Pod Autoscaler (HPA)

HPA is configured for all application services:

```yaml
minReplicas: 3
maxReplicas: 10
targetCPUUtilization: 70%
targetMemoryUtilization: 80%
```

### Cluster Autoscaler

EKS cluster autoscaling is enabled in production:

```
Min nodes: 3
Max nodes: 15
```

## 🔄 CI/CD Integration

This infrastructure integrates with GitHub Actions for:
- Automated deployments
- Infrastructure validation
- Security scanning
- Cost estimation

See `.github/workflows/` in the root directory.

## 🛠️ Troubleshooting

### Common Issues

1. **Pods not starting**
   ```bash
   kubectl describe pod <pod-name> -n dating-app
   kubectl logs <pod-name> -n dating-app
   ```

2. **Service connectivity issues**
   ```bash
   kubectl get svc -n dating-app
   kubectl get endpoints -n dating-app
   ```

3. **Database connection errors**
   ```bash
   # Check database service
   kubectl get svc postgres-service -n dating-app

   # Test connection
   kubectl run -it --rm debug --image=postgres:15 --restart=Never -- psql -h postgres-service -U datingapp_prod
   ```

4. **Terraform state lock**
   ```bash
   # Force unlock (use with caution)
   terraform force-unlock <lock-id>
   ```

## 📚 Additional Documentation

- [Ansible Best Practices](./ansible/README.md)
- [Kubernetes Operations Guide](./kubernetes/README.md)
- [Monitoring and Alerting Guide](./monitoring/README.md)
- [Terraform Module Documentation](./terraform/modules/README.md)

## 🤝 Contributing

When adding new infrastructure:
1. Test in development environment first
2. Update documentation
3. Follow naming conventions
4. Add appropriate tags and labels
5. Include monitoring and alerting configurations

## 📞 Support

For infrastructure issues:
- Platform Team: platform@datingapp.com
- On-call: Use PagerDuty for production incidents

## 📝 License

Copyright © 2025 Dating App Platform. All rights reserved.

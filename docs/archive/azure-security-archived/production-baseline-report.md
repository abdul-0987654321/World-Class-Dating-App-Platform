# Flamoral Dating Platform - Production Baseline Report

---

## Header Information

| Field | Value |
|-------|-------|
| **Report Generation Date** | 2025-12-25 |
| **Platform Version/Tag** | v1.0.0 |
| **Environment** | Production |
| **Primary Domain** | flamoral.com |
| **API Domain** | api.flamoral.com |

---

## Infrastructure Inventory

### Backend Services (20 Services)

| # | Service Name | Description | Directory Path |
|---|--------------|-------------|----------------|
| 1 | api-gateway | API Gateway / Request Router | `backend/services/api-gateway` |
| 2 | auth-service | Authentication & Authorization | `backend/services/auth-service` |
| 3 | user-service | User Profile Management | `backend/services/user-service` |
| 4 | matching-service | Match Algorithm & Recommendations | `backend/services/matching-service` |
| 5 | messaging-service | Chat & Messaging | `backend/services/messaging-service` |
| 6 | media-service | Media Upload & Management | `backend/services/media-service` |
| 7 | payment-service | Payment Processing | `backend/services/payment-service` |
| 8 | notification-service | Push & Email Notifications | `backend/services/notification-service` |
| 9 | analytics-service | Usage Analytics & Metrics | `backend/services/analytics-service` |
| 10 | moderation-service | Content Moderation | `backend/services/moderation-service` |
| 11 | admin-service | Admin Panel Backend | `backend/services/admin-service` |
| 12 | automation-service | Workflow Automation | `backend/services/automation-service` |
| 13 | advertising-service | Ad Management | `backend/services/advertising-service` |
| 14 | workflow-engine | Business Process Engine | `backend/services/workflow-engine` |
| 15 | realtime-service | WebSocket & Real-time Features | `backend/services/realtime-service` |
| 16 | policy-service | Policy & Rules Engine | `backend/services/policy-service` |
| 17 | recommendation-service (AI) | AI-powered Recommendations | `backend/services/ai-services/recommendation-service` |
| 18 | dating-coach-service (AI) | AI Dating Coach | `backend/services/ai-services/dating-coach-service` |
| 19 | fraud-detection (AI) | Fraud Detection ML | `backend/services/ai-services/fraud-detection` |
| 20 | nlp-service (AI) | Natural Language Processing | `backend/services/ai-services/nlp-service` |
| 21 | photo-analysis (AI) | Photo Analysis & Verification | `backend/services/ai-services/photo-analysis` |
| 22 | content-generator (AI) | AI Content Generation | `backend/services/ai-services/content-generator` |

### Frontend Applications

| Application | Description |
|-------------|-------------|
| web-app | React-based Web Application |

### Container Registry

| Property | Value |
|----------|-------|
| **Registry URL** | `flamoralprodacr.azurecr.io` |
| **Shared ACR Name** | flamoralacr |
| **Shared Resource Group** | flamoral-shared-rg |

### Kubernetes Configuration

| Property | Value |
|----------|-------|
| **Production Namespace** | `flamoral-prod` |
| **Staging Namespace** | `flamoral-staging` |
| **Development Namespace** | `flamoral-dev` |
| **Kubernetes Version** | 1.28.3 |
| **Network Plugin** | Azure CNI |
| **Network Policy** | Calico |

### Azure Regions (from Terraform Configs)

| Environment | Region | Resource Group |
|-------------|--------|----------------|
| Production | westus2 | flamoral-prod-rg |
| Staging | westus2 | flamoral-staging-rg |
| Development | westus2 | flamoral-dev-rg |

---

## Image Manifest

### Backend Services Image Table

| Service Name | Expected Image | Tag Pattern |
|--------------|----------------|-------------|
| api-gateway | `flamoralprodacr.azurecr.io/api-gateway:${IMAGE_TAG}` | `v*.*.*` or `sha-*` |
| auth-service | `flamoralprodacr.azurecr.io/auth-service:${IMAGE_TAG}` | `v*.*.*` or `sha-*` |
| user-service | `flamoralprodacr.azurecr.io/user-service:${IMAGE_TAG}` | `v*.*.*` or `sha-*` |
| matching-service | `flamoralprodacr.azurecr.io/matching-service:${IMAGE_TAG}` | `v*.*.*` or `sha-*` |
| messaging-service | `flamoralprodacr.azurecr.io/messaging-service:${IMAGE_TAG}` | `v*.*.*` or `sha-*` |
| media-service | `flamoralprodacr.azurecr.io/media-service:${IMAGE_TAG}` | `v*.*.*` or `sha-*` |
| payment-service | `flamoralprodacr.azurecr.io/payment-service:${IMAGE_TAG}` | `v*.*.*` or `sha-*` |
| notification-service | `flamoralprodacr.azurecr.io/notification-service:${IMAGE_TAG}` | `v*.*.*` or `sha-*` |
| analytics-service | `flamoralprodacr.azurecr.io/analytics-service:${IMAGE_TAG}` | `v*.*.*` or `sha-*` |
| moderation-service | `flamoralprodacr.azurecr.io/moderation-service:${IMAGE_TAG}` | `v*.*.*` or `sha-*` |
| admin-service | `flamoralprodacr.azurecr.io/admin-service:${IMAGE_TAG}` | `v*.*.*` or `sha-*` |
| automation-service | `flamoralprodacr.azurecr.io/automation-service:${IMAGE_TAG}` | `v*.*.*` or `sha-*` |
| advertising-service | `flamoralprodacr.azurecr.io/advertising-service:${IMAGE_TAG}` | `v*.*.*` or `sha-*` |
| workflow-engine | `flamoralprodacr.azurecr.io/workflow-engine:${IMAGE_TAG}` | `v*.*.*` or `sha-*` |
| realtime-service | `flamoralprodacr.azurecr.io/realtime-service:${IMAGE_TAG}` | `v*.*.*` or `sha-*` |

### AI Services Image Table

| Service Name | Expected Image | Tag Pattern |
|--------------|----------------|-------------|
| recommendation-service | `flamoralprodacr.azurecr.io/recommendation-service:${IMAGE_TAG}` | `v*.*.*` or `sha-*` |
| dating-coach-service | `flamoralprodacr.azurecr.io/dating-coach-service:${IMAGE_TAG}` | `v*.*.*` or `sha-*` |
| fraud-detection | `flamoralprodacr.azurecr.io/fraud-detection:${IMAGE_TAG}` | `v*.*.*` or `sha-*` |
| nlp-service | `flamoralprodacr.azurecr.io/nlp-service:${IMAGE_TAG}` | `v*.*.*` or `sha-*` |
| photo-analysis | `flamoralprodacr.azurecr.io/photo-analysis:${IMAGE_TAG}` | `v*.*.*` or `sha-*` |
| content-generator | `flamoralprodacr.azurecr.io/content-generator:${IMAGE_TAG}` | `v*.*.*` or `sha-*` |

### Frontend Image Table

| Application | Expected Image | Tag Pattern |
|-------------|----------------|-------------|
| web-app | `flamoralprodacr.azurecr.io/web-app:${IMAGE_TAG}` | `v*.*.*` or `sha-*` |

**Note:** `${IMAGE_TAG}` is a placeholder. In production, use semantic version tags (e.g., `v1.2.3`) or Git SHA digests. Live image digests are captured during CI/CD deployment.

---

## Environment Checklist

### Configuration Verification

- [ ] No dev/staging URLs in production configs
  - Production API URL: `https://api.flamoral.com`
  - Production WS URL: `wss://api.flamoral.com`
  - CORS allowed origins: `https://flamoral.com`, `https://www.flamoral.com`, `https://api.flamoral.com`

- [ ] No shared secrets across environments
  - Secrets managed via Azure Key Vault
  - Environment-specific Key Vaults per environment
  - RBAC-based secret access

- [ ] No `:latest` tags
  - Kyverno policy `block-latest-tag` in **Enforce** mode blocks `:latest` tags
  - CI/CD pipeline uses version tags + SHA digests only
  - Policy applies to `flamoral` namespace

- [ ] Kyverno policies in Enforce mode
  - `block-latest-tag`: Enforce
  - `require-labels`: Enforce
  - `require-ci-deployment`: Enforce
  - `restrict-image-registries`: Enforce
  - `require-resource-limits`: Enforce
  - `require-probes`: Enforce
  - `disallow-privileged`: Enforce
  - `disallow-host-network`: Enforce

---

## Deployment Governance

### Deployment Process

| Stage | Description | Trigger |
|-------|-------------|---------|
| **Build & Test** | Compile, lint, security audit, unit tests | Automatic on push to `main`/`develop` or PR |
| **Docker Build** | Build and push images with version + SHA tags | Manual trigger via `workflow_dispatch` |
| **Image Signing** | Sign images with Cosign (keyless via Sigstore) | Automatic after Docker build |
| **SBOM Generation** | Generate Software Bill of Materials | Automatic after image build |
| **Deploy** | Helm upgrade to target environment | Manual trigger with environment selection |
| **Release** | Create Git tag and GitHub Release | Manual trigger with version input |
| **Rollback** | Helm rollback to previous/specified revision | Manual trigger |

### Approval Requirements

- **Production deploys**: Require `workflow_dispatch` manual trigger
- **Push to main**: Builds only, does NOT auto-deploy to production
- **Break-glass access**: Requires `break-glass-admin` ClusterRole to bypass CI/CD requirement

### Helm Charts

| Chart Name | Version | Description |
|------------|---------|-------------|
| flamoral-platform | 1.0.0 | Complete platform umbrella chart |
| flamoral | 1.0.0 | Main microservices deployment chart |
| dating-api | 1.0.0 | API service chart |
| dating-app | 1.0.0 | Web application chart |
| chat-worker | 1.0.0 | Chat worker service chart |
| media-processor | 1.0.0 | Media processing service chart |

### Helm Chart Dependencies (flamoral-platform)

| Dependency | Version | Repository |
|------------|---------|------------|
| postgresql | 12.x.x | Bitnami |
| redis | 17.x.x | Bitnami |
| mongodb | 13.x.x | Bitnami |
| kafka | 22.x.x | Bitnami |
| prometheus | 15.x.x | prometheus-community |
| grafana | 6.x.x | Grafana |
| jaeger | 0.x.x | jaegertracing |
| loki-stack | 2.x.x | Grafana |

### Git Tag Requirements

- Version format: Semantic versioning (`X.Y.Z`)
- Tag prefix: `v` (e.g., `v1.2.3`)
- Tags are signed and pushed during release workflow
- Changelog generated from commit history

---

## Security Controls

### Image Signing Status

| Control | Status | Details |
|---------|--------|---------|
| **Cosign Signing** | Enabled | Keyless signing via GitHub OIDC/Sigstore |
| **SBOM Generation** | Enabled | Anchore SBOM action generates SPDX format |
| **Image Digests** | Captured | SHA256 digests stored during build |
| **Signature Verification** | Configured | Images signed with `cosign sign --yes` |

### Admission Control (Kyverno)

| Policy | Mode | Severity | Description |
|--------|------|----------|-------------|
| `block-latest-tag` | Enforce | High | Blocks `:latest` tag usage |
| `require-labels` | Enforce | Medium | Requires `app` and `team` labels |
| `require-ci-deployment` | Enforce | High | Requires CI/CD annotation |
| `restrict-image-registries` | Enforce | High | Only allows flamoralprodacr.azurecr.io |
| `require-resource-limits` | Enforce | Medium | Requires CPU/memory limits |
| `require-probes` | Enforce | Medium | Requires readiness/liveness probes |
| `disallow-privileged` | Enforce | Critical | Blocks privileged containers |
| `disallow-host-network` | Enforce | High | Blocks host network access |
| `add-deployment-metadata` | Mutate | N/A | Auto-adds deployment timestamps |

### Network Policies

| Policy Name | Namespace | Description |
|-------------|-----------|-------------|
| `default-deny-all-ingress` | dating-app-production | Deny all ingress by default |
| `default-deny-all-egress` | dating-app-production | Deny all egress by default |
| `api-to-postgres` | dating-app-production | Allow API to PostgreSQL (5432) |
| `api-to-redis` | dating-app-production | Allow API to Redis (6379) |
| `ingress-to-api` | dating-app-production | Allow ingress to API (8080) |
| `ingress-to-web` | dating-app-production | Allow ingress to web (80) |
| `web-to-api` | dating-app-production | Allow web to API |
| `api-to-external` | dating-app-production | Allow HTTPS/SMTP egress |
| `prometheus-scraping` | dating-app-production | Allow Prometheus metrics scraping |
| `chat-worker-policy` | dating-app-production | Chat worker communication |
| `media-processor-policy` | dating-app-production | Media processor communication |
| `allow-dns` | dating-app-production | Allow DNS resolution |

### Pod Security Standards

| Namespace | Enforce Level | Audit Level | Warn Level |
|-----------|---------------|-------------|------------|
| dating-app-production | Restricted | Restricted | Restricted |
| dating-app-staging | Restricted | Restricted | Restricted |
| dating-app-dev | Baseline | Baseline | Baseline |
| logging | Baseline | Restricted | Restricted |
| monitoring | Baseline | Restricted | Restricted |

### Additional Security Controls

| Control | Configuration |
|---------|---------------|
| **WAF (Web Application Firewall)** | Azure Front Door Premium with Prevention mode |
| **Managed WAF Rules** | DefaultRuleSet 1.0, BotManagerRuleSet 1.0 |
| **TLS Version** | Minimum TLS 1.2 enforced |
| **RBAC** | Azure AD integration, Key Vault RBAC |
| **Microsoft Defender** | Enabled on AKS cluster |
| **Azure Policy** | Enabled for governance |
| **Secrets Management** | Azure Key Vault with CSI Driver integration |

---

## Observability

### Monitoring Stack (Prometheus/Grafana)

| Component | Version | Configuration |
|-----------|---------|---------------|
| **Prometheus** | Community Helm Chart 15.x.x | Scrape interval: 15s |
| **Grafana** | 10.2.0 | HTTPS at grafana.flamoral.com |
| **Alertmanager** | Bundled | Alert routing to Slack |

**Prometheus Scrape Targets:**
- API Gateway metrics
- Backend services (user-service, matching-service, messaging-service, etc.)
- Kubernetes nodes
- Kubernetes pods with `prometheus.io/scrape: true` annotation
- PostgreSQL exporter (port 9187)
- Redis exporter (port 9121)
- AKS metrics via Azure SD

**Grafana Datasources:**
- Prometheus (default)
- Loki (log aggregation)
- PostgreSQL (direct database queries)

### Logging Stack (ELK)

| Component | Version | Configuration |
|-----------|---------|---------------|
| **Elasticsearch** | 8.10.2 | 3-node cluster with zone redundancy |
| **Kibana** | Bundled | UI for log visualization |
| **Filebeat** | DaemonSet | Log collection from all nodes |
| **Logstash** | Deployed | Log processing pipeline |

**Elasticsearch Configuration:**
- Cluster name: `dating-app-logs`
- X-Pack security enabled
- Transport SSL enabled
- Index lifecycle management (ILM) enabled
- Log retention: 90 days (hot -> warm -> cold -> delete)
- Storage: 200Gi per node (fast-ssd StorageClass)

### Tracing (Jaeger)

| Component | Replicas | Configuration |
|-----------|----------|---------------|
| **Jaeger Collector** | 3 (HPA: 3-10) | gRPC, Thrift, OTLP receivers |
| **Jaeger Query** | 2 | UI at tracing.flamoral.com |
| **Jaeger Agent** | DaemonSet | Host network mode |

**Storage Backend:** Elasticsearch
- Index: `jaeger-span`
- Max span age: 720 hours (30 days)
- 5 shards, 1 replica

**Supported Protocols:**
- gRPC (14250)
- Thrift HTTP (14268)
- Thrift Compact (6831)
- Thrift Binary (6832)
- OTLP gRPC (4317)
- OTLP HTTP (4318)
- Zipkin (9411)

### Observability URLs (Production)

| Service | URL | Purpose |
|---------|-----|---------|
| Grafana | https://grafana.flamoral.com | Dashboards & Metrics |
| Jaeger | https://tracing.flamoral.com | Distributed Tracing |
| Kibana | Internal | Log Visualization |

---

## Infrastructure Summary

### Azure Resources (Production)

| Resource Type | Name Pattern | SKU/Tier |
|--------------|--------------|----------|
| AKS Cluster | flamoral-prod-aks | Standard with Defender |
| PostgreSQL Flexible Server | flamoral-prod-postgres | GP_Standard_D4s_v3 (HA) |
| Redis Cache | flamoral-prod-redis | Premium P1 (Zone Redundant) |
| Storage Account | flamoralprod* | Standard GRS |
| Key Vault | flamoral-prod-kv-* | Premium |
| SignalR Service | flamoral-prod-signalr | Premium_P1 |
| CDN Profile | flamoral-prod-cdn | Standard_Microsoft |
| Front Door | flamoral-prod-afd | Premium_AzureFrontDoor |
| Log Analytics | flamoral-prod-logs | PerGB2018 (90 day retention) |
| Application Insights | flamoral-prod-appinsights | Web type |

### Node Configuration

| Node Pool | VM Size | Count | Auto-scaling |
|-----------|---------|-------|--------------|
| System | Standard_D4s_v3 | 3 | 3-5 nodes |
| User | Standard_D8s_v3 | 3 | 3-20 nodes |

Both node pools are zone-redundant (zones 1, 2, 3).

---

## Document Control

| Field | Value |
|-------|-------|
| **Document Owner** | DevOps Team |
| **Last Updated** | 2025-12-25 |
| **Review Frequency** | Monthly |
| **Classification** | Internal |

---

*This document represents the production baseline state of the Flamoral Dating Platform. Any deviations from this baseline should be documented and approved through change management processes.*

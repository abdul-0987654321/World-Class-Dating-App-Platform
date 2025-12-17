# Kubernetes Cost Optimization Deployment Guide
# Flamoral Dating Platform

**Created:** 2025-12-13
**Version:** 1.0
**Target Savings:** 40-60% infrastructure cost reduction

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Deployment Instructions](#deployment-instructions)
4. [Verification](#verification)
5. [Monitoring](#monitoring)
6. [Rollback Procedures](#rollback-procedures)
7. [Cost Projections](#cost-projections)

---

## Overview

This deployment implements comprehensive cost optimization for the Flamoral Kubernetes cluster on Azure AKS. The optimization strategy includes:

- **Resource Right-Sizing**: Optimized CPU/memory requests and limits
- **Horizontal Pod Autoscaling (HPA)**: Dynamic scaling based on traffic
- **Vertical Pod Autoscaling (VPA)**: Automatic resource optimization recommendations
- **Spot Instances**: 70% cost savings for non-critical workloads
- **Pod Disruption Budgets**: Zero-downtime updates without over-provisioning
- **Resource Quotas**: Prevent resource sprawl

### Expected Outcomes

- **40-60% cost reduction** on infrastructure
- **Zero degradation** in performance
- **Improved reliability** through proper resource allocation
- **Automated scaling** to handle traffic variations

---

## Architecture

### Service Classification

Services are classified into 4 tiers for cost optimization:

#### 1. Critical Services (Payment, Auth)
- **Min Replicas:** 2 (always running)
- **Max Replicas:** 8
- **Resources:** Guaranteed
- **Node Type:** On-demand only
- **Auto-scaling Threshold:** 65% CPU

#### 2. High Traffic Services (API Gateway, User Service)
- **Min Replicas:** 2
- **Max Replicas:** 10
- **Resources:** High baseline
- **Node Type:** On-demand only
- **Auto-scaling Threshold:** 70% CPU

#### 3. Medium Traffic Services (Messaging, Matching, Media)
- **Min Replicas:** 1
- **Max Replicas:** 5
- **Resources:** Moderate
- **Node Type:** Spot preferred
- **Auto-scaling Threshold:** 75% CPU

#### 4. Low Traffic Services (Analytics, Admin, Advertising)
- **Min Replicas:** 1
- **Max Replicas:** 3
- **Resources:** Minimal
- **Node Type:** Spot required
- **Auto-scaling Threshold:** 80% CPU

---

## Deployment Instructions

### Prerequisites

```bash
# Ensure you're connected to the correct cluster
az aks get-credentials --resource-group flamoral-rg --name flamoral-aks

# Verify connection
kubectl cluster-info
kubectl get nodes

# Install Metrics Server (required for HPA)
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Install VPA (optional but recommended)
git clone https://github.com/kubernetes/autoscaler.git
cd autoscaler/vertical-pod-autoscaler
./hack/vpa-up.sh
```

### Phase 1: Create Spot Instance Node Pool (Week 1)

```bash
# Create spot instance node pool for cost savings
az aks nodepool add \
  --resource-group flamoral-rg \
  --cluster-name flamoral-aks \
  --name spotnp \
  --priority Spot \
  --eviction-policy Delete \
  --spot-max-price -1 \
  --enable-cluster-autoscaler \
  --min-count 1 \
  --max-count 10 \
  --node-vm-size Standard_D2s_v3 \
  --node-taints kubernetes.azure.com/scalesetpriority=spot:NoSchedule \
  --labels kubernetes.azure.com/scalesetpriority=spot

# Verify node pool creation
az aks nodepool list \
  --resource-group flamoral-rg \
  --cluster-name flamoral-aks \
  --output table
```

### Phase 2: Deploy Resource Quotas and Limits (Week 1)

```bash
# Create namespaces if they don't exist
kubectl create namespace flamoral --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace flamoral-staging --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace flamoral-dev --dry-run=client -o yaml | kubectl apply -f -

# Apply resource quotas and limit ranges
kubectl apply -f production/cost-optimization/namespace-quotas.yaml

# Verify quotas
kubectl describe quota flamoral-production-quota -n flamoral
kubectl describe limitrange flamoral-production-limits -n flamoral
```

### Phase 3: Deploy VPA (Week 1-2)

```bash
# Deploy VPA configs in "Off" mode first (recommendations only)
kubectl apply -f production/autoscaling/vpa-configs.yaml

# Verify VPA installation
kubectl get vpa -n flamoral

# Wait 1 week to collect recommendations
# Check VPA recommendations after 1 week:
kubectl describe vpa -n flamoral
```

### Phase 4: Deploy Pod Disruption Budgets (Week 2)

```bash
# Apply PDBs for zero-downtime updates
kubectl apply -f production/cost-optimization/pod-disruption-budgets.yaml

# Verify PDBs
kubectl get pdb -n flamoral
kubectl describe pdb -n flamoral
```

### Phase 5: Deploy Optimized Deployments (Week 2)

Start with low-traffic services, then medium, then high-traffic/critical:

```bash
# Low traffic services first (safe to test)
kubectl apply -f production/deployments/admin-service-optimized.yaml
kubectl apply -f production/deployments/analytics-service-optimized.yaml

# Monitor for 24 hours, then proceed to medium traffic
kubectl apply -f production/deployments/messaging-service-optimized.yaml
kubectl apply -f production/deployments/matching-service-optimized.yaml

# Monitor for 48 hours, then high traffic
kubectl apply -f production/deployments/api-gateway-optimized.yaml
kubectl apply -f production/deployments/auth-service-optimized.yaml

# Verify deployments
kubectl get deployments -n flamoral
kubectl get pods -n flamoral -o wide
```

### Phase 6: Deploy HPA (Week 3)

```bash
# Deploy HPA configurations
kubectl apply -f production/autoscaling/hpa-configs.yaml

# Verify HPA
kubectl get hpa -n flamoral
kubectl describe hpa -n flamoral

# Watch autoscaling in action
kubectl get hpa -n flamoral --watch
```

### Phase 7: Enable VPA Auto Mode (Week 4 - Optional)

After collecting 2-3 weeks of recommendations:

```bash
# For low-traffic services only, enable Auto mode
# Edit vpa-configs.yaml and change updateMode from "Off" to "Auto" for selected services
# Then reapply
kubectl apply -f production/autoscaling/vpa-configs.yaml
```

---

## Verification

### Check Resource Allocation

```bash
# View resource requests/limits across all pods
kubectl describe nodes | grep -A 5 "Allocated resources"

# Check specific service resources
kubectl get pods -n flamoral -o custom-columns=\
NAME:.metadata.name,\
CPU_REQ:.spec.containers[*].resources.requests.cpu,\
MEM_REQ:.spec.containers[*].resources.requests.memory,\
CPU_LIM:.spec.containers[*].resources.limits.cpu,\
MEM_LIM:.spec.containers[*].resources.limits.memory
```

### Monitor Autoscaling

```bash
# Watch HPA status
kubectl get hpa -n flamoral --watch

# Check current replica counts
kubectl get deployments -n flamoral

# View HPA events
kubectl describe hpa <service-name>-hpa -n flamoral
```

### Verify Spot Instance Usage

```bash
# Check which pods are on spot instances
kubectl get pods -n flamoral -o wide | grep spot

# Monitor spot instance evictions
kubectl get events -n flamoral --sort-by='.lastTimestamp' | grep -i evict
```

### Check Cost Metrics

```bash
# View resource utilization
kubectl top nodes
kubectl top pods -n flamoral

# Check quota usage
kubectl describe quota flamoral-production-quota -n flamoral
```

---

## Monitoring

### Prometheus Queries

Add these queries to your Grafana dashboards:

```promql
# CPU Request vs Usage (identify over-provisioning)
(
  avg(rate(container_cpu_usage_seconds_total{namespace="flamoral"}[5m])) by (pod)
  /
  avg(kube_pod_container_resource_requests{namespace="flamoral",resource="cpu"}) by (pod)
) * 100

# Memory Request vs Usage
(
  avg(container_memory_working_set_bytes{namespace="flamoral"}) by (pod)
  /
  avg(kube_pod_container_resource_requests{namespace="flamoral",resource="memory"}) by (pod)
) * 100

# HPA Current Replicas
kube_horizontalpodautoscaler_status_current_replicas{namespace="flamoral"}

# Spot Instance Pod Count
count(kube_pod_info{namespace="flamoral",node=~".*spot.*"})

# Cost Savings Estimate (70% savings on spot)
sum(
  kube_pod_info{namespace="flamoral",node=~".*spot.*"}
  * on(pod) group_left()
  avg_over_time(kube_pod_container_resource_requests{resource="cpu"}[1h])
) * 0.7
```

### Azure Monitor

```bash
# View AKS cluster metrics
az monitor metrics list \
  --resource-group flamoral-rg \
  --resource flamoral-aks \
  --resource-type Microsoft.ContainerService/managedClusters \
  --metric-names "node_cpu_usage_percentage" "node_memory_working_set_percentage"

# Check spot instance interruption rate
az aks nodepool show \
  --resource-group flamoral-rg \
  --cluster-name flamoral-aks \
  --name spotnp \
  --query "{Priority:priority,Count:count,ProvisioningState:provisioningState}"
```

### Set Up Alerts

```yaml
# Example alert for high quota usage
apiVersion: v1
kind: ConfigMap
metadata:
  name: cost-optimization-alerts
  namespace: flamoral
data:
  alerts.yaml: |
    groups:
    - name: cost-optimization
      rules:
      - alert: QuotaNearLimit
        expr: (kube_resourcequota{type="used"} / kube_resourcequota{type="hard"}) > 0.85
        for: 10m
        annotations:
          summary: "Resource quota near limit"

      - alert: SpotEvictionRateHigh
        expr: rate(kube_node_status_condition{condition="Ready",status="false"}[1h]) > 0.1
        for: 5m
        annotations:
          summary: "Spot instance eviction rate > 10%"

      - alert: HPAMaxReplicasReached
        expr: kube_horizontalpodautoscaler_status_current_replicas >= kube_horizontalpodautoscaler_spec_max_replicas
        for: 15m
        annotations:
          summary: "HPA at max replicas - consider increasing limit"
```

---

## Rollback Procedures

### Quick Rollback

If issues arise, rollback in reverse order:

```bash
# 1. Disable HPA (go back to manual replicas)
kubectl delete hpa --all -n flamoral

# 2. Rollback deployments to previous version
kubectl rollout undo deployment/<service-name> -n flamoral

# 3. Remove PDBs if they're blocking updates
kubectl delete pdb --all -n flamoral

# 4. Disable VPA
kubectl delete vpa --all -n flamoral

# 5. Remove spot instance node pool (last resort)
az aks nodepool delete \
  --resource-group flamoral-rg \
  --cluster-name flamoral-aks \
  --name spotnp
```

### Service-Specific Rollback

```bash
# Rollback single service
kubectl rollout undo deployment/<service-name> -n flamoral

# Check rollback status
kubectl rollout status deployment/<service-name> -n flamoral

# View rollback history
kubectl rollout history deployment/<service-name> -n flamoral
```

---

## Cost Projections

### Before Optimization

| Category | Monthly Cost |
|----------|--------------|
| 3x D2s_v3 nodes (on-demand) | $270 |
| Over-provisioned resources | +$100 |
| Always-on low-traffic services | +$80 |
| **Total** | **~$450/month** |

### After Optimization

| Category | Monthly Cost | Savings |
|----------|--------------|---------|
| 2x D2s_v3 regular nodes | $180 | -$90 |
| 3x D2s_v3 spot nodes (avg) | $27 | -$63 |
| Right-sized resources | $0 | -$100 |
| Autoscaling (off-hours) | $0 | -$80 |
| **Total** | **~$207/month** | **-$243 (54%)** |

### ROI Analysis

- **Investment**: 20 hours setup/testing (~$2,000 engineering time)
- **Monthly Savings**: $243
- **Annual Savings**: $2,916
- **Payback Period**: < 1 month
- **3-Year ROI**: $8,748 savings

---

## Success Metrics

Track these KPIs to measure optimization success:

### Cost Metrics
- [ ] Infrastructure cost reduced by 40-60%
- [ ] Spot instance usage at 50%+ of total pods
- [ ] Resource utilization improved to 60-70%

### Performance Metrics
- [ ] p95 latency increase < 50ms
- [ ] Error rate increase < 0.1%
- [ ] Zero customer-impacting incidents

### Operational Metrics
- [ ] Deployment frequency unchanged
- [ ] Rollback rate unchanged
- [ ] Alert fatigue not increased

---

## Troubleshooting

### Common Issues

#### HPA Not Scaling

```bash
# Check metrics server
kubectl get apiservice v1beta1.metrics.k8s.io
kubectl top nodes  # Should show metrics

# Check HPA status
kubectl describe hpa <service-name>-hpa -n flamoral
```

#### Pods Stuck Pending on Spot Nodes

```bash
# Check spot node availability
kubectl get nodes -l kubernetes.azure.com/scalesetpriority=spot

# If no spot nodes, pods will stay pending
# Solution: Allow fallback to regular nodes or wait for spot availability
```

#### Resource Quota Exceeded

```bash
# Check quota usage
kubectl describe quota flamoral-production-quota -n flamoral

# Temporarily increase quota if needed
kubectl edit quota flamoral-production-quota -n flamoral
```

#### VPA Recommendations Not Appearing

```bash
# VPA needs 24-48 hours to generate recommendations
# Check VPA status
kubectl describe vpa <service-name>-vpa -n flamoral

# View VPA logs
kubectl logs -n kube-system deployment/vpa-recommender
```

---

## Next Steps

After successful deployment:

1. **Week 1-2**: Monitor metrics and alerts closely
2. **Week 3-4**: Fine-tune HPA thresholds based on traffic patterns
3. **Month 2**: Review VPA recommendations and adjust resource requests
4. **Month 3**: Consider implementing CronJob-based scaling for predictable off-hours
5. **Quarterly**: Review and optimize based on growth and changing patterns

---

## Support

For issues or questions:

- **Documentation**: Check `production/cost-optimization/resource-recommendations.yaml`
- **Monitoring**: Review Grafana dashboards
- **Logs**: Check pod logs with `kubectl logs -n flamoral <pod-name>`
- **Azure Support**: Contact Azure support for node pool or AKS issues

---

**Last Updated**: 2025-12-13
**Maintained By**: Flamoral DevOps Team
**Review Schedule**: Monthly

# Cost Optimization for Flamoral Dating Platform
# Kubernetes Resource Configurations

**Last Updated**: 2025-12-13
**Status**: Ready for Deployment
**Estimated Savings**: 40-60% ($243/month)

---

## Quick Links

- **Getting Started**: [QUICK_START_CHECKLIST.md](../QUICK_START_CHECKLIST.md)
- **Full Deployment Guide**: [COST_OPTIMIZATION_DEPLOYMENT_GUIDE.md](../COST_OPTIMIZATION_DEPLOYMENT_GUIDE.md)
- **Executive Summary**: [COST_OPTIMIZATION_SUMMARY.md](../COST_OPTIMIZATION_SUMMARY.md)

---

## What's Included

This directory contains comprehensive cost optimization configurations for the Flamoral Kubernetes cluster on Azure AKS.

### Files in This Directory

#### 1. `resource-recommendations.yaml`
**Comprehensive resource optimization guide**

Contains:
- Detailed resource requests/limits for all 17 microservices
- Service tier classifications (Critical, High, Medium, Low)
- Cost projections and ROI analysis
- Implementation checklist
- Monitoring queries (Prometheus + Azure CLI)
- Monthly cost estimates: $67-$186 (optimized) vs $167-$376 (baseline)

**Use this for**: Understanding resource allocations per service

#### 2. `namespace-quotas.yaml`
**Resource quotas and limits to prevent cost sprawl**

Contains:
- Production namespace: 20 CPU / 40Gi RAM limit
- Staging namespace: 10 CPU / 20Gi RAM limit
- Development namespace: 5 CPU / 10Gi RAM limit
- LimitRanges with sensible defaults per container
- Priority Classes for intelligent scheduling
- Monitoring scripts and alerts

**Use this for**: Setting hard limits on total resource usage

#### 3. `pod-disruption-budgets.yaml`
**Zero-downtime rolling updates without over-provisioning**

Contains:
- PDBs for all 17 services
- Critical services: minAvailable=2 (always maintain 2 pods)
- High traffic: minAvailable=1
- Medium traffic: maxUnavailable=50%
- Low traffic: maxUnavailable=1 (aggressive updates)

**Use this for**: Enabling safe, cost-effective deployments

#### 4. `spot-instance-config.yaml`
**Spot instance configuration for 70% cost savings**

Contains:
- Azure CLI commands to create spot node pools
- Node affinity rules per service tier
- Spot eviction handling guidance
- Service classification (spot-required, spot-preferred, regular-only)
- Monitoring queries for spot instance health
- Example deployments with spot affinity

**Use this for**: Implementing spot instances for massive savings

---

## Directory Structure

```
production/
├── autoscaling/
│   ├── hpa-configs.yaml           # Horizontal Pod Autoscaler (all services)
│   └── vpa-configs.yaml           # Vertical Pod Autoscaler (all services)
├── cost-optimization/
│   ├── README.md                  # This file
│   ├── resource-recommendations.yaml
│   ├── namespace-quotas.yaml
│   ├── pod-disruption-budgets.yaml
│   └── spot-instance-config.yaml
├── deployments/
│   ├── api-gateway-optimized.yaml
│   ├── auth-service-optimized.yaml
│   └── messaging-service-optimized.yaml
├── COST_OPTIMIZATION_DEPLOYMENT_GUIDE.md
├── COST_OPTIMIZATION_SUMMARY.md
└── QUICK_START_CHECKLIST.md
```

---

## Service Tiers & Resource Allocation

### Tier 1: Critical Services
**Services**: auth-service, payment-service
**Characteristics**:
- Always maintain 2+ replicas
- Guaranteed resources (no limits >> requests)
- Regular nodes only (NO spot instances)
- Lower autoscaling thresholds (65% CPU)
- Strict Pod Disruption Budgets

**Why**: Cannot tolerate any downtime, handle money/security

### Tier 2: High Traffic Services
**Services**: api-gateway, user-service
**Characteristics**:
- Minimum 2 replicas for HA
- Higher resource baselines
- Regular nodes only
- Moderate autoscaling (70% CPU)
- Pod anti-affinity for distribution

**Why**: Handle majority of user traffic, need consistent performance

### Tier 3: Medium Traffic Services
**Services**: messaging, matching, realtime, notification, media
**Characteristics**:
- Can scale to 1 replica during low traffic
- Balanced resource allocation
- PREFER spot instances (can fallback to regular)
- Standard autoscaling (75% CPU)
- Can tolerate brief interruptions

**Why**: Important but not critical, can handle pod restarts

### Tier 4: Low Traffic Services
**Services**: analytics, admin, advertising, moderation, automation, policy, workflow
**Characteristics**:
- Minimal resource allocation
- REQUIRE spot instances for savings
- Aggressive autoscaling (80% CPU)
- Can scale to 0 during off-hours
- Very tolerant of disruptions

**Why**: Asynchronous or low-usage, maximize cost savings

---

## Cost Breakdown

### Before Optimization
| Component | Monthly Cost |
|-----------|--------------|
| 3x D2s_v3 on-demand nodes | $270 |
| Over-provisioned resources | +$100 |
| Always-on services | +$80 |
| **TOTAL** | **$450** |

### After Optimization
| Component | Monthly Cost | Savings |
|-----------|--------------|---------|
| 2x D2s_v3 regular nodes | $180 | -$90 |
| 3x D2s_v3 spot nodes | $27 | -$63 |
| Right-sized resources | - | -$100 |
| Autoscaling | - | -$80 |
| **TOTAL** | **$207** | **-$243 (54%)** |

### Savings Sources
1. **Spot Instances**: $63/month (using spot for 50% of workloads)
2. **Node Reduction**: $90/month (from 3 to 2 regular nodes)
3. **Right-Sizing**: $100/month (eliminating over-provisioning)
4. **Autoscaling**: $80/month (scaling down during off-hours)

---

## Deployment Overview

### Phase 1: Week 1 - Foundation
1. Create spot instance node pool
2. Deploy resource quotas
3. Deploy VPA in monitoring mode
4. Begin collecting metrics

### Phase 2: Week 2 - Optimization
1. Deploy Pod Disruption Budgets
2. Roll out optimized deployments (low → medium → high traffic)
3. Monitor resource usage
4. Review VPA recommendations

### Phase 3: Week 3 - Autoscaling
1. Deploy HPA configs
2. Test scale-up and scale-down
3. Fine-tune thresholds
4. Validate performance

### Phase 4: Week 4 - Advanced
1. Enable VPA auto-mode for low-traffic services
2. Implement scheduled scaling
3. Set up cost alerts
4. Document results

---

## Monitoring & Alerts

### Key Metrics to Track

**Cost Metrics**:
- Total monthly infrastructure cost
- Cost per service
- Spot instance savings
- Resource utilization rate

**Performance Metrics**:
- Error rate (target: <0.1%)
- p95 latency (baseline ±50ms)
- Availability (99.9% for critical)
- Pod restart rate (<5%/day)

**Operational Metrics**:
- HPA scaling events
- VPA recommendations
- Spot eviction rate
- Quota usage (target: 70-85%)

### Prometheus Queries

```promql
# Over-provisioning detection
(container_cpu_usage / kube_pod_resource_requests{resource="cpu"}) * 100

# Spot instance cost savings
sum(kube_pod_info{node=~".*spot.*"}) * 0.7

# Quota usage
(kube_resourcequota{type="used"} / kube_resourcequota{type="hard"}) * 100
```

---

## Risk Mitigation

### Identified Risks & Mitigations

1. **Spot Instance Evictions**
   - **Risk**: Pods terminated with 30s notice
   - **Mitigation**: Only non-critical services, HPA ensures quick replacement
   - **Impact**: Low

2. **Resource Exhaustion**
   - **Risk**: Hitting quota limits
   - **Mitigation**: Alerts at 85%, quotas set at 150% expected peak
   - **Impact**: Low

3. **Performance Degradation**
   - **Risk**: Under-provisioned resources
   - **Mitigation**: Conservative requests, fast HPA scale-up
   - **Impact**: Low

4. **Autoscaling Flapping**
   - **Risk**: Rapid scale up/down cycles
   - **Mitigation**: Stabilization windows, careful threshold tuning
   - **Impact**: Medium

---

## Success Criteria

After 4 weeks of deployment:

### Must-Have ✅
- [ ] Infrastructure cost reduced by ≥40%
- [ ] Zero increase in error rates
- [ ] p95 latency increase <50ms
- [ ] All critical services maintain 99.9% uptime

### Should-Have ✅
- [ ] Infrastructure cost reduced by ≥50%
- [ ] Resource utilization 60-70%
- [ ] Spot instance usage ≥50%
- [ ] Automated cost reporting

---

## Rollback Plan

If critical issues occur:

```bash
# Quick rollback steps
kubectl delete hpa --all -n flamoral
kubectl rollout undo deployment/<service> -n flamoral
kubectl delete pdb <pdb-name> -n flamoral

# Full rollback
az aks nodepool delete --name spotnp \
  --resource-group flamoral-rg \
  --cluster-name flamoral-aks
```

---

## Next Steps

1. **Review** this README and deployment guide
2. **Prepare** monitoring dashboards
3. **Execute** Week 1 of deployment plan
4. **Monitor** metrics daily during rollout
5. **Optimize** based on actual usage patterns

---

## Support & Documentation

- **Deployment Guide**: [../COST_OPTIMIZATION_DEPLOYMENT_GUIDE.md](../COST_OPTIMIZATION_DEPLOYMENT_GUIDE.md)
- **Quick Start**: [../QUICK_START_CHECKLIST.md](../QUICK_START_CHECKLIST.md)
- **Summary**: [../COST_OPTIMIZATION_SUMMARY.md](../COST_OPTIMIZATION_SUMMARY.md)
- **Kubernetes Docs**: https://kubernetes.io/docs/
- **Azure AKS Docs**: https://docs.microsoft.com/azure/aks/

---

## Change Log

### 2025-12-13 - Initial Implementation
- Created comprehensive cost optimization configs
- Defined 4-tier service classification
- Set up HPA for 17 services
- Configured VPA in monitoring mode
- Created spot instance strategy
- Established resource quotas
- Documented deployment plan

**Estimated Impact**: $243/month savings (54% reduction)
**Implementation Time**: 4 weeks
**Risk Level**: Low (conservative approach, gradual rollout)

---

**Questions? Issues? Improvements?**

Contact the DevOps team or create an issue in the project repository.

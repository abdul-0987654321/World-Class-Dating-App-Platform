# Cost Optimization Quick Start Checklist
# Flamoral Dating Platform - Kubernetes

**Use this checklist to deploy cost optimizations step-by-step**

---

## Pre-Deployment Checklist

- [ ] Azure CLI installed and authenticated
- [ ] kubectl configured for flamoral-aks cluster
- [ ] Metrics Server installed in cluster
- [ ] Backup of current deployments created
- [ ] Monitoring dashboards ready
- [ ] Team briefed on deployment plan
- [ ] Rollback plan reviewed and understood

---

## Week 1: Foundation Setup

### Day 1-2: Spot Instance Node Pool

```bash
# Create spot instance node pool
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
```

- [ ] Spot node pool created
- [ ] Verify with: `az aks nodepool list --resource-group flamoral-rg --cluster-name flamoral-aks`
- [ ] Confirm at least 1 spot node is running: `kubectl get nodes -l kubernetes.azure.com/scalesetpriority=spot`

### Day 2-3: Resource Quotas

```bash
# Apply resource quotas
kubectl apply -f production/cost-optimization/namespace-quotas.yaml
```

- [ ] Quotas applied to flamoral namespace
- [ ] Quotas applied to flamoral-staging namespace
- [ ] Quotas applied to flamoral-dev namespace
- [ ] Verify: `kubectl describe quota -n flamoral`
- [ ] Verify: `kubectl describe limitrange -n flamoral`

### Day 3-5: VPA Setup

```bash
# Deploy VPA configurations (Off mode for monitoring)
kubectl apply -f production/autoscaling/vpa-configs.yaml
```

- [ ] VPA deployed for all 17 services
- [ ] All VPAs in "Off" mode initially
- [ ] Verify: `kubectl get vpa -n flamoral`
- [ ] Set reminder to check recommendations in 1 week

### Day 5-7: Pod Disruption Budgets

```bash
# Deploy PDBs
kubectl apply -f production/cost-optimization/pod-disruption-budgets.yaml
```

- [ ] PDBs created for all services
- [ ] Verify: `kubectl get pdb -n flamoral`
- [ ] Test rolling update on low-traffic service: `kubectl rollout restart deployment/admin-service -n flamoral`
- [ ] Confirm zero downtime during update

---

## Week 2: Resource Optimization

### Day 8-10: Low Traffic Services

Deploy optimized versions of low-traffic services first (safest):

```bash
# Low traffic deployments
kubectl apply -f production/deployments/admin-service-optimized.yaml
kubectl apply -f production/deployments/analytics-service-optimized.yaml
kubectl apply -f production/deployments/advertising-service-optimized.yaml
```

- [ ] Admin service deployed and healthy
- [ ] Analytics service deployed and healthy
- [ ] Advertising service deployed and healthy
- [ ] Verify pods are on spot nodes: `kubectl get pods -n flamoral -o wide | grep admin`
- [ ] Check logs for errors: `kubectl logs -n flamoral -l app=admin-service --tail=50`
- [ ] Monitor for 24 hours before proceeding

### Day 10-12: Medium Traffic Services

```bash
# Medium traffic deployments
kubectl apply -f production/deployments/messaging-service-optimized.yaml
```

- [ ] Messaging service deployed
- [ ] Service responding normally
- [ ] WebSocket connections working
- [ ] Monitor for 48 hours before proceeding

### Day 12-14: High Traffic & Critical Services

```bash
# High traffic deployments
kubectl apply -f production/deployments/api-gateway-optimized.yaml
kubectl apply -f production/deployments/auth-service-optimized.yaml
```

- [ ] API Gateway deployed (2 replicas minimum)
- [ ] Auth service deployed (2 replicas minimum)
- [ ] Both services on regular nodes (no spot)
- [ ] Pod anti-affinity working (spread across nodes)
- [ ] All health checks passing
- [ ] API response times normal
- [ ] Monitor closely for 72 hours

---

## Week 3: Autoscaling

### Day 15-17: HPA Deployment

```bash
# Deploy all HPA configurations
kubectl apply -f production/autoscaling/hpa-configs.yaml
```

- [ ] HPA created for all 17 services
- [ ] Verify: `kubectl get hpa -n flamoral`
- [ ] Check initial status: `kubectl describe hpa -n flamoral`
- [ ] All HPAs showing metrics (may take 1-2 minutes)

### Day 17-19: HPA Testing

```bash
# Watch HPA in action
kubectl get hpa -n flamoral --watch
```

**Scale-Up Test:**
- [ ] Generate load on API Gateway
- [ ] Observe HPA scaling up within 30 seconds
- [ ] Pods created successfully
- [ ] New pods become ready and start serving traffic

**Scale-Down Test:**
- [ ] Stop load generation
- [ ] Wait for stabilization window (5 minutes)
- [ ] Observe HPA scaling down
- [ ] Pods terminated gracefully

### Day 19-21: Fine-Tuning

- [ ] Review HPA events for all services
- [ ] Identify any flapping (rapid scale up/down)
- [ ] Adjust thresholds if needed
- [ ] Document any changes made

---

## Week 4: Optimization & Monitoring

### Day 22-24: VPA Review

```bash
# Check VPA recommendations (after 2+ weeks of data)
kubectl describe vpa -n flamoral | grep -A 10 "Recommendation:"
```

- [ ] Review recommendations for each service
- [ ] Compare recommended vs current resources
- [ ] Document significant differences (>30%)
- [ ] Plan resource adjustments for next deployment

### Day 24-26: VPA Auto Mode (Optional)

For low-traffic services only:

```bash
# Edit VPA to enable Auto mode for selected services
# This will automatically apply resource recommendations
kubectl edit vpa analytics-service-vpa -n flamoral
# Change updateMode from "Off" to "Auto"
```

- [ ] Enable Auto mode for analytics-service
- [ ] Enable Auto mode for admin-service
- [ ] Monitor for pod restarts
- [ ] Verify resource changes applied correctly

### Day 26-28: Cost Analysis

```bash
# Check current resource usage
kubectl top nodes
kubectl top pods -n flamoral

# Count pods on spot vs regular
echo "Spot pods:" $(kubectl get pods -n flamoral -o wide | grep spot | wc -l)
echo "Total pods:" $(kubectl get pods -n flamoral | grep -v NAME | wc -l)
```

- [ ] Gather baseline cost data from Azure Cost Management
- [ ] Compare to pre-optimization costs
- [ ] Calculate actual savings percentage
- [ ] Document in cost report

---

## Ongoing Monitoring (Monthly)

### Cost Monitoring

- [ ] Review Azure Cost Management dashboard
- [ ] Check quota usage: `kubectl describe quota -n flamoral`
- [ ] Verify spot instance savings
- [ ] Compare to target savings (40-60%)

### Performance Monitoring

- [ ] Review error rate trends (should be <0.1%)
- [ ] Check p95 latency (should be <50ms increase)
- [ ] Verify availability meets SLA (99.9%)
- [ ] Review HPA scaling patterns

### Optimization Opportunities

- [ ] Review VPA recommendations
- [ ] Identify services to reclassify (tier changes)
- [ ] Check for services that could use more/less resources
- [ ] Plan quarterly optimization updates

---

## Troubleshooting Quick Reference

### HPA Not Scaling

```bash
# Check metrics server
kubectl get apiservice v1beta1.metrics.k8s.io -o yaml
kubectl top nodes

# Check HPA status
kubectl describe hpa <service-name>-hpa -n flamoral
```

### Pods Stuck Pending

```bash
# Check pod events
kubectl describe pod <pod-name> -n flamoral

# Check node availability
kubectl get nodes
kubectl describe nodes

# If waiting for spot nodes:
kubectl get nodes -l kubernetes.azure.com/scalesetpriority=spot
```

### Quota Exceeded

```bash
# Check quota usage
kubectl describe quota flamoral-production-quota -n flamoral

# Temporarily increase if needed
kubectl edit quota flamoral-production-quota -n flamoral
```

### Service Errors After Deployment

```bash
# Check pod logs
kubectl logs -n flamoral <pod-name> --tail=100

# Check events
kubectl get events -n flamoral --sort-by='.lastTimestamp' | tail -20

# Rollback if needed
kubectl rollout undo deployment/<service-name> -n flamoral
```

---

## Success Validation

After 4 weeks, verify these success criteria:

### Cost Reduction ✅
- [ ] Infrastructure costs reduced by 40-60%
- [ ] Spot instance usage >50% of eligible workloads
- [ ] Resource utilization improved to 60-70%

### Performance Maintained ✅
- [ ] Error rates unchanged or improved
- [ ] p95 latency increase <50ms
- [ ] No customer-impacting incidents

### Operational Health ✅
- [ ] Deployments working smoothly with PDBs
- [ ] Autoscaling functioning as expected
- [ ] Team comfortable with new setup

---

## Emergency Rollback

If critical issues occur, execute in this order:

```bash
# 1. Disable HPA (stops autoscaling)
kubectl delete hpa --all -n flamoral

# 2. Set manual replica counts
kubectl scale deployment/<service-name> --replicas=3 -n flamoral

# 3. Rollback deployments
kubectl rollout undo deployment/<service-name> -n flamoral

# 4. Remove PDBs if blocking
kubectl delete pdb <pdb-name> -n flamoral

# 5. Contact team lead for further guidance
```

---

## Completion Sign-Off

**Deployment Completed By**: ________________
**Date**: ________________
**Cost Savings Achieved**: ________%
**Issues Encountered**: ________________
**Recommendations for Next Time**: ________________

---

**Questions? Check:**
- Full guide: `COST_OPTIMIZATION_DEPLOYMENT_GUIDE.md`
- Summary: `COST_OPTIMIZATION_SUMMARY.md`
- Resource specs: `cost-optimization/resource-recommendations.yaml`

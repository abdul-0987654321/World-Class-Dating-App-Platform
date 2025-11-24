# Security Incident Response Runbook

## Overview
This runbook provides procedures for responding to security incidents.

## Incident Classification

### Severity Levels
- **Critical (P0)**: Active breach, data exfiltration, ransomware
- **High (P1)**: Vulnerability exploitation, unauthorized access
- **Medium (P2)**: Suspicious activity, potential vulnerability
- **Low (P3)**: Security policy violation, false positive

## Immediate Response (First 15 Minutes)

### 1. Detect and Triage
```bash
# Check WAF alerts
az monitor metrics list \
  --resource /subscriptions/.../frontdoor/... \
  --metric BlockedRequests \
  --interval PT5M

# Check Application Insights for anomalies
# Look for:
# - Unusual traffic patterns
# - Failed authentication attempts
# - Privilege escalation attempts
# - SQL injection attempts

# Check AKS security events
kubectl get events -n datingapp --sort-by='.lastTimestamp' | grep -i security
```

### 2. Containment
```bash
# If active attack detected:

# Option 1: Block specific IP addresses
az network frontdoor waf-policy custom-rule create \
  --policy-name datingappprodwafpolicy \
  --resource-group datingapp-prod-rg \
  --name BlockMaliciousIP \
  --priority 100 \
  --action Block \
  --rule-type MatchRule \
  --match-variable RemoteAddr \
  --operator IPMatch \
  --match-values "X.X.X.X"

# Option 2: Enable geo-blocking
# Update terraform/modules/frontdoor/main.tf with blocked countries

# Option 3: Scale down compromised service
kubectl scale deployment/affected-service --replicas=0 -n datingapp

# Option 4: Isolate database (EXTREME - data loss risk)
az postgres flexible-server firewall-rule create \
  --resource-group datingapp-prod-rg \
  --name datingapp-prod-postgres \
  --rule-name EmergencyLockdown \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

## Investigation Phase

### 1. Collect Evidence
```bash
# Export logs
kubectl logs -n datingapp --all-containers --since=24h > incident-logs.txt

# Export Application Insights data
# Use Azure Portal to export last 24 hours of telemetry

# Capture network traffic
kubectl debug node/aks-nodepool1-12345 -it --image=nicolaka/netshoot

# Export container images for analysis
docker save dating-api:latest -o dating-api-evidence.tar
```

### 2. Analyze Attack Vector
```bash
# Check for compromised secrets
az keyvault secret list --vault-name datingapp-prod-kv

# Review recent access
az monitor activity-log list \
  --resource-group datingapp-prod-rg \
  --start-time 2024-01-01T00:00:00Z

# Check for malware
trivy image ghcr.io/your-org/dating-api:latest

# Verify container integrity
kubectl get pods -n datingapp -o json | \
  jq '.items[].spec.containers[].image' | \
  xargs -I {} cosign verify {}
```

## Common Incident Scenarios

### Scenario 1: SQL Injection Detected
```bash
# Step 1: Block the attack vector
# Review WAF logs to identify pattern
# Create custom WAF rule to block

# Step 2: Review database logs
kubectl exec -it postgres-pod -n datingapp -- psql -U psqladmin -d datingapp
\x
SELECT * FROM pg_stat_statements ORDER BY calls DESC LIMIT 20;

# Step 3: Check for data exfiltration
# Review unusual query patterns
# Check for UNION attacks, time-based attacks

# Step 4: Patch vulnerable code
# Review and fix parameterized queries
# Deploy fix immediately
```

### Scenario 2: Unauthorized Access to Storage
```bash
# Step 1: Review storage access logs
az storage blob list --account-name datingappprodstorage --container-name photos

# Step 2: Rotate storage keys
az storage account keys renew \
  --resource-group datingapp-prod-rg \
  --account-name datingappprodstorage \
  --key primary

# Step 3: Update application configuration
kubectl create secret generic storage-credentials \
  --from-literal=connection-string="new-connection-string" \
  --dry-run=client -o yaml | kubectl apply -f -

# Step 4: Restart affected services
kubectl rollout restart deployment/dating-api -n datingapp
```

### Scenario 3: Container Compromise
```bash
# Step 1: Isolate the pod
kubectl label pod compromised-pod-123 quarantine=true
kubectl cordon node-where-pod-runs

# Step 2: Capture forensic data
kubectl exec compromised-pod-123 -n datingapp -- ps aux > process-list.txt
kubectl exec compromised-pod-123 -n datingapp -- netstat -tulpn > network-connections.txt

# Step 3: Terminate compromised pod
kubectl delete pod compromised-pod-123 -n datingapp

# Step 4: Scan container image
trivy image --severity HIGH,CRITICAL compromised-image:tag

# Step 5: Review admission controller logs
kubectl logs -n kube-system -l app=admission-controller
```

## Recovery Phase

### 1. Rotate All Credentials
```bash
# Rotate database passwords
az postgres flexible-server parameter set \
  --resource-group datingapp-prod-rg \
  --server-name datingapp-prod-postgres \
  --name password \
  --value "new-secure-password"

# Rotate Redis keys
az redis regenerate-key \
  --resource-group datingapp-prod-rg \
  --name datingapp-prod-redis \
  --key-type Primary

# Rotate API keys in Key Vault
az keyvault secret set \
  --vault-name datingapp-prod-kv \
  --name api-key \
  --value "new-api-key"

# Force re-deployment to pick up new secrets
kubectl rollout restart deployment/dating-api -n datingapp
```

### 2. Harden Security
```bash
# Enable additional WAF rules
# Update frontdoor module to enable all OWASP rules

# Enable Azure Defender
az security pricing create \
  --name AppServices \
  --tier Standard

# Enable network policies
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: deny-all-ingress
  namespace: datingapp
spec:
  podSelector: {}
  policyTypes:
  - Ingress
EOF
```

## Post-Incident

### 1. Document Incident
```markdown
# Incident Report: [Title]

## Timeline
- Detection: [Time]
- Containment: [Time]
- Investigation: [Time]
- Recovery: [Time]
- Closure: [Time]

## Impact
- Affected users: [Number]
- Data exposed: [Description]
- Service downtime: [Duration]

## Root Cause
[Detailed description]

## Resolution
[Steps taken]

## Prevention
[Measures implemented]
```

### 2. Compliance Reporting
- Notify legal team if PII exposed
- Report to regulatory bodies (GDPR, CCPA) if required
- Update security audit log

### 3. Lessons Learned
- Conduct post-mortem meeting
- Update security policies
- Improve detection capabilities
- Update this runbook

## Emergency Contacts
- Security Team: security@datingapp.com
- Incident Commander: commander@datingapp.com
- Legal: legal@datingapp.com
- Communications: pr@datingapp.com
- Azure Support: +1-800-867-1389

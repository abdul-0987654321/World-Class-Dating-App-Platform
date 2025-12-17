# Flamoral Kubernetes Fixes - Documentation Index

## Quick Navigation

### START HERE: Quick Fix Guide
**[README.md](README.md)** - Start here for quick fix instructions

---

## Critical Fix Files

### 1. Database Secrets Fix (CRITICAL)
**File:** [database-secrets-fix.yaml](database-secrets-fix.yaml)

**Problem:** Deployments can't find POSTGRES_* keys in secrets

**Apply:**
```bash
cp FIXES/database-secrets-fix.yaml production/external-secrets/database-secrets.yaml
kubectl apply -f production/external-secrets/database-secrets.yaml
```

### 2. Ingress Port Fix (CRITICAL)
**File:** [ingress-fix.yaml](ingress-fix.yaml)

**Problem:** API Gateway ingress routes to wrong port (80 instead of 4000)

**Apply:**
```bash
cp FIXES/ingress-fix.yaml deploy/ingress.yaml
kubectl apply -f deploy/ingress.yaml
```

---

## Documentation Files

### Step-by-Step Instructions
**[APPLY_FIXES.md](APPLY_FIXES.md)** - Detailed instructions for applying all fixes
- How to apply each fix
- Verification steps
- Rollback instructions
- Troubleshooting guide

### Azure Key Vault Configuration
**[AZURE_KEY_VAULT_SECRETS_CHECKLIST.md](AZURE_KEY_VAULT_SECRETS_CHECKLIST.md)** - Complete secrets checklist
- All required secrets listed
- Correct format examples
- Priority order for configuration
- Verification commands
- Security best practices

### Automated Verification
**[verify-deployment.sh](verify-deployment.sh)** - Bash script to verify deployment
- Checks all prerequisites
- Verifies secrets configuration
- Tests service health
- Provides actionable recommendations

```bash
chmod +x FIXES/verify-deployment.sh
./FIXES/verify-deployment.sh
```

---

## Parent Directory Documentation

### Comprehensive Analysis
**[../KUBERNETES_CONFIGURATION_FIXES.md](../KUBERNETES_CONFIGURATION_FIXES.md)** - Full technical analysis
- Detailed problem descriptions
- Root cause analysis
- Complete fix documentation
- Technical specifications

### Deployment Status Report
**[../DEPLOYMENT_STATUS_REPORT.md](../DEPLOYMENT_STATUS_REPORT.md)** - Overall deployment status
- Executive summary
- Risk assessment
- Deployment checklist
- Success criteria
- Rollback plan

---

## Quick Reference

### Most Common Issues

| Issue | Fix File | Documentation |
|-------|----------|---------------|
| Database connection fails | database-secrets-fix.yaml | APPLY_FIXES.md §1 |
| 502 Bad Gateway on API | ingress-fix.yaml | APPLY_FIXES.md §2 |
| Secrets not syncing | - | AZURE_KEY_VAULT_SECRETS_CHECKLIST.md |
| Pods crashing | - | APPLY_FIXES.md "Troubleshooting" |

### Most Important Files

**For DevOps:**
1. APPLY_FIXES.md (step-by-step instructions)
2. verify-deployment.sh (automated verification)
3. AZURE_KEY_VAULT_SECRETS_CHECKLIST.md (secrets configuration)

**For Managers:**
1. README.md (quick overview)
2. ../DEPLOYMENT_STATUS_REPORT.md (status report)

**For Troubleshooting:**
1. APPLY_FIXES.md "Troubleshooting" section
2. verify-deployment.sh (automated diagnostics)

---

## File Tree

```
FIXES/
├── README.md                                  ← START HERE
├── APPLY_FIXES.md                             ← Detailed instructions
├── AZURE_KEY_VAULT_SECRETS_CHECKLIST.md       ← Secrets configuration
├── INDEX.md                                   ← This file
├── verify-deployment.sh                       ← Verification script
├── database-secrets-fix.yaml                  ← Fix #1
└── ingress-fix.yaml                           ← Fix #2

../
├── KUBERNETES_CONFIGURATION_FIXES.md          ← Technical analysis
└── DEPLOYMENT_STATUS_REPORT.md                ← Status report
```

---

## Workflow

### Standard Deployment Workflow

1. **Read** [README.md](README.md) - Understand what needs to be fixed
2. **Apply** fixes using [APPLY_FIXES.md](APPLY_FIXES.md)
3. **Configure** Azure Key Vault using [AZURE_KEY_VAULT_SECRETS_CHECKLIST.md](AZURE_KEY_VAULT_SECRETS_CHECKLIST.md)
4. **Verify** using [verify-deployment.sh](verify-deployment.sh)
5. **Deploy** using instructions in [../DEPLOYMENT_STATUS_REPORT.md](../DEPLOYMENT_STATUS_REPORT.md)

### Troubleshooting Workflow

1. **Run** [verify-deployment.sh](verify-deployment.sh) to identify issues
2. **Check** [APPLY_FIXES.md](APPLY_FIXES.md) "Troubleshooting" section
3. **Review** [../KUBERNETES_CONFIGURATION_FIXES.md](../KUBERNETES_CONFIGURATION_FIXES.md) for technical details
4. **Verify** secrets in Azure Key Vault using [AZURE_KEY_VAULT_SECRETS_CHECKLIST.md](AZURE_KEY_VAULT_SECRETS_CHECKLIST.md)

---

## Common Commands

### Apply Fixes
```bash
# Database secrets
cp FIXES/database-secrets-fix.yaml production/external-secrets/database-secrets.yaml
kubectl apply -f production/external-secrets/database-secrets.yaml

# Ingress
cp FIXES/ingress-fix.yaml deploy/ingress.yaml
kubectl apply -f deploy/ingress.yaml
```

### Verify Deployment
```bash
# Automated verification
./FIXES/verify-deployment.sh

# Manual checks
kubectl get externalsecrets -n flamoral
kubectl get pods -n flamoral
kubectl get ingress -n flamoral
```

### Check Secrets
```bash
# External Secrets
kubectl describe externalsecret flamoral-database-secrets -n flamoral

# Kubernetes Secrets
kubectl get secret flamoral-database-secrets -n flamoral -o jsonpath='{.data}' | jq 'keys'

# Azure Key Vault
az keyvault secret list --vault-name flamoral-prod-kv --query "[].name" -o table
```

---

## Support

### Need Help?

**For configuration issues:**
- Check [APPLY_FIXES.md](APPLY_FIXES.md) Troubleshooting section
- Run [verify-deployment.sh](verify-deployment.sh) for diagnostics

**For secret issues:**
- See [AZURE_KEY_VAULT_SECRETS_CHECKLIST.md](AZURE_KEY_VAULT_SECRETS_CHECKLIST.md)
- Verify Azure Key Vault access and permissions

**For deployment issues:**
- Review [../DEPLOYMENT_STATUS_REPORT.md](../DEPLOYMENT_STATUS_REPORT.md)
- Check pod logs: `kubectl logs <pod-name> -n flamoral`

**For understanding technical details:**
- Read [../KUBERNETES_CONFIGURATION_FIXES.md](../KUBERNETES_CONFIGURATION_FIXES.md)

---

## Document Status

| Document | Last Updated | Status |
|----------|--------------|--------|
| README.md | 2025-12-15 | ✓ Complete |
| APPLY_FIXES.md | 2025-12-15 | ✓ Complete |
| AZURE_KEY_VAULT_SECRETS_CHECKLIST.md | 2025-12-15 | ✓ Complete |
| database-secrets-fix.yaml | 2025-12-15 | ✓ Ready |
| ingress-fix.yaml | 2025-12-15 | ✓ Ready |
| verify-deployment.sh | 2025-12-15 | ✓ Tested |
| INDEX.md | 2025-12-15 | ✓ Complete |

---

**Version:** 1.0
**Last Updated:** 2025-12-15
**Maintained By:** DevOps Team

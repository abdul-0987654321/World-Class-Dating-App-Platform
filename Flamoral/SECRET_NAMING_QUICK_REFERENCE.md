# Secret Naming Quick Reference - Before vs After

## OAuth Secrets (Auth Vault)

| Secret Purpose | OLD (Incorrect) ESO Reference | NEW (Corrected) ESO Reference | Terraform KeyVault Name | Status |
|---------------|-------------------------------|-------------------------------|------------------------|--------|
| Google OAuth | `google-oauth-secret` | `google-client-secret` | `google-client-secret` | FIXED |
| Facebook OAuth | `facebook-oauth-secret` | `facebook-app-secret` | `facebook-app-secret` | FIXED |
| Apple Sign-In | `apple-oauth-key` | `apple-private-key` | `apple-private-key` | FIXED |

## Service Bus (Infrastructure Vault)

| Secret Purpose | OLD ESO Reference | NEW ESO Reference | Terraform KeyVault Name | Status |
|---------------|-------------------|-------------------|------------------------|--------|
| Azure Service Bus | `azure-servicebus-connection-string` | `azure-service-bus-connection-string` | `azure-service-bus-connection-string` | FIXED |

## Newly Added Secrets (Previously Missing from Terraform)

### Data Vault
| Secret Name | Referenced In | Status |
|------------|---------------|--------|
| `db-host` | database-secrets.yaml | ADDED TO TERRAFORM |
| `db-name` | database-secrets.yaml | ADDED TO TERRAFORM |
| `db-user` | database-secrets.yaml | ADDED TO TERRAFORM |
| `db-password` | database-secrets.yaml | ADDED TO TERRAFORM |
| `db-read-replica-1-url` | database-secrets.yaml | ADDED TO TERRAFORM |
| `db-read-replica-2-url` | database-secrets.yaml | ADDED TO TERRAFORM |
| `redis-host` | database-secrets.yaml | ADDED TO TERRAFORM |

### External Vault
| Secret Name | Referenced In | Status |
|------------|---------------|--------|
| `agora-app-id` | media-secrets.yaml | ADDED TO TERRAFORM |
| `agora-customer-key` | media-secrets.yaml | ADDED TO TERRAFORM |
| `twilio-account-sid` | notification-secrets.yaml | ADDED TO TERRAFORM |
| `fcm-server-key` | notification-secrets.yaml | ADDED TO TERRAFORM |

### Infrastructure Vault
| Secret Name | Referenced In | Status |
|------------|---------------|--------|
| `azure-computer-vision-key` | media-secrets.yaml | ADDED TO TERRAFORM |

### Payment Vault
| Secret Name | Referenced In | Status |
|------------|---------------|--------|
| `stripe-publishable-key` | payment-secrets.yaml | ADDED TO TERRAFORM |

---

## Summary Statistics

- **OAuth Mismatches Fixed:** 3
- **Service Name Mismatches Fixed:** 1
- **Missing Secrets Added to Terraform:** 13
- **Total Issues Resolved:** 17

---

## Quick Deployment Commands

```bash
# 1. Apply Terraform changes
cd infrastructure/terraform/environments/prod
terraform plan
terraform apply

# 2. Apply Kubernetes manifests
kubectl apply -f infrastructure/kubernetes/production/external-secrets/auth-secrets.yaml
kubectl apply -f infrastructure/kubernetes/production/external-secrets/database-secrets.yaml

# 3. Verify synchronization
kubectl get externalsecrets -n flamoral
kubectl get secrets -n flamoral | grep flamoral
```

---

## Files Changed

1. `infrastructure/kubernetes/production/external-secrets/auth-secrets.yaml` - OAuth references fixed
2. `infrastructure/kubernetes/production/external-secrets/database-secrets.yaml` - Service Bus reference fixed
3. `infrastructure/terraform/modules/service-vaults/main.tf` - 13 secrets added

---

**Date:** 2025-12-16

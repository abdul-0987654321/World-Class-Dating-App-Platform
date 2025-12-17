# Production Key Vault Secrets Setup Checklist

**Platform:** Flamoral Dating Platform
**Environment:** Production
**Date Started:** _______________
**Completed By:** _______________

---

## Phase 1: Prerequisites

- [ ] Azure CLI installed and updated to latest version
- [ ] Logged into Azure: `az login`
- [ ] Correct subscription selected: `az account set --subscription "YOUR_SUB"`
- [ ] Verified Key Vaults exist (created by Terraform)
- [ ] Have necessary permissions (Key Vault Secrets Officer or Administrator)
- [ ] Network access configured (IP whitelisted if needed)
- [ ] OpenSSL installed (for Bash) or PowerShell 5.1+ (for Windows)

---

## Phase 2: Initial Population

- [ ] Downloaded/located population script
  - Windows: `populate-prod-keyvault-secrets.ps1`
  - Linux/Mac: `populate-prod-keyvault-secrets.sh`

- [ ] Made script executable (Linux/Mac only)
  ```bash
  chmod +x populate-prod-keyvault-secrets.sh
  ```

- [ ] Ran population script successfully
  - [ ] Auth vault populated (4 secrets)
  - [ ] Payment vault populated (2 secrets)
  - [ ] Data vault populated (2 secrets)
  - [ ] External vault populated (6 secrets)
  - [ ] Infra vault populated (3 secrets)

- [ ] Verified secrets created
  ```bash
  az keyvault secret list --vault-name flamoralprodauthkv --output table
  az keyvault secret list --vault-name flamoralprodpaymentkv --output table
  az keyvault secret list --vault-name flamoralproddatakv --output table
  az keyvault secret list --vault-name flamoralprodexternalkv --output table
  az keyvault secret list --vault-name flamoralprodinfrakv --output table
  ```

---

## Phase 3: Replace Payment Vault Placeholders

### Stripe Configuration

- [ ] Created/have Stripe account
- [ ] Obtained Stripe Secret Key (sk_live_...)
  - From: https://dashboard.stripe.com/apikeys
  - [ ] Updated in vault:
    ```bash
    az keyvault secret set \
      --vault-name flamoralprodpaymentkv \
      --name stripe-secret-key \
      --value "sk_live_YOUR_KEY"
    ```

- [ ] Configured Stripe webhook endpoint
- [ ] Obtained Stripe Webhook Secret (whsec_...)
  - From: https://dashboard.stripe.com/webhooks
  - [ ] Updated in vault:
    ```bash
    az keyvault secret set \
      --vault-name flamoralprodpaymentkv \
      --name stripe-webhook-secret \
      --value "whsec_YOUR_SECRET"
    ```

- [ ] Verified Stripe secrets
  ```bash
  az keyvault secret show --vault-name flamoralprodpaymentkv --name stripe-secret-key --query value -o tsv
  az keyvault secret show --vault-name flamoralprodpaymentkv --name stripe-webhook-secret --query value -o tsv
  ```

---

## Phase 4: Replace External Services Vault Placeholders

### SendGrid (Email)

- [ ] Created/have SendGrid account
- [ ] Generated API key
  - From: https://app.sendgrid.com/settings/api_keys
  - Permissions: Full Access or Mail Send
  - [ ] Updated in vault:
    ```bash
    az keyvault secret set \
      --vault-name flamoralprodexternalkv \
      --name sendgrid-api-key \
      --value "SG.YOUR_KEY"
    ```

### Twilio (SMS)

- [ ] Created/have Twilio account
- [ ] Obtained Auth Token
  - From: https://console.twilio.com/
  - [ ] Updated in vault:
    ```bash
    az keyvault secret set \
      --vault-name flamoralprodexternalkv \
      --name twilio-auth-token \
      --value "YOUR_TOKEN"
    ```

### Firebase (Push Notifications)

- [ ] Created/have Firebase project
- [ ] Generated service account key
  - From: https://console.firebase.google.com/ → Project Settings → Service Accounts
  - Downloaded JSON file
  - [ ] Updated in vault:
    ```bash
    az keyvault secret set \
      --vault-name flamoralprodexternalkv \
      --name firebase-private-key \
      --file firebase-service-account.json
    ```

### Agora (Video/Audio)

- [ ] Created/have Agora account
- [ ] Obtained App Certificate
  - From: https://console.agora.io/
  - [ ] Updated in vault:
    ```bash
    az keyvault secret set \
      --vault-name flamoralprodexternalkv \
      --name agora-app-certificate \
      --value "YOUR_CERTIFICATE"
    ```

### Sentry (Error Tracking)

- [ ] Created/have Sentry project
- [ ] Obtained DSN
  - From: https://sentry.io/settings/ → Projects → Your Project → Client Keys
  - [ ] Updated in vault:
    ```bash
    az keyvault secret set \
      --vault-name flamoralprodexternalkv \
      --name sentry-dsn \
      --value "https://YOUR_DSN@sentry.io/PROJECT_ID"
    ```

### OpenAI (AI Features)

- [ ] Created/have OpenAI account
- [ ] Generated API key
  - From: https://platform.openai.com/api-keys
  - [ ] Updated in vault:
    ```bash
    az keyvault secret set \
      --vault-name flamoralprodexternalkv \
      --name openai-api-key \
      --value "sk-YOUR_KEY"
    ```

- [ ] Verified all external secrets
  ```bash
  az keyvault secret list --vault-name flamoralprodexternalkv --output table
  ```

---

## Phase 5: Replace Infrastructure Vault Placeholders

### Azure Storage

- [ ] Located storage account name (from Terraform output or Portal)
  - Storage Account: _______________________

- [ ] Obtained connection string
  - [ ] From Terraform output, or
  - [ ] From Azure Portal, or
  - [ ] Via CLI:
    ```bash
    az storage account show-connection-string \
      --name YOUR_STORAGE_ACCOUNT \
      --resource-group flamoral-prod-rg \
      --output tsv
    ```

- [ ] Updated in vault:
  ```bash
  az keyvault secret set \
    --vault-name flamoralprodinfrakv \
    --name azure-storage-connection-string \
    --value "YOUR_CONNECTION_STRING"
  ```

- [ ] Verified infra secrets
  ```bash
  az keyvault secret list --vault-name flamoralprodinfrakv --output table
  ```

---

## Phase 6: Verify All Secrets

- [ ] All 17 secrets populated
- [ ] No placeholder values remain
- [ ] Secrets have correct format/structure
- [ ] Tested retrieval of each secret

### Quick Verification Commands

```bash
# Count secrets in each vault (should be 4, 2, 2, 6, 3 respectively)
az keyvault secret list --vault-name flamoralprodauthkv --query "length(@)"
az keyvault secret list --vault-name flamoralprodpaymentkv --query "length(@)"
az keyvault secret list --vault-name flamoralproddatakv --query "length(@)"
az keyvault secret list --vault-name flamoralprodexternalkv --query "length(@)"
az keyvault secret list --vault-name flamoralprodinfrakv --query "length(@)"
```

---

## Phase 7: Kubernetes Integration

- [ ] Verified Secrets Store CSI Driver installed
  ```bash
  kubectl get pods -n kube-system | grep secrets-store
  ```

- [ ] Applied SecretProviderClass configurations
  ```bash
  kubectl apply -f infrastructure/kubernetes/secrets/service-vault-providers.yaml
  ```

- [ ] Verified AKS managed identity has access
  ```bash
  # Get AKS identity
  AKS_IDENTITY=$(az aks show \
    --resource-group flamoral-prod-rg \
    --name flamoral-prod-aks \
    --query "identityProfile.kubeletidentity.objectId" \
    --output tsv)

  # Check role assignments
  az role assignment list --assignee $AKS_IDENTITY --all
  ```

- [ ] Tested secret access from a pod
  ```bash
  # Deploy a test pod
  kubectl run test-secrets --image=busybox --restart=Never --command -- sleep 3600

  # Check secrets are mounted
  kubectl exec test-secrets -- ls /mnt/secrets

  # Cleanup
  kubectl delete pod test-secrets
  ```

---

## Phase 8: Application Testing

- [ ] Started all application services
- [ ] Verified no secret-related errors in logs
- [ ] Tested authentication flows (JWT generation/validation)
- [ ] Tested payment processing (Stripe integration)
- [ ] Tested email sending (SendGrid)
- [ ] Tested SMS sending (Twilio)
- [ ] Tested push notifications (Firebase)
- [ ] Tested video calls (Agora)
- [ ] Tested error reporting (Sentry)
- [ ] Tested database connections (Postgres, Redis)

---

## Phase 9: Security & Monitoring

- [ ] Enabled audit logging on all vaults
- [ ] Configured alerting for unauthorized access
- [ ] Set up log analysis dashboard
- [ ] Documented secret rotation schedule
- [ ] Created runbooks for secret rotation
- [ ] Assigned secret ownership responsibilities
- [ ] Configured automatic secret expiration (if applicable)
- [ ] Reviewed network access rules
- [ ] Verified soft delete and purge protection enabled
- [ ] Tested secret recovery procedures

---

## Phase 10: Documentation

- [ ] Updated deployment documentation with secret references
- [ ] Documented which services use which secrets
- [ ] Created disaster recovery procedures
- [ ] Documented secret rotation procedures
- [ ] Created troubleshooting guide
- [ ] Trained team on secret management
- [ ] Created on-call runbooks

---

## Phase 11: Backup & Disaster Recovery

- [ ] Backed up all secrets
  ```bash
  # Example for one vault
  for secret in $(az keyvault secret list --vault-name flamoralprodauthkv --query "[].name" -o tsv); do
    az keyvault secret backup \
      --vault-name flamoralprodauthkv \
      --name $secret \
      --file "backups/${secret}.backup"
  done
  ```

- [ ] Stored backups securely (encrypted storage)
- [ ] Tested secret restoration
- [ ] Documented backup retention policy
- [ ] Created backup schedule

---

## Phase 12: Compliance & Audit

- [ ] Reviewed secrets meet compliance requirements (PCI, GDPR, etc.)
- [ ] Verified encryption at rest (Premium SKU uses HSM)
- [ ] Verified encryption in transit (TLS 1.2+)
- [ ] Documented access control policies
- [ ] Created audit report
- [ ] Scheduled compliance reviews
- [ ] Configured compliance monitoring

---

## Post-Setup Maintenance

### Weekly Tasks

- [ ] Review audit logs for unauthorized access attempts
- [ ] Check alert notifications
- [ ] Verify all secrets are still accessible
- [ ] Monitor secret expiration dates

### Monthly Tasks

- [ ] Audit user/identity permissions
- [ ] Review network access rules
- [ ] Check for deprecated API versions
- [ ] Update documentation if needed
- [ ] Review and update runbooks

### Quarterly Tasks

- [ ] Rotate all secrets (or per compliance requirements)
- [ ] Test disaster recovery procedures
- [ ] Review and update security policies
- [ ] Conduct security training
- [ ] Compliance audit

---

## Issues & Notes

| Date | Issue | Resolution | Notes |
|------|-------|------------|-------|
| | | | |
| | | | |
| | | | |

---

## Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| DevOps Engineer | | | |
| Security Engineer | | | |
| Platform Lead | | | |
| Product Owner | | | |

---

## Reference Files

- **Full Documentation:** `docs/PRODUCTION_KEYVAULT_SECRETS.md`
- **Quick Reference:** `scripts/keyvault-secrets-reference.txt`
- **Setup Report:** `KEYVAULT_SECRETS_SETUP_REPORT.md`
- **Population Script (PS):** `scripts/populate-prod-keyvault-secrets.ps1`
- **Population Script (Bash):** `scripts/populate-prod-keyvault-secrets.sh`

---

**Checklist Version:** 1.0
**Last Updated:** 2025-12-12
**Next Review:** _______________

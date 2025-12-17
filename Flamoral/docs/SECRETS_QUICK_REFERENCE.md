# Secrets Replacement - Quick Reference Card

**Flamoral Dating Platform - Production Environment**

---

## 📋 Placeholder Secrets to Replace

### 🔴 Critical (Do First)
- [ ] `stripe-secret-key` → Payment Vault
- [ ] `stripe-webhook-secret` → Payment Vault

### 🟠 High Priority
- [ ] `sendgrid-api-key` → External Vault
- [ ] `azure-storage-connection-string` → Infrastructure Vault (AUTO)

### 🟡 Medium Priority
- [ ] `twilio-auth-token` → External Vault
- [ ] `sentry-dsn` → External Vault
- [ ] `openai-api-key` → External Vault

### 🟢 Low Priority (Optional)
- [ ] `firebase-private-key` → External Vault
- [ ] `agora-app-certificate` → External Vault

---

## 🚀 Quick Start (5 Minutes)

### 1. Auto-Retrieve Azure Secrets
```bash
cd DatingPlatform/scripts
chmod +x auto-retrieve-azure-secrets.sh
./auto-retrieve-azure-secrets.sh
```

### 2. Update Manual Secrets (Interactive)
```powershell
.\update-placeholder-secrets.ps1 -Vaults payment,external
```

### 3. Verify
```bash
./verify-placeholder-secrets.sh
```

### 4. Restart Services
```bash
kubectl rollout restart deployment -n flamoral-prod payment-service
kubectl rollout restart deployment -n flamoral-prod notification-service
```

---

## 📦 Vault Names Reference

| Vault | Name | Placeholders |
|-------|------|--------------|
| Payment | `flamoral-prod-payment-kv` | 2 |
| External | `flamoral-prod-ext-kv` | 6 |
| Infrastructure | `flamoral-prod-infra-kv` | 1 |

---

## 🔑 API Key Sources

| Service | Dashboard URL | Key Format |
|---------|---------------|------------|
| Stripe | https://dashboard.stripe.com/apikeys | `sk_live_...` |
| SendGrid | https://app.sendgrid.com/settings/api_keys | `SG....` |
| Twilio | https://console.twilio.com/ | 32 hex chars |
| Sentry | https://sentry.io/settings/projects/ | `https://...@....ingest.sentry.io/...` |
| OpenAI | https://platform.openai.com/api-keys | `sk-...` |
| Firebase | https://console.firebase.google.com/ | JSON file |
| Agora | https://console.agora.io/ | 32 hex chars |

---

## ⚡ One-Line Updates

### Stripe
```bash
az keyvault secret set --vault-name flamoral-prod-payment-kv --name stripe-secret-key --value "sk_live_YOUR_KEY"
az keyvault secret set --vault-name flamoral-prod-payment-kv --name stripe-webhook-secret --value "whsec_YOUR_SECRET"
```

### SendGrid
```bash
az keyvault secret set --vault-name flamoral-prod-ext-kv --name sendgrid-api-key --value "SG.YOUR_KEY"
```

### Azure Storage (Auto)
```bash
STORAGE_CONN=$(az storage account show-connection-string --name flamoralprodzcqqgc --resource-group flamoral-prod-rg --output tsv)
az keyvault secret set --vault-name flamoral-prod-infra-kv --name azure-storage-connection-string --value "$STORAGE_CONN"
```

### Sentry
```bash
az keyvault secret set --vault-name flamoral-prod-ext-kv --name sentry-dsn --value "https://YOUR_KEY@YOUR_ORG.ingest.sentry.io/PROJECT_ID"
```

### OpenAI
```bash
az keyvault secret set --vault-name flamoral-prod-ext-kv --name openai-api-key --value "sk-YOUR_KEY"
```

---

## 🔍 Verification Commands

### Check Placeholders
```bash
./scripts/verify-placeholder-secrets.sh
```

### List Secrets in Vault
```bash
az keyvault secret list --vault-name flamoral-prod-payment-kv --output table
```

### Show Secret (metadata only)
```bash
az keyvault secret show --vault-name flamoral-prod-payment-kv --name stripe-secret-key --query "attributes" --output json
```

### Get Secret Value
```bash
az keyvault secret show --vault-name flamoral-prod-payment-kv --name stripe-secret-key --query "value" --output tsv
```

---

## 🛠️ Script Options

### update-placeholder-secrets.ps1
```powershell
# Interactive mode
.\update-placeholder-secrets.ps1

# Batch mode (from env vars)
.\update-placeholder-secrets.ps1 -UseBatchMode

# Specific vaults
.\update-placeholder-secrets.ps1 -Vaults payment,external

# Dry run (no changes)
.\update-placeholder-secrets.ps1 -DryRun

# Auto-retrieve Azure secrets
.\update-placeholder-secrets.ps1 -AutoRetrieveAzureSecrets
```

### auto-retrieve-azure-secrets.sh
```bash
# Retrieve and update all Azure secrets
./auto-retrieve-azure-secrets.sh

# Dry run
./auto-retrieve-azure-secrets.sh --dry-run
```

---

## 🧪 Test Integration

### Stripe
```bash
curl -X POST https://api.flamoral.com/payments/health
```

### SendGrid
```bash
curl -X POST https://api.flamoral.com/notifications/test-email \
  -H "Authorization: Bearer <token>" \
  -d '{"email":"test@example.com"}'
```

### Storage
```bash
curl -X POST https://api.flamoral.com/media/test-upload \
  -H "Authorization: Bearer <token>"
```

---

## 🚨 Troubleshooting

### Permission Denied
```bash
# Check your role
az role assignment list --assignee $(az account show --query user.name -o tsv) --all

# Request role (from admin)
az role assignment create \
  --assignee <your-email> \
  --role "Key Vault Secrets Officer" \
  --scope /subscriptions/<sub>/resourceGroups/flamoral-prod-rg
```

### Services Not Updating
```bash
# Restart pods
kubectl rollout restart deployment -n flamoral-prod <service-name>

# Check logs
kubectl logs -n flamoral-prod -l app=payment-service --tail=50
```

### Restore Previous Version
```bash
# List versions
az keyvault secret list-versions --vault-name flamoral-prod-payment-kv --name stripe-secret-key

# Get previous value
az keyvault secret show --vault-name flamoral-prod-payment-kv --name stripe-secret-key --version <version-id> --query "value" -o tsv
```

---

## 📚 Documentation Links

- **Complete Guide:** `docs/SECRETS_REPLACEMENT_GUIDE.md`
- **Azure Resources:** `docs/AZURE_AUTO_SECRETS.md`
- **Implementation Summary:** `docs/SECRETS_REPLACEMENT_SUMMARY.md`

---

## ✅ Post-Update Checklist

- [ ] All placeholders replaced (run `verify-placeholder-secrets.sh`)
- [ ] Services restarted
- [ ] Integration tests passed
- [ ] Error logs checked (Sentry, Kubernetes)
- [ ] Calendar reminders set (90-day rotation)
- [ ] PowerShell history cleared (`Clear-History`)
- [ ] Temporary files with secrets deleted

---

## 📞 Support

**Issue:** Can't access Key Vault
→ Check Azure authentication: `az login`

**Issue:** Pattern validation failed
→ Verify key format matches service provider

**Issue:** Service integration failing
→ Check logs: `kubectl logs -n flamoral-prod <pod-name>`

**Issue:** Secret not found
→ Verify vault name and secret name match exactly

---

**Quick Reference v1.0 | Last Updated: 2025-12-12**

# Key Vault Access Control Policy - Flamoral

Last Updated: 2025-12-12

## Access Control Model

All Flamoral Key Vaults use **Azure RBAC** (Role-Based Access Control) for authorization.

---

## Role Definitions

### Recommended Roles by Consumer

| Consumer Type | Role | Permissions |
|--------------|------|-------------|
| AKS Workload Identity | Key Vault Secrets User | Get secrets only |
| DevOps Pipeline | Key Vault Secrets User | Get secrets only |
| Platform Admin | Key Vault Secrets Officer | Get, Set, Delete secrets |
| Security Team | Key Vault Administrator | Full management |

### Role Scope

```
/subscriptions/{subscription-id}/resourceGroups/flamoral-prod-rg/providers/Microsoft.KeyVault/vaults/{vault-name}
```

---

## Service-to-Vault Mapping

### Payment Service (payment-service)

**Vault Access:**
- `flamoral-prod-payment-kv` - Get only

**Required Secrets:**
- `stripe-secret-key`
- `stripe-webhook-secret`
- `flutterwave-secret-key`
- `flutterwave-webhook-secret`
- `paystack-secret-key`
- `paystack-webhook-secret`

### Auth Service (auth-service)

**Vault Access:**
- `flamoral-prod-auth-kv` - Get only

**Required Secrets:**
- `jwt-secret`
- `jwt-access-secret`
- `jwt-refresh-secret`
- `session-secret`

### API Gateway / All Services

**Vault Access:**
- `flamoral-prod-data-kv` - Get only

**Required Secrets:**
- `postgres-password`
- `redis-password`

### Notification Service

**Vault Access:**
- `flamoral-prod-ext-kv` - Get only

**Required Secrets:**
- `sendgrid-api-key`
- `twilio-auth-token`
- `sentry-dsn`

---

## Denied Operations

The following operations are **explicitly denied** to service workloads:

| Operation | Reason |
|-----------|--------|
| Delete | Prevent accidental/malicious secret deletion |
| List | Minimize attack surface (services know what they need) |
| Set/Update | Services should never modify secrets |
| Purge | Protected by purge protection |

---

## Granting Access (AKS Workload Identity)

When AKS cluster is provisioned, grant access using:

```bash
# Get the AKS managed identity
AKS_IDENTITY=$(az aks show -g flamoral-prod-rg -n flamoral-prod-aks \
  --query identityProfile.kubeletidentity.objectId -o tsv)

# Grant Key Vault Secrets User role for payment service
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee-object-id $AKS_IDENTITY \
  --scope "/subscriptions/ebd1613e-fea0-4b6d-8918-7e4de6a71c44/resourceGroups/flamoral-prod-rg/providers/Microsoft.KeyVault/vaults/flamoral-prod-payment-kv"
```

---

## Audit Logging

Enable diagnostic settings for all vaults:

```bash
az monitor diagnostic-settings create \
  --name "keyvault-audit" \
  --resource "/subscriptions/{sub}/resourceGroups/flamoral-prod-rg/providers/Microsoft.KeyVault/vaults/flamoral-prod-payment-kv" \
  --workspace "/subscriptions/{sub}/resourceGroups/flamoral-prod-rg/providers/Microsoft.OperationalInsights/workspaces/flamoral-prod-logs" \
  --logs '[{"category":"AuditEvent","enabled":true}]'
```

---

## Emergency Access

In case of emergency requiring direct secret access:

1. Contact Platform Owner or Security Team
2. Use Azure Portal with MFA-protected admin account
3. All access is logged to Log Analytics
4. Review and revoke temporary access after incident

---

## Compliance Notes

- All secrets encrypted at rest with Microsoft-managed keys
- TLS 1.2+ required for all vault access
- Network restrictions can be added via service endpoints
- Private endpoints recommended for production

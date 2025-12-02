# Secrets Migration Quick Reference

## Quick Links

- **Main Migration Plan**: [SECRETS_MIGRATION_PLAN.md](./SECRETS_MIGRATION_PLAN.md)
- **Azure Portal Key Vaults**: https://portal.azure.com/#view/HubsExtension/BrowseResource/resourceType/Microsoft.KeyVault%2Fvaults
- **Azure DevOps Library**: https://dev.azure.com/yourorg/dating-app/_library

---

## Common Commands

### Azure Key Vault

```bash
# Login to Azure
az login

# Set default subscription
az account set --subscription "your-subscription-id"

# List all Key Vaults
az keyvault list --query "[].name" -o table

# List secrets in a Key Vault
az keyvault secret list --vault-name dating-app-prod-kv --query "[].name" -o tsv

# Get a secret value (BE CAREFUL - this prints the secret!)
az keyvault secret show --vault-name dating-app-prod-kv --name prod-database-url --query "value" -o tsv

# Set/Update a secret
az keyvault secret set --vault-name dating-app-prod-kv --name prod-database-url --value "new-value"

# Delete a secret (soft delete)
az keyvault secret delete --vault-name dating-app-prod-kv --name prod-database-url

# List deleted secrets
az keyvault secret list-deleted --vault-name dating-app-prod-kv

# Recover a deleted secret
az keyvault secret recover --vault-name dating-app-prod-kv --name prod-database-url

# Backup a secret
az keyvault secret backup --vault-name dating-app-prod-kv --name prod-database-url --file backup.blob
```

### Azure DevOps Variable Groups

```bash
# Install Azure DevOps extension
az extension add --name azure-devops

# Set defaults
az devops configure --defaults organization=https://dev.azure.com/yourorg project=dating-app

# List variable groups
az pipelines variable-group list -o table

# Show variable group details
az pipelines variable-group show --group-id <id>

# Create variable group
az pipelines variable-group create --name "my-secrets" --description "My secrets"

# Add variable to group
az pipelines variable-group variable create --group-name "my-secrets" --name "MY_VAR" --value "my-value"

# Update variable
az pipelines variable-group variable update --group-name "my-secrets" --name "MY_VAR" --value "new-value"

# Delete variable group
az pipelines variable-group delete --group-id <id> --yes
```

---

## Secret Naming Conventions

### GitHub Secrets → Key Vault

| GitHub Secret Name | Key Vault Secret Name | Environment |
|--------------------|----------------------|-------------|
| `DATABASE_URL` | `dev-database-url` | Dev |
| `DATABASE_URL` | `staging-database-url` | Staging |
| `DATABASE_URL` | `prod-database-url` | Production |
| `JWT_ACCESS_SECRET` | `dev-jwt-access-secret` | Dev |
| `STRIPE_SECRET_KEY` | `prod-stripe-secret-key` | Production |
| `AZURE_CLIENT_ID` | `azure-client-id` | Common |

**Rules**:
- Lowercase only
- Use hyphens instead of underscores
- Prefix with environment (dev-, staging-, prod-)
- No prefix for common secrets

---

## Variable Group → Key Vault Mapping

### Development

- **Variable Group**: `dev-secrets`
- **Key Vault**: `dating-app-dev-kv`
- **Service Connection**: `Azure-Production-ServiceConnection`

### Staging

- **Variable Group**: `test-secrets`
- **Key Vault**: `dating-app-staging-kv`
- **Service Connection**: `Azure-Production-ServiceConnection`

### Production

- **Variable Group**: `prod-secrets`
- **Key Vault**: `dating-app-prod-kv`
- **Service Connection**: `Azure-Production-ServiceConnection`

### Common

- **Variable Group**: `common-secrets`
- **Key Vault**: `dating-app-common-kv`
- **Service Connection**: `Azure-Production-ServiceConnection`

---

## Pipeline Variable Group Usage

```yaml
# Azure Pipelines YAML
variables:
  - group: common-secrets
  - group: dev-secrets  # or test-secrets, prod-secrets

steps:
  - script: |
      echo "Database URL: $(DATABASE_URL)"
      echo "JWT Secret length: ${#JWT_ACCESS_SECRET}"
    displayName: 'Use secrets'
    env:
      DATABASE_URL: $(DATABASE_URL)
      JWT_ACCESS_SECRET: $(JWT_ACCESS_SECRET)
```

---

## Troubleshooting

### Secret not found in pipeline

1. Check variable group is referenced in pipeline YAML
2. Verify secret exists in Key Vault
3. Verify service connection has Key Vault access
4. Wait 1-2 minutes for Key Vault sync

### Permission denied accessing Key Vault

1. Check service principal access policy:
   ```bash
   az keyvault show --name dating-app-prod-kv --query "properties.accessPolicies"
   ```

2. Grant access:
   ```bash
   az keyvault set-policy --name dating-app-prod-kv \
     --object-id <service-principal-object-id> \
     --secret-permissions get list
   ```

### Secret value is incorrect

1. Verify in Azure Portal (click "Show Secret Value")
2. Update in Key Vault:
   ```bash
   az keyvault secret set --vault-name dating-app-prod-kv \
     --name prod-database-url \
     --value "correct-value"
   ```
3. Restart pods:
   ```bash
   kubectl rollout restart deployment/user-service -n production
   ```

---

## Critical Secrets Checklist

### Before Production Deployment

- [ ] All production secrets uploaded to Key Vault
- [ ] JWT secrets are unique per environment (not reused from dev/staging)
- [ ] Stripe production keys (not test keys)
- [ ] Production database credentials
- [ ] Production third-party API keys (SendGrid, Twilio, etc.)
- [ ] Kubernetes config for production cluster
- [ ] ACR production credentials
- [ ] Encryption key (32 characters, unique)

### Security Verification

- [ ] No secrets exposed in logs
- [ ] No secrets in git repository
- [ ] Key Vault soft delete enabled
- [ ] Key Vault purge protection enabled
- [ ] Access policies use least privilege
- [ ] Production variable group requires approval
- [ ] Audit logging enabled

---

## Emergency Contacts

| Role | Name | Contact |
|------|------|---------|
| DevOps Lead | {name} | {email/phone} |
| Security Engineer | {name} | {email/phone} |
| On-Call Engineer | Rotation | {on-call-phone} |
| Manager | {name} | {email/phone} |

**Support Channels**:
- Slack: #devops-support
- Email: devops@datingapp.com
- Emergency: {emergency-phone}

---

## Migration Scripts

Located in `scripts/` directory:

1. **migrate-secrets-to-keyvault.sh** - Upload secrets from file to Key Vault
   ```bash
   ./scripts/migrate-secrets-to-keyvault.sh dev secrets-dev.env
   ```

2. **verify-keyvault-secrets.sh** - Verify all required secrets exist
   ```bash
   ./scripts/verify-keyvault-secrets.sh prod
   ```

3. **create-azure-variable-groups.sh** - Create variable groups in Azure DevOps
   ```bash
   ./scripts/create-azure-variable-groups.sh
   ```

---

## Rollback Plan

### Immediate Rollback (< 5 minutes)

If Azure DevOps pipelines fail:

1. Re-enable GitHub Actions workflows
2. GitHub secrets are still available (not deleted)
3. Trigger GitHub Actions manually
4. Monitor deployment

### Secret Fix (< 10 minutes)

If specific secret is wrong:

1. Update in Key Vault
2. Wait 1-2 minutes for sync
3. Restart affected pods
4. Verify health checks

### Full Rollback (< 15 minutes)

If complete failure:

1. Use Kubernetes rollback:
   ```bash
   kubectl rollout undo deployment/{service} -n production
   ```
2. Restore database from backup (if needed)
3. Verify all services healthy

---

## Post-Migration Checklist

### Week 1
- [ ] Monitor error rates daily
- [ ] Review Key Vault access logs
- [ ] Verify all services stable
- [ ] Document any issues encountered

### Week 2-4
- [ ] Review and remove unused secrets
- [ ] Optimize pipeline performance
- [ ] Update documentation
- [ ] Train team on new processes

### Day 30
- [ ] Delete GitHub secrets (after confirming stability)
- [ ] Archive GitHub Actions workflows
- [ ] Conduct security audit
- [ ] Update disaster recovery procedures

---

**Document Version**: 1.0
**Last Updated**: {date}

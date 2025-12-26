# FLAMORAL - GitHub Secrets for Azure AD Group Authorization

## Overview

This document lists all GitHub repository secrets required for Azure AD group-driven authorization in CI/CD pipelines and deployments.

---

## Required Secrets

Navigate to: **GitHub Repository** > **Settings** > **Secrets and variables** > **Actions**

### Azure AD B2C Configuration

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `B2C_TENANT_NAME` | B2C tenant name | `flamoralb2c` |
| `B2C_TENANT_ID` | B2C tenant ID (GUID) | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `B2C_CLIENT_ID` | B2C application client ID | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `B2C_POLICY_NAME` | B2C sign-up/sign-in policy | `B2C_1_SignUpSignIn` |

### Group Sync Automation

| Secret Name | Description | Example Value |
|-------------|-------------|---------------|
| `AUTOMATION_CLIENT_ID` | Service principal client ID for group sync | `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `AUTOMATION_CLIENT_SECRET` | Service principal secret | `your-client-secret` |

### Azure AD Group IDs

| Secret Name | Description | Group Name |
|-------------|-------------|------------|
| `GROUP_ID_SAAS_FREE` | Free tier users group ID | `saas-free` |
| `GROUP_ID_SAAS_STANDARD` | Standard tier users group ID | `saas-standard` |
| `GROUP_ID_SAAS_PREMIUM` | Premium tier users group ID | `saas-premium` |
| `GROUP_ID_SAAS_VERIFIED` | Verified users group ID | `saas-verified` |
| `GROUP_ID_SAAS_MODERATOR` | Moderators group ID | `saas-moderator` |
| `GROUP_ID_SAAS_OPERATOR` | Operators group ID | `saas-operator` |
| `GROUP_ID_SAAS_ADMIN` | Administrators group ID | `saas-admin` |
| `GROUP_ID_BANNED` | Banned users group ID | `banned` |

---

## Adding Secrets via GitHub Web UI

1. Go to your repository on GitHub
2. Click **Settings** (top navigation)
3. In the left sidebar, click **Secrets and variables** > **Actions**
4. Click **New repository secret**
5. Enter the **Name** (e.g., `GROUP_ID_SAAS_FREE`)
6. Enter the **Secret** (the GUID value)
7. Click **Add secret**
8. Repeat for all secrets listed above

---

## Adding Secrets via GitHub CLI

```bash
# Install GitHub CLI if not already installed
# https://cli.github.com/

# Authenticate
gh auth login

# Add B2C configuration secrets
gh secret set B2C_TENANT_NAME --body "your-tenant-name"
gh secret set B2C_TENANT_ID --body "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
gh secret set B2C_CLIENT_ID --body "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
gh secret set B2C_POLICY_NAME --body "B2C_1_SignUpSignIn"

# Add automation service principal secrets
gh secret set AUTOMATION_CLIENT_ID --body "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
gh secret set AUTOMATION_CLIENT_SECRET --body "your-client-secret"

# Add group ID secrets (replace with actual GUIDs from provisioning script)
gh secret set GROUP_ID_SAAS_FREE --body "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
gh secret set GROUP_ID_SAAS_STANDARD --body "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
gh secret set GROUP_ID_SAAS_PREMIUM --body "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
gh secret set GROUP_ID_SAAS_VERIFIED --body "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
gh secret set GROUP_ID_SAAS_MODERATOR --body "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
gh secret set GROUP_ID_SAAS_OPERATOR --body "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
gh secret set GROUP_ID_SAAS_ADMIN --body "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
gh secret set GROUP_ID_BANNED --body "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

---

## Bulk Import from File

After running the provisioning script, you can import from the exported file:

```bash
# The provisioning script exports to: scripts/group-ids-export.env

# Read and set each secret
while IFS='=' read -r name value; do
    # Skip comments and empty lines
    [[ -z "$name" || "$name" =~ ^# ]] && continue

    echo "Setting secret: $name"
    gh secret set "$name" --body "$value"
done < scripts/group-ids-export.env
```

---

## Using Secrets in GitHub Actions

### Example Workflow Configuration

```yaml
name: Deploy with Group Authorization

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    env:
      # B2C Configuration
      B2C_TENANT_NAME: ${{ secrets.B2C_TENANT_NAME }}
      B2C_TENANT_ID: ${{ secrets.B2C_TENANT_ID }}
      B2C_CLIENT_ID: ${{ secrets.B2C_CLIENT_ID }}
      B2C_POLICY_NAME: ${{ secrets.B2C_POLICY_NAME }}

      # Group IDs
      GROUP_ID_SAAS_FREE: ${{ secrets.GROUP_ID_SAAS_FREE }}
      GROUP_ID_SAAS_STANDARD: ${{ secrets.GROUP_ID_SAAS_STANDARD }}
      GROUP_ID_SAAS_PREMIUM: ${{ secrets.GROUP_ID_SAAS_PREMIUM }}
      GROUP_ID_SAAS_VERIFIED: ${{ secrets.GROUP_ID_SAAS_VERIFIED }}
      GROUP_ID_SAAS_MODERATOR: ${{ secrets.GROUP_ID_SAAS_MODERATOR }}
      GROUP_ID_SAAS_OPERATOR: ${{ secrets.GROUP_ID_SAAS_OPERATOR }}
      GROUP_ID_SAAS_ADMIN: ${{ secrets.GROUP_ID_SAAS_ADMIN }}
      GROUP_ID_BANNED: ${{ secrets.GROUP_ID_BANNED }}

    steps:
      - uses: actions/checkout@v4

      - name: Build and Deploy
        run: |
          # Secrets are available as environment variables
          echo "Deploying with B2C tenant: $B2C_TENANT_NAME"
```

### Example: Docker Build with Secrets

```yaml
- name: Build Docker image
  run: |
    docker build \
      --build-arg B2C_TENANT_NAME=${{ secrets.B2C_TENANT_NAME }} \
      --build-arg B2C_CLIENT_ID=${{ secrets.B2C_CLIENT_ID }} \
      -t flamoral/auth-service:${{ github.sha }} \
      ./backend/services/auth-service
```

### Example: Kubernetes Deployment

```yaml
- name: Deploy to Kubernetes
  run: |
    kubectl create secret generic flamoral-group-ids \
      --from-literal=GROUP_ID_SAAS_FREE=${{ secrets.GROUP_ID_SAAS_FREE }} \
      --from-literal=GROUP_ID_SAAS_STANDARD=${{ secrets.GROUP_ID_SAAS_STANDARD }} \
      --from-literal=GROUP_ID_SAAS_PREMIUM=${{ secrets.GROUP_ID_SAAS_PREMIUM }} \
      --from-literal=GROUP_ID_SAAS_VERIFIED=${{ secrets.GROUP_ID_SAAS_VERIFIED }} \
      --from-literal=GROUP_ID_SAAS_MODERATOR=${{ secrets.GROUP_ID_SAAS_MODERATOR }} \
      --from-literal=GROUP_ID_SAAS_OPERATOR=${{ secrets.GROUP_ID_SAAS_OPERATOR }} \
      --from-literal=GROUP_ID_SAAS_ADMIN=${{ secrets.GROUP_ID_SAAS_ADMIN }} \
      --from-literal=GROUP_ID_BANNED=${{ secrets.GROUP_ID_BANNED }} \
      --dry-run=client -o yaml | kubectl apply -f -
```

---

## Environment-Specific Secrets

For multi-environment setups, consider using environment-scoped secrets:

### GitHub Environments

1. Go to **Settings** > **Environments**
2. Create environments: `development`, `staging`, `production`
3. Add environment-specific secrets

### Naming Convention

```
# Development
GROUP_ID_SAAS_FREE_DEV=...

# Staging
GROUP_ID_SAAS_FREE_STAGING=...

# Production
GROUP_ID_SAAS_FREE_PROD=...
```

Or use GitHub Environments with the same secret names scoped to each environment.

---

## Security Best Practices

1. **Never log secrets** - Avoid echoing secret values in workflow logs
2. **Use environments** - Scope secrets to specific environments for production
3. **Rotate regularly** - `AUTOMATION_CLIENT_SECRET` should rotate every 90 days
4. **Audit access** - Review who has access to repository secrets periodically
5. **Use OIDC** - Consider using GitHub OIDC for Azure authentication instead of long-lived secrets

---

## Verification

After adding all secrets, verify they are configured:

```bash
# List all secrets (names only, not values)
gh secret list

# Expected output:
# B2C_TENANT_NAME          Updated 2024-12-25
# B2C_TENANT_ID            Updated 2024-12-25
# B2C_CLIENT_ID            Updated 2024-12-25
# B2C_POLICY_NAME          Updated 2024-12-25
# AUTOMATION_CLIENT_ID     Updated 2024-12-25
# AUTOMATION_CLIENT_SECRET Updated 2024-12-25
# GROUP_ID_SAAS_FREE       Updated 2024-12-25
# GROUP_ID_SAAS_STANDARD   Updated 2024-12-25
# GROUP_ID_SAAS_PREMIUM    Updated 2024-12-25
# GROUP_ID_SAAS_VERIFIED   Updated 2024-12-25
# GROUP_ID_SAAS_MODERATOR  Updated 2024-12-25
# GROUP_ID_SAAS_OPERATOR   Updated 2024-12-25
# GROUP_ID_SAAS_ADMIN      Updated 2024-12-25
# GROUP_ID_BANNED          Updated 2024-12-25
```

---

## Related Documentation

- [GROUP_PROVISIONING.md](./GROUP_PROVISIONING.md) - How to provision the Azure AD groups
- [SECRETS_INVENTORY.md](../SECRETS_INVENTORY.md) - Complete secrets reference

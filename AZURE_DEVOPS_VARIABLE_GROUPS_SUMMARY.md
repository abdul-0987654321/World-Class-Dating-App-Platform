# Azure DevOps Variable Groups - Implementation Summary

## Overview

This document provides a quick reference for the Azure DevOps Variable Groups setup that has been created for the Flamoral Dating Platform.

## Created Files

### 1. Documentation
- **Location**: `docs/azure-devops-setup.md` (23 KB)
- **Purpose**: Comprehensive documentation of all Variable Groups, variables, and setup procedures
- **Contents**:
  - Complete list of all variable groups and their variables
  - Secrets management guidelines
  - Azure Key Vault integration instructions
  - Manual and automated setup procedures
  - Troubleshooting guide
  - Best practices

### 2. Automation Script
- **Location**: `scripts/setup-variable-groups.ps1` (27 KB)
- **Purpose**: PowerShell script to automate Variable Group creation via Azure DevOps REST API
- **Features**:
  - Creates all 6 required Variable Groups
  - Sets up non-secret variables with default values
  - Creates secret placeholders (to be filled manually)
  - Supports selective environment creation
  - Idempotent (safe to run multiple times)

### 3. Environment Configuration Templates
- **`.env.dev.example`** (8.9 KB) - Development environment template
- **`.env.test.example`** (11 KB) - Test/Staging environment template
- **`.env.prod.example`** (14 KB) - Production environment template

## Variable Groups Structure

### Created Variable Groups

1. **`flamoral-shared-vars`**
   - Purpose: Common variables across all environments
   - Contains: Build tool versions, ACR settings, Terraform state config

2. **`flamoral-cd-vars`**
   - Purpose: CD-specific configuration
   - Contains: Service connection names

3. **`datingplatform-terraform-common`**
   - Purpose: Terraform and Azure authentication
   - Contains: ARM credentials (all secrets)

4. **`datingplatform-dev`**
   - Purpose: Development environment
   - Contains: 50+ environment-specific variables
   - Secrets: Database passwords, API keys, JWT secrets

5. **`datingplatform-test`**
   - Purpose: Test/Staging environment
   - Contains: 50+ environment-specific variables
   - Secrets: Database passwords, API keys, JWT secrets

6. **`datingplatform-prod`**
   - Purpose: Production environment
   - Contains: 60+ environment-specific variables
   - Secrets: ALL production secrets stored in Azure Key Vault

## Quick Start Guide

### Method 1: Automated Setup (Recommended)

```powershell
# Navigate to project directory
cd C:\Users\citad\OneDrive\Documents\Dating\DatingPlatform

# Run the setup script
.\scripts\setup-variable-groups.ps1 -PAT "your-azure-devops-pat-token"

# Or create specific environment
.\scripts\setup-variable-groups.ps1 -PAT "your-pat" -Environment "dev"
```

### Method 2: Manual Setup

1. Navigate to Azure DevOps → Pipelines → Library
2. Follow instructions in `docs/azure-devops-setup.md`
3. Create each Variable Group manually
4. Add all variables from the documentation tables

## Post-Setup Tasks

After running the automation script or manual setup:

1. **Set Secret Values**
   - Navigate to each Variable Group in Azure DevOps
   - Fill in all secret variable values (marked with lock icon)
   - Use strong, randomly generated values for JWT secrets (64+ chars)

2. **Link to Azure Key Vault (Production & Test)**
   ```bash
   # Create secrets in Key Vault first
   az keyvault secret set --vault-name flamoral-prod-kv --name JWT-ACCESS-SECRET --value "your-secret"

   # Then link Variable Group to Key Vault via Azure DevOps UI
   ```

3. **Set Pipeline Permissions**
   - For each Variable Group, add pipeline permissions:
     - `Flamoral-CI-Pipeline`
     - `Flamoral-CD-Pipeline`
     - `Infrastructure-Pipeline`

4. **Validate Variables**
   - Review all placeholder values (e.g., `REPLACE_WITH_YOUR_*`)
   - Update with actual values for your environment
   - Test connection strings and API keys

## Variable Categories

### Azure Infrastructure
- ARM credentials (Client ID, Secret, Subscription ID, Tenant ID)
- Resource group names
- AKS cluster names
- Key Vault names

### Databases
- PostgreSQL connection strings and credentials
- MongoDB connection strings
- Redis connection strings and passwords

### Third-Party Services
- **Stripe**: Secret keys, publishable keys, webhook secrets
- **SendGrid**: API keys, sender emails
- **Twilio**: Account SID, auth token, phone numbers
- **Agora**: App ID, app certificate
- **Sentry**: DSN, environment

### Azure Services
- Storage account keys and connection strings
- Cognitive Services API keys
- Container Registry credentials

### Application Configuration
- JWT secrets (access and refresh)
- CORS origins
- Feature flags
- Logging levels
- Resource limits

## Security Best Practices

1. **Never Commit Secrets**
   - All `.env.*` files should be in `.gitignore`
   - Never commit actual secret values to source control

2. **Use Azure Key Vault for Production**
   - All production secrets MUST be in Azure Key Vault
   - Link Variable Groups to Key Vault
   - Enable managed identity for AKS pods

3. **Rotate Secrets Regularly**
   - JWT secrets: Every 90 days
   - Database passwords: Every 60 days
   - API keys: When compromised or annually

4. **Separate Environments**
   - Never share secrets between environments
   - Use test API keys in dev/test
   - Use production keys only in production

5. **Access Control**
   - Limit Variable Group access to necessary pipelines only
   - Review access permissions quarterly
   - Use Azure RBAC for Key Vault access

## Pipeline Integration

Variable Groups are referenced in pipelines as follows:

```yaml
# In pipeline YAML
variables:
  - template: templates/variables-common.yml
  - group: flamoral-shared-vars
  - group: datingplatform-dev  # or test/prod based on stage
```

## Validation Checklist

Before deploying to any environment:

- [ ] All Variable Groups created
- [ ] All secret values populated (no empty secrets)
- [ ] Production linked to Azure Key Vault
- [ ] Pipeline permissions configured
- [ ] Connection strings tested
- [ ] API keys validated (correct environment)
- [ ] JWT secrets are 64+ characters
- [ ] CORS origins match actual domains
- [ ] Resource limits appropriate for environment

## Troubleshooting

### Common Issues

1. **Variable not found in pipeline**
   - Check Variable Group is linked to pipeline
   - Verify variable name matches exactly (case-sensitive)
   - Ensure group is referenced in pipeline YAML

2. **Secret values empty**
   - Secrets are masked in logs (expected)
   - Verify secret has a value in Variable Group
   - For Key Vault secrets, check permissions

3. **Key Vault integration fails**
   - Verify service connection is authorized
   - Check Key Vault access policies
   - Ensure secret names match exactly

## Documentation References

- **Full Documentation**: `docs/azure-devops-setup.md`
- **Setup Script**: `scripts/setup-variable-groups.ps1`
- **Dev Environment**: `.env.dev.example`
- **Test Environment**: `.env.test.example`
- **Production Environment**: `.env.prod.example`

## Pipeline References

- **CI Pipeline**: `pipelines/ci-pipeline.yml`
- **CD Pipeline**: `pipelines/cd-pipeline.yml`
- **Infrastructure Pipeline**: `pipelines/infrastructure-pipeline.yml`
- **Variable Templates**:
  - `pipelines/templates/variables-common.yml`
  - `pipelines/templates/variables-dev.yml`
  - `pipelines/templates/variables-test.yml`
  - `pipelines/templates/variables-prod.yml`

## Support Contacts

For assistance with Variable Groups setup:

- **DevOps Team**: devops@flamoral.com
- **Azure Administrator**: azure-admin@flamoral.com
- **Technical Lead**: tech-lead@flamoral.com

## Next Steps

1. Run the automation script to create Variable Groups
2. Populate all secret values
3. Link production to Azure Key Vault
4. Set pipeline permissions
5. Test pipelines in dev environment
6. Deploy to test environment
7. After validation, deploy to production

---

**Created**: 2025-12-07
**Status**: Ready for Implementation
**Version**: 1.0.0

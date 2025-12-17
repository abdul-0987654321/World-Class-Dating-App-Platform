# Flamoral Configuration

Environment-specific configuration files for flamoral.com deployment.

## Directory Structure

```
config/
├── dev/                    # Development environment
│   ├── .env.example       # Development environment variables
│   └── .env.test.example  # Test environment variables
├── staging/               # Staging environment
│   └── .env.example       # Staging environment variables
└── production/            # Production environment
    └── .env.example       # Production environment variables
```

## Environment Variables

### Required Secrets (Azure Key Vault)

These secrets should be stored in Azure Key Vault and referenced via External Secrets:

| Secret | Description |
|--------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | JWT signing key |
| `STRIPE_SECRET_KEY` | Stripe API key |
| `AZURE_STORAGE_CONNECTION` | Azure Blob Storage connection |

### Configuration by Environment

| Variable | Dev | Staging | Production |
|----------|-----|---------|------------|
| `NODE_ENV` | development | staging | production |
| `LOG_LEVEL` | debug | info | warn |
| `API_URL` | dev.flamoral.com | staging.flamoral.com | flamoral.com |

## Usage

1. Copy the appropriate `.env.example` file to `.env`
2. Fill in the required values
3. For Kubernetes, use External Secrets to pull from Azure Key Vault

## Azure Key Vault Integration

```bash
# Development
az keyvault secret list --vault-name flamoral-kv-dev

# Staging
az keyvault secret list --vault-name flamoral-kv-staging

# Production
az keyvault secret list --vault-name flamoral-kv-prod
```

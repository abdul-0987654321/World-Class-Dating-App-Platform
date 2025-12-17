# Azure Key Vault Secrets Reference

This document lists all the secrets that must be created in Azure Key Vault (`flamoral-prod-kv`) before deploying the External Secrets configuration.

## Quick Commands

### List all secrets in Key Vault
```bash
az keyvault secret list --vault-name flamoral-prod-kv --output table
```

### Set a secret
```bash
az keyvault secret set --vault-name flamoral-prod-kv --name <secret-name> --value "<secret-value>"
```

### Set a secret from file
```bash
az keyvault secret set --vault-name flamoral-prod-kv --name <secret-name> --file <path-to-file>
```

---

## Authentication & Authorization Secrets

### JWT Secrets
| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `jwt-secret` | General JWT signing secret | `base64-encoded-random-string-min-32-chars` |
| `jwt-access-secret` | Access token signing secret | `base64-encoded-random-string-min-32-chars` |
| `jwt-refresh-secret` | Refresh token signing secret | `base64-encoded-random-string-min-32-chars` |

**Commands:**
```bash
# Generate and set JWT secrets
az keyvault secret set --vault-name flamoral-prod-kv --name jwt-secret --value "$(openssl rand -base64 32)"
az keyvault secret set --vault-name flamoral-prod-kv --name jwt-access-secret --value "$(openssl rand -base64 32)"
az keyvault secret set --vault-name flamoral-prod-kv --name jwt-refresh-secret --value "$(openssl rand -base64 32)"
```

### Service Authentication
| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `service-api-key` | Internal service-to-service API key | `base64-encoded-random-string` |
| `session-secret` | Session encryption secret | `base64-encoded-random-string-min-32-chars` |

**Commands:**
```bash
az keyvault secret set --vault-name flamoral-prod-kv --name service-api-key --value "$(openssl rand -base64 32)"
az keyvault secret set --vault-name flamoral-prod-kv --name session-secret --value "$(openssl rand -base64 32)"
```

### OAuth Secrets
| Secret Name | Description | Where to Get |
|------------|-------------|--------------|
| `google-oauth-secret` | Google OAuth client secret | Google Cloud Console > APIs & Services > Credentials |
| `facebook-oauth-secret` | Facebook app secret | Facebook Developers > App Settings > Basic |
| `apple-oauth-key` | Apple OAuth private key | Apple Developer > Certificates, IDs & Profiles |

**Commands:**
```bash
az keyvault secret set --vault-name flamoral-prod-kv --name google-oauth-secret --value "<your-google-client-secret>"
az keyvault secret set --vault-name flamoral-prod-kv --name facebook-oauth-secret --value "<your-facebook-app-secret>"
az keyvault secret set --vault-name flamoral-prod-kv --name apple-oauth-key --file apple-private-key.p8
```

---

## Payment Secrets (Stripe)

| Secret Name | Description | Where to Get |
|------------|-------------|--------------|
| `stripe-secret-key` | Stripe secret API key | Stripe Dashboard > Developers > API keys |
| `stripe-publishable-key` | Stripe publishable key | Stripe Dashboard > Developers > API keys |
| `stripe-webhook-secret` | Stripe webhook signing secret | Stripe Dashboard > Developers > Webhooks |

**Commands:**
```bash
az keyvault secret set --vault-name flamoral-prod-kv --name stripe-secret-key --value "<sk_live_...>"
az keyvault secret set --vault-name flamoral-prod-kv --name stripe-publishable-key --value "<pk_live_...>"
az keyvault secret set --vault-name flamoral-prod-kv --name stripe-webhook-secret --value "<whsec_...>"
```

---

## Notification Secrets

### SendGrid (Email)
| Secret Name | Description | Where to Get |
|------------|-------------|--------------|
| `sendgrid-api-key` | SendGrid API key | SendGrid Dashboard > Settings > API Keys |

**Command:**
```bash
az keyvault secret set --vault-name flamoral-prod-kv --name sendgrid-api-key --value "<SG.xxx>"
```

### Twilio (SMS)
| Secret Name | Description | Where to Get |
|------------|-------------|--------------|
| `twilio-account-sid` | Twilio account SID | Twilio Console > Account Info |
| `twilio-auth-token` | Twilio auth token | Twilio Console > Account Info |

**Commands:**
```bash
az keyvault secret set --vault-name flamoral-prod-kv --name twilio-account-sid --value "<ACxxxxx>"
az keyvault secret set --vault-name flamoral-prod-kv --name twilio-auth-token --value "<auth-token>"
```

### Firebase (Push Notifications)
| Secret Name | Description | Where to Get |
|------------|-------------|--------------|
| `firebase-private-key` | Firebase service account private key | Firebase Console > Project Settings > Service Accounts |
| `fcm-server-key` | Firebase Cloud Messaging server key | Firebase Console > Project Settings > Cloud Messaging |

**Commands:**
```bash
az keyvault secret set --vault-name flamoral-prod-kv --name firebase-private-key --file firebase-service-account.json
az keyvault secret set --vault-name flamoral-prod-kv --name fcm-server-key --value "<server-key>"
```

---

## Database & Cache Secrets

### PostgreSQL
| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `db-host` | PostgreSQL server hostname | `flamoral-prod-db.postgres.database.azure.com` |
| `db-name` | Database name | `flamoral_production` |
| `db-user` | Database username | `flamoraladmin` |
| `db-password` | Database password | `strong-random-password` |
| `db-read-replica-1-url` | Read replica 1 connection URL | `postgresql://user:pass@replica1.postgres.database.azure.com:5432/dbname` |
| `db-read-replica-2-url` | Read replica 2 connection URL | `postgresql://user:pass@replica2.postgres.database.azure.com:5432/dbname` |

**Commands:**
```bash
az keyvault secret set --vault-name flamoral-prod-kv --name db-host --value "flamoral-prod-db.postgres.database.azure.com"
az keyvault secret set --vault-name flamoral-prod-kv --name db-name --value "flamoral_production"
az keyvault secret set --vault-name flamoral-prod-kv --name db-user --value "flamoraladmin"
az keyvault secret set --vault-name flamoral-prod-kv --name db-password --value "<strong-password>"
```

### MongoDB (if used)
| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `mongodb-uri` | MongoDB connection URI | `mongodb+srv://user:pass@cluster.mongodb.net/dbname` |

**Command:**
```bash
az keyvault secret set --vault-name flamoral-prod-kv --name mongodb-uri --value "<connection-string>"
```

### Redis
| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `redis-host` | Redis hostname | `flamoral-prod-redis.redis.cache.windows.net` |
| `redis-password` | Redis access key | Azure Portal > Redis Cache > Access keys |

**Commands:**
```bash
az keyvault secret set --vault-name flamoral-prod-kv --name redis-host --value "flamoral-prod-redis.redis.cache.windows.net"
az keyvault secret set --vault-name flamoral-prod-kv --name redis-password --value "<primary-access-key>"
```

### Azure Service Bus
| Secret Name | Description | Where to Get |
|------------|-------------|--------------|
| `azure-servicebus-connection-string` | Service Bus connection string | Azure Portal > Service Bus > Shared access policies |

**Command:**
```bash
az keyvault secret set --vault-name flamoral-prod-kv --name azure-servicebus-connection-string --value "<Endpoint=sb://...>"
```

---

## Media & Storage Secrets

### Azure Storage
| Secret Name | Description | Where to Get |
|------------|-------------|--------------|
| `azure-storage-key` | Storage account access key | Azure Portal > Storage Account > Access keys |
| `azure-storage-connection-string` | Storage account connection string | Azure Portal > Storage Account > Access keys |

**Commands:**
```bash
az keyvault secret set --vault-name flamoral-prod-kv --name azure-storage-key --value "<storage-access-key>"
az keyvault secret set --vault-name flamoral-prod-kv --name azure-storage-connection-string --value "DefaultEndpointsProtocol=https;AccountName=..."
```

### Azure Cognitive Services
| Secret Name | Description | Where to Get |
|------------|-------------|--------------|
| `azure-face-api-key` | Azure Face API key | Azure Portal > Face API > Keys and Endpoint |
| `azure-content-moderator-key` | Content Moderator API key | Azure Portal > Content Moderator > Keys and Endpoint |
| `azure-computer-vision-key` | Computer Vision API key | Azure Portal > Computer Vision > Keys and Endpoint |

**Commands:**
```bash
az keyvault secret set --vault-name flamoral-prod-kv --name azure-face-api-key --value "<face-api-key>"
az keyvault secret set --vault-name flamoral-prod-kv --name azure-content-moderator-key --value "<moderator-key>"
az keyvault secret set --vault-name flamoral-prod-kv --name azure-computer-vision-key --value "<vision-key>"
```

### Agora (Video/Voice)
| Secret Name | Description | Where to Get |
|------------|-------------|--------------|
| `agora-app-id` | Agora application ID | Agora Console > Project Management |
| `agora-app-certificate` | Agora app certificate | Agora Console > Project Management |
| `agora-customer-key` | Agora customer key | Agora Console > RESTful API |
| `agora-customer-secret` | Agora customer secret | Agora Console > RESTful API |

**Commands:**
```bash
az keyvault secret set --vault-name flamoral-prod-kv --name agora-app-id --value "<app-id>"
az keyvault secret set --vault-name flamoral-prod-kv --name agora-app-certificate --value "<app-certificate>"
az keyvault secret set --vault-name flamoral-prod-kv --name agora-customer-key --value "<customer-key>"
az keyvault secret set --vault-name flamoral-prod-kv --name agora-customer-secret --value "<customer-secret>"
```

---

## Additional Secrets (Optional)

### AI Services
| Secret Name | Description | Where to Get |
|------------|-------------|--------------|
| `openai-api-key` | OpenAI API key | OpenAI Platform > API Keys |
| `ai-model-api-key` | Custom AI model API key | Your AI service provider |

### Monitoring
| Secret Name | Description | Where to Get |
|------------|-------------|--------------|
| `sentry-dsn` | Sentry DSN for error tracking | Sentry > Project Settings > Client Keys (DSN) |
| `application-insights-connection-string` | Application Insights connection string | Azure Portal > Application Insights > Properties |

### Geolocation
| Secret Name | Description | Where to Get |
|------------|-------------|--------------|
| `google-maps-api-key` | Google Maps API key | Google Cloud Console > APIs & Services > Credentials |
| `mapbox-access-token` | Mapbox access token | Mapbox Account > Access tokens |

---

## Bulk Import Script

Save all your secrets in a `.env` file (DO NOT commit this file to version control):

```bash
# .env.secrets
JWT_SECRET=<value>
JWT_ACCESS_SECRET=<value>
JWT_REFRESH_SECRET=<value>
# ... add all secrets here
```

Then use this script to import them:

```bash
#!/bin/bash
# import-secrets.sh

KEY_VAULT_NAME="flamoral-prod-kv"

# Read .env file and import each secret
while IFS='=' read -r key value; do
  # Skip comments and empty lines
  [[ $key =~ ^#.*$ ]] && continue
  [[ -z $key ]] && continue

  # Convert SNAKE_CASE to kebab-case
  secret_name=$(echo "$key" | tr '[:upper:]' '[:lower:]' | tr '_' '-')

  echo "Setting secret: $secret_name"
  az keyvault secret set \
    --vault-name "$KEY_VAULT_NAME" \
    --name "$secret_name" \
    --value "$value"
done < .env.secrets

echo "All secrets imported successfully!"
```

---

## Verification

After setting all secrets, verify they exist:

```bash
# List all secrets
az keyvault secret list --vault-name flamoral-prod-kv --output table

# Count secrets
az keyvault secret list --vault-name flamoral-prod-kv --query "length(@)"

# Check a specific secret (will show metadata only, not value)
az keyvault secret show --vault-name flamoral-prod-kv --name jwt-access-secret
```

---

## Security Best Practices

1. **Rotate secrets regularly**: Set up automatic rotation policies
2. **Use separate Key Vaults**: Keep production secrets isolated
3. **Enable soft delete**: Protect against accidental deletion
4. **Enable purge protection**: Prevent permanent deletion
5. **Audit access**: Review Key Vault access logs regularly
6. **Least privilege**: Grant minimum necessary permissions
7. **Use managed identities**: Avoid storing credentials in code

---

## Troubleshooting

### Permission Denied
```bash
# Grant yourself access to secrets
az keyvault set-policy \
  --name flamoral-prod-kv \
  --upn <your-email> \
  --secret-permissions get list set delete
```

### Cannot find Key Vault
```bash
# Verify Key Vault exists
az keyvault show --name flamoral-prod-kv

# Check your subscription
az account show
```

### Secret not syncing to Kubernetes
1. Verify the secret exists in Key Vault
2. Check the secret name matches exactly (case-sensitive)
3. Ensure managed identity has "Get" permission on secrets
4. Check External Secrets Operator logs

# OAuth Secret Naming Fix - Validation Checklist

## Pre-Deployment Validation

### 1. File Changes Review
- [x] `auth-secrets.yaml` - OAuth references updated to match Terraform
- [x] `database-secrets.yaml` - Service Bus reference corrected
- [x] `service-vaults/main.tf` - All missing secrets added

### 2. Verify Secret Name Alignment

#### Auth Vault OAuth Secrets
- [x] `google-client-secret` (was: google-oauth-secret)
- [x] `facebook-app-secret` (was: facebook-oauth-secret)
- [x] `apple-private-key` (was: apple-oauth-key)

#### Database/Data Vault Secrets
- [x] `db-host` - Added to Terraform
- [x] `db-name` - Added to Terraform
- [x] `db-user` - Added to Terraform
- [x] `db-password` - Added to Terraform
- [x] `db-read-replica-1-url` - Added to Terraform
- [x] `db-read-replica-2-url` - Added to Terraform
- [x] `redis-host` - Added to Terraform

#### External Vault Secrets
- [x] `agora-app-id` - Added to Terraform
- [x] `agora-customer-key` - Added to Terraform
- [x] `twilio-account-sid` - Added to Terraform
- [x] `fcm-server-key` - Added to Terraform

#### Infrastructure Vault Secrets
- [x] `azure-computer-vision-key` - Added to Terraform
- [x] `azure-service-bus-connection-string` - ESO reference corrected

#### Payment Vault Secrets
- [x] `stripe-publishable-key` - Added to Terraform

---

## Deployment Phase

### Step 1: Terraform Deployment
```bash
cd infrastructure/terraform/environments/prod
terraform init
terraform plan -out=tfplan
# Review plan output carefully
terraform apply tfplan
```

**Validation:**
- [ ] Terraform plan shows ONLY secret additions (no deletions)
- [ ] No errors during apply
- [ ] All 5 KeyVaults updated successfully

### Step 2: Populate Missing Secrets
```bash
# Data Vault - Database credentials
az keyvault secret set --vault-name flamoralproddatakv --name db-host --value "<postgres-host>"
az keyvault secret set --vault-name flamoralproddatakv --name db-name --value "flamoral_prod"
az keyvault secret set --vault-name flamoralproddatakv --name db-user --value "<db-username>"
az keyvault secret set --vault-name flamoralproddatakv --name db-password --value "<db-password>"
az keyvault secret set --vault-name flamoralproddatakv --name db-read-replica-1-url --value "<replica-1-url>"
az keyvault secret set --vault-name flamoralproddatakv --name db-read-replica-2-url --value "<replica-2-url>"
az keyvault secret set --vault-name flamoralproddatakv --name redis-host --value "<redis-host>"

# External Vault - Third-party APIs
az keyvault secret set --vault-name flamoralprodexternalkv --name agora-app-id --value "<agora-app-id>"
az keyvault secret set --vault-name flamoralprodexternalkv --name agora-customer-key --value "<agora-customer-key>"
az keyvault secret set --vault-name flamoralprodexternalkv --name twilio-account-sid --value "<twilio-sid>"
az keyvault secret set --vault-name flamoralprodexternalkv --name fcm-server-key --value "<fcm-key>"

# Infrastructure Vault
az keyvault secret set --vault-name flamoralprodinfrakv --name azure-computer-vision-key --value "<cv-key>"

# Payment Vault
az keyvault secret set --vault-name flamoralprodpaymentkv --name stripe-publishable-key --value "<pk_live_...>"
```

**Validation:**
- [ ] All 13 new secrets created successfully
- [ ] Verify each secret value is correct (not placeholder)

### Step 3: Deploy Kubernetes ExternalSecrets
```bash
kubectl apply -f infrastructure/kubernetes/production/external-secrets/auth-secrets.yaml
kubectl apply -f infrastructure/kubernetes/production/external-secrets/database-secrets.yaml

# Apply all ExternalSecrets to ensure consistency
kubectl apply -f infrastructure/kubernetes/production/external-secrets/
```

**Validation:**
- [ ] No errors during apply
- [ ] ExternalSecret resources created/updated

### Step 4: Verify ESO Synchronization
```bash
# Check ExternalSecret status
kubectl get externalsecrets -n flamoral

# Should show SecretSynced=True for all
kubectl get externalsecret flamoral-auth-secrets -n flamoral -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}'
kubectl get externalsecret flamoral-database-secrets -n flamoral -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}'

# Check generated Kubernetes secrets
kubectl get secrets -n flamoral | grep flamoral

# Verify secret keys exist (without exposing values)
kubectl get secret flamoral-auth-secrets -n flamoral -o jsonpath='{.data}' | jq 'keys'
```

**Expected Keys in `flamoral-auth-secrets`:**
```json
[
  "APPLE_PRIVATE_KEY",
  "FACEBOOK_APP_SECRET",
  "GOOGLE_CLIENT_SECRET",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "JWT_SECRET",
  "SERVICE_API_KEY",
  "SESSION_SECRET"
]
```

**Validation:**
- [ ] All ExternalSecrets show `Ready=True`
- [ ] All ExternalSecrets show `SecretSynced=True`
- [ ] No error messages in status
- [ ] Kubernetes secrets contain expected keys

---

## Post-Deployment Validation

### Step 5: Application Pod Health
```bash
# Restart deployments to pick up new secrets
kubectl rollout restart deployment/auth-service -n flamoral
kubectl rollout restart deployment/user-service -n flamoral

# Wait for rollout
kubectl rollout status deployment/auth-service -n flamoral
kubectl rollout status deployment/user-service -n flamoral

# Check pod logs for secret-related errors
kubectl logs deployment/auth-service -n flamoral --tail=50 | grep -i "secret\|oauth\|error"
```

**Validation:**
- [ ] Pods restart successfully
- [ ] No secret-related errors in logs
- [ ] Environment variables loaded correctly

### Step 6: OAuth Flow Testing

#### Google OAuth
```bash
# Test endpoint
curl -X POST https://api.flamoral.com/auth/google \
  -H "Content-Type: application/json" \
  -d '{"token": "<google-id-token>"}'
```
- [ ] Returns 200 OK or valid auth response
- [ ] No "invalid client secret" errors

#### Facebook OAuth
```bash
curl -X POST https://api.flamoral.com/auth/facebook \
  -H "Content-Type: application/json" \
  -d '{"accessToken": "<facebook-token>"}'
```
- [ ] Returns 200 OK or valid auth response
- [ ] No "invalid app secret" errors

#### Apple Sign-In
```bash
curl -X POST https://api.flamoral.com/auth/apple \
  -H "Content-Type: application/json" \
  -d '{"identityToken": "<apple-token>", "authorizationCode": "<code>"}'
```
- [ ] Returns 200 OK or valid auth response
- [ ] No "invalid private key" errors

### Step 7: Database Connectivity
```bash
# Exec into a service pod
kubectl exec -it deployment/user-service -n flamoral -- sh

# Inside pod:
env | grep DB_
# Should show: DB_HOST, DB_NAME, DB_USER, DB_PASSWORD

# Test connection (if psql available)
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT 1;"
```

**Validation:**
- [ ] Database environment variables present
- [ ] Database connection successful
- [ ] Read replica URLs configured

### Step 8: Third-Party Service Testing

#### Agora (Video/Audio)
- [ ] Agora app ID loaded in media-service
- [ ] Video call initialization successful
- [ ] Token generation works

#### Twilio (SMS)
- [ ] Send test SMS succeeds
- [ ] Twilio account SID and auth token working

#### SendGrid (Email)
- [ ] Send test email succeeds
- [ ] API key valid

#### Firebase (Push Notifications)
- [ ] FCM server key loaded
- [ ] Test push notification delivered

---

## Monitoring & Verification

### ESO Logs
```bash
kubectl logs -n external-secrets-system deployment/external-secrets --tail=100 -f
```
**Look for:**
- [ ] No "secret not found" errors
- [ ] No "permission denied" errors
- [ ] Successful sync messages

### Application Logs
```bash
kubectl logs deployment/auth-service -n flamoral -f | grep -i oauth
```
**Look for:**
- [ ] OAuth initialization successful
- [ ] No missing configuration warnings

### Azure Portal Verification
1. Navigate to each KeyVault in Azure Portal
2. Check "Secrets" blade
3. Verify all expected secrets exist
4. Check "Access policies" or "Access control (IAM)" for ESO permissions

**Validation:**
- [ ] All 13 new secrets visible in KeyVaults
- [ ] ESO managed identity has "Key Vault Secrets User" role
- [ ] No access denied audit logs

---

## Rollback Procedure

If validation fails at any step:

### Emergency Rollback
```bash
# 1. Revert Kubernetes manifests
cd infrastructure/kubernetes/production/external-secrets
git checkout HEAD~1 auth-secrets.yaml database-secrets.yaml
kubectl apply -f auth-secrets.yaml
kubectl apply -f database-secrets.yaml

# 2. Add temporary bridge secrets in KeyVault
az keyvault secret set --vault-name flamoralprodauthkv \
  --name google-oauth-secret \
  --value "$(az keyvault secret show --vault-name flamoralprodauthkv --name google-client-secret --query value -o tsv)"

az keyvault secret set --vault-name flamoralprodauthkv \
  --name facebook-oauth-secret \
  --value "$(az keyvault secret show --vault-name flamoralprodauthkv --name facebook-app-secret --query value -o tsv)"

az keyvault secret set --vault-name flamoralprodauthkv \
  --name apple-oauth-key \
  --value "$(az keyvault secret show --vault-name flamoralprodauthkv --name apple-private-key --query value -o tsv)"

# 3. Restart ESO
kubectl rollout restart deployment/external-secrets -n external-secrets-system
```

**When to Rollback:**
- ESO fails to sync secrets after 5 minutes
- Application pods crash due to missing secrets
- OAuth authentication completely broken
- Database connections failing across all services

---

## Success Criteria

All checkboxes below must be checked for deployment to be considered successful:

- [ ] Terraform apply completed without errors
- [ ] All 13 new secrets populated in KeyVault
- [ ] ESO ExternalSecrets showing Ready=True
- [ ] Kubernetes secrets created with correct keys
- [ ] Application pods running without secret errors
- [ ] Google OAuth login working
- [ ] Facebook OAuth login working
- [ ] Apple Sign-In working
- [ ] Database connectivity verified
- [ ] Agora video calls functional
- [ ] Twilio SMS sending working
- [ ] No errors in ESO logs for 10+ minutes
- [ ] No secret-related errors in application logs

---

## Troubleshooting Guide

### Issue: ExternalSecret shows "SecretSyncedError"
**Solution:**
```bash
kubectl describe externalsecret flamoral-auth-secrets -n flamoral
# Check "Status" section for specific error
# Common causes:
# - Secret doesn't exist in KeyVault → Add it
# - Permission denied → Check RBAC/Access Policy
# - Wrong KeyVault name → Verify SecretStore config
```

### Issue: Secret exists but has empty value
**Solution:**
```bash
# Check KeyVault secret
az keyvault secret show --vault-name flamoralprodauthkv --name google-client-secret --query value

# If empty, set it:
az keyvault secret set --vault-name flamoralprodauthkv --name google-client-secret --value "<actual-value>"
```

### Issue: OAuth still using old secret names
**Solution:**
```bash
# Force recreation of ExternalSecret
kubectl delete externalsecret flamoral-auth-secrets -n flamoral
kubectl apply -f infrastructure/kubernetes/production/external-secrets/auth-secrets.yaml

# Force recreation of Kubernetes secret
kubectl delete secret flamoral-auth-secrets -n flamoral
# Wait 30 seconds for ESO to recreate it

# Restart pods
kubectl rollout restart deployment/auth-service -n flamoral
```

---

**Document Version:** 1.0
**Last Updated:** 2025-12-16
**Owner:** Infrastructure Team

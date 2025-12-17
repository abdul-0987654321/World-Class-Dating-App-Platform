# Flamoral TLS Certificate Setup

## Overview
This document describes the TLS certificate configuration for the Flamoral dating platform using cert-manager and Let's Encrypt.

## Created Resources

### 1. Certificate Resource
**File**: `C:/Users/citad/OneDrive/Documents/Dating/DatingPlatform/infrastructure/kubernetes/production/flamoral-certificate.yaml`

This Certificate resource automatically provisions and manages TLS certificates for the Flamoral platform.

**Configuration Details**:
- **Certificate Name**: `flamoral-tls`
- **Namespace**: `flamoral`
- **Secret Name**: `flamoral-tls` (where the certificate will be stored)
- **Issuer**: `letsencrypt-prod` (ClusterIssuer)
- **Challenge Type**: HTTP-01 (via nginx ingress)

**Domains Covered**:
- `flamoral.com` (main domain)
- `www.flamoral.com` (www subdomain)
- `api.flamoral.com` (API subdomain)

**Certificate Settings**:
- **Algorithm**: RSA 4096-bit
- **Duration**: 90 days (2160h)
- **Renewal**: 15 days before expiry (360h)
- **Auto-rotation**: Enabled

## Existing Infrastructure

### ClusterIssuer
**File**: `C:/Users/citad/OneDrive/Documents/Dating/letsencrypt-prod-issuer.yaml`

The `letsencrypt-prod` ClusterIssuer is already configured with:
- Let's Encrypt production ACME server
- HTTP-01 challenge solver using nginx ingress
- Email: admin@flamoral.com

### Ingress Resources
The following ingress resources already reference the `flamoral-tls` secret:

1. **Production Ingress** (`infrastructure/k8s/production-ingress.yaml`)
   - Uses `flamoral-tls` secret
   - Configured for flamoral.com, www.flamoral.com, api.flamoral.com
   - Has cert-manager annotation: `cert-manager.io/cluster-issuer: letsencrypt-prod`

2. **Base Ingress** (`infrastructure/kubernetes/base/ingress.yaml`)
   - Also references `flamoral-tls` secret
   - Similar configuration

## Deployment Instructions

### Prerequisites
1. cert-manager must be installed in the cluster
2. The `letsencrypt-prod` ClusterIssuer must be deployed
3. nginx-ingress-controller must be installed
4. DNS records must point to the ingress controller's external IP

### Deployment Steps

#### 1. Verify cert-manager is installed
```bash
kubectl get pods -n cert-manager
```

Expected output: cert-manager pods running

#### 2. Deploy the ClusterIssuer (if not already deployed)
```bash
kubectl apply -f C:/Users/citad/OneDrive/Documents/Dating/letsencrypt-prod-issuer.yaml
```

#### 3. Verify ClusterIssuer is ready
```bash
kubectl get clusterissuer letsencrypt-prod
```

Expected status: Ready=True

#### 4. Deploy the Certificate resource
```bash
kubectl apply -f C:/Users/citad/OneDrive/Documents/Dating/DatingPlatform/infrastructure/kubernetes/production/flamoral-certificate.yaml
```

#### 5. Monitor certificate issuance
```bash
# Check certificate status
kubectl get certificate -n flamoral

# Check certificate details
kubectl describe certificate flamoral-tls -n flamoral

# Check cert-manager logs if needed
kubectl logs -n cert-manager -l app=cert-manager -f
```

#### 6. Verify the secret was created
```bash
kubectl get secret flamoral-tls -n flamoral
```

Expected: Secret should exist with type `kubernetes.io/tls`

#### 7. Check certificate details
```bash
kubectl describe secret flamoral-tls -n flamoral
```

### Certificate Issuance Process

When the Certificate resource is applied:

1. cert-manager creates a CertificateRequest
2. cert-manager creates a temporary Ingress resource or modifies existing ones for HTTP-01 challenge
3. Let's Encrypt validates domain ownership via HTTP-01 challenge
4. Upon successful validation, Let's Encrypt issues the certificate
5. cert-manager stores the certificate in the `flamoral-tls` secret
6. The ingress controller automatically uses this secret for HTTPS

**Timeline**: Certificate issuance typically takes 2-5 minutes

### Troubleshooting

#### Certificate not issuing
```bash
# Check certificate status
kubectl describe certificate flamoral-tls -n flamoral

# Check certificate request
kubectl get certificaterequest -n flamoral
kubectl describe certificaterequest -n flamoral

# Check challenges
kubectl get challenges -n flamoral
kubectl describe challenge -n flamoral

# Check cert-manager logs
kubectl logs -n cert-manager -l app=cert-manager --tail=100
```

#### Common Issues

1. **DNS not pointing to cluster**
   - Ensure DNS A records point to the ingress controller's external IP
   - Verify with: `nslookup flamoral.com`

2. **Ingress controller not responding**
   - Check ingress controller logs
   - Verify nginx-ingress-controller is running

3. **HTTP-01 challenge failing**
   - Ensure port 80 is accessible from the internet
   - Check firewall rules
   - Verify ingress controller has a public IP

4. **Rate limiting**
   - Let's Encrypt has rate limits (50 certificates per domain per week)
   - Use letsencrypt-staging for testing

### Certificate Renewal

cert-manager automatically renews certificates:
- Renewal starts 15 days before expiry
- No manual intervention required
- Monitor renewal with: `kubectl get certificate -n flamoral -w`

### Monitoring

Check certificate expiration:
```bash
# Get certificate expiration time
kubectl get certificate flamoral-tls -n flamoral -o jsonpath='{.status.notAfter}'

# Check if certificate is ready
kubectl get certificate flamoral-tls -n flamoral -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}'
```

## Security Considerations

1. **Strong encryption**: RSA 4096-bit keys
2. **Auto-renewal**: Prevents expired certificates
3. **HTTPS enforcement**: Ingress configured with SSL redirect
4. **HSTS headers**: Configured in ingress annotations

## Related Files

- ClusterIssuer: `C:/Users/citad/OneDrive/Documents/Dating/letsencrypt-prod-issuer.yaml`
- Certificate: `C:/Users/citad/OneDrive/Documents/Dating/DatingPlatform/infrastructure/kubernetes/production/flamoral-certificate.yaml`
- Production Ingress: `C:/Users/citad/OneDrive/Documents/Dating/DatingPlatform/infrastructure/k8s/production-ingress.yaml`
- Base Ingress: `C:/Users/citad/OneDrive/Documents/Dating/DatingPlatform/infrastructure/kubernetes/base/ingress.yaml`

## Alternative: cert-manager.yaml Configuration

The repository also contains `infrastructure/kubernetes/production/cert-manager.yaml` which has:
- A ClusterIssuer named `letsencrypt-production` (note: different name)
- DNS-01 challenge solver for Azure DNS (requires Azure credentials)
- Wildcard certificate support

**Note**: The current setup uses `letsencrypt-prod` ClusterIssuer with HTTP-01 challenge for simplicity. To use DNS-01 with Azure DNS, you would need to:
1. Configure Azure DNS credentials
2. Update the Certificate to reference `letsencrypt-production`
3. Update all ingress annotations to use `letsencrypt-production`

## Next Steps

1. Deploy the Certificate resource
2. Verify certificate issuance
3. Test HTTPS access to all domains
4. Set up monitoring/alerting for certificate expiry
5. Document rollback procedure if needed

# Security Infrastructure Documentation

## Overview
This directory contains comprehensive security configurations and policies for the Dating App Platform production environment.

## Components

### 1. Microsoft Defender for Cloud
- **Location**: `infrastructure/terraform/environments/production/security.tf`
- **Coverage**:
  - Container Security (AKS)
  - Key Vault Protection
  - Storage Account Security
  - SQL Database Protection
  - Application Services
  - Virtual Machine Protection

### 2. Azure Policy
Enforces organizational standards and compliance:
- Storage encryption requirements
- HTTPS-only access
- Minimum TLS version (1.2)
- Azure AD authentication for databases
- Diagnostic settings for all resources
- NSG flow logs

### 3. Pod Security Policies
- **Location**: `infrastructure/security/pod-security-policies.yaml`
- **Policies**:
  - Restricted: Production workloads
  - Baseline: Development/testing
- **Enforcement**: OPA Gatekeeper

### 4. Network Security
- Default deny network policies
- Firewall rules for outbound traffic
- Private endpoints for sensitive resources
- DDoS protection

### 5. Runtime Security
- **Falco**: Runtime threat detection
- **Trivy**: Vulnerability scanning
- **OPA**: Policy enforcement

### 6. Secret Management
- Azure Key Vault integration
- External Secrets Operator
- Automatic secret rotation
- Private endpoint access only

## Security Controls

### Authentication & Authorization
- Azure AD integration
- RBAC for Kubernetes
- Service accounts with least privilege
- No default service account usage

### Encryption
- Data at rest: AES-256
- Data in transit: TLS 1.2+
- Database: Transparent Data Encryption (TDE)
- Storage: Customer-managed keys (optional)

### Monitoring & Logging
- Audit logs enabled
- Security event logging
- Alert rules for suspicious activity
- SIEM integration ready

### Compliance
- GDPR compliance controls
- SOC 2 Type II alignment
- PCI DSS controls (for payments)
- Regular security audits

## Running Security Audits

### Automated Audit Script
```bash
chmod +x infrastructure/security/security-audit.sh
./infrastructure/security/security-audit.sh
```

This script checks:
- Kubernetes security posture
- Azure resource configurations
- Certificate expiration
- Secrets management
- Container vulnerabilities
- Compliance requirements

### Manual Checks

#### 1. Verify Defender for Cloud
```bash
az security pricing list
```

#### 2. Check Pod Security
```bash
kubectl auth can-i --list
kubectl get psp
kubectl get networkpolicies -n dating-app-production
```

#### 3. Scan Container Images
```bash
trivy image productiondatingappacr.azurecr.io/dating-api:latest
```

#### 4. Review Firewall Rules
```bash
az network firewall show -g production-dating-app-rg -n production-firewall
```

## Security Incident Response

### 1. Detection
- Monitor Azure Security Center alerts
- Review Falco runtime alerts
- Check Prometheus security metrics

### 2. Response
1. Identify affected resources
2. Isolate compromised components
3. Collect forensic data
4. Remediate vulnerabilities
5. Document incident

### 3. Recovery
- Restore from known-good backups
- Verify system integrity
- Update security controls
- Conduct post-mortem

## Best Practices

### Container Security
- ✅ Use minimal base images
- ✅ Run as non-root user
- ✅ Enable read-only root filesystem
- ✅ Drop all capabilities
- ✅ Scan images before deployment
- ✅ Sign images with Cosign

### Kubernetes Security
- ✅ Enable RBAC
- ✅ Use Network Policies
- ✅ Implement Pod Security Policies
- ✅ Separate namespaces by environment
- ✅ Rotate service account tokens
- ✅ Enable audit logging

### Azure Security
- ✅ Use managed identities
- ✅ Enable private endpoints
- ✅ Implement Just-In-Time access
- ✅ Use Azure Policy for governance
- ✅ Enable Advanced Threat Protection
- ✅ Regular security assessments

## Vulnerability Management

### Scanning Schedule
- **Daily**: Container images
- **Weekly**: Kubernetes cluster
- **Monthly**: Full infrastructure scan

### Remediation SLA
- **Critical**: 24 hours
- **High**: 7 days
- **Medium**: 30 days
- **Low**: 90 days

## Compliance Reports

Generate compliance reports:
```bash
# Export security recommendations
az security assessment list -o table

# Generate compliance snapshot
az security regulatory-compliance-control show \
  --standard-name "Azure-CIS-1.1.0" \
  --control-name "1.1"
```

## Security Contacts

- **Security Team**: security@flamoral.com
- **Incident Response**: incident@flamoral.com
- **On-Call**: +1-555-SECURITY
- **Azure Support**: support.azure.com

## Additional Resources

- [Azure Security Best Practices](https://docs.microsoft.com/en-us/azure/security/fundamentals/best-practices-and-patterns)
- [Kubernetes Security Guide](https://kubernetes.io/docs/concepts/security/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CIS Benchmarks](https://www.cisecurity.org/cis-benchmarks/)

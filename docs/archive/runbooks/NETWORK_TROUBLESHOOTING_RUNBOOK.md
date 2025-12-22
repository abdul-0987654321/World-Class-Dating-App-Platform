# Flamoral Dating Platform - Network Troubleshooting Runbook

## Overview

This runbook provides comprehensive procedures for diagnosing and resolving network-related issues in the Flamoral dating platform, including DNS problems, load balancer issues, SSL/TLS certificate problems, and firewall rule debugging.

**Last Updated:** 2025-12-17
**Version:** 1.0.0
**Maintained By:** Network & SRE Team

## Table of Contents

1. [Network Architecture](#network-architecture)
2. [DNS Troubleshooting](#dns-troubleshooting)
3. [Load Balancer Issues](#load-balancer-issues)
4. [SSL/TLS Certificate Problems](#ssltls-certificate-problems)
5. [Firewall Rule Debugging](#firewall-rule-debugging)
6. [Connectivity Issues](#connectivity-issues)
7. [Performance Degradation](#performance-degradation)
8. [Diagnostic Tools](#diagnostic-tools)

## Network Architecture

### Network Topology

```
Internet
    ↓
Azure Front Door (Global Load Balancer)
├── WAF Rules
└── SSL Termination
    ↓
Application Gateway (Regional LB)
├── Backend Pool: AKS Ingress
└── Health Probes
    ↓
AKS Cluster VNet (10.10.0.0/16)
├── Ingress-Nginx (Service LoadBalancer)
│   └── Subnet: 10.10.1.0/24
├── Application Pods
│   └── Subnet: 10.10.2.0/24
├── Database Subnet (Private Endpoint)
│   └── Subnet: 10.10.3.0/24
└── Redis Subnet (Private Endpoint)
    └── Subnet: 10.10.4.0/24

External Services
├── PostgreSQL (Private Endpoint)
├── Redis Cache (Private Endpoint)
└── Storage Account (Private Endpoint)
```

### DNS Structure

```
flamoral.com (Root Domain)
├── api.flamoral.com → Azure Front Door → AKS Ingress
├── admin.flamoral.com → Azure Front Door → AKS Ingress
├── www.flamoral.com → Azure Front Door → Static Site
└── status.flamoral.com → StatusPage.io

Internal DNS (Private)
├── flamoral-prod-postgres.private.postgres.database.azure.com
├── flamoral-prod-redis.private.redis.cache.windows.net
└── flamoralprod.private.blob.core.windows.net
```

## DNS Troubleshooting

### Issue: Domain Not Resolving

**Symptoms:** Users cannot reach flamoral.com or subdomains

#### Diagnosis
```bash
# Test DNS resolution from multiple locations
dig flamoral.com
dig api.flamoral.com
dig admin.flamoral.com

# Check authoritative nameservers
dig flamoral.com NS

# Verify DNS propagation
dig @8.8.8.8 flamoral.com
dig @1.1.1.1 flamoral.com
dig @208.67.222.222 flamoral.com

# Check TTL values
dig flamoral.com | grep -A1 "ANSWER SECTION"

# Test from different regions
for ns in 8.8.8.8 1.1.1.1 208.67.222.222; do
  echo "Testing with $ns:"
  dig @$ns api.flamoral.com +short
done
```

#### Common Causes & Fixes

**Cause 1: DNS Record Not Created/Updated**
```bash
# Check current DNS records in Azure
az network dns record-set a list \
  --resource-group datingapp-prod-rg \
  --zone-name flamoral.com \
  -o table

# Add/Update A record
az network dns record-set a add-record \
  --resource-group datingapp-prod-rg \
  --zone-name flamoral.com \
  --record-set-name api \
  --ipv4-address 20.1.2.3

# Verify record
az network dns record-set a show \
  --resource-group datingapp-prod-rg \
  --zone-name flamoral.com \
  --name api
```

**Cause 2: DNS Propagation Delay**
```bash
# Check when record was last updated
az network dns record-set a show \
  --resource-group datingapp-prod-rg \
  --zone-name flamoral.com \
  --name api \
  --query "metadata" -o json

# Lower TTL temporarily for faster propagation
az network dns record-set a update \
  --resource-group datingapp-prod-rg \
  --zone-name flamoral.com \
  --name api \
  --set ttl=60

# Note: May take up to previous TTL to propagate
# Use online tools: https://dnschecker.org
```

**Cause 3: Nameserver Configuration**
```bash
# Verify nameservers at registrar match Azure DNS
az network dns zone show \
  --resource-group datingapp-prod-rg \
  --name flamoral.com \
  --query "nameServers" -o table

# Expected output should match registrar settings:
# ns1-01.azure-dns.com
# ns2-01.azure-dns.net
# ns3-01.azure-dns.org
# ns4-01.azure-dns.info
```

### Issue: Private DNS Not Resolving

**Symptoms:** Pods cannot resolve private endpoints

#### Diagnosis
```bash
# Test from within cluster
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup flamoral-prod-postgres.postgres.database.azure.com

# Check private DNS zone
az network private-dns zone list \
  --resource-group datingapp-prod-rg \
  -o table

# Verify VNet link
az network private-dns link vnet list \
  --resource-group datingapp-prod-rg \
  --zone-name privatelink.postgres.database.azure.com \
  -o table
```

#### Fix: Create/Update Private DNS
```bash
# Create private DNS zone (if missing)
az network private-dns zone create \
  --resource-group datingapp-prod-rg \
  --name privatelink.postgres.database.azure.com

# Link to VNet
az network private-dns link vnet create \
  --resource-group datingapp-prod-rg \
  --zone-name privatelink.postgres.database.azure.com \
  --name flamoral-vnet-link \
  --virtual-network flamoral-prod-vnet \
  --registration-enabled false

# Verify DNS resolution from pod
kubectl run -it --rm debug --image=busybox --restart=Never -- nslookup flamoral-prod-postgres.postgres.database.azure.com
```

## Load Balancer Issues

### Issue: 503 Service Unavailable

**Symptoms:** Users getting 503 errors, Front Door health checks failing

#### Diagnosis
```bash
# Check Front Door health
az network front-door show \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-fd \
  --query "backendPools[].backends[].{address:address, enabled:enabledState, health:healthProbeSettings}" \
  -o table

# Check backend pool health
az network front-door backend-pool list \
  --resource-group datingapp-prod-rg \
  --front-door-name flamoral-prod-fd \
  -o table

# Check health probe settings
az network front-door probe list \
  --resource-group datingapp-prod-rg \
  --front-door-name flamoral-prod-fd \
  -o table

# Test backend directly
BACKEND_IP=$(kubectl get svc ingress-nginx-controller -n ingress-nginx -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
curl -v http://$BACKEND_IP/health
```

#### Fix: Backend Health Issues
```bash
# Check if ingress is running
kubectl get pods -n ingress-nginx

# Check ingress service
kubectl get svc ingress-nginx-controller -n ingress-nginx

# Verify backend pods are healthy
kubectl get pods -n datingapp

# Check ingress logs
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller --tail=100

# Restart ingress if needed
kubectl rollout restart deployment/ingress-nginx-controller -n ingress-nginx
```

#### Fix: Update Health Probe
```bash
# Update health probe path
az network front-door probe update \
  --resource-group datingapp-prod-rg \
  --front-door-name flamoral-prod-fd \
  --name DefaultProbe \
  --path "/health" \
  --protocol Http \
  --interval 30

# Disable backend temporarily
az network front-door backend-pool backend update \
  --resource-group datingapp-prod-rg \
  --front-door-name flamoral-prod-fd \
  --pool-name DefaultBackendPool \
  --address "$BACKEND_IP" \
  --enabled-state Disabled

# Re-enable after fix
az network front-door backend-pool backend update \
  --resource-group datingapp-prod-rg \
  --front-door-name flamoral-prod-fd \
  --pool-name DefaultBackendPool \
  --address "$BACKEND_IP" \
  --enabled-state Enabled
```

### Issue: Uneven Traffic Distribution

**Symptoms:** Some pods receive all traffic, others idle

#### Diagnosis
```bash
# Check current connections per pod
for pod in $(kubectl get pods -n datingapp -l app=dating-api -o name); do
  echo "$pod:"
  kubectl exec -n datingapp $pod -- netstat -an | grep ESTABLISHED | wc -l
done

# Check service endpoints
kubectl get endpoints dating-api -n datingapp -o yaml

# Check if all pods are ready
kubectl get pods -n datingapp -l app=dating-api -o wide
```

#### Fix: Session Affinity Issues
```bash
# Check current service configuration
kubectl get svc dating-api -n datingapp -o yaml | grep sessionAffinity

# Disable session affinity if not needed
kubectl patch svc dating-api -n datingapp -p '{"spec":{"sessionAffinity":"None"}}'

# Or configure proper affinity
kubectl patch svc dating-api -n datingapp -p '{
  "spec": {
    "sessionAffinity": "ClientIP",
    "sessionAffinityConfig": {
      "clientIP": {
        "timeoutSeconds": 3600
      }
    }
  }
}'

# Verify change
kubectl get svc dating-api -n datingapp -o yaml | grep -A5 sessionAffinity
```

## SSL/TLS Certificate Problems

### Issue: Certificate Expired

**Symptoms:** SSL warnings in browser, API calls failing with cert errors

#### Diagnosis
```bash
# Check certificate expiration
echo | openssl s_client -servername api.flamoral.com -connect api.flamoral.com:443 2>/dev/null | openssl x509 -noout -dates

# Check from Azure Front Door
az network front-door frontend-endpoint show \
  --resource-group datingapp-prod-rg \
  --front-door-name flamoral-prod-fd \
  --name DefaultFrontendEndpoint \
  --query "customHttpsConfiguration" -o json

# Check cert-manager certificates in cluster
kubectl get certificates -n datingapp
kubectl describe certificate api-flamoral-com -n datingapp
```

#### Fix: Renew Certificate (cert-manager)
```bash
# Force cert renewal
kubectl delete certificate api-flamoral-com -n datingapp

# cert-manager will automatically recreate
kubectl get certificate api-flamoral-com -n datingapp -w

# Check certificate order status
kubectl get certificaterequest -n datingapp
kubectl describe certificaterequest api-flamoral-com-xxx -n datingapp

# Verify new certificate
kubectl get secret api-flamoral-com-tls -n datingapp -o jsonpath='{.data.tls\.crt}' | base64 -d | openssl x509 -noout -dates
```

#### Fix: Manual Certificate Upload (Azure)
```bash
# For Azure Front Door managed certificate
az network front-door frontend-endpoint enable-https \
  --resource-group datingapp-prod-rg \
  --front-door-name flamoral-prod-fd \
  --name DefaultFrontendEndpoint \
  --certificate-source FrontDoor \
  --minimum-tls-version 1.2

# Or upload custom certificate
az network front-door frontend-endpoint enable-https \
  --resource-group datingapp-prod-rg \
  --front-door-name flamoral-prod-fd \
  --name DefaultFrontendEndpoint \
  --certificate-source AzureKeyVault \
  --vault-id /subscriptions/.../vaults/datingapp-prod-kv \
  --secret-name api-flamoral-com-cert \
  --minimum-tls-version 1.2
```

### Issue: Certificate Validation Failing

**Symptoms:** "Certificate does not match domain" error

#### Diagnosis
```bash
# Check certificate SANs
echo | openssl s_client -servername api.flamoral.com -connect api.flamoral.com:443 2>/dev/null | openssl x509 -noout -text | grep -A1 "Subject Alternative Name"

# Expected: DNS:api.flamoral.com

# Check certificate issuer
echo | openssl s_client -servername api.flamoral.com -connect api.flamoral.com:443 2>/dev/null | openssl x509 -noout -issuer

# Check certificate chain
echo | openssl s_client -servername api.flamoral.com -connect api.flamoral.com:443 -showcerts 2>/dev/null
```

#### Fix: Update Certificate with Correct SANs
```bash
# Update cert-manager Certificate resource
kubectl edit certificate api-flamoral-com -n datingapp

# Add/update dnsNames:
# spec:
#   dnsNames:
#   - api.flamoral.com
#   - www.api.flamoral.com

# Force renewal
kubectl delete certificaterequest -n datingapp -l certmanager.k8s.io/certificate-name=api-flamoral-com

# Monitor renewal
kubectl get certificate api-flamoral-com -n datingapp -w
```

### Issue: Mixed Content Warnings

**Symptoms:** Browser shows "Not Secure" despite HTTPS

#### Diagnosis
```bash
# Check if backend is terminating SSL
kubectl get ingress -n datingapp -o yaml | grep -A5 "tls:"

# Verify SSL redirect
kubectl get ingress dating-api -n datingapp -o yaml | grep ssl-redirect

# Check backend protocol
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller | grep "backend protocol"
```

#### Fix: Force HTTPS Redirect
```bash
# Update ingress with SSL redirect annotation
kubectl patch ingress dating-api -n datingapp -p '{
  "metadata": {
    "annotations": {
      "nginx.ingress.kubernetes.io/ssl-redirect": "true",
      "nginx.ingress.kubernetes.io/force-ssl-redirect": "true"
    }
  }
}'

# Verify ingress updated
kubectl get ingress dating-api -n datingapp -o yaml | grep ssl-redirect
```

## Firewall Rule Debugging

### Issue: Connection Timeout from Pods

**Symptoms:** Pods cannot connect to external services or database

#### Diagnosis
```bash
# Test connectivity from pod
kubectl run -it --rm debug --image=nicolaka/netshoot --restart=Never -- bash

# Inside pod:
# Test DNS
nslookup flamoral-prod-postgres.postgres.database.azure.com

# Test TCP connection
nc -zv flamoral-prod-postgres.postgres.database.azure.com 5432

# Test HTTP/HTTPS
curl -v https://api.flamoral.com

# Traceroute
traceroute flamoral-prod-postgres.postgres.database.azure.com

# Check local routing
ip route show
```

#### Check Network Security Groups
```bash
# List NSGs
az network nsg list \
  --resource-group datingapp-prod-rg \
  -o table

# Show NSG rules
az network nsg rule list \
  --resource-group datingapp-prod-rg \
  --nsg-name flamoral-prod-nsg \
  -o table

# Check if rule exists for PostgreSQL
az network nsg rule show \
  --resource-group datingapp-prod-rg \
  --nsg-name flamoral-prod-nsg \
  --name AllowPostgreSQL
```

#### Fix: Add Firewall Rule
```bash
# Add NSG rule to allow PostgreSQL
az network nsg rule create \
  --resource-group datingapp-prod-rg \
  --nsg-name flamoral-prod-nsg \
  --name AllowPostgreSQL \
  --priority 100 \
  --source-address-prefixes "10.10.0.0/16" \
  --destination-address-prefixes "*" \
  --destination-port-ranges 5432 \
  --direction Outbound \
  --access Allow \
  --protocol Tcp

# Verify rule
az network nsg rule list \
  --resource-group datingapp-prod-rg \
  --nsg-name flamoral-prod-nsg \
  --query "[?name=='AllowPostgreSQL']" \
  -o table
```

### Issue: Database Connection Refused

**Symptoms:** Application cannot connect to PostgreSQL

#### Check Database Firewall
```bash
# List current firewall rules
az postgres flexible-server firewall-rule list \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-postgres \
  -o table

# Check if AKS subnet is allowed
az postgres flexible-server firewall-rule show \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-postgres \
  --rule-name AllowAKS
```

#### Fix: Add Database Firewall Rule
```bash
# Get AKS outbound IP
AKS_OUTBOUND_IP=$(az aks show \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-aks \
  --query "networkProfile.loadBalancerProfile.effectiveOutboundIPs[0].id" -o tsv)

# Or use VNet rule (recommended)
az postgres flexible-server firewall-rule create \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-postgres \
  --rule-name AllowAKSSubnet \
  --start-ip-address 10.10.0.0 \
  --end-ip-address 10.10.255.255

# Or use private endpoint (most secure)
az network private-endpoint create \
  --resource-group datingapp-prod-rg \
  --name postgres-private-endpoint \
  --vnet-name flamoral-prod-vnet \
  --subnet database-subnet \
  --private-connection-resource-id /subscriptions/.../flexibleServers/flamoral-prod-postgres \
  --group-id postgresqlServer \
  --connection-name postgres-connection
```

### Issue: Redis Connection Timeout

**Symptoms:** Cache operations failing, timeout errors

#### Diagnosis
```bash
# Test Redis connectivity from pod
kubectl run -it --rm debug --image=redis --restart=Never -- \
  redis-cli -h flamoral-prod-redis.redis.cache.windows.net -p 6380 -a $REDIS_PASSWORD --tls PING

# Check Redis firewall
az redis firewall-rules list \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-redis \
  -o table

# Check if non-SSL port is enabled (not recommended for production)
az redis show \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-redis \
  --query "enableNonSslPort" -o tsv
```

#### Fix: Configure Redis Access
```bash
# Add firewall rule for AKS subnet
az redis firewall-rules create \
  --resource-group datingapp-prod-rg \
  --name flamoral-prod-redis \
  --rule-name AllowAKS \
  --start-ip 10.10.0.1 \
  --end-ip 10.10.255.254

# Or use private endpoint (recommended)
az network private-endpoint create \
  --resource-group datingapp-prod-rg \
  --name redis-private-endpoint \
  --vnet-name flamoral-prod-vnet \
  --subnet redis-subnet \
  --private-connection-resource-id /subscriptions/.../Redis/flamoral-prod-redis \
  --group-id redisCache \
  --connection-name redis-connection
```

## Connectivity Issues

### Issue: Pod-to-Pod Communication Failing

**Symptoms:** Services cannot communicate within cluster

#### Diagnosis
```bash
# Check network policies
kubectl get networkpolicies -n datingapp

# Describe specific policy
kubectl describe networkpolicy -n datingapp

# Test pod-to-pod connectivity
kubectl run -it --rm source --image=busybox --restart=Never -- \
  wget -O- http://dating-api:8080/health

# Check service endpoints
kubectl get endpoints -n datingapp
```

#### Fix: Update Network Policy
```bash
# Allow ingress from specific pods
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dating-api
  namespace: datingapp
spec:
  podSelector:
    matchLabels:
      app: dating-api
  policyTypes:
  - Ingress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: dating-worker
    - podSelector:
        matchLabels:
          app: dating-messaging-service
    ports:
    - protocol: TCP
      port: 8080
EOF

# Verify policy
kubectl get networkpolicy allow-dating-api -n datingapp -o yaml
```

### Issue: External API Call Failing

**Symptoms:** Application cannot reach external services

#### Diagnosis
```bash
# Test from pod
kubectl exec -it -n datingapp deployment/dating-api -- \
  curl -v https://api.external-service.com

# Check egress rules
kubectl get networkpolicies -n datingapp -o yaml | grep -A10 egress

# Check if egress is allowed
az network nsg rule list \
  --resource-group datingapp-prod-rg \
  --nsg-name flamoral-prod-nsg \
  --query "[?direction=='Outbound']" \
  -o table
```

#### Fix: Allow Egress
```bash
# Update network policy to allow egress
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-external-egress
  namespace: datingapp
spec:
  podSelector:
    matchLabels:
      app: dating-api
  policyTypes:
  - Egress
  egress:
  - to:
    - podSelector: {}
    ports:
    - protocol: TCP
      port: 443
  - to:
    - namespaceSelector: {}
    ports:
    - protocol: TCP
      port: 5432
    - protocol: TCP
      port: 6379
  - to: []  # Allow all egress
    ports:
    - protocol: TCP
      port: 53  # DNS
    - protocol: UDP
      port: 53
EOF
```

## Performance Degradation

### Issue: High Latency

**Symptoms:** API responses slow, timeouts

#### Diagnosis
```bash
# Check Front Door metrics
az monitor metrics list \
  --resource /subscriptions/.../frontdoors/flamoral-prod-fd \
  --metric TotalLatency \
  --interval PT1M \
  --aggregation Average

# Test latency from different locations
curl -w "@curl-format.txt" -o /dev/null -s https://api.flamoral.com/health

# curl-format.txt:
# time_namelookup:  %{time_namelookup}\n
# time_connect:  %{time_connect}\n
# time_appconnect:  %{time_appconnect}\n
# time_pretransfer:  %{time_pretransfer}\n
# time_redirect:  %{time_redirect}\n
# time_starttransfer:  %{time_starttransfer}\n
# time_total:  %{time_total}\n

# Check ingress latency
kubectl logs -n ingress-nginx deployment/ingress-nginx-controller | grep "request_time"
```

#### Fix: Optimize Routing
```bash
# Enable caching on Front Door
az network front-door routing-rule update \
  --resource-group datingapp-prod-rg \
  --front-door-name flamoral-prod-fd \
  --name DefaultRoutingRule \
  --caching Enabled \
  --query-parameter-strip-directive StripAll \
  --cache-duration PT1H

# Enable compression
az network front-door routing-rule update \
  --resource-group datingapp-prod-rg \
  --front-door-name flamoral-prod-fd \
  --name DefaultRoutingRule \
  --enable-compression true

# Verify changes
az network front-door routing-rule show \
  --resource-group datingapp-prod-rg \
  --front-door-name flamoral-prod-fd \
  --name DefaultRoutingRule \
  --query "{caching:cacheConfiguration, compression:enabledState}" -o json
```

## Diagnostic Tools

### Network Debugging Pod

```bash
# Deploy network debugging pod
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: netshoot
  namespace: datingapp
spec:
  containers:
  - name: netshoot
    image: nicolaka/netshoot
    command: ["/bin/bash"]
    args: ["-c", "while true; do sleep 3600; done"]
EOF

# Exec into pod
kubectl exec -it netshoot -n datingapp -- bash

# Tools available:
# - tcpdump: Packet capture
# - nmap: Port scanning
# - curl/wget: HTTP testing
# - dig/nslookup: DNS testing
# - netcat: TCP/UDP testing
# - traceroute: Route tracing
# - iperf3: Bandwidth testing
```

### Packet Capture

```bash
# Capture traffic from specific pod
kubectl exec -it netshoot -n datingapp -- \
  tcpdump -i any -w /tmp/capture.pcap

# Capture specific port
kubectl exec -it netshoot -n datingapp -- \
  tcpdump -i any port 5432 -w /tmp/postgres.pcap

# Copy capture file
kubectl cp datingapp/netshoot:/tmp/capture.pcap ./capture.pcap

# Analyze with Wireshark locally
```

### Connection Tracing

```bash
# Trace route to database
kubectl exec -it netshoot -n datingapp -- \
  traceroute flamoral-prod-postgres.postgres.database.azure.com

# Test specific port connectivity
kubectl exec -it netshoot -n datingapp -- \
  nc -zv flamoral-prod-postgres.postgres.database.azure.com 5432

# HTTP debugging
kubectl exec -it netshoot -n datingapp -- \
  curl -v -H "Host: api.flamoral.com" http://dating-api:8080/health
```

## Best Practices

1. **Document Network Changes:** Keep network diagram updated
2. **Use Private Endpoints:** Avoid public database access
3. **Monitor DNS TTL:** Use appropriate TTL for flexibility
4. **Certificate Automation:** Use cert-manager for auto-renewal
5. **Network Policies:** Implement least-privilege network access
6. **Regular Testing:** Test disaster recovery procedures
7. **Monitoring:** Set up alerts for certificate expiration
8. **Security:** Regular firewall rule audits

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-12-17 | Network Team | Initial creation |

---

**Document Status:** Active
**Next Review Date:** 2026-01-17
**Document Owner:** Network SRE Team Lead

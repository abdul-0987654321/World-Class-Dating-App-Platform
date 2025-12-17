#!/bin/bash
# =============================================================================
# Verify Flamoral TLS Certificate Setup
# =============================================================================
# This script verifies the TLS certificate configuration for flamoral.com
# =============================================================================

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "========================================="
echo "Flamoral TLS Certificate Setup Verification"
echo "========================================="
echo ""

# Counter for issues
ISSUES=0

# 1. Check kubectl connectivity
echo -e "${BLUE}[1/8] Checking kubectl connectivity...${NC}"
if kubectl cluster-info &> /dev/null; then
    echo -e "${GREEN}✓ Connected to Kubernetes cluster${NC}"
else
    echo -e "${RED}✗ Cannot connect to Kubernetes cluster${NC}"
    ISSUES=$((ISSUES + 1))
fi
echo ""

# 2. Check cert-manager installation
echo -e "${BLUE}[2/8] Checking cert-manager installation...${NC}"
if kubectl get namespace cert-manager &> /dev/null; then
    echo -e "${GREEN}✓ cert-manager namespace exists${NC}"

    # Check cert-manager pods
    RUNNING_PODS=$(kubectl get pods -n cert-manager --field-selector=status.phase=Running --no-headers 2>/dev/null | wc -l)
    if [ $RUNNING_PODS -ge 3 ]; then
        echo -e "${GREEN}✓ cert-manager pods are running ($RUNNING_PODS pods)${NC}"
    else
        echo -e "${YELLOW}⚠ Only $RUNNING_PODS cert-manager pods running (expected 3)${NC}"
        ISSUES=$((ISSUES + 1))
    fi
else
    echo -e "${RED}✗ cert-manager namespace not found${NC}"
    echo "  Install cert-manager: helm install cert-manager jetstack/cert-manager --namespace cert-manager --create-namespace --set installCRDs=true"
    ISSUES=$((ISSUES + 1))
fi
echo ""

# 3. Check ClusterIssuer
echo -e "${BLUE}[3/8] Checking ClusterIssuer...${NC}"
if kubectl get clusterissuer letsencrypt-prod &> /dev/null; then
    echo -e "${GREEN}✓ ClusterIssuer 'letsencrypt-prod' exists${NC}"

    # Check if ready
    ISSUER_READY=$(kubectl get clusterissuer letsencrypt-prod -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>/dev/null)
    if [ "$ISSUER_READY" = "True" ]; then
        echo -e "${GREEN}✓ ClusterIssuer is ready${NC}"
    else
        echo -e "${YELLOW}⚠ ClusterIssuer is not ready${NC}"
        ISSUES=$((ISSUES + 1))
    fi

    # Check email
    EMAIL=$(kubectl get clusterissuer letsencrypt-prod -o jsonpath='{.spec.acme.email}' 2>/dev/null)
    echo "  Email: $EMAIL"

    # Check solver type
    SOLVER=$(kubectl get clusterissuer letsencrypt-prod -o jsonpath='{.spec.acme.solvers[0]}' 2>/dev/null)
    if echo "$SOLVER" | grep -q "http01"; then
        echo -e "${GREEN}  Challenge type: HTTP-01${NC}"
    elif echo "$SOLVER" | grep -q "dns01"; then
        echo -e "${GREEN}  Challenge type: DNS-01${NC}"
    fi
else
    echo -e "${RED}✗ ClusterIssuer 'letsencrypt-prod' not found${NC}"
    echo "  Deploy with: kubectl apply -f ../../../../letsencrypt-prod-issuer.yaml"
    ISSUES=$((ISSUES + 1))
fi
echo ""

# 4. Check flamoral namespace
echo -e "${BLUE}[4/8] Checking flamoral namespace...${NC}"
if kubectl get namespace flamoral &> /dev/null; then
    echo -e "${GREEN}✓ Namespace 'flamoral' exists${NC}"
else
    echo -e "${YELLOW}⚠ Namespace 'flamoral' not found${NC}"
    echo "  Create with: kubectl create namespace flamoral"
    ISSUES=$((ISSUES + 1))
fi
echo ""

# 5. Check Certificate resource
echo -e "${BLUE}[5/8] Checking Certificate resource...${NC}"
if kubectl get certificate flamoral-tls -n flamoral &> /dev/null; then
    echo -e "${GREEN}✓ Certificate 'flamoral-tls' exists${NC}"

    # Check if ready
    CERT_READY=$(kubectl get certificate flamoral-tls -n flamoral -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}' 2>/dev/null)
    if [ "$CERT_READY" = "True" ]; then
        echo -e "${GREEN}✓ Certificate is ready and issued${NC}"

        # Get expiration
        NOT_AFTER=$(kubectl get certificate flamoral-tls -n flamoral -o jsonpath='{.status.notAfter}' 2>/dev/null)
        if [ -n "$NOT_AFTER" ]; then
            echo "  Expires: $NOT_AFTER"
        fi

        # Get renewal time
        RENEWAL_TIME=$(kubectl get certificate flamoral-tls -n flamoral -o jsonpath='{.status.renewalTime}' 2>/dev/null)
        if [ -n "$RENEWAL_TIME" ]; then
            echo "  Renewal scheduled: $RENEWAL_TIME"
        fi
    else
        echo -e "${YELLOW}⚠ Certificate is not ready yet${NC}"
        echo "  Status: $CERT_READY"

        # Check for errors
        kubectl get certificate flamoral-tls -n flamoral -o jsonpath='{.status.conditions[?(@.type=="Ready")].message}' 2>/dev/null | sed 's/^/  Message: /'
        ISSUES=$((ISSUES + 1))
    fi

    # Check domains
    echo "  Domains:"
    kubectl get certificate flamoral-tls -n flamoral -o jsonpath='{.spec.dnsNames[*]}' 2>/dev/null | tr ' ' '\n' | sed 's/^/    - /'
else
    echo -e "${RED}✗ Certificate 'flamoral-tls' not found${NC}"
    echo "  Deploy with: kubectl apply -f flamoral-certificate.yaml"
    ISSUES=$((ISSUES + 1))
fi
echo ""

# 6. Check TLS Secret
echo -e "${BLUE}[6/8] Checking TLS Secret...${NC}"
if kubectl get secret flamoral-tls -n flamoral &> /dev/null; then
    echo -e "${GREEN}✓ Secret 'flamoral-tls' exists${NC}"

    # Check type
    SECRET_TYPE=$(kubectl get secret flamoral-tls -n flamoral -o jsonpath='{.type}' 2>/dev/null)
    if [ "$SECRET_TYPE" = "kubernetes.io/tls" ]; then
        echo -e "${GREEN}✓ Secret type is correct: $SECRET_TYPE${NC}"
    else
        echo -e "${YELLOW}⚠ Unexpected secret type: $SECRET_TYPE${NC}"
        ISSUES=$((ISSUES + 1))
    fi

    # Check if it has tls.crt and tls.key
    if kubectl get secret flamoral-tls -n flamoral -o jsonpath='{.data.tls\.crt}' &> /dev/null; then
        echo -e "${GREEN}✓ Secret contains tls.crt${NC}"
    else
        echo -e "${RED}✗ Secret missing tls.crt${NC}"
        ISSUES=$((ISSUES + 1))
    fi

    if kubectl get secret flamoral-tls -n flamoral -o jsonpath='{.data.tls\.key}' &> /dev/null; then
        echo -e "${GREEN}✓ Secret contains tls.key${NC}"
    else
        echo -e "${RED}✗ Secret missing tls.key${NC}"
        ISSUES=$((ISSUES + 1))
    fi
else
    echo -e "${YELLOW}⚠ Secret 'flamoral-tls' not found${NC}"
    echo "  This will be created automatically when the certificate is issued"
    ISSUES=$((ISSUES + 1))
fi
echo ""

# 7. Check Ingress resources
echo -e "${BLUE}[7/8] Checking Ingress resources...${NC}"
INGRESS_COUNT=$(kubectl get ingress -n flamoral --no-headers 2>/dev/null | wc -l)
if [ $INGRESS_COUNT -gt 0 ]; then
    echo -e "${GREEN}✓ Found $INGRESS_COUNT ingress resource(s) in flamoral namespace${NC}"

    # List ingress resources
    kubectl get ingress -n flamoral -o custom-columns=NAME:.metadata.name,HOSTS:.spec.rules[*].host,SECRET:.spec.tls[*].secretName 2>/dev/null | while read line; do
        if echo "$line" | grep -q "flamoral-tls"; then
            echo -e "${GREEN}  ✓ $line${NC}"
        else
            echo "  $line"
        fi
    done
else
    echo -e "${YELLOW}⚠ No ingress resources found in flamoral namespace${NC}"
    echo "  Deploy ingress: kubectl apply -f ../k8s/production-ingress.yaml"
    ISSUES=$((ISSUES + 1))
fi
echo ""

# 8. Check DNS resolution
echo -e "${BLUE}[8/8] Checking DNS resolution...${NC}"
DOMAINS=("flamoral.com" "www.flamoral.com" "api.flamoral.com")
for domain in "${DOMAINS[@]}"; do
    if nslookup "$domain" &> /dev/null; then
        IP=$(nslookup "$domain" | grep -A1 "Name:" | grep "Address:" | awk '{print $2}' | head -1)
        echo -e "${GREEN}✓ $domain resolves to $IP${NC}"
    else
        echo -e "${YELLOW}⚠ $domain does not resolve${NC}"
        ISSUES=$((ISSUES + 1))
    fi
done
echo ""

# Summary
echo "========================================="
echo "Verification Summary"
echo "========================================="
if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed! TLS setup is complete.${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Test HTTPS access: curl -I https://flamoral.com"
    echo "2. Check certificate in browser"
    echo "3. Monitor certificate renewal"
else
    echo -e "${YELLOW}⚠ Found $ISSUES issue(s) that need attention${NC}"
    echo ""
    echo "Common troubleshooting commands:"
    echo "  kubectl describe certificate flamoral-tls -n flamoral"
    echo "  kubectl get certificaterequest -n flamoral"
    echo "  kubectl get challenges -n flamoral"
    echo "  kubectl logs -n cert-manager -l app=cert-manager"
fi
echo ""

exit $ISSUES

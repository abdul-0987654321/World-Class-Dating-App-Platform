#!/bin/bash

# =============================================================================
# Cache Configuration Verification Script
# Verifies all caching and performance configurations in Flamoral platform
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

echo -e "${BLUE}==============================================================================${NC}"
echo -e "${BLUE}Flamoral Cache Configuration Verification${NC}"
echo -e "${BLUE}==============================================================================${NC}\n"

# =============================================================================
# Helper Functions
# =============================================================================

check_pass() {
    echo -e "${GREEN}✓ PASS:${NC} $1"
    ((PASSED++))
}

check_fail() {
    echo -e "${RED}✗ FAIL:${NC} $1"
    ((FAILED++))
}

check_warn() {
    echo -e "${YELLOW}⚠ WARN:${NC} $1"
    ((WARNINGS++))
}

check_file_exists() {
    if [ -f "$1" ]; then
        check_pass "File exists: $1"
        return 0
    else
        check_fail "File not found: $1"
        return 1
    fi
}

check_file_contains() {
    if grep -q "$2" "$1" 2>/dev/null; then
        check_pass "$3"
        return 0
    else
        check_fail "$3"
        return 1
    fi
}

# =============================================================================
# 1. Redis Configuration Checks
# =============================================================================

echo -e "\n${BLUE}[1] Redis Caching Configuration${NC}"
echo "-----------------------------------"

# Check Redis config files
REDIS_CONFIG_FILES=(
    "backend/shared/infrastructure/redis-config.ts"
    "backend/services/matching-service/src/infrastructure/cache/redis.client.ts"
    "backend/services/auth-service/src/infrastructure/cache/redis.ts"
    "backend/shared/services/cache-invalidation.service.ts"
)

for file in "${REDIS_CONFIG_FILES[@]}"; do
    check_file_exists "$file"
done

# Check for TLS configuration
check_file_contains "backend/shared/infrastructure/redis-config.ts" "tls:" "Redis TLS configuration present"

# Check for retry strategy
check_file_contains "backend/shared/infrastructure/redis-config.ts" "retryStrategy" "Redis retry strategy configured"

# Check for SCAN usage (not KEYS)
if grep -r "\.keys(" backend/shared/services/cache-invalidation.service.ts >/dev/null 2>&1; then
    check_fail "Cache invalidation service uses blocking KEYS command"
else
    check_pass "Cache invalidation uses non-blocking SCAN"
fi

# Check for proper DB separation
check_file_contains "backend/shared/infrastructure/redis-config.ts" "createCacheClient" "Redis cache DB separation configured"
check_file_contains "backend/shared/infrastructure/redis-config.ts" "createSessionClient" "Redis session DB separation configured"

# =============================================================================
# 2. API Gateway Cache Headers
# =============================================================================

echo -e "\n${BLUE}[2] API Gateway Cache Headers${NC}"
echo "-----------------------------------"

CACHE_MIDDLEWARE="backend/services/api-gateway/src/middleware/cache-control.middleware.ts"
check_file_exists "$CACHE_MIDDLEWARE"

# Check for different cache strategies
check_file_contains "$CACHE_MIDDLEWARE" "isStaticAsset" "Static asset caching logic present"
check_file_contains "$CACHE_MIDDLEWARE" "isPublicDataEndpoint" "Public data caching logic present"
check_file_contains "$CACHE_MIDDLEWARE" "isSensitiveEndpoint" "Sensitive endpoint no-cache logic present"

# Check for proper cache directives
check_file_contains "$CACHE_MIDDLEWARE" "immutable" "Immutable cache directive for static assets"
check_file_contains "$CACHE_MIDDLEWARE" "must-revalidate" "Must-revalidate directive configured"

# =============================================================================
# 3. Service Worker Caching
# =============================================================================

echo -e "\n${BLUE}[3] Service Worker Caching Strategies${NC}"
echo "-----------------------------------"

SERVICE_WORKER="apps/web-app/public/service-worker.js"
check_file_exists "$SERVICE_WORKER"

# Check for cache strategies
check_file_contains "$SERVICE_WORKER" "staleWhileRevalidate" "Stale-while-revalidate strategy implemented"
check_file_contains "$SERVICE_WORKER" "networkFirst" "Network-first strategy implemented"
check_file_contains "$SERVICE_WORKER" "cacheFirst" "Cache-first strategy implemented"

# Check for cache expiration
check_file_contains "$SERVICE_WORKER" "CACHE_MAX_AGE" "Cache expiration configuration present"

# Check for cache size limits
check_file_contains "$SERVICE_WORKER" "MAX_CACHE_SIZE" "Cache size limits configured"

# Check for cache trimming
check_file_contains "$SERVICE_WORKER" "trimCache" "Cache trimming function implemented"

# Check for timestamp tracking
check_file_contains "$SERVICE_WORKER" "getCacheTimestamp" "Cache timestamp tracking implemented"

# =============================================================================
# 4. CDN Configuration
# =============================================================================

echo -e "\n${BLUE}[4] CDN Configuration${NC}"
echo "-----------------------------------"

CDN_CONFIG="infrastructure/azure/frontdoor-caching-rules.yaml"
check_file_exists "$CDN_CONFIG"

# Check for cache duration rules
check_file_contains "$CDN_CONFIG" "html-caching" "HTML caching rules configured"
check_file_contains "$CDN_CONFIG" "static-assets-caching" "Static assets caching configured"
check_file_contains "$CDN_CONFIG" "media-caching" "Media caching configured"
check_file_contains "$CDN_CONFIG" "api-caching" "API caching rules configured"

# Check for compression
check_file_contains "$CDN_CONFIG" "brotli" "Brotli compression enabled"
check_file_contains "$CDN_CONFIG" "gzip" "Gzip compression enabled"

# Check for origin shield
check_file_contains "$CDN_CONFIG" "originShield" "Origin shield configured"

# Check for request coalescing
check_file_contains "$CDN_CONFIG" "requestCoalescing" "Request coalescing enabled"

# Check for stale-while-revalidate
check_file_contains "$CDN_CONFIG" "staleWhileRevalidate" "Stale-while-revalidate configured"

# =============================================================================
# 5. Nginx Cache Headers
# =============================================================================

echo -e "\n${BLUE}[5] Nginx Cache Headers${NC}"
echo "-----------------------------------"

NGINX_CONFIG="infrastructure/nginx/cache-headers.conf"
check_file_exists "$NGINX_CONFIG"

# Check for static asset caching
check_file_contains "$NGINX_CONFIG" "expires 1y" "Long-term caching for static assets"

# Check for image caching
check_file_contains "$NGINX_CONFIG" "expires 30d" "30-day caching for images"

# Check for gzip compression
check_file_contains "$NGINX_CONFIG" "gzip on" "Gzip compression enabled"

# Check for ETag support
check_file_contains "$NGINX_CONFIG" "etag on" "ETag support enabled"

# Check for sendfile
check_file_contains "$NGINX_CONFIG" "sendfile on" "Sendfile optimization enabled"

# =============================================================================
# 6. Memory Cache Configuration
# =============================================================================

echo -e "\n${BLUE}[6] Memory Cache Configuration${NC}"
echo "-----------------------------------"

RESPONSE_CACHE="backend/services/api-gateway/src/services/response-cache.service.ts"
check_file_exists "$RESPONSE_CACHE"

# Check for memory cache limits
check_file_contains "$RESPONSE_CACHE" "maxMemoryCacheSize" "Memory cache size limit configured"

# Check for fallback to memory cache
check_file_contains "$RESPONSE_CACHE" "memoryCache" "Memory cache fallback implemented"

# Check for cache TTL configuration
check_file_contains "$RESPONSE_CACHE" "cacheTTL" "Cache TTL configuration present"

# Check for stale cache support
check_file_contains "$RESPONSE_CACHE" "getStale" "Stale cache support implemented"

# =============================================================================
# 7. Browser Caching Headers
# =============================================================================

echo -e "\n${BLUE}[7] Browser Caching Headers${NC}"
echo "-----------------------------------"

SECURITY_HEADERS="backend/services/api-gateway/src/middleware/security-headers.middleware.ts"
check_file_exists "$SECURITY_HEADERS"

# Check for cache control on sensitive endpoints
check_file_contains "$SECURITY_HEADERS" "isSensitiveEndpoint" "Sensitive endpoint detection present"
check_file_contains "$SECURITY_HEADERS" "no-store" "No-store directive for sensitive data"

# =============================================================================
# 8. Vite Build Configuration
# =============================================================================

echo -e "\n${BLUE}[8] Vite Build Configuration${NC}"
echo "-----------------------------------"

VITE_CONFIG="apps/web-app/vite.config.ts"
check_file_exists "$VITE_CONFIG"

# Check for asset hashing
check_file_contains "$VITE_CONFIG" "\\[hash\\]" "Asset hash in filename for cache busting"

# Check for code splitting
check_file_contains "$VITE_CONFIG" "manualChunks" "Manual code splitting configured"

# Check for CSS code splitting
check_file_contains "$VITE_CONFIG" "cssCodeSplit" "CSS code splitting enabled"

# =============================================================================
# 9. CDN Utility Functions
# =============================================================================

echo -e "\n${BLUE}[9] CDN Utility Functions${NC}"
echo "-----------------------------------"

CDN_UTILS="apps/web-app/src/utils/cdn.ts"
check_file_exists "$CDN_UTILS"

# Check for CDN URL generation
check_file_contains "$CDN_UTILS" "getCdnUrl" "CDN URL generation function present"
check_file_contains "$CDN_UTILS" "getMediaUrl" "Media CDN URL function present"

# Check for image optimization
check_file_contains "$CDN_UTILS" "getOptimizedImageUrl" "Image optimization function present"

# Check for WebP support detection
check_file_contains "$CDN_UTILS" "supportsWebP" "WebP support detection present"

# Check for cache busting
check_file_contains "$CDN_UTILS" "getCacheBustedUrl" "Cache busting function present"

# =============================================================================
# Summary
# =============================================================================

echo -e "\n${BLUE}==============================================================================${NC}"
echo -e "${BLUE}Verification Summary${NC}"
echo -e "${BLUE}==============================================================================${NC}"

echo -e "\n${GREEN}Passed:${NC}   $PASSED"
echo -e "${RED}Failed:${NC}   $FAILED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"

TOTAL=$((PASSED + FAILED + WARNINGS))
echo -e "\nTotal checks: $TOTAL"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ All critical checks passed!${NC}"
    exit 0
else
    echo -e "\n${RED}✗ Some checks failed. Please review the output above.${NC}"
    exit 1
fi

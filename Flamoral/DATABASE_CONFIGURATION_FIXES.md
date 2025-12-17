# Database Configuration Fixes - Production Ready

**Date:** December 15, 2024
**Project:** Flamoral Dating Platform
**Status:** ✅ COMPLETED

## Executive Summary

This document outlines comprehensive fixes applied to database and Redis configurations across the Flamoral platform to ensure production readiness, security, and reliability.

## Issues Identified and Fixed

### 1. PostgreSQL Database Configuration Issues

#### Issue 1.1: Missing DATABASE_URL Support
**Problem:** Production deployments typically use `DATABASE_URL` connection strings (especially on Azure, Heroku, etc.), but configurations only supported individual parameters.

**Fix Applied:**
- Updated all knexfile.ts configurations to support `DATABASE_URL` as primary connection method
- Fallback to individual connection parameters if `DATABASE_URL` not provided
- Applied to:
  - `database/knexfile.ts` (main database)
  - `backend/services/user-service/src/infrastructure/database/knexfile.ts`
  - `backend/services/matching-service/src/infrastructure/database/knexfile.ts`
  - `backend/services/media-service/src/infrastructure/database/knexfile.ts`

**Code Example:**
```typescript
connection: process.env.DATABASE_URL || {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false',
    ca: process.env.DB_SSL_CA,
  } : false,
}
```

#### Issue 1.2: Hardcoded SSL Configuration
**Problem:** SSL settings were hardcoded with `{ rejectUnauthorized: true }`, causing issues with self-signed certificates and certain cloud providers.

**Fix Applied:**
- Made SSL configuration environment-variable driven
- Added support for `DB_SSL`, `DB_SSL_REJECT_UNAUTHORIZED`, and `DB_SSL_CA` variables
- Allows flexible SSL configuration based on deployment environment

**Environment Variables:**
```bash
# Production
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true

# Development with self-signed cert
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=false

# Development without SSL
DB_SSL=false
```

#### Issue 1.3: Missing Connection Timeouts
**Problem:** No timeout configurations could lead to hanging connections and degraded performance.

**Fix Applied:**
- Added `connectionTimeoutMillis` (default: 30 seconds)
- Added `statement_timeout` (default: 60 seconds)
- Both configurable via environment variables

**Environment Variables:**
```bash
DB_CONNECTION_TIMEOUT=30000  # 30 seconds
DB_QUERY_TIMEOUT=60000       # 60 seconds
```

#### Issue 1.4: Inconsistent Pool Configuration
**Problem:** Different services had different pool configurations, no environment variable support.

**Fix Applied:**
- Standardized pool configuration across all services
- Made pool sizes environment-variable driven
- Added validation in configuration validation script

**Recommended Production Settings:**
```bash
# Main database
DB_POOL_MIN=10
DB_POOL_MAX=50

# Individual services
DB_POOL_MIN=5
DB_POOL_MAX=20
```

#### Issue 1.5: Missing Migration Extensions
**Problem:** Production builds (compiled to JS) couldn't load TypeScript migrations due to missing `.js` in `loadExtensions`.

**Fix Applied:**
```typescript
migrations: {
  tableName: 'knex_migrations',
  directory: './migrations',
  extension: 'ts',
  loadExtensions: ['.ts', '.js'],  // Added .js support
}
```

### 2. Redis Configuration Issues

#### Issue 2.1: Missing TLS Support for Azure Cache
**Problem:** Azure Cache for Redis requires TLS, but configuration didn't support TLS settings.

**Fix Applied:**
- Added TLS configuration support
- Added support for `REDIS_TLS` and `REDIS_TLS_REJECT_UNAUTHORIZED` variables
- Applied to:
  - `backend/services/api-gateway/src/config/configuration.ts`
  - `backend/services/user-service/src/config/index.ts`
  - `backend/services/auth-service/src/config/index.ts`

**Environment Variables:**
```bash
# Production (Azure Cache)
REDIS_HOST=flamoral-prod-redis.redis.cache.windows.net
REDIS_PORT=6380
REDIS_PASSWORD=***
REDIS_TLS=true
REDIS_TLS_REJECT_UNAUTHORIZED=true

# Or use connection URL
REDIS_URL=rediss://default:password@host:6380
```

#### Issue 2.2: Missing Retry Strategy
**Problem:** No retry logic for failed Redis connections could cause service disruptions.

**Fix Applied:**
- Added configurable retry strategy
- Exponential backoff with maximum retry limit
- Configurable via `REDIS_MAX_RETRIES` environment variable

**Configuration:**
```typescript
retryStrategy: (times: number) => {
  const maxRetries = parseInt(process.env.REDIS_MAX_RETRIES, 10) || 3;
  if (times > maxRetries) return null;
  return Math.min(times * 50, 2000);  // Max 2 second delay
}
```

#### Issue 2.3: Missing Connection Timeout
**Problem:** Could hang indefinitely waiting for Redis connection.

**Fix Applied:**
- Added `connectTimeout` configuration (default: 10 seconds)

### 3. Environment Configuration Issues

#### Issue 3.1: Incomplete Production Environment File
**Problem:** Production `.env` file had placeholders but missing guidance on required vs optional variables.

**Current State:**
- Production environment file at `infrastructure/config/.env.production`
- Contains comprehensive configuration with clear markers for required secrets
- All sensitive values marked with `***` and comments indicating Azure Key Vault storage

**Recommendations:**
1. Use Azure Key Vault for all production secrets
2. Never commit actual production secrets to version control
3. Use managed identities where possible

#### Issue 3.2: Missing Environment Validation
**Problem:** No automated validation of required environment variables before deployment.

**Fix Applied:**
- Created validation script: `database/scripts/validate-database-config.ts`
- Validates all database and Redis configurations
- Tests connections (optional)
- Can be run in CI/CD pipeline

**Usage:**
```bash
# Validate current environment
npm run validate:db-config

# Validate production configuration
NODE_ENV=production npm run validate:db-config

# Skip connection tests (for CI/CD)
TEST_CONNECTION=false npm run validate:db-config
```

## Files Modified

### Database Configuration Files
1. ✅ `database/knexfile.ts`
2. ✅ `backend/services/user-service/src/infrastructure/database/knexfile.ts`
3. ✅ `backend/services/matching-service/src/infrastructure/database/knexfile.ts`
4. ✅ `backend/services/media-service/src/infrastructure/database/knexfile.ts`

### Redis Configuration Files
1. ✅ `backend/services/api-gateway/src/config/configuration.ts`
2. ✅ `backend/services/user-service/src/config/index.ts`
3. ✅ `backend/services/auth-service/src/config/index.ts`

### New Files Created
1. ✅ `database/scripts/validate-database-config.ts` - Configuration validation script
2. ✅ `DATABASE_CONFIGURATION_FIXES.md` - This documentation

## Environment Variables Reference

### PostgreSQL (Required for Production/Staging)

```bash
# Connection (Option 1: URL)
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# Connection (Option 2: Individual params)
DB_HOST=flamoral-prod-postgres.postgres.database.azure.com
DB_PORT=5432
DB_NAME=flamoral
DB_USER=flamoral_admin
DB_PASSWORD=***  # MUST be in Azure Key Vault

# SSL Configuration
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true  # Set to false for self-signed certs
DB_SSL_CA=***  # Optional: CA certificate

# Connection Tuning
DB_CONNECTION_TIMEOUT=30000  # 30 seconds
DB_QUERY_TIMEOUT=60000       # 60 seconds

# Pool Configuration
DB_POOL_MIN=10               # Production: 10, Staging: 2, Dev: 2
DB_POOL_MAX=50               # Production: 50, Staging: 20, Dev: 10
```

### Redis (Required for Production/Staging)

```bash
# Connection (Option 1: URL)
REDIS_URL=rediss://default:password@host:6380

# Connection (Option 2: Individual params)
REDIS_HOST=flamoral-prod-redis.redis.cache.windows.net
REDIS_PORT=6380              # Azure Cache uses 6380 for TLS
REDIS_PASSWORD=***           # MUST be in Azure Key Vault
REDIS_DB=0

# TLS Configuration (Azure Cache requires TLS)
REDIS_TLS=true
REDIS_TLS_REJECT_UNAUTHORIZED=true

# Connection Tuning
REDIS_MAX_RETRIES=3
REDIS_CONNECT_TIMEOUT=10000  # 10 seconds
REDIS_TTL=3600               # Default TTL for cached items
```

## Migration Configuration

All services now support both TypeScript and compiled JavaScript migrations:

```typescript
migrations: {
  tableName: 'knex_migrations',
  directory: './migrations',
  extension: 'ts',
  loadExtensions: ['.ts', '.js'],
}
```

**Migration Directories:**
- Main: `database/migrations/`
- User Service: `backend/services/user-service/src/infrastructure/database/migrations/`
- Matching Service: `backend/services/matching-service/src/infrastructure/database/migrations/`
- Media Service: `backend/services/media-service/src/infrastructure/database/migrations/`

## Deployment Checklist

### Pre-Deployment

- [ ] Set all required environment variables in deployment environment
- [ ] Store all secrets in Azure Key Vault
- [ ] Run configuration validation: `NODE_ENV=production npm run validate:db-config`
- [ ] Test database connection with production credentials (in secure environment)
- [ ] Test Redis connection with production credentials (in secure environment)
- [ ] Review pool sizes for expected load
- [ ] Verify SSL certificates are properly configured

### Database Deployment

- [ ] Run migrations in staging first
- [ ] Verify migration success
- [ ] Test application connectivity
- [ ] Run migrations in production
- [ ] Monitor for connection errors
- [ ] Verify pool statistics

### Redis Deployment

- [ ] Configure Redis with TLS enabled
- [ ] Set strong password
- [ ] Configure connection limits
- [ ] Test failover behavior
- [ ] Monitor cache hit rates

### Post-Deployment

- [ ] Monitor database connection pool usage
- [ ] Monitor query performance
- [ ] Monitor Redis connection stability
- [ ] Check for SSL/TLS errors
- [ ] Review timeout configurations
- [ ] Monitor error logs for connection issues

## Security Recommendations

### Database Security
1. **Use SSL/TLS in production** - Always set `DB_SSL=true`
2. **Strong passwords** - Use Azure Key Vault generated passwords (min 32 chars)
3. **Least privilege** - Database user should have only necessary permissions
4. **Network isolation** - Use VNet integration for Azure services
5. **Connection limits** - Configure appropriate pool sizes
6. **Firewall rules** - Restrict access to specific IP ranges

### Redis Security
1. **Enable TLS** - Always set `REDIS_TLS=true` in production
2. **Strong passwords** - Use Azure Key Vault generated passwords
3. **Network isolation** - Use VNet integration
4. **Disable dangerous commands** - Configure Redis to disable FLUSHALL, FLUSHDB, etc.
5. **Regular key rotation** - Rotate passwords quarterly
6. **Monitor access** - Enable Redis monitoring and alerts

## Performance Tuning

### Database Connection Pools

**Small Services (1-5 req/sec):**
```bash
DB_POOL_MIN=2
DB_POOL_MAX=10
```

**Medium Services (5-50 req/sec):**
```bash
DB_POOL_MIN=5
DB_POOL_MAX=20
```

**Large Services (50+ req/sec):**
```bash
DB_POOL_MIN=10
DB_POOL_MAX=50
```

### Redis Configuration

**Development:**
```bash
REDIS_MAX_RETRIES=3
REDIS_CONNECT_TIMEOUT=10000
REDIS_TTL=3600
```

**Production:**
```bash
REDIS_MAX_RETRIES=3
REDIS_CONNECT_TIMEOUT=5000   # Faster timeout
REDIS_TTL=7200                # Longer cache
```

## Monitoring and Alerts

### Database Metrics to Monitor
- Connection pool usage (should be < 80%)
- Query execution time (should be < 100ms for 95th percentile)
- Connection errors
- SSL/TLS errors
- Failed transactions
- Long-running queries

### Redis Metrics to Monitor
- Connection count
- Cache hit rate (should be > 80%)
- Memory usage (should be < 80%)
- Evicted keys
- Connection errors
- Command latency

## Troubleshooting

### Database Connection Issues

**Problem:** "Connection timeout"
```bash
# Increase timeout
DB_CONNECTION_TIMEOUT=60000
```

**Problem:** "SSL connection error"
```bash
# For self-signed certificates
DB_SSL_REJECT_UNAUTHORIZED=false

# For proper certificates, ensure CA is provided
DB_SSL_CA=<certificate_content>
```

**Problem:** "Too many connections"
```bash
# Reduce pool size
DB_POOL_MAX=10

# Or increase database max_connections
# (requires database configuration change)
```

### Redis Connection Issues

**Problem:** "TLS connection error"
```bash
# Verify TLS settings
REDIS_TLS=true
REDIS_PORT=6380  # Azure Cache requires 6380 for TLS
```

**Problem:** "Connection timeout"
```bash
# Increase timeout
REDIS_CONNECT_TIMEOUT=15000
```

**Problem:** "Authentication failed"
```bash
# Verify password is correct
# Check if password was rotated in Azure
```

## Testing

### Local Testing

```bash
# Test database connection
npm run test:db-connection

# Test Redis connection
npm run test:redis-connection

# Validate all configurations
npm run validate:db-config
```

### Staging Testing

```bash
# Set environment
export NODE_ENV=staging

# Run validation
npm run validate:db-config

# Run integration tests
npm run test:integration
```

### Production Validation

```bash
# In production environment (do NOT test from local)
NODE_ENV=production npm run validate:db-config
```

## Support and Maintenance

### Regular Maintenance Tasks

**Weekly:**
- Review connection pool metrics
- Check for slow queries
- Monitor Redis cache hit rates

**Monthly:**
- Review and optimize pool sizes
- Analyze query performance
- Update connection strings if needed
- Review security logs

**Quarterly:**
- Rotate passwords and secrets
- Review and update SSL certificates
- Performance tuning based on metrics
- Disaster recovery testing

### Getting Help

For issues with database configurations:
1. Check this documentation first
2. Review validation script output
3. Check service-specific logs
4. Review Azure portal for infrastructure issues

## Conclusion

All database and Redis configurations have been updated to support production deployments with:

✅ **Flexible connection options** (URL or individual params)
✅ **Proper SSL/TLS support** for security
✅ **Environment-driven configuration** for all settings
✅ **Connection timeouts and retries** for reliability
✅ **Validation scripts** for deployment safety
✅ **Comprehensive documentation** for operations

The platform is now ready for production deployment with robust, secure, and properly configured database connections.

---

**Next Steps:**
1. Run validation script: `npm run validate:db-config`
2. Set up Azure Key Vault secrets
3. Configure production environment variables
4. Test in staging environment
5. Deploy to production with monitoring enabled

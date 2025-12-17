# Database Environment Variables Reference

This document lists all database-related environment variables used across the Flamoral application.

## PostgreSQL Configuration (All Services)

### Core Connection Settings
```bash
DB_HOST=localhost                    # Database host
DB_PORT=5432                         # Database port
DB_NAME=flamoral_dev                 # Database name (service-specific)
DB_USER=postgres                     # Database user
DB_PASSWORD=your_secure_password     # Database password
DATABASE_URL=postgresql://...        # Full connection string (overrides individual settings)
```

### SSL Configuration
```bash
DB_SSL=true                          # Enable SSL (true/false)
DB_SSL_REJECT_UNAUTHORIZED=true      # Verify SSL certificates
DB_SSL_CA=/path/to/ca-cert.pem      # Path to CA certificate
```

### Connection Pool Settings
```bash
DB_POOL_MIN=2                        # Minimum connections in pool
DB_POOL_MAX=10                       # Maximum connections in pool
DB_CONNECTION_TIMEOUT=30000          # Connection timeout (ms)
DB_QUERY_TIMEOUT=60000               # Query timeout (ms)
DB_IDLE_TIMEOUT=30000                # Idle connection timeout (ms)
DB_IDLE_IN_TRANSACTION_TIMEOUT=60000 # Idle in transaction timeout (ms)
DB_APPLICATION_NAME=flamoral_dev     # Application name for monitoring
```

### Test Database
```bash
DB_NAME_TEST=flamoral_test           # Test database name
```

## Service-Specific Database Names

### Development Environment Defaults
- User Service: `flamoral_users` or as set in `DB_NAME`
- Matching Service: `flamoral_matching` or as set in `DB_NAME`
- Payment Service: `flamoral_payments` or as set in `DB_NAME`
- Media Service: `flamoral_media` or as set in `DB_NAME`
- Notification Service: `flamoral_notifications` or as set in `DB_NAME`
- Analytics Service: `flamoral_analytics` or as set in `DB_NAME`
- Advertising Service: `flamoral_advertising` or as set in `DB_NAME`
- Moderation Service: `flamoral_moderation` or as set in `DB_NAME`

## Cosmos DB / MongoDB (Messaging Service)

### Cosmos DB Configuration
```bash
COSMOS_ENDPOINT=https://your-account.documents.azure.com:443/
COSMOS_KEY=your_cosmos_key
COSMOS_DATABASE_ID=Flamoral
COSMOS_MESSAGES_CONTAINER=Messages
COSMOS_CONVERSATIONS_CONTAINER=Conversations
COSMOS_CALL_HISTORY_CONTAINER=CallHistory
COSMOS_CALL_RECORDINGS_CONTAINER=CallRecordings
COSMOS_CONNECTION_TIMEOUT=30000
COSMOS_REQUEST_TIMEOUT=10000
COSMOS_MAX_RETRIES=3
```

### MongoDB Configuration (Alternative)
```bash
MONGODB_URI=mongodb://localhost:27017/flamoral_messaging
MONGODB_DATABASE=flamoral_messaging
MONGODB_PASSWORD=your_mongodb_password
MONGODB_POOL_SIZE=10
MONGODB_MIN_POOL_SIZE=2
MONGODB_SOCKET_TIMEOUT=45000
MONGODB_CONNECT_TIMEOUT=30000
MONGODB_RETRY_WRITES=true
MONGODB_RETRY_READS=true
```

## Redis Configuration

### Core Redis Settings
```bash
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_DB=0                           # Database number (0-15)
REDIS_MAX_RETRIES=3
REDIS_ENABLE_OFFLINE_QUEUE=true
```

### Service-Specific Redis DB Numbers
- Messaging Service: `REDIS_DB=0`
- Analytics Service: `REDIS_DB=7`
- User Service: `REDIS_DB=1`
- Matching Service: `REDIS_DB=2`

### Redis TTL Settings (Messaging Service)
```bash
REDIS_TTL_ONLINE_STATUS=300          # 5 minutes
REDIS_TTL_TYPING=10                  # 10 seconds
REDIS_TTL_MESSAGE_CACHE=3600         # 1 hour
```

## TimescaleDB (Analytics Service)

```bash
ENABLE_TIMESCALEDB=true              # Enable TimescaleDB extension
DATA_RETENTION_DAYS=365              # Data retention policy
```

## Read Replicas Configuration

```bash
DB_REPLICA_COUNT=2                   # Number of read replicas

# Replica 1
DB_REPLICA_1_HOST=replica1.example.com
DB_REPLICA_1_PORT=5432
DB_REPLICA_1_NAME=flamoral_dev
DB_REPLICA_1_USER=postgres
DB_REPLICA_1_PASSWORD=password
DB_REPLICA_1_PRIORITY=1

# Replica 2
DB_REPLICA_2_HOST=replica2.example.com
DB_REPLICA_2_PORT=5432
DB_REPLICA_2_NAME=flamoral_dev
DB_REPLICA_2_USER=postgres
DB_REPLICA_2_PASSWORD=password
DB_REPLICA_2_PRIORITY=2
```

## Environment-Specific Recommendations

### Development
```bash
NODE_ENV=development
DB_HOST=localhost
DB_NAME=flamoral_dev
DB_POOL_MIN=2
DB_POOL_MAX=10
DB_SSL=false
```

### Test
```bash
NODE_ENV=test
DB_HOST=localhost
DB_NAME=flamoral_test
DB_POOL_MIN=0
DB_POOL_MAX=5
DB_SSL=false
```

### Staging
```bash
NODE_ENV=staging
DB_HOST=staging-db.example.com
DB_NAME=flamoral_staging
DB_POOL_MIN=2
DB_POOL_MAX=20
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
```

### Production
```bash
NODE_ENV=production
DB_HOST=prod-db.example.com
DB_NAME=flamoral_production
DB_POOL_MIN=5
DB_POOL_MAX=30
DB_SSL=true
DB_SSL_REJECT_UNAUTHORIZED=true
# Use DATABASE_URL for managed database services
DATABASE_URL=postgresql://user:pass@host:5432/dbname?sslmode=require
```

## Security Best Practices

1. **Never commit .env files** to version control
2. **Use strong passwords** for all database credentials
3. **Enable SSL** in staging and production environments
4. **Rotate credentials** regularly
5. **Use DATABASE_URL** for managed database services (Heroku, Azure, AWS RDS)
6. **Set appropriate pool sizes** based on your infrastructure
7. **Enable connection timeouts** to prevent hanging connections
8. **Use read replicas** for high-traffic read operations

## Validation

To validate your database configuration:

```bash
# Run from project root
npm run db:validate

# Or manually check connection
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME
```

## Troubleshooting

### Connection Issues
- Verify `DB_HOST` and `DB_PORT` are correct
- Check firewall rules
- Ensure database is running
- Verify credentials

### Pool Exhaustion
- Increase `DB_POOL_MAX`
- Check for connection leaks
- Review slow queries

### SSL Errors
- Verify SSL certificate path in `DB_SSL_CA`
- Check `DB_SSL_REJECT_UNAUTHORIZED` setting
- Ensure server supports SSL

## Migration Commands

```bash
# Run migrations
npm run migrate

# Rollback migrations
npm run migrate:rollback

# Create new migration
npm run migrate:make migration_name

# Run seeds
npm run seed
```

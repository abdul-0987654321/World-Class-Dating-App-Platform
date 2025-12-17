# ADR 0005: Database Technology Selection

## Status
Accepted

## Context
The Flamoral dating platform requires multiple database technologies to handle different data types and access patterns:

### Data Requirements
1. **Structured relational data** - User profiles, matches, subscriptions, transactions
2. **Unstructured data** - Chat messages, logs, user activity
3. **High-speed caching** - Session management, real-time presence, rate limiting
4. **Search and analytics** - Full-text search, user discovery, analytics queries

### Performance Requirements
- Support 100,000+ concurrent users
- Sub-100ms response times for profile queries
- Real-time messaging delivery (<1 second)
- Complex matching algorithm queries
- Geospatial queries for location-based discovery
- ACID compliance for payment transactions

### Scalability Requirements
- Horizontal scaling capability
- Read replicas for high-read workloads
- Sharding support for data distribution
- Auto-scaling based on load

## Decision

We will use a **polyglot persistence** approach with four complementary database technologies:

### 1. PostgreSQL 15 (Primary Relational Database)

**Use cases:**
- User accounts and authentication
- User profiles and preferences
- Matches and connections
- Subscription and payment records
- Reporting and analytics

**Rationale:**
- Strong ACID compliance for critical transactions
- Excellent support for complex queries and joins
- Built-in geospatial support (PostGIS extension)
- JSON/JSONB support for flexible schema evolution
- Mature ecosystem and tooling
- Strong data integrity guarantees
- Row-level security for multi-tenancy

**Configuration:**
- Master-slave replication (1 master, 2 read replicas)
- Connection pooling via PgBouncer
- Partitioning for large tables (messages, activity logs)
- PostGIS extension for geospatial queries

### 2. MongoDB 7 (Document Database)

**Use cases:**
- Chat messages and message history
- User activity logs and events
- Real-time notifications queue
- User-generated content (photos metadata, comments)
- Flexible profile data (interests, prompts, etc.)

**Rationale:**
- Flexible schema for evolving message formats
- High write throughput for chat messages
- Horizontal scaling via sharding
- Built-in replication and high availability
- Efficient for unstructured/semi-structured data
- TTL indexes for automatic data expiration
- Aggregation pipeline for analytics

**Configuration:**
- 3-node replica set for high availability
- Sharding by user_id for horizontal scaling
- TTL indexes for message expiration
- Compound indexes for efficient message retrieval

### 3. Redis 7 (In-Memory Cache)

**Use cases:**
- Session management and JWT token storage
- Rate limiting counters
- Real-time user presence/online status
- Swipe queue and temporary match data
- Leaderboards and trending profiles
- Pub/Sub for real-time features
- Cache for frequently accessed profile data

**Rationale:**
- Sub-millisecond latency
- Native support for complex data structures (sorted sets, hashes, lists)
- Built-in pub/sub for real-time messaging
- Automatic key expiration (TTL)
- Redis Cluster for horizontal scaling
- Persistence options (RDB + AOF) for durability
- Atomic operations for counters and rate limiting

**Configuration:**
- Redis Cluster (3 master nodes, 3 replicas)
- RDB snapshots every 5 minutes
- AOF for write durability
- Maxmemory policy: allkeys-lru (evict least recently used)
- Separate instances for cache vs. session data

### 4. Elasticsearch 8 (Search and Analytics)

**Use cases:**
- Full-text search for user profiles
- Advanced filtering and discovery
- User behavior analytics
- Log aggregation and analysis
- Real-time dashboards (admin panel)
- Recommendations based on user behavior

**Rationale:**
- Powerful full-text search capabilities
- Real-time indexing and search
- Aggregations for analytics
- Geospatial queries for location-based discovery
- Scalable and distributed
- Integration with Kibana for visualization
- Near real-time search updates

**Configuration:**
- 3-node cluster for redundancy
- Index sharding based on data volume
- Daily index rotation for logs
- Index lifecycle management (ILM)
- Snapshot repository for backups

## Data Distribution Strategy

### PostgreSQL (Primary Database)
```
users
├── id, email, password_hash, phone, created_at
profiles
├── user_id, name, age, bio, photos, location, preferences
matches
├── id, user1_id, user2_id, matched_at, status
subscriptions
├── id, user_id, plan, status, start_date, end_date
payments
├── id, user_id, amount, currency, status, stripe_id
```

### MongoDB (Messages & Logs)
```
messages
├── _id, conversation_id, sender_id, receiver_id, content, timestamp
conversations
├── _id, participants[], last_message, updated_at
activity_logs
├── _id, user_id, action, metadata, timestamp
```

### Redis (Cache & Sessions)
```
session:{token} -> user session data (TTL: 24h)
rate_limit:{user_id}:{action} -> counter (TTL: 1h)
online:{user_id} -> presence data (TTL: 5m)
swipe_queue:{user_id} -> list of profile IDs
profile_cache:{user_id} -> cached profile data (TTL: 10m)
```

### Elasticsearch (Search & Analytics)
```
profiles index -> searchable user profiles
activity index -> user behavior for recommendations
logs index -> application and error logs
```

## Migration Strategy

### Phase 1: Initial Setup
- Set up PostgreSQL as primary database
- Migrate existing user and profile data
- Configure read replicas

### Phase 2: Add Specialized Databases
- Deploy MongoDB for messages
- Migrate message history
- Set up Redis for caching and sessions

### Phase 3: Add Search
- Deploy Elasticsearch cluster
- Index existing profiles
- Implement real-time indexing pipeline

### Data Synchronization
- Use change data capture (CDC) to sync PostgreSQL → Elasticsearch
- Use application-level sync for MongoDB → Elasticsearch
- Redis as cache only (no persistence requirements beyond session data)

## Consequences

### Positive

**Performance:**
- Optimized for each use case
- Sub-100ms query response times
- Horizontal scaling for growth
- Efficient caching reduces database load by 70%

**Reliability:**
- High availability through replication
- No single point of failure
- Data durability with multiple backup strategies
- Automatic failover

**Flexibility:**
- Schema flexibility where needed (MongoDB)
- Strong consistency where required (PostgreSQL)
- Real-time capabilities (Redis pub/sub)
- Advanced search (Elasticsearch)

**Developer Experience:**
- Use the right tool for each job
- Rich ecosystem of tools and libraries
- Mature documentation and community support

### Negative

**Complexity:**
- Multiple database systems to maintain
- Need expertise in 4 different technologies
- More complex deployment and monitoring
- Data consistency across systems requires careful design

**Operational Overhead:**
- More infrastructure to manage
- Higher hosting costs
- Complex backup and recovery procedures
- Need for data synchronization

**Development Complexity:**
- Developers need to understand data distribution
- More complex testing (multiple databases)
- Potential for data inconsistency bugs
- Need for distributed transaction handling

### Mitigations

**Reduce Complexity:**
- Use managed database services (Azure Database for PostgreSQL, MongoDB Atlas, Redis Enterprise, Elastic Cloud)
- Infrastructure as Code (Terraform) for consistent deployments
- Automated backup and monitoring
- Comprehensive documentation for data architecture

**Ensure Consistency:**
- Use event sourcing for critical operations
- Implement saga pattern for distributed transactions
- Regular data validation and reconciliation jobs
- Comprehensive integration tests

**Operational Excellence:**
- Centralized monitoring via Prometheus + Grafana
- Centralized logging via ELK stack
- Automated failover testing
- Disaster recovery runbooks
- Regular backup testing

## Alternatives Considered

### Single Database (PostgreSQL only)
**Rejected because:**
- Poor performance for high-volume message storage
- Expensive to scale for caching use cases
- Limited full-text search capabilities
- Inefficient for real-time presence tracking

### Single NoSQL (MongoDB only)
**Rejected because:**
- Lacks strong ACID guarantees for payments
- Less mature ecosystem for complex relational queries
- Weaker consistency guarantees
- Not ideal for caching use cases

### PostgreSQL + Redis only
**Rejected because:**
- PostgreSQL becomes bottleneck for message storage
- No advanced search capabilities
- Difficult to scale message history
- Limited analytics capabilities

## References

- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [Redis Documentation](https://redis.io/documentation)
- [Elasticsearch Documentation](https://www.elastic.co/guide/)
- [Polyglot Persistence - Martin Fowler](https://martinfowler.com/bliki/PolyglotPersistence.html)
- ADR 0002: Microservices Architecture
- ADR 0008: Caching Strategy (references Redis usage)

## Approval

**Date:** November 2025
**Approved by:** Technical Architecture Team
**Review Date:** November 2026 (annual review)

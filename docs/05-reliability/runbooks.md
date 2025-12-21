# Flamoral SEV-1 Runbooks

> **Purpose**: Step-by-step remediation procedures for critical production incidents.

## Runbook Index

| Incident | Runbook |
|----------|---------|
| Discovery feed empty | [SEV-1-001](#sev-1-001-discovery-feed-empty) |
| Messaging down | [SEV-1-002](#sev-1-002-messaging-down) |
| Verification stuck | [SEV-1-003](#sev-1-003-verification-stuck) |
| Payment webhooks failing | [SEV-1-004](#sev-1-004-payment-webhooks-failing) |
| Calls failing | [SEV-1-005](#sev-1-005-calls-failing) |
| Auth service down | [SEV-1-006](#sev-1-006-auth-service-down) |
| Database connection exhaustion | [SEV-1-007](#sev-1-007-database-connection-exhaustion) |
| Redis cluster failure | [SEV-1-008](#sev-1-008-redis-cluster-failure) |

---

## SEV-1-001: Discovery Feed Empty

### Symptoms
- Users report seeing "No more profiles" when eligible matches exist
- Discovery feed API returns empty array
- Metrics show 0 candidates returned

### Impact
- Core product functionality broken
- User engagement drops immediately
- Revenue impact (users cannot like/match)

### Diagnosis

```bash
# 1. Check discovery service health
curl -s https://api.flamoral.com/health | jq

# 2. Check discovery service logs
kubectl logs -l app=discovery-service --tail=100 | grep -i error

# 3. Check database connectivity
kubectl exec -it deployment/discovery-service -- \
  psql $DATABASE_URL -c "SELECT 1"

# 4. Check Redis (candidate cache)
kubectl exec -it deployment/discovery-service -- \
  redis-cli -h $REDIS_HOST PING

# 5. Check discovery_ranking_worker status
kubectl logs -l app=discovery-ranking-worker --tail=100

# 6. Check if users exist in discovery pool
kubectl exec -it deployment/discovery-service -- \
  psql $DATABASE_URL -c "SELECT COUNT(*) FROM users WHERE deleted_at IS NULL AND status = 'active'"
```

### Remediation Steps

1. **If discovery service unhealthy**:
   ```bash
   kubectl rollout restart deployment/discovery-service
   # Wait 2 minutes, check health again
   ```

2. **If database connection issues**:
   ```bash
   # Check connection pool
   kubectl exec -it deployment/discovery-service -- \
     psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'flamoral'"

   # If pool exhausted, restart to clear connections
   kubectl rollout restart deployment/discovery-service
   ```

3. **If Redis issues**:
   ```bash
   # Check Redis memory
   kubectl exec -it deployment/redis -- redis-cli INFO memory

   # If memory full, flush discovery cache (rebuilds automatically)
   kubectl exec -it deployment/redis -- redis-cli FLUSHDB

   # Trigger cache rebuild
   kubectl exec -it deployment/discovery-ranking-worker -- \
     node scripts/rebuild-discovery-cache.js
   ```

4. **If ranking worker stuck**:
   ```bash
   # Check worker queue depth
   kubectl exec -it deployment/discovery-ranking-worker -- \
     node scripts/check-queue-depth.js

   # Clear stuck jobs
   kubectl exec -it deployment/discovery-ranking-worker -- \
     node scripts/clear-stuck-jobs.js

   # Restart worker
   kubectl rollout restart deployment/discovery-ranking-worker
   ```

### Verification
```bash
# Test feed returns results
curl -H "Authorization: Bearer $TEST_TOKEN" \
  https://api.flamoral.com/discovery/feed | jq '.items | length'
# Should be > 0
```

---

## SEV-1-002: Messaging Down

### Symptoms
- Messages not sending (API errors or timeouts)
- Real-time delivery not working (WebSocket disconnections)
- Message history not loading

### Impact
- Core communication broken
- Users cannot interact with matches
- Severe user experience degradation

### Diagnosis

```bash
# 1. Check messaging service health
curl -s https://api.flamoral.com/health | jq '.services.messaging'

# 2. Check messaging service logs
kubectl logs -l app=messaging-service --tail=200 | grep -i error

# 3. Check WebSocket gateway
kubectl logs -l app=websocket-gateway --tail=100

# 4. Check message queue depth
kubectl exec -it deployment/messaging-service -- \
  node scripts/check-queue-depth.js

# 5. Check database connections
kubectl exec -it deployment/messaging-service -- \
  psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity"

# 6. Check Redis pub/sub
kubectl exec -it deployment/redis -- \
  redis-cli PUBSUB CHANNELS 'messages:*'
```

### Remediation Steps

1. **If messaging service unhealthy**:
   ```bash
   kubectl rollout restart deployment/messaging-service
   kubectl rollout restart deployment/websocket-gateway
   ```

2. **If queue backlog**:
   ```bash
   # Check message_delivery_worker
   kubectl logs -l app=message-delivery-worker --tail=100

   # Scale up workers temporarily
   kubectl scale deployment/message-delivery-worker --replicas=5

   # After backlog cleared, scale back
   kubectl scale deployment/message-delivery-worker --replicas=2
   ```

3. **If WebSocket connections dropping**:
   ```bash
   # Check pod memory/CPU
   kubectl top pods -l app=websocket-gateway

   # If resource constrained, scale up
   kubectl scale deployment/websocket-gateway --replicas=4
   ```

4. **If database issues**:
   ```bash
   # Check for long-running queries
   kubectl exec -it deployment/messaging-service -- \
     psql $DATABASE_URL -c "SELECT pid, query, state, age(clock_timestamp(), query_start) FROM pg_stat_activity WHERE state != 'idle' ORDER BY query_start"

   # Kill long-running queries if necessary
   kubectl exec -it deployment/messaging-service -- \
     psql $DATABASE_URL -c "SELECT pg_terminate_backend(<pid>)"
   ```

### Verification
```bash
# Test message send
curl -X POST -H "Authorization: Bearer $TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d '{"type":"text","content":"test"}' \
  https://api.flamoral.com/conversations/$TEST_CONVERSATION_ID/messages

# Should return 201
```

---

## SEV-1-003: Verification Stuck

### Symptoms
- Verification status not updating after upload
- Users stuck in "pending" or "in_review" state indefinitely
- Verification worker not processing

### Impact
- Users cannot complete verification
- Trust badges not updating
- User frustration, potential churn

### Diagnosis

```bash
# 1. Check verification service health
curl -s https://api.flamoral.com/health | jq '.services.verification'

# 2. Check verification worker logs
kubectl logs -l app=verification-worker --tail=200

# 3. Check stuck requests
kubectl exec -it deployment/verification-service -- \
  psql $DATABASE_URL -c "SELECT status, COUNT(*) FROM verification_requests WHERE updated_at < NOW() - INTERVAL '1 hour' GROUP BY status"

# 4. Check external verification provider
kubectl exec -it deployment/verification-worker -- \
  node scripts/check-provider-status.js

# 5. Check queue depth
kubectl exec -it deployment/verification-worker -- \
  node scripts/check-queue-depth.js
```

### Remediation Steps

1. **If worker not processing**:
   ```bash
   kubectl rollout restart deployment/verification-worker
   ```

2. **If external provider down**:
   ```bash
   # Check provider status page
   # If provider issue, update status page
   # Queue will process once provider recovers

   # For critical users, manual processing:
   kubectl exec -it deployment/verification-worker -- \
     node scripts/manual-verify.js --request-id=<id>
   ```

3. **If stuck in queue**:
   ```bash
   # Check DLQ for failed jobs
   kubectl exec -it deployment/verification-worker -- \
     node scripts/check-dlq.js

   # Reprocess failed jobs
   kubectl exec -it deployment/verification-worker -- \
     node scripts/reprocess-dlq.js
   ```

4. **If database sync issue**:
   ```bash
   # Force status refresh for stuck requests
   kubectl exec -it deployment/verification-service -- \
     psql $DATABASE_URL -c "UPDATE verification_requests SET updated_at = NOW() WHERE status = 'in_review' AND updated_at < NOW() - INTERVAL '2 hours'"
   ```

### Verification
```bash
# Check a specific user's status
curl -H "Authorization: Bearer $TEST_TOKEN" \
  https://api.flamoral.com/verification/status | jq
```

---

## SEV-1-004: Payment Webhooks Failing

### Symptoms
- Stripe webhooks returning errors
- User subscriptions not updating after payment
- Premium features not enabling after purchase

### Impact
- Revenue recognition issues
- Users paying but not getting features
- Customer trust violation

### Diagnosis

```bash
# 1. Check webhook endpoint health
curl -X POST https://api.flamoral.com/webhooks/stripe \
  -H "Content-Type: application/json" -d '{}' -v
# Should return 400 (invalid payload), not 5xx

# 2. Check payment service logs
kubectl logs -l app=payment-service --tail=200 | grep -i webhook

# 3. Check Stripe webhook dashboard for failures
# https://dashboard.stripe.com/webhooks

# 4. Check subscription sync worker
kubectl logs -l app=subscription-sync-worker --tail=100

# 5. Check for mismatched subscriptions
kubectl exec -it deployment/payment-service -- \
  psql $DATABASE_URL -c "SELECT u.user_id, us.status as db_status FROM user_subscriptions us JOIN users u ON u.user_id = us.user_id WHERE us.updated_at < NOW() - INTERVAL '1 hour' AND us.status = 'active'"
```

### Remediation Steps

1. **If webhook signature validation failing**:
   ```bash
   # Verify webhook secret is current
   kubectl get secret payment-secrets -o jsonpath='{.data.STRIPE_WEBHOOK_SECRET}' | base64 -d

   # Compare with Stripe dashboard
   # If mismatch, update secret:
   kubectl create secret generic payment-secrets \
     --from-literal=STRIPE_WEBHOOK_SECRET=<new-secret> \
     --dry-run=client -o yaml | kubectl apply -f -

   kubectl rollout restart deployment/payment-service
   ```

2. **If webhook endpoint timing out**:
   ```bash
   # Check for slow database queries
   kubectl exec -it deployment/payment-service -- \
     psql $DATABASE_URL -c "SELECT query, calls, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10"

   # Restart payment service
   kubectl rollout restart deployment/payment-service
   ```

3. **If webhooks queued/delayed**:
   ```bash
   # Force sync with Stripe
   kubectl exec -it deployment/subscription-sync-worker -- \
     node scripts/full-sync-stripe.js
   ```

4. **Manual fix for affected users**:
   ```bash
   # Sync specific user from Stripe
   kubectl exec -it deployment/payment-service -- \
     node scripts/sync-user-subscription.js --user-id=<id>
   ```

### Verification
```bash
# Trigger test webhook from Stripe dashboard
# Check logs for successful processing
kubectl logs -l app=payment-service --tail=50 | grep webhook
```

---

## SEV-1-005: Calls Failing

### Symptoms
- Call requests returning errors
- Calls not connecting
- Calls dropping immediately

### Impact
- Premium feature broken
- User complaints
- Subscription value not delivered

### Diagnosis

```bash
# 1. Check call service health
curl -s https://api.flamoral.com/health | jq '.services.calls'

# 2. Check call service logs
kubectl logs -l app=call-service --tail=200 | grep -i error

# 3. Check call provider (e.g., Twilio, Agora) status
kubectl exec -it deployment/call-service -- \
  node scripts/check-provider-status.js

# 4. Check call signal worker
kubectl logs -l app=call-signal-worker --tail=100

# 5. Check active calls
kubectl exec -it deployment/call-service -- \
  psql $DATABASE_URL -c "SELECT status, COUNT(*) FROM call_sessions WHERE created_at > NOW() - INTERVAL '1 hour' GROUP BY status"
```

### Remediation Steps

1. **If call provider issue**:
   ```bash
   # Check provider status page
   # If provider down, enable fallback provider if configured
   kubectl set env deployment/call-service CALL_PROVIDER=fallback
   kubectl rollout restart deployment/call-service
   ```

2. **If call service unhealthy**:
   ```bash
   kubectl rollout restart deployment/call-service
   kubectl rollout restart deployment/call-signal-worker
   ```

3. **If TURN/STUN server issues**:
   ```bash
   # Check TURN server connectivity
   kubectl exec -it deployment/call-service -- \
     node scripts/test-turn-connection.js

   # Refresh TURN credentials if expired
   kubectl exec -it deployment/call-service -- \
     node scripts/refresh-turn-credentials.js
   ```

### Verification
```bash
# Test call initiation
curl -X POST -H "Authorization: Bearer $TEST_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"match_id":"<test-match-id>","type":"audio"}' \
  https://api.flamoral.com/calls/request | jq
```

---

## SEV-1-006: Auth Service Down

### Symptoms
- Users cannot log in
- API requests returning 401 for valid tokens
- Token refresh failing

### Impact
- Complete platform outage
- All users locked out
- Maximum severity

### Diagnosis

```bash
# 1. Check auth service health
curl -s https://api.flamoral.com/health | jq '.services.auth'

# 2. Check auth service pods
kubectl get pods -l app=auth-service

# 3. Check auth service logs
kubectl logs -l app=auth-service --tail=200

# 4. Check Redis (session store)
kubectl exec -it deployment/auth-service -- \
  redis-cli -h $REDIS_HOST PING

# 5. Check database
kubectl exec -it deployment/auth-service -- \
  psql $DATABASE_URL -c "SELECT 1"
```

### Remediation Steps

1. **If pods not running**:
   ```bash
   kubectl describe pods -l app=auth-service
   # Check for resource issues, image pull errors

   kubectl rollout restart deployment/auth-service
   ```

2. **If Redis down**:
   ```bash
   kubectl get pods -l app=redis
   kubectl rollout restart statefulset/redis

   # If Redis cluster, check cluster health
   kubectl exec -it redis-0 -- redis-cli CLUSTER INFO
   ```

3. **If database connection issues**:
   ```bash
   # Check connection pool
   kubectl exec -it deployment/auth-service -- \
     psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity"

   # Emergency: increase connection limit
   kubectl exec -it deployment/auth-service -- \
     psql $DATABASE_URL -c "ALTER SYSTEM SET max_connections = 200"
   ```

4. **If JWT signing key issue**:
   ```bash
   # Verify secret exists
   kubectl get secret auth-secrets

   # If missing, restore from backup
   kubectl create secret generic auth-secrets \
     --from-file=JWT_PRIVATE_KEY=/path/to/backup

   kubectl rollout restart deployment/auth-service
   ```

### Verification
```bash
# Test login
curl -X POST https://api.flamoral.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpassword"}' | jq

# Test token validation
curl -H "Authorization: Bearer $TEST_TOKEN" \
  https://api.flamoral.com/auth/session | jq
```

---

## SEV-1-007: Database Connection Exhaustion

### Symptoms
- Intermittent 500 errors across services
- "too many connections" in logs
- Services timing out on database calls

### Diagnosis

```bash
# Check active connections
kubectl exec -it deployment/api-gateway -- \
  psql $DATABASE_URL -c "SELECT usename, application_name, state, COUNT(*) FROM pg_stat_activity GROUP BY 1,2,3 ORDER BY 4 DESC"

# Check max connections
kubectl exec -it deployment/api-gateway -- \
  psql $DATABASE_URL -c "SHOW max_connections"

# Check connection age
kubectl exec -it deployment/api-gateway -- \
  psql $DATABASE_URL -c "SELECT usename, application_name, age(clock_timestamp(), backend_start) as conn_age FROM pg_stat_activity ORDER BY conn_age DESC LIMIT 20"
```

### Remediation Steps

1. **Kill idle connections**:
   ```bash
   kubectl exec -it deployment/api-gateway -- \
     psql $DATABASE_URL -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'idle' AND query_start < NOW() - INTERVAL '10 minutes'"
   ```

2. **Restart services with connection leaks**:
   ```bash
   # Identify service with most connections
   # Restart that service
   kubectl rollout restart deployment/<service-name>
   ```

3. **Increase connection limit temporarily**:
   ```bash
   kubectl exec -it deployment/api-gateway -- \
     psql $DATABASE_URL -c "ALTER SYSTEM SET max_connections = 300"
   # Note: Requires database restart
   ```

4. **Enable PgBouncer if not already**:
   ```bash
   # Deploy PgBouncer for connection pooling
   kubectl apply -f k8s/pgbouncer.yaml
   ```

---

## SEV-1-008: Redis Cluster Failure

### Symptoms
- Session validation failing
- Cache misses everywhere
- Rate limiting not working

### Diagnosis

```bash
# Check Redis pods
kubectl get pods -l app=redis

# Check cluster health
kubectl exec -it redis-0 -- redis-cli CLUSTER INFO

# Check memory
kubectl exec -it redis-0 -- redis-cli INFO memory

# Check connections
kubectl exec -it redis-0 -- redis-cli CLIENT LIST | wc -l
```

### Remediation Steps

1. **If single node down**:
   ```bash
   kubectl delete pod redis-<n>
   # StatefulSet will recreate
   ```

2. **If cluster state inconsistent**:
   ```bash
   kubectl exec -it redis-0 -- redis-cli CLUSTER FIX
   ```

3. **If memory exhausted**:
   ```bash
   # Flush non-critical caches
   kubectl exec -it redis-0 -- redis-cli --scan --pattern 'cache:*' | xargs redis-cli DEL

   # Or flush all
   kubectl exec -it redis-0 -- redis-cli FLUSHALL
   ```

4. **If complete failure**:
   ```bash
   # Services should degrade gracefully without Redis
   # Restart Redis StatefulSet
   kubectl rollout restart statefulset/redis

   # After Redis up, restart services to reconnect
   kubectl rollout restart deployment/auth-service
   kubectl rollout restart deployment/api-gateway
   ```

---

## Post-Incident Checklist

After any SEV-1 resolution:

- [ ] Verify all services healthy via `/health`
- [ ] Check error rates returned to baseline
- [ ] Notify stakeholders of resolution
- [ ] Update status page
- [ ] Create incident ticket
- [ ] Schedule post-mortem within 48 hours
- [ ] Document any temporary fixes that need permanent solutions

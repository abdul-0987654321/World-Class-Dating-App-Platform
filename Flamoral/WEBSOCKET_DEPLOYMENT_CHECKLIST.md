# WebSocket Deployment Checklist

## Pre-Deployment Preparation

### 1. Azure Key Vault Setup
- [ ] Create or verify Azure Key Vault exists: `flamoral-prod-kv`
- [ ] Add required secrets:
  ```bash
  # JWT Secret (64+ characters)
  az keyvault secret set --vault-name flamoral-prod-kv \
    --name JWT-SECRET \
    --value "$(openssl rand -base64 64 | tr -d '\n')"

  # Service Token (64+ characters)
  az keyvault secret set --vault-name flamoral-prod-kv \
    --name SERVICE-TOKEN \
    --value "$(openssl rand -base64 64 | tr -d '\n')"

  # Redis Password
  az keyvault secret set --vault-name flamoral-prod-kv \
    --name REDIS-PASSWORD \
    --value "your-azure-redis-password"
  ```

### 2. Azure Redis Configuration
- [ ] Verify Azure Cache for Redis is provisioned
- [ ] Confirm Redis is using Premium tier (for clustering)
- [ ] Enable TLS/SSL (port 6380)
- [ ] Configure firewall rules to allow AKS cluster
- [ ] Set up persistence (RDB or AOF) for production
- [ ] Note the connection string

### 3. Kubernetes Secrets
- [ ] Create or update `flamoral-auth-secrets`:
  ```bash
  kubectl create secret generic flamoral-auth-secrets \
    --from-literal=JWT_SECRET="$(az keyvault secret show --vault-name flamoral-prod-kv --name JWT-SECRET --query value -o tsv)" \
    --from-literal=JWT_ACCESS_SECRET="$(az keyvault secret show --vault-name flamoral-prod-kv --name JWT-SECRET --query value -o tsv)" \
    --from-literal=INTERNAL_SERVICE_KEY="$(az keyvault secret show --vault-name flamoral-prod-kv --name SERVICE-TOKEN --query value -o tsv)" \
    -n flamoral \
    --dry-run=client -o yaml | kubectl apply -f -
  ```

- [ ] Create or update `flamoral-database-secrets`:
  ```bash
  kubectl create secret generic flamoral-database-secrets \
    --from-literal=REDIS_HOST="flamoral-prod-redis.redis.cache.windows.net" \
    --from-literal=REDIS_PORT="6380" \
    --from-literal=REDIS_PASSWORD="$(az keyvault secret show --vault-name flamoral-prod-kv --name REDIS-PASSWORD --query value -o tsv)" \
    --from-literal=REDIS_URL="rediss://:$(az keyvault secret show --vault-name flamoral-prod-kv --name REDIS-PASSWORD --query value -o tsv)@flamoral-prod-redis.redis.cache.windows.net:6380" \
    -n flamoral \
    --dry-run=client -o yaml | kubectl apply -f -
  ```

### 4. Build and Push Docker Images
- [ ] Build API Gateway image:
  ```bash
  cd backend/services/api-gateway
  docker build -t flamoralacr.azurecr.io/api-gateway:latest .
  docker push flamoralacr.azurecr.io/api-gateway:latest
  ```

- [ ] Build Realtime Service image:
  ```bash
  cd backend/services/realtime-service
  docker build -t flamoralacr.azurecr.io/realtime-service:latest .
  docker push flamoralacr.azurecr.io/realtime-service:latest
  ```

- [ ] Tag images with version:
  ```bash
  docker tag flamoralacr.azurecr.io/api-gateway:latest flamoralacr.azurecr.io/api-gateway:v1.0.0
  docker tag flamoralacr.azurecr.io/realtime-service:latest flamoralacr.azurecr.io/realtime-service:v1.0.0
  docker push flamoralacr.azurecr.io/api-gateway:v1.0.0
  docker push flamoralacr.azurecr.io/realtime-service:v1.0.0
  ```

## Deployment Steps

### 5. Deploy to Kubernetes
- [ ] Deploy API Gateway:
  ```bash
  kubectl apply -f infrastructure/kubernetes/production/deployments/api-gateway.yaml
  kubectl rollout status deployment/api-gateway -n flamoral
  ```

- [ ] Deploy Realtime Service:
  ```bash
  kubectl apply -f infrastructure/kubernetes/production/deployments/realtime-service.yaml
  kubectl rollout status deployment/realtime-service -n flamoral
  ```

- [ ] Verify pods are running:
  ```bash
  kubectl get pods -n flamoral | grep -E "(api-gateway|realtime-service)"
  ```

- [ ] Check pod logs for errors:
  ```bash
  kubectl logs -f deployment/api-gateway -n flamoral --tail=50
  kubectl logs -f deployment/realtime-service -n flamoral --tail=50
  ```

### 6. Configure Azure Front Door
- [ ] Create or update Front Door profile
- [ ] Configure backend pools:
  - **API Gateway Backend**
    - Address: `api-gateway.flamoral-prod.svc.cluster.local:3000`
    - Weight: 100
    - Priority: 1

  - **Realtime Service Backend**
    - Address: `realtime-service.flamoral-prod.svc.cluster.local:8081`
    - Weight: 100
    - Priority: 1

- [ ] Configure routing rules:
  - **Route 1: Socket.IO**
    - Path: `/socket.io/*`
    - Backend: API Gateway
    - Session Affinity: Enabled
    - Protocol: HTTP/HTTPS
    - WebSocket: Enabled

  - **Route 2: Realtime Service**
    - Path: `/realtime/*`
    - Backend: Realtime Service
    - Session Affinity: Enabled
    - Protocol: HTTP/HTTPS
    - WebSocket: Enabled

  - **Route 3: API Gateway (default)**
    - Path: `/*`
    - Backend: API Gateway
    - Protocol: HTTPS only

- [ ] Configure WAF policy (Web Application Firewall)
- [ ] Enable DDoS protection
- [ ] Configure caching rules (exclude `/socket.io/*` and `/realtime/*`)

### 7. DNS Configuration
- [ ] Add CNAME record: `api.flamoral.com` → Front Door endpoint
- [ ] Verify DNS propagation:
  ```bash
  nslookup api.flamoral.com
  dig api.flamoral.com
  ```

### 8. SSL/TLS Configuration
- [ ] Upload SSL certificate to Azure Key Vault or Front Door
- [ ] Configure HTTPS binding in Front Door
- [ ] Enforce HTTPS redirect
- [ ] Set minimum TLS version to 1.2

## Post-Deployment Verification

### 9. Health Checks
- [ ] API Gateway health:
  ```bash
  curl https://api.flamoral.com/health
  # Expected: {"status":"healthy"}
  ```

- [ ] Realtime Service health:
  ```bash
  curl https://api.flamoral.com/realtime/health
  # Expected: {"status":"healthy"}
  ```

- [ ] Realtime Service readiness (Redis check):
  ```bash
  curl https://api.flamoral.com/realtime/ready
  # Expected: {"status":"ready"}
  ```

### 10. WebSocket Connectivity Tests
- [ ] Test Socket.IO connection:
  ```bash
  websocat wss://api.flamoral.com/socket.io/?EIO=4&transport=websocket \
    --header="Authorization: Bearer YOUR_JWT_TOKEN"
  ```

- [ ] Test from browser console:
  ```javascript
  const socket = io('https://api.flamoral.com', {
    auth: { token: 'YOUR_JWT_TOKEN' },
    path: '/socket.io',
  });

  socket.on('connect', () => console.log('✅ Connected'));
  socket.on('authenticated', (data) => console.log('✅ Authenticated:', data));
  socket.on('connect_error', (err) => console.error('❌ Error:', err));
  ```

- [ ] Test messaging flow:
  ```javascript
  // Join conversation
  socket.emit('join_conversation', { conversationId: 'test-123' });

  // Send message
  socket.emit('send_message', {
    conversationId: 'test-123',
    content: 'Hello!',
    type: 'text'
  });

  // Listen for messages
  socket.on('message:new', (msg) => console.log('New message:', msg));
  ```

### 11. Functional Tests
- [ ] Test user authentication via WebSocket
- [ ] Test message sending and receiving
- [ ] Test typing indicators
- [ ] Test presence updates (online/offline)
- [ ] Test read receipts
- [ ] Test conversation join/leave
- [ ] Test new match notifications
- [ ] Test video call signaling

### 12. Performance Tests
- [ ] Run load test with expected concurrent users:
  ```bash
  # Using k6
  k6 run backend/tests/performance/k6/scenarios/06-websocket-test.js
  ```

- [ ] Monitor metrics during load test:
  - WebSocket connection count
  - Message throughput
  - Redis latency
  - CPU/Memory usage

- [ ] Verify autoscaling works:
  ```bash
  kubectl get hpa -n flamoral
  kubectl top pods -n flamoral
  ```

### 13. Security Verification
- [ ] Verify CORS headers:
  ```bash
  curl -I -H "Origin: https://flamoral.com" https://api.flamoral.com/health
  # Check for Access-Control-Allow-Origin header
  ```

- [ ] Test authentication rejection:
  ```bash
  # Try connecting without token (should fail)
  websocat wss://api.flamoral.com/socket.io/?EIO=4&transport=websocket
  ```

- [ ] Verify CSP headers allow WebSocket:
  ```bash
  curl -I https://flamoral.com
  # Check Content-Security-Policy: connect-src includes wss://api.flamoral.com
  ```

- [ ] Test rate limiting:
  ```bash
  # Send rapid messages and verify rate limit triggers
  ```

### 14. Monitoring Setup
- [ ] Verify Prometheus is scraping metrics:
  ```bash
  curl https://api.flamoral.com/metrics
  curl https://api.flamoral.com/realtime/metrics
  ```

- [ ] Check Grafana dashboards:
  - [ ] WebSocket Connections Dashboard
  - [ ] Redis Pub/Sub Dashboard
  - [ ] Realtime Service Performance

- [ ] Configure alerts in Azure Monitor or Prometheus:
  - [ ] WebSocket connection failures > 5%
  - [ ] Redis connection issues
  - [ ] Message delivery failures
  - [ ] High latency (>1s)
  - [ ] Pod crashes or restarts

### 15. Logging Verification
- [ ] Check logs are being collected:
  ```bash
  kubectl logs -f deployment/api-gateway -n flamoral
  kubectl logs -f deployment/realtime-service -n flamoral
  ```

- [ ] Verify log aggregation (if using ELK/Loki):
  - [ ] Logs visible in Grafana/Kibana
  - [ ] Search functionality works
  - [ ] Log retention policy set

- [ ] Check for error patterns:
  ```bash
  kubectl logs deployment/realtime-service -n flamoral | grep -i "error"
  kubectl logs deployment/realtime-service -n flamoral | grep -i "failed"
  ```

## Application Deployment

### 16. Deploy Web App
- [ ] Update environment variables:
  ```env
  VITE_SOCKET_URL=https://api.flamoral.com
  VITE_WS_URL=wss://api.flamoral.com/ws
  VITE_REALTIME_URL=wss://api.flamoral.com/realtime/ws
  VITE_API_URL=https://api.flamoral.com/api/v1
  ```

- [ ] Build production bundle:
  ```bash
  cd apps/web-app
  npm run build
  ```

- [ ] Deploy to Azure Static Web Apps or CDN:
  ```bash
  # Using Azure CLI
  az staticwebapp create \
    --name flamoral-web \
    --resource-group flamoral-prod-rg \
    --location eastus
  ```

- [ ] Verify deployment:
  ```bash
  curl https://flamoral.com
  ```

### 17. Deploy Mobile App (if applicable)
- [ ] Update environment configuration
- [ ] Build app bundles
- [ ] Test on physical devices
- [ ] Submit to app stores (if ready)

## Final Verification

### 18. End-to-End Testing
- [ ] Test complete user flow:
  1. User logs in
  2. WebSocket connection established
  3. User sends message
  4. Recipient receives message in real-time
  5. Read receipt sent
  6. Typing indicators work
  7. Presence updates work
  8. Match notifications work

- [ ] Test on multiple devices/browsers:
  - [ ] Chrome (desktop)
  - [ ] Firefox (desktop)
  - [ ] Safari (desktop)
  - [ ] Chrome (mobile)
  - [ ] Safari (iOS)
  - [ ] Mobile app (if applicable)

- [ ] Test reconnection scenarios:
  - [ ] Network drop and reconnect
  - [ ] Server restart
  - [ ] Browser refresh
  - [ ] Background/foreground switching

### 19. Documentation
- [ ] Update API documentation
- [ ] Update README files
- [ ] Document any configuration changes
- [ ] Create runbook for operations team
- [ ] Update architecture diagrams

### 20. Rollback Plan
- [ ] Document rollback procedure:
  ```bash
  # Rollback API Gateway
  kubectl rollout undo deployment/api-gateway -n flamoral

  # Rollback Realtime Service
  kubectl rollout undo deployment/realtime-service -n flamoral

  # Verify rollback
  kubectl rollout status deployment/api-gateway -n flamoral
  kubectl rollout status deployment/realtime-service -n flamoral
  ```

- [ ] Test rollback in staging
- [ ] Document point of contact for emergencies

## Go-Live

### 21. Pre-Launch Checks (Day Before)
- [ ] Review all checklist items
- [ ] Verify backup procedures
- [ ] Confirm monitoring is active
- [ ] Brief team on deployment plan
- [ ] Schedule launch window

### 22. Launch (Day Of)
- [ ] Announce maintenance window (if needed)
- [ ] Execute deployment steps
- [ ] Monitor systems closely for 1 hour
- [ ] Verify key metrics:
  - [ ] WebSocket connections stable
  - [ ] Message delivery working
  - [ ] No critical errors in logs
  - [ ] Latency within acceptable range
  - [ ] CPU/Memory usage normal

### 23. Post-Launch (24 Hours)
- [ ] Continue monitoring for issues
- [ ] Review error logs
- [ ] Check user reports/support tickets
- [ ] Verify autoscaling behavior
- [ ] Review performance metrics

### 24. Post-Launch (1 Week)
- [ ] Analyze performance trends
- [ ] Optimize based on real usage patterns
- [ ] Address any minor issues
- [ ] Document lessons learned
- [ ] Plan for next iteration

## Troubleshooting Common Issues

### Connection Refused
1. Check pod status: `kubectl get pods -n flamoral`
2. Check service endpoints: `kubectl get endpoints -n flamoral`
3. Check Front Door backend health
4. Verify DNS resolution

### Authentication Failures
1. Verify JWT_SECRET matches across services
2. Check token expiration
3. Verify SERVICE_TOKEN for service-to-service calls
4. Check auth service logs

### Redis Connection Issues
1. Verify REDIS_TLS=true
2. Check Redis password
3. Verify firewall rules
4. Test connection from pod:
   ```bash
   kubectl exec -it POD_NAME -- wget -O- http://localhost:8081/ready
   ```

### Messages Not Delivering
1. Check Redis pub/sub is working
2. Verify users are in correct rooms
3. Check message service logs
4. Verify realtime service is publishing to Redis

### High Latency
1. Check Redis latency
2. Verify network between services
3. Check for CPU/memory constraints
4. Review message size and compression

## Support Contacts

- **DevOps Lead:** devops@flamoral.com
- **Backend Lead:** backend@flamoral.com
- **On-Call:** oncall@flamoral.com
- **Azure Support:** [Azure Portal]

## References

- Full Documentation: `/WEBSOCKET_FIX_SUMMARY.md`
- Quick Reference: `/WEBSOCKET_QUICK_REFERENCE.md`
- API Documentation: `/docs/api/WEBSOCKET_API.md`
- Deployment Runbook: `/infrastructure/DEPLOYMENT_RUNBOOK.md`

---

**Last Updated:** December 2024
**Version:** 1.0.0
**Status:** Ready for Deployment

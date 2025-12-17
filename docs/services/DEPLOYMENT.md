# Deployment Guide - Heartly Realtime Service

This guide covers deploying the Heartly Realtime Service to production environments.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Deployment Options](#deployment-options)
  - [Docker Deployment](#docker-deployment)
  - [Kubernetes Deployment](#kubernetes-deployment)
  - [AWS Deployment](#aws-deployment)
  - [Google Cloud Platform](#google-cloud-platform)
- [Configuration](#configuration)
- [Monitoring](#monitoring)
- [Scaling](#scaling)
- [Security](#security)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Docker 20.10+
- Redis 6.0+ (managed or self-hosted)
- Load balancer (for multi-instance deployments)
- SSL/TLS certificates
- Monitoring infrastructure (Prometheus, Grafana)

## Environment Setup

### 1. Environment Variables

Create a `.env` file with production values:

```bash
# Server
PORT=8081
ENVIRONMENT=production
LOG_LEVEL=info

# CORS - Restrict to your domains
ALLOWED_ORIGINS=https://app.heartly.com,https://www.heartly.com

# Redis - Use managed Redis service
REDIS_HOST=your-redis-instance.cloud.com
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-redis-password
REDIS_DB=0

# JWT - Use strong secret
JWT_SECRET=your-very-strong-secret-minimum-32-characters-long
JWT_ISSUER=heartly
JWT_EXPIRATION=15m

# WebSocket
WS_READ_BUFFER_SIZE=1024
WS_WRITE_BUFFER_SIZE=1024
WS_MAX_MESSAGE_SIZE=524288
WS_PONG_WAIT=60s
WS_PING_PERIOD=54s
WS_WRITE_WAIT=10s
WS_HANDSHAKE_TIMEOUT=10s

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=1m

# Presence
PRESENCE_TTL=5m
PRESENCE_HEARTBEAT=30s

# Typing
TYPING_TIMEOUT=5s
```

### 2. SSL/TLS Setup

The service should run behind a reverse proxy (nginx, Caddy, or load balancer) that handles SSL/TLS termination.

Example nginx configuration:

```nginx
upstream realtime {
    ip_hash;  # Sticky sessions for WebSocket
    server realtime1:8081;
    server realtime2:8081;
    server realtime3:8081;
}

server {
    listen 443 ssl http2;
    server_name realtime.heartly.com;

    ssl_certificate /etc/ssl/certs/heartly.crt;
    ssl_certificate_key /etc/ssl/private/heartly.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location /ws {
        proxy_pass http://realtime;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    location / {
        proxy_pass http://realtime;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Deployment Options

### Docker Deployment

#### Single Instance

```bash
# Build image
docker build -t heartly/realtime-service:latest .

# Run container
docker run -d \
  --name realtime-service \
  -p 8081:8081 \
  --env-file .env \
  --restart unless-stopped \
  heartly/realtime-service:latest
```

#### Docker Compose (Multi-Service)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f realtime-service

# Scale service
docker-compose up -d --scale realtime-service=3

# Stop services
docker-compose down
```

### Kubernetes Deployment

#### 1. Create ConfigMap

```yaml
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: realtime-config
  namespace: heartly
data:
  PORT: "8081"
  ENVIRONMENT: "production"
  LOG_LEVEL: "info"
  REDIS_HOST: "redis-service"
  REDIS_PORT: "6379"
```

#### 2. Create Secret

```bash
kubectl create secret generic realtime-secrets \
  --from-literal=JWT_SECRET='your-secret-key' \
  --from-literal=REDIS_PASSWORD='redis-password' \
  -n heartly
```

#### 3. Create Deployment

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: realtime-service
  namespace: heartly
spec:
  replicas: 3
  selector:
    matchLabels:
      app: realtime-service
  template:
    metadata:
      labels:
        app: realtime-service
    spec:
      containers:
      - name: realtime-service
        image: heartly/realtime-service:latest
        ports:
        - containerPort: 8081
        envFrom:
        - configMapRef:
            name: realtime-config
        - secretRef:
            name: realtime-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8081
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /ready
            port: 8081
          initialDelaySeconds: 5
          periodSeconds: 10
```

#### 4. Create Service

```yaml
# k8s/service.yaml
apiVersion: v1
kind: Service
metadata:
  name: realtime-service
  namespace: heartly
spec:
  type: LoadBalancer
  sessionAffinity: ClientIP  # Sticky sessions for WebSocket
  ports:
  - port: 80
    targetPort: 8081
    protocol: TCP
  selector:
    app: realtime-service
```

#### 5. Deploy

```bash
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

### AWS Deployment

#### Using ECS (Elastic Container Service)

1. **Push image to ECR**:
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com

docker tag heartly/realtime-service:latest YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/heartly/realtime-service:latest

docker push YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/heartly/realtime-service:latest
```

2. **Create task definition** (JSON):
```json
{
  "family": "heartly-realtime",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "containerDefinitions": [
    {
      "name": "realtime-service",
      "image": "YOUR_ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/heartly/realtime-service:latest",
      "portMappings": [
        {
          "containerPort": 8081,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {"name": "PORT", "value": "8081"},
        {"name": "ENVIRONMENT", "value": "production"},
        {"name": "REDIS_HOST", "value": "your-elasticache-endpoint"}
      ],
      "secrets": [
        {
          "name": "JWT_SECRET",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:ACCOUNT:secret:heartly/jwt-secret"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/heartly-realtime",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

3. **Use Application Load Balancer** with sticky sessions enabled

4. **Use ElastiCache** for Redis

### Google Cloud Platform

#### Using Cloud Run

```bash
# Build and push to GCR
gcloud builds submit --tag gcr.io/PROJECT_ID/realtime-service

# Deploy
gcloud run deploy realtime-service \
  --image gcr.io/PROJECT_ID/realtime-service \
  --platform managed \
  --region us-central1 \
  --set-env-vars "REDIS_HOST=your-memorystore-ip,ENVIRONMENT=production" \
  --set-secrets "JWT_SECRET=jwt-secret:latest" \
  --allow-unauthenticated \
  --session-affinity \
  --max-instances 10
```

## Configuration

### Redis

Use a managed Redis service for production:
- **AWS**: ElastiCache for Redis
- **GCP**: Memorystore for Redis
- **Azure**: Azure Cache for Redis
- **Redis Cloud**: redis.com

Configuration:
- Enable persistence (AOF or RDB)
- Use Redis Cluster for high availability
- Configure backup schedule
- Enable encryption at rest and in transit

### Load Balancer

Configure sticky sessions based on client IP or cookie:
- AWS ALB: Enable stickiness on target group
- GCP Load Balancer: Use session affinity
- Nginx: Use `ip_hash` directive

## Monitoring

### Prometheus Metrics

Configure Prometheus to scrape metrics:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'realtime-service'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_label_app]
        action: keep
        regex: realtime-service
    metrics_path: '/metrics'
    scrape_interval: 15s
```

### Grafana Dashboards

Import or create dashboards to monitor:
- Active WebSocket connections
- Message throughput (messages/sec)
- Error rates
- Latency (p50, p95, p99)
- Online users count
- Redis performance

### Alerts

Set up alerts for:
```yaml
groups:
- name: realtime_alerts
  rules:
  - alert: HighErrorRate
    expr: rate(realtime_errors_total[5m]) > 0.05
    for: 5m
    annotations:
      summary: "High error rate detected"

  - alert: HighConnectionCount
    expr: realtime_websocket_connections_total > 10000
    for: 5m
    annotations:
      summary: "High connection count"

  - alert: RedisDown
    expr: up{job="redis"} == 0
    for: 1m
    annotations:
      summary: "Redis is down"
```

## Scaling

### Horizontal Scaling

The service is designed for horizontal scaling:

1. **Add more instances**:
   - Kubernetes: `kubectl scale deployment realtime-service --replicas=5`
   - Docker: `docker-compose up -d --scale realtime-service=5`

2. **Configure load balancer** with sticky sessions

3. **Monitor Redis**: Ensure Redis can handle the increased load

### Vertical Scaling

Increase resources per instance:
- Memory: 512MB - 2GB per instance
- CPU: 1-2 cores per instance

### Auto-scaling

#### Kubernetes HPA

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: realtime-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: realtime-service
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Pods
    pods:
      metric:
        name: realtime_websocket_connections_total
      target:
        type: AverageValue
        averageValue: "5000"
```

## Security

### Best Practices

1. **JWT Secret**: Use strong, random secret (32+ characters)
2. **HTTPS Only**: Always use SSL/TLS in production
3. **CORS**: Restrict allowed origins to your domains
4. **Rate Limiting**: Implement rate limiting to prevent abuse
5. **Input Validation**: Validate all incoming messages
6. **Redis Security**: Use password, enable TLS
7. **Network Security**: Use VPC, security groups
8. **Secrets Management**: Use secrets manager (AWS Secrets Manager, GCP Secret Manager)

### Security Headers

Add security headers in reverse proxy:
```nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

## Troubleshooting

### WebSocket Connection Issues

1. **Check CORS settings**:
   ```bash
   curl -I https://realtime.heartly.com/ws
   ```

2. **Verify JWT token**:
   ```bash
   curl -H "Authorization: Bearer TOKEN" https://realtime.heartly.com/health
   ```

3. **Test WebSocket**:
   ```bash
   wscat -c "wss://realtime.heartly.com/ws?token=TOKEN"
   ```

### High Memory Usage

1. Check connection count:
   ```bash
   curl https://realtime.heartly.com/api/v1/online/count
   ```

2. Review logs for leaks:
   ```bash
   kubectl logs -f deployment/realtime-service
   ```

3. Adjust buffer sizes in config

### Redis Connection Issues

1. **Test Redis connectivity**:
   ```bash
   redis-cli -h HOST -p PORT -a PASSWORD ping
   ```

2. **Check Redis metrics**:
   - Connected clients
   - Memory usage
   - Command latency

### Performance Issues

1. **Check metrics**:
   - CPU usage
   - Memory usage
   - Network I/O
   - Message latency

2. **Optimize**:
   - Increase instances
   - Upgrade Redis
   - Tune buffer sizes
   - Enable compression

## Maintenance

### Updates

1. Build new version:
   ```bash
   docker build -t heartly/realtime-service:v1.1.0 .
   ```

2. Rolling update (Kubernetes):
   ```bash
   kubectl set image deployment/realtime-service realtime-service=heartly/realtime-service:v1.1.0
   ```

3. Monitor rollout:
   ```bash
   kubectl rollout status deployment/realtime-service
   ```

4. Rollback if needed:
   ```bash
   kubectl rollout undo deployment/realtime-service
   ```

### Backup and Recovery

1. **Redis backups**: Configure automatic backups
2. **Configuration backups**: Version control all configs
3. **Disaster recovery**: Document recovery procedures

## Support

For issues or questions:
- Check logs: `kubectl logs -f deployment/realtime-service`
- Review metrics in Grafana
- Contact DevOps team

# Flamoral Platform Operations Runbook

**Version:** 1.1.0
**Last Updated:** 2026-01-10
**Owner:** Platform Operations Team
**Classification:** Internal - Operations
**Infrastructure:** AWS ECS Fargate (27 microservices)

---

## Table of Contents

1. [Deployment Procedures](#1-deployment-procedures)
2. [Monitoring & Alerting](#2-monitoring--alerting)
3. [Incident Response](#3-incident-response)
4. [Database Operations](#4-database-operations)
5. [Scaling Operations](#5-scaling-operations)
6. [Security Operations](#6-security-operations)
7. [Disaster Recovery](#7-disaster-recovery)
8. [Appendix](#8-appendix)

---

## 1. Deployment Procedures

### 1.1 Automated Nightly Deployments

Flamoral uses automated nightly deployments triggered at **9 PM UTC** via AWS EventBridge and CodePipeline.

#### EventBridge Rule Configuration

```json
{
  "Name": "flamoral-nightly-deployment",
  "ScheduleExpression": "cron(0 21 * * ? *)",
  "State": "ENABLED",
  "Targets": [
    {
      "Id": "CodePipelineTrigger",
      "Arn": "arn:aws:codepipeline:us-east-1:ACCOUNT_ID:flamoral-production-pipeline",
      "RoleArn": "arn:aws:iam::ACCOUNT_ID:role/EventBridgeCodePipelineRole"
    }
  ]
}
```

#### Deployment Pipeline Stages

| Stage | Description | Duration | Auto-Approve |
|-------|-------------|----------|--------------|
| Source | Pull from main branch | ~1 min | Yes |
| Build | Build all microservices | ~8 min | Yes |
| Test | Run integration tests | ~12 min | Yes |
| Security Scan | Snyk + Trivy scanning | ~5 min | Yes |
| Staging Deploy | Deploy to staging ECS | ~10 min | Yes |
| Staging Tests | E2E smoke tests | ~15 min | Yes |
| Production Approval | Manual gate (weekdays only) | Variable | No |
| Production Deploy | Blue/green deployment | ~15 min | Yes |
| Health Check | Verify production health | ~5 min | Yes |

#### Monitoring Nightly Builds

```bash
# Check EventBridge rule status
aws events describe-rule --name flamoral-nightly-deployment

# View recent pipeline executions
aws codepipeline list-pipeline-executions \
  --pipeline-name flamoral-production-pipeline \
  --max-items 10

# Get detailed execution status
aws codepipeline get-pipeline-execution \
  --pipeline-name flamoral-production-pipeline \
  --pipeline-execution-id <EXECUTION_ID>
```

#### Disabling Automated Deployments

For maintenance windows or freeze periods:

```bash
# Disable nightly deployments
aws events disable-rule --name flamoral-nightly-deployment

# Re-enable after maintenance
aws events enable-rule --name flamoral-nightly-deployment

# Verify rule state
aws events describe-rule --name flamoral-nightly-deployment --query 'State'
```

### 1.2 Manual Deployment Steps

#### Prerequisites

- AWS CLI configured with appropriate IAM role
- Docker installed for image builds
- Access to ECR repositories
- Membership in the `platform-engineers` IAM group

#### Step-by-Step Manual Deployment

```bash
# 1. Set environment variables
export AWS_REGION=us-east-1
export CLUSTER_NAME=flamoral-prod-ecs
export AWS_ACCOUNT_ID=992382449461
export DEPLOYMENT_VERSION=$(date +%Y%m%d-%H%M%S)

# 2. Authenticate with ECR
aws ecr get-login-password --region $AWS_REGION | \
  docker login --username AWS --password-stdin \
  ${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com

# 3. Verify ECS cluster status
aws ecs describe-clusters --clusters $CLUSTER_NAME

# 4. List current services
aws ecs list-services --cluster $CLUSTER_NAME

# 5. Get current task definitions (for rollback reference)
aws ecs list-task-definitions --family-prefix flamoral-prod > backup-$DEPLOYMENT_VERSION.json

# 6. Build and push updated images
SERVICE_NAME="auth-service"
IMAGE_TAG=$(git rev-parse --short HEAD)
ECR_REPO="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/flamoral/${SERVICE_NAME}"

docker build -t ${ECR_REPO}:${IMAGE_TAG} ./backend/services/${SERVICE_NAME}
docker push ${ECR_REPO}:${IMAGE_TAG}

# 7. Update ECS service with new image
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service ${SERVICE_NAME} \
  --force-new-deployment

# 8. Wait for service to stabilize
aws ecs wait services-stable \
  --cluster $CLUSTER_NAME \
  --services ${SERVICE_NAME}

# 9. Verify deployment
aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services ${SERVICE_NAME} \
  --query 'services[0].deployments'
```

#### Post-Deployment Verification

```bash
# Check all ECS services are running
aws ecs list-services --cluster $CLUSTER_NAME --query 'serviceArns[]' --output table

# Verify service task counts
aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services auth-service user-service matching-service \
  --query 'services[*].[serviceName, runningCount, desiredCount]' \
  --output table

# Check target group health
aws elbv2 describe-target-health \
  --target-group-arn $(terraform output -raw target_group_arns | jq -r '.["auth-service"]')

# Run smoke tests
curl -s https://api.flamoral.com/health | jq .
curl -s https://api.flamoral.com/api/auth/health | jq .

# Verify metrics are flowing
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ClusterName,Value=$CLUSTER_NAME \
  --start-time $(date -u -d '5 minutes ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 60 \
  --statistics Average
```

### 1.3 Rollback Procedures

#### Automated Rollback (Preferred)

```bash
# Rollback to previous task definition
CLUSTER_NAME="flamoral-prod-ecs"
SERVICE_NAME="user-service"

# Get previous task definition
PREVIOUS_TASK_DEF=$(aws ecs describe-services \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME \
  --query 'services[0].deployments[1].taskDefinition' \
  --output text)

# Update service to use previous task definition
aws ecs update-service \
  --cluster $CLUSTER_NAME \
  --service $SERVICE_NAME \
  --task-definition $PREVIOUS_TASK_DEF

# Wait for rollback to complete
aws ecs wait services-stable \
  --cluster $CLUSTER_NAME \
  --services $SERVICE_NAME
```

#### Full Service Rollback

```bash
#!/bin/bash
# rollback-all-services.sh

CLUSTER_NAME="flamoral-prod-ecs"
SERVICES=(
  "user-service"
  "messaging-service"
  "matching-service"
  "notification-service"
  "payment-service"
  "analytics-service"
  "advertising-service"
)

echo "Starting full rollback at $(date)"

for service in "${SERVICES[@]}"; do
  echo "Rolling back $service..."

  # Get previous task definition
  PREVIOUS_TASK_DEF=$(aws ecs describe-services \
    --cluster $CLUSTER_NAME \
    --services $service \
    --query 'services[0].deployments[1].taskDefinition' \
    --output text)

  if [ "$PREVIOUS_TASK_DEF" == "None" ]; then
    echo "WARNING: No previous deployment found for $service, skipping"
    continue
  fi

  aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service $service \
    --task-definition $PREVIOUS_TASK_DEF

  aws ecs wait services-stable \
    --cluster $CLUSTER_NAME \
    --services $service

  if [ $? -ne 0 ]; then
    echo "ERROR: Rollback failed for $service"
    exit 1
  fi
done

echo "Full rollback completed at $(date)"
```

#### Database-Aware Rollback

When rollback involves database migrations:

```bash
# 1. Get a running task for the service
TASK_ARN=$(aws ecs list-tasks \
  --cluster flamoral-prod-ecs \
  --service-name user-service \
  --query 'taskArns[0]' \
  --output text)

# 2. Execute migration revert in the running container
aws ecs execute-command \
  --cluster flamoral-prod-ecs \
  --task $TASK_ARN \
  --container user-service \
  --interactive \
  --command "npx typeorm migration:revert"

# 3. After migration revert, rollback the deployment
PREVIOUS_TASK_DEF=$(aws ecs describe-services \
  --cluster flamoral-prod-ecs \
  --services user-service \
  --query 'services[0].deployments[1].taskDefinition' \
  --output text)

aws ecs update-service \
  --cluster flamoral-prod-ecs \
  --service user-service \
  --task-definition $PREVIOUS_TASK_DEF
```

#### Emergency Rollback via CodePipeline

```bash
# Find the last successful deployment
aws codepipeline list-pipeline-executions \
  --pipeline-name flamoral-production-pipeline \
  --query 'pipelineExecutionSummaries[?status==`Succeeded`].[pipelineExecutionId,startTime]' \
  --output table

# Trigger a re-deployment of a previous successful build
aws codepipeline start-pipeline-execution \
  --name flamoral-production-pipeline \
  --source-revisions \
    actionName=Source,revisionType=COMMIT_ID,revisionValue=<PREVIOUS_COMMIT_SHA>
```

### 1.4 Blue/Green Deployment Process

#### Architecture Overview

```
                    ┌─────────────────┐
                    │   Route 53      │
                    │   (DNS)         │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   ALB           │
                    │   (weighted)    │
                    └────────┬────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
     ┌────────▼────────┐         ┌─────────▼────────┐
     │   Blue (Live)   │         │   Green (New)    │
     │   Target Group  │         │   Target Group   │
     │   Weight: 100%  │         │   Weight: 0%     │
     └────────┬────────┘         └─────────┬────────┘
              │                             │
     ┌────────▼────────┐         ┌─────────▼────────┐
     │   ECS Service   │         │   ECS Service    │
     │   (blue)        │         │   (green)        │
     └─────────────────┘         └──────────────────┘
```

#### Blue/Green Deployment Steps

```bash
# 1. Create green ECS services (with different target groups)
export CLUSTER_NAME="flamoral-prod-ecs"
export GREEN_SUFFIX="-green"

# Deploy services to green target groups
for service in auth-service user-service matching-service; do
  aws ecs update-service \
    --cluster $CLUSTER_NAME \
    --service ${service}${GREEN_SUFFIX} \
    --force-new-deployment
done

# 2. Wait for green services to be healthy
aws ecs wait services-stable \
  --cluster $CLUSTER_NAME \
  --services auth-service-green user-service-green matching-service-green

# 3. Run smoke tests against green
GREEN_URL="https://green.api.flamoral.com"
./scripts/smoke-tests.sh $GREEN_URL

# 4. Gradually shift traffic (canary)
# Shift 10% to green
aws elbv2 modify-rule \
  --rule-arn $ALB_RULE_ARN \
  --actions '[
    {
      "Type": "forward",
      "ForwardConfig": {
        "TargetGroups": [
          {"TargetGroupArn": "'$BLUE_TG_ARN'", "Weight": 90},
          {"TargetGroupArn": "'$GREEN_TG_ARN'", "Weight": 10}
        ]
      }
    }
  ]'

# 5. Monitor error rates for 5 minutes
./scripts/monitor-error-rates.sh --duration 300 --threshold 0.1

# 6. Shift 50% to green
aws elbv2 modify-rule \
  --rule-arn $ALB_RULE_ARN \
  --actions '[
    {
      "Type": "forward",
      "ForwardConfig": {
        "TargetGroups": [
          {"TargetGroupArn": "'$BLUE_TG_ARN'", "Weight": 50},
          {"TargetGroupArn": "'$GREEN_TG_ARN'", "Weight": 50}
        ]
      }
    }
  ]'

# 7. Monitor for another 5 minutes
./scripts/monitor-error-rates.sh --duration 300 --threshold 0.1

# 8. Complete cutover to green (100%)
aws elbv2 modify-rule \
  --rule-arn $ALB_RULE_ARN \
  --actions '[
    {
      "Type": "forward",
      "ForwardConfig": {
        "TargetGroups": [
          {"TargetGroupArn": "'$BLUE_TG_ARN'", "Weight": 0},
          {"TargetGroupArn": "'$GREEN_TG_ARN'", "Weight": 100}
        ]
      }
    }
  ]'

# 9. Keep blue environment for 1 hour (quick rollback capability)
# 10. Tear down blue after successful deployment
kubectl delete namespace flamoral-prod-blue
```

#### Blue/Green Rollback

```bash
# Immediate rollback - shift all traffic back to blue
aws elbv2 modify-rule \
  --rule-arn $ALB_RULE_ARN \
  --actions '[
    {
      "Type": "forward",
      "ForwardConfig": {
        "TargetGroups": [
          {"TargetGroupArn": "'$BLUE_TG_ARN'", "Weight": 100},
          {"TargetGroupArn": "'$GREEN_TG_ARN'", "Weight": 0}
        ]
      }
    }
  ]'

# Verify traffic is going to blue
curl -s https://api.flamoral.com/health | jq '.deploymentColor'
```

---

## 2. Monitoring & Alerting

### 2.1 CloudWatch Dashboard URLs

| Dashboard | URL | Purpose |
|-----------|-----|---------|
| Executive Overview | `https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=Flamoral-Executive` | High-level KPIs |
| API Performance | `https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=Flamoral-API-Performance` | Latency, throughput, errors |
| Infrastructure | `https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=Flamoral-Infrastructure` | ECS Fargate, RDS, ElastiCache |
| Security | `https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=Flamoral-Security` | GuardDuty, WAF, failed logins |
| Business Metrics | `https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=Flamoral-Business` | Signups, matches, revenue |
| Database | `https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=Flamoral-Database` | RDS Aurora metrics |
| Container Insights | `https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#container-insights:` | ECS service and task metrics |

### 2.2 Key Metrics to Monitor

#### Application Metrics

| Metric | Namespace | Warning | Critical | Description |
|--------|-----------|---------|----------|-------------|
| API Latency P99 | Flamoral/API | > 500ms | > 1000ms | 99th percentile response time |
| API Latency P50 | Flamoral/API | > 100ms | > 250ms | Median response time |
| Error Rate | Flamoral/API | > 1% | > 5% | HTTP 5xx / Total requests |
| Request Count | Flamoral/API | N/A | < 100/min | Total API requests |
| Active WebSocket Connections | Flamoral/Messaging | > 50,000 | > 75,000 | Live connections |
| Message Queue Depth | Flamoral/Messaging | > 1,000 | > 10,000 | Unprocessed messages |

#### Infrastructure Metrics

| Metric | Namespace | Warning | Critical | Description |
|--------|-----------|---------|----------|-------------|
| CPU Utilization | AWS/ECS | > 70% | > 85% | Task CPU usage |
| Memory Utilization | AWS/ECS | > 75% | > 90% | Task memory usage |
| Task Count | AWS/ECS | < desired | 0 | Running task count |
| Service Health | AWS/ECS | < 100% | < 50% | Healthy task percentage |
| Target Response Time | AWS/ApplicationELB | > 500ms | > 1000ms | ALB target latency |

#### Database Metrics

| Metric | Namespace | Warning | Critical | Description |
|--------|-----------|---------|----------|-------------|
| CPU Utilization | AWS/RDS | > 70% | > 85% | Aurora CPU |
| FreeableMemory | AWS/RDS | < 2GB | < 1GB | Available RAM |
| DatabaseConnections | AWS/RDS | > 80% max | > 95% max | Active connections |
| ReadLatency | AWS/RDS | > 10ms | > 50ms | Read operation latency |
| WriteLatency | AWS/RDS | > 20ms | > 100ms | Write operation latency |
| ReplicationLag | AWS/RDS | > 100ms | > 1000ms | Replica lag |
| FreeStorageSpace | AWS/RDS | < 50GB | < 20GB | Available storage |

#### Cache Metrics

| Metric | Namespace | Warning | Critical | Description |
|--------|-----------|---------|----------|-------------|
| CacheHitRate | AWS/ElastiCache | < 90% | < 80% | Cache effectiveness |
| CPUUtilization | AWS/ElastiCache | > 70% | > 85% | Redis CPU |
| NetworkBytesIn | AWS/ElastiCache | > 80% limit | > 95% limit | Network ingress |
| Evictions | AWS/ElastiCache | > 100/min | > 1000/min | Key evictions |
| CurrConnections | AWS/ElastiCache | > 5,000 | > 8,000 | Active connections |

### 2.3 Alert Configuration

#### CloudWatch Alarm Examples

```bash
# Create P99 latency alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "Flamoral-API-P99-Latency-Critical" \
  --alarm-description "API P99 latency exceeds 1 second" \
  --metric-name "Latency" \
  --namespace "Flamoral/API" \
  --statistic "p99" \
  --period 60 \
  --threshold 1000 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 3 \
  --alarm-actions "arn:aws:sns:us-east-1:ACCOUNT_ID:flamoral-critical-alerts" \
  --dimensions Name=Environment,Value=production

# Create error rate alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "Flamoral-API-Error-Rate-Critical" \
  --alarm-description "API error rate exceeds 5%" \
  --metric-name "5XXError" \
  --namespace "Flamoral/API" \
  --statistic "Average" \
  --period 60 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2 \
  --alarm-actions "arn:aws:sns:us-east-1:ACCOUNT_ID:flamoral-critical-alerts"
```

### 2.4 Alert Severity Levels and Response Times

| Severity | Response Time | Examples | Notification Channel |
|----------|---------------|----------|---------------------|
| SEV1 - Critical | 15 minutes | Complete outage, data breach, payment failures | PagerDuty + Phone + Slack #incidents |
| SEV2 - High | 30 minutes | Degraded performance, partial outage, failed deployments | PagerDuty + Slack #incidents |
| SEV3 - Medium | 2 hours | Non-critical service degradation, elevated errors | Slack #alerts |
| SEV4 - Low | Next business day | Minor issues, cosmetic bugs, non-urgent maintenance | Email + Jira |

### 2.5 GuardDuty and Security Hub Findings

#### GuardDuty Severity Mapping

```bash
# List high-severity GuardDuty findings
aws guardduty list-findings \
  --detector-id $DETECTOR_ID \
  --finding-criteria '{
    "Criterion": {
      "severity": {"Gte": 7}
    }
  }'

# Get finding details
aws guardduty get-findings \
  --detector-id $DETECTOR_ID \
  --finding-ids $FINDING_ID
```

#### Security Hub Integration

```bash
# Get critical findings from Security Hub
aws securityhub get-findings \
  --filters '{
    "SeverityLabel": [{"Value": "CRITICAL", "Comparison": "EQUALS"}],
    "WorkflowStatus": [{"Value": "NEW", "Comparison": "EQUALS"}]
  }'

# Update finding workflow status
aws securityhub batch-update-findings \
  --finding-identifiers '[{"Id": "FINDING_ID", "ProductArn": "PRODUCT_ARN"}]' \
  --workflow '{"Status": "NOTIFIED"}'
```

#### Security Alert Response Matrix

| Finding Type | Severity | Response | Escalation |
|--------------|----------|----------|------------|
| UnauthorizedAccess:IAMUser/ConsoleLogin | HIGH | Investigate IP, disable if suspicious | Security Team Lead |
| Recon:EC2/PortProbeUnprotectedPort | MEDIUM | Review security groups | DevOps |
| CryptoCurrency:EC2/BitcoinTool.B | HIGH | Isolate instance immediately | Security + Management |
| Trojan:EC2/DNSDataExfiltration | CRITICAL | Isolate, forensic snapshot | Security + Legal |
| Policy:S3/BucketAnonymousAccessGranted | HIGH | Revoke public access immediately | Security Team |

---

## 3. Incident Response

### 3.1 Severity Definitions

#### P1 - Critical (SEV1)

**Definition:** Complete service outage affecting all users, data breach, or financial system failure.

**Examples:**
- Complete API unavailability
- Database corruption or total failure
- Security breach with data exfiltration
- Payment processing completely down
- All users unable to login

**Response Requirements:**
- Immediate page to on-call engineer
- War room established within 15 minutes
- Executive notification within 30 minutes
- Status page updated within 15 minutes
- Continuous updates every 30 minutes

#### P2 - High (SEV2)

**Definition:** Major functionality impaired affecting a significant portion of users.

**Examples:**
- Matching algorithm completely failing
- Messaging delayed by more than 5 minutes
- Mobile app crashes on launch for specific OS versions
- Payment failures for specific payment methods
- 50%+ increase in error rates

**Response Requirements:**
- Page on-call engineer
- Response within 30 minutes
- Status page updated within 30 minutes
- Updates every hour until resolved

#### P3 - Medium (SEV3)

**Definition:** Partial functionality degradation with workarounds available.

**Examples:**
- Photo upload failures
- Push notification delays
- Non-critical feature unavailable
- Elevated latency (2-3x normal)
- Minor data inconsistencies

**Response Requirements:**
- Slack notification to #alerts
- Response within 2 hours
- Track in incident management system
- Resolution within 8 business hours

#### P4 - Low (SEV4)

**Definition:** Minor issues with minimal user impact.

**Examples:**
- UI cosmetic issues
- Non-critical dashboard errors
- Minor logging gaps
- Documentation errors
- Performance within acceptable but non-optimal range

**Response Requirements:**
- Email notification
- Create Jira ticket
- Resolution within 5 business days
- Can be batched with regular maintenance

### 3.2 Escalation Matrix

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        ESCALATION MATRIX                                │
├─────────────┬──────────────┬───────────────┬───────────────────────────┤
│   Level     │  Time Limit  │  Escalate To  │  Contact Method           │
├─────────────┼──────────────┼───────────────┼───────────────────────────┤
│ L1 On-Call  │  15 min P1   │  L2 Lead      │  PagerDuty                │
│             │  30 min P2   │               │                           │
├─────────────┼──────────────┼───────────────┼───────────────────────────┤
│ L2 Lead     │  30 min P1   │  Engineering  │  PagerDuty + Phone        │
│             │  1 hour P2   │  Manager      │                           │
├─────────────┼──────────────┼───────────────┼───────────────────────────┤
│ Engineering │  1 hour P1   │  VP Eng       │  Phone + SMS              │
│ Manager     │  2 hours P2  │               │                           │
├─────────────┼──────────────┼───────────────┼───────────────────────────┤
│ VP Eng      │  2 hours P1  │  CTO          │  Phone                    │
├─────────────┼──────────────┼───────────────┼───────────────────────────┤
│ CTO         │  4 hours P1  │  CEO          │  Phone                    │
└─────────────┴──────────────┴───────────────┴───────────────────────────┘
```

#### On-Call Rotation

```yaml
# PagerDuty Schedule
primary_on_call:
  rotation: weekly
  handoff: Monday 9:00 AM UTC
  team: platform-engineering

secondary_on_call:
  rotation: weekly
  handoff: Monday 9:00 AM UTC
  team: platform-engineering

escalation_policy:
  - level: 1
    targets: [primary_on_call]
    timeout: 15min
  - level: 2
    targets: [secondary_on_call, engineering_manager]
    timeout: 15min
  - level: 3
    targets: [vp_engineering]
    timeout: 30min
```

### 3.3 Communication Templates

#### Initial Incident Notification (Internal)

```markdown
## INCIDENT DECLARED - [SEVERITY] - [TITLE]

**Incident ID:** INC-[YYYYMMDD]-[###]
**Severity:** [P1/P2/P3/P4]
**Status:** INVESTIGATING
**Incident Commander:** [Name]
**Start Time:** [UTC Timestamp]

### Impact
[Brief description of user impact]

### Affected Systems
- [System 1]
- [System 2]

### Current Actions
- [Action being taken]

### War Room
- Slack: #incident-[ID]
- Zoom: [Link]

Next update in [X] minutes.
```

#### Customer-Facing Status Page Update

```markdown
## [Service Name] - Investigating Issues

**Posted:** [Timestamp]

We are currently investigating issues affecting [brief description].
Some users may experience [specific symptoms].

Our team is actively working to resolve this issue. We will provide
updates as we learn more.

We apologize for any inconvenience this may cause.
```

#### Incident Resolution Notification

```markdown
## INCIDENT RESOLVED - [SEVERITY] - [TITLE]

**Incident ID:** INC-[YYYYMMDD]-[###]
**Duration:** [X hours Y minutes]
**Resolved:** [UTC Timestamp]

### Summary
[Brief description of what happened]

### Root Cause
[Initial root cause assessment]

### Resolution
[How the issue was resolved]

### User Impact
- Users affected: ~[Number]
- Duration of impact: [Time]
- Data loss: [Yes/No - details if yes]

### Follow-up Actions
- [ ] Post-incident review scheduled for [Date]
- [ ] [Any immediate follow-up items]

Full post-incident review will be published within 72 hours.
```

### 3.4 Post-Incident Review Process

#### Timeline

| Day | Activity |
|-----|----------|
| Day 0 | Incident occurs and is resolved |
| Day 1-2 | Collect logs, metrics, and timeline data |
| Day 3 | Post-incident review meeting |
| Day 5 | PIR document completed and published |
| Day 5-14 | Remediation items tracked to completion |

#### Post-Incident Review Template

```markdown
# Post-Incident Review: INC-[ID]

## Incident Summary
- **Date:** [Date]
- **Duration:** [Duration]
- **Severity:** [P1/P2/P3/P4]
- **Services Affected:** [List]
- **Customers Affected:** [Number/Percentage]

## Timeline (UTC)
| Time | Event |
|------|-------|
| HH:MM | [Event description] |

## Root Cause Analysis
### What happened?
[Detailed technical explanation]

### Why did it happen?
[5 Whys or similar analysis]

### Contributing Factors
- [Factor 1]
- [Factor 2]

## Impact Assessment
- **User Impact:** [Description]
- **Revenue Impact:** [If applicable]
- **Reputation Impact:** [If applicable]

## What Went Well
- [Positive aspect 1]
- [Positive aspect 2]

## What Could Be Improved
- [Improvement area 1]
- [Improvement area 2]

## Action Items
| ID | Action | Owner | Due Date | Priority |
|----|--------|-------|----------|----------|
| 1 | [Action] | [Owner] | [Date] | [P1/P2/P3] |

## Lessons Learned
[Key takeaways for the team]

## Appendix
- [Links to relevant logs, graphs, etc.]
```

---

## 4. Database Operations

### 4.1 RDS Aurora Maintenance Windows

#### Scheduled Maintenance Windows

| Environment | Window (UTC) | Day |
|-------------|--------------|-----|
| Production | 04:00 - 06:00 | Sunday |
| Staging | 02:00 - 04:00 | Saturday |
| Development | 00:00 - 02:00 | Saturday |

#### Modifying Maintenance Window

```bash
# Update maintenance window
aws rds modify-db-cluster \
  --db-cluster-identifier flamoral-production-cluster \
  --preferred-maintenance-window "sun:04:00-sun:06:00" \
  --apply-immediately

# Check pending maintenance actions
aws rds describe-pending-maintenance-actions \
  --resource-identifier arn:aws:rds:us-east-1:ACCOUNT_ID:cluster:flamoral-production-cluster
```

#### Pre-Maintenance Checklist

```bash
# 1. Verify current cluster status
aws rds describe-db-clusters \
  --db-cluster-identifier flamoral-production-cluster \
  --query 'DBClusters[0].Status'

# 2. Check for pending modifications
aws rds describe-db-clusters \
  --db-cluster-identifier flamoral-production-cluster \
  --query 'DBClusters[0].PendingModifiedValues'

# 3. Verify backup status
aws rds describe-db-cluster-snapshots \
  --db-cluster-identifier flamoral-production-cluster \
  --snapshot-type automated \
  --query 'DBClusterSnapshots | sort_by(@, &SnapshotCreateTime) | [-1]'

# 4. Check replica lag
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name AuroraReplicaLag \
  --dimensions Name=DBClusterIdentifier,Value=flamoral-production-cluster \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%SZ) \
  --period 300 \
  --statistics Maximum
```

### 4.2 Backup Verification

#### Automated Backup Configuration

```bash
# Verify backup retention
aws rds describe-db-clusters \
  --db-cluster-identifier flamoral-production-cluster \
  --query 'DBClusters[0].BackupRetentionPeriod'
# Expected: 35 days

# List recent automated backups
aws rds describe-db-cluster-snapshots \
  --db-cluster-identifier flamoral-production-cluster \
  --snapshot-type automated \
  --query 'DBClusterSnapshots[*].[DBClusterSnapshotIdentifier,SnapshotCreateTime,Status]' \
  --output table
```

#### Manual Backup Creation

```bash
# Create manual snapshot before major changes
SNAPSHOT_ID="flamoral-manual-$(date +%Y%m%d-%H%M%S)"

aws rds create-db-cluster-snapshot \
  --db-cluster-identifier flamoral-production-cluster \
  --db-cluster-snapshot-identifier $SNAPSHOT_ID \
  --tags Key=Purpose,Value=PreDeploymentBackup Key=CreatedBy,Value=Operations

# Monitor snapshot progress
aws rds describe-db-cluster-snapshots \
  --db-cluster-snapshot-identifier $SNAPSHOT_ID \
  --query 'DBClusterSnapshots[0].[Status,PercentProgress]'
```

#### Backup Restoration Test (Monthly)

```bash
#!/bin/bash
# monthly-backup-verification.sh

TEST_CLUSTER="flamoral-backup-test-$(date +%Y%m%d)"
LATEST_SNAPSHOT=$(aws rds describe-db-cluster-snapshots \
  --db-cluster-identifier flamoral-production-cluster \
  --snapshot-type automated \
  --query 'DBClusterSnapshots | sort_by(@, &SnapshotCreateTime) | [-1].DBClusterSnapshotIdentifier' \
  --output text)

echo "Testing restore from snapshot: $LATEST_SNAPSHOT"

# Restore to test cluster
aws rds restore-db-cluster-from-snapshot \
  --db-cluster-identifier $TEST_CLUSTER \
  --snapshot-identifier $LATEST_SNAPSHOT \
  --engine aurora-postgresql \
  --vpc-security-group-ids sg-xxxxxxxx \
  --db-subnet-group-name flamoral-db-subnet-group

# Wait for cluster to be available
aws rds wait db-cluster-available \
  --db-cluster-identifier $TEST_CLUSTER

# Create instance in the cluster
aws rds create-db-instance \
  --db-instance-identifier "${TEST_CLUSTER}-instance" \
  --db-cluster-identifier $TEST_CLUSTER \
  --db-instance-class db.r6g.large \
  --engine aurora-postgresql

# Wait for instance
aws rds wait db-instance-available \
  --db-instance-identifier "${TEST_CLUSTER}-instance"

# Run verification queries
ENDPOINT=$(aws rds describe-db-clusters \
  --db-cluster-identifier $TEST_CLUSTER \
  --query 'DBClusters[0].Endpoint' \
  --output text)

# Verify data integrity
psql -h $ENDPOINT -U admin -d flamoral -c "
  SELECT COUNT(*) as user_count FROM users;
  SELECT COUNT(*) as match_count FROM matches;
  SELECT MAX(created_at) as latest_record FROM users;
"

# Cleanup test cluster
aws rds delete-db-instance \
  --db-instance-identifier "${TEST_CLUSTER}-instance" \
  --skip-final-snapshot

aws rds delete-db-cluster \
  --db-cluster-identifier $TEST_CLUSTER \
  --skip-final-snapshot

echo "Backup verification completed successfully"
```

### 4.3 Point-in-Time Recovery

#### PITR Availability

```bash
# Check earliest and latest restorable times
aws rds describe-db-clusters \
  --db-cluster-identifier flamoral-production-cluster \
  --query 'DBClusters[0].[EarliestRestorableTime,LatestRestorableTime]'
```

#### Performing Point-in-Time Recovery

```bash
#!/bin/bash
# pitr-recovery.sh

RESTORE_TIME="2026-01-04T15:30:00Z"  # Target restore point
RECOVERY_CLUSTER="flamoral-pitr-recovery-$(date +%Y%m%d-%H%M%S)"

echo "Starting PITR to: $RESTORE_TIME"

# Restore to new cluster
aws rds restore-db-cluster-to-point-in-time \
  --source-db-cluster-identifier flamoral-production-cluster \
  --db-cluster-identifier $RECOVERY_CLUSTER \
  --restore-to-time $RESTORE_TIME \
  --vpc-security-group-ids sg-xxxxxxxx \
  --db-subnet-group-name flamoral-db-subnet-group \
  --tags Key=Purpose,Value=PITRRecovery

# Wait for cluster
echo "Waiting for cluster to be available..."
aws rds wait db-cluster-available \
  --db-cluster-identifier $RECOVERY_CLUSTER

# Create writer instance
aws rds create-db-instance \
  --db-instance-identifier "${RECOVERY_CLUSTER}-writer" \
  --db-cluster-identifier $RECOVERY_CLUSTER \
  --db-instance-class db.r6g.xlarge \
  --engine aurora-postgresql

aws rds wait db-instance-available \
  --db-instance-identifier "${RECOVERY_CLUSTER}-writer"

echo "PITR cluster ready: $RECOVERY_CLUSTER"
echo "Endpoint: $(aws rds describe-db-clusters \
  --db-cluster-identifier $RECOVERY_CLUSTER \
  --query 'DBClusters[0].Endpoint' --output text)"
```

### 4.4 Failover Procedures

#### Planned Failover

```bash
# Trigger planned failover to replica
aws rds failover-db-cluster \
  --db-cluster-identifier flamoral-production-cluster

# Monitor failover progress
watch -n 5 "aws rds describe-db-clusters \
  --db-cluster-identifier flamoral-production-cluster \
  --query 'DBClusters[0].[Status,DBClusterMembers[*].[DBInstanceIdentifier,IsClusterWriter]]'"
```

#### Emergency Failover

```bash
#!/bin/bash
# emergency-failover.sh

CLUSTER_ID="flamoral-production-cluster"

echo "=== EMERGENCY FAILOVER INITIATED ==="
echo "Time: $(date -u)"

# Get current writer
CURRENT_WRITER=$(aws rds describe-db-clusters \
  --db-cluster-identifier $CLUSTER_ID \
  --query 'DBClusters[0].DBClusterMembers[?IsClusterWriter==`true`].DBInstanceIdentifier' \
  --output text)

echo "Current writer: $CURRENT_WRITER"

# Trigger failover
aws rds failover-db-cluster \
  --db-cluster-identifier $CLUSTER_ID

# Wait for failover completion
echo "Waiting for failover to complete..."
sleep 30

# Verify new writer
NEW_WRITER=$(aws rds describe-db-clusters \
  --db-cluster-identifier $CLUSTER_ID \
  --query 'DBClusters[0].DBClusterMembers[?IsClusterWriter==`true`].DBInstanceIdentifier' \
  --output text)

echo "New writer: $NEW_WRITER"

if [ "$CURRENT_WRITER" != "$NEW_WRITER" ]; then
  echo "Failover successful!"
else
  echo "WARNING: Writer may not have changed. Verify cluster status."
fi

# Check cluster status
aws rds describe-db-clusters \
  --db-cluster-identifier $CLUSTER_ID \
  --query 'DBClusters[0].Status'
```

---

## 5. Scaling Operations

### 5.1 ECS Service Scaling

#### Current Service Configuration

| Service | CPU | Memory | Min Tasks | Max Tasks | Purpose |
|---------|-----|--------|-----------|-----------|---------|
| api-gateway | 256 | 512 MB | 2 | 20 | Request routing |
| auth-service | 256 | 512 MB | 2 | 10 | Authentication |
| matching-service | 512 | 1024 MB | 2 | 15 | AI matching |
| messaging-service | 256 | 512 MB | 2 | 20 | Real-time chat |
| media-service | 512 | 1024 MB | 2 | 10 | Media processing |

#### Manual Service Scaling

```bash
# Scale ECS service
aws ecs update-service \
  --cluster flamoral-prod-ecs \
  --service auth-service \
  --desired-count 10

# Monitor scaling progress
aws ecs describe-services \
  --cluster flamoral-prod-ecs \
  --services auth-service \
  --query 'services[0].[runningCount,desiredCount,pendingCount]'

# Wait for scaling to complete
aws ecs wait services-stable \
  --cluster flamoral-prod-ecs \
  --services auth-service
```

#### Application Auto Scaling Configuration

```bash
# Register scalable target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/flamoral-prod-ecs/auth-service \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 20

# Create scaling policy (target tracking)
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/flamoral-prod-ecs/auth-service \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name auth-service-cpu-scaling \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration '{
    "TargetValue": 70.0,
    "PredefinedMetricSpecification": {
      "PredefinedMetricType": "ECSServiceAverageCPUUtilization"
    },
    "ScaleOutCooldown": 60,
    "ScaleInCooldown": 300
  }'
```

### 5.2 Auto Scaling Policies

#### Current Auto Scaling Policies

| Service | Metric | Target | Scale Out | Scale In |
|---------|--------|--------|-----------|----------|
| api-gateway | CPU | 70% | 60s cooldown | 300s cooldown |
| matching-service | CPU | 70% | 60s cooldown | 300s cooldown |
| messaging-service | CPU | 60% | 60s cooldown | 300s cooldown |
| media-service | CPU | 70% | 60s cooldown | 300s cooldown |

#### Auto Scaling Management Commands

```bash
# List scaling policies
aws application-autoscaling describe-scaling-policies \
  --service-namespace ecs \
  --resource-id service/flamoral-prod-ecs/auth-service

# View scaling activities
aws application-autoscaling describe-scaling-activities \
  --service-namespace ecs \
  --resource-id service/flamoral-prod-ecs/auth-service \
  --max-results 10

# Manually override auto scaling temporarily (emergency)
aws ecs update-service \
  --cluster flamoral-prod-ecs \
  --service auth-service \
  --desired-count 20

# Suspend auto scaling (for maintenance)
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/flamoral-prod-ecs/auth-service \
  --scalable-dimension ecs:service:DesiredCount \
  --suspended-state '{"DynamicScalingInSuspended":true,"DynamicScalingOutSuspended":true}'
```

### 5.3 Cache Warming Procedures

#### ElastiCache Warming Script

```bash
#!/bin/bash
# cache-warming.sh

REDIS_ENDPOINT="flamoral-prod-cache.xxxxx.cache.amazonaws.com"
REDIS_PORT=6379

echo "Starting cache warming at $(date)"

# 1. Warm user profile cache
echo "Warming user profile cache..."
psql -h $DB_ENDPOINT -U $DB_USER -d flamoral -c "
  SELECT id, email, profile_data FROM users
  WHERE last_active > NOW() - INTERVAL '7 days'
  LIMIT 100000
" | while read line; do
  USER_ID=$(echo $line | cut -d'|' -f1)
  DATA=$(echo $line | cut -d'|' -f3)
  redis-cli -h $REDIS_ENDPOINT -p $REDIS_PORT SET "user:profile:$USER_ID" "$DATA" EX 3600
done

# 2. Warm matching preferences cache
echo "Warming matching preferences cache..."
psql -h $DB_ENDPOINT -U $DB_USER -d flamoral -c "
  SELECT user_id, preferences FROM user_preferences
  WHERE updated_at > NOW() - INTERVAL '30 days'
" | while read line; do
  USER_ID=$(echo $line | cut -d'|' -f1)
  PREFS=$(echo $line | cut -d'|' -f2)
  redis-cli -h $REDIS_ENDPOINT -p $REDIS_PORT SET "user:prefs:$USER_ID" "$PREFS" EX 7200
done

# 3. Warm popular content cache
echo "Warming popular content cache..."
redis-cli -h $REDIS_ENDPOINT -p $REDIS_PORT EVAL "
  -- Warm frequently accessed content
  local content = redis.call('GET', 'popular:prompts')
  if not content then
    -- Load from database via application
    redis.call('PUBLISH', 'cache:warm', 'popular_prompts')
  end
" 0

# 4. Verify cache stats
echo "Cache warming stats:"
redis-cli -h $REDIS_ENDPOINT -p $REDIS_PORT INFO memory | grep used_memory_human
redis-cli -h $REDIS_ENDPOINT -p $REDIS_PORT INFO stats | grep keyspace

echo "Cache warming completed at $(date)"
```

#### Pre-Scale Cache Warming

```bash
# Run before expected traffic surge (e.g., marketing campaign)
./scripts/cache-warming.sh

# Verify cache hit rate
redis-cli -h $REDIS_ENDPOINT -p $REDIS_PORT INFO stats | grep -E "keyspace_hits|keyspace_misses"
```

---

## 6. Security Operations

### 6.1 Credential Rotation Schedules

#### Rotation Schedule

| Credential Type | Rotation Frequency | Method | Owner |
|-----------------|-------------------|--------|-------|
| Database passwords | 90 days | AWS Secrets Manager | Platform |
| API keys | 90 days | AWS Secrets Manager | Platform |
| JWT signing keys | 180 days | Manual + deployment | Security |
| SSL/TLS certificates | Annual | ACM auto-renewal | Platform |
| IAM access keys | 90 days | IAM rotation | Security |
| Service account tokens | 30 days | Kubernetes | Platform |
| OAuth client secrets | 180 days | Manual | Security |

#### Automated Rotation with Secrets Manager

```bash
# Enable rotation for database credentials
aws secretsmanager rotate-secret \
  --secret-id flamoral/production/database \
  --rotation-lambda-arn arn:aws:lambda:us-east-1:ACCOUNT_ID:function:SecretsManagerRotation \
  --rotation-rules AutomaticallyAfterDays=90

# Manually trigger rotation
aws secretsmanager rotate-secret \
  --secret-id flamoral/production/database

# Check rotation status
aws secretsmanager describe-secret \
  --secret-id flamoral/production/database \
  --query '[RotationEnabled,LastRotatedDate,NextRotationDate]'
```

#### JWT Key Rotation Procedure

```bash
#!/bin/bash
# rotate-jwt-keys.sh

echo "JWT Key Rotation - $(date)"

# 1. Generate new key pair
openssl genrsa -out new-jwt-private.pem 4096
openssl rsa -in new-jwt-private.pem -pubout -out new-jwt-public.pem

# 2. Store new keys in Secrets Manager
aws secretsmanager put-secret-value \
  --secret-id flamoral/production/jwt-private-key \
  --secret-string file://new-jwt-private.pem \
  --version-stages AWSPENDING

aws secretsmanager put-secret-value \
  --secret-id flamoral/production/jwt-public-key \
  --secret-string file://new-jwt-public.pem \
  --version-stages AWSPENDING

# 3. Deploy with dual-key support (accept both old and new)
kubectl set env deployment/user-service -n flamoral-prod \
  JWT_PUBLIC_KEY_V2="$(cat new-jwt-public.pem | base64)"

# 4. Wait for all tokens to refresh (max token lifetime)
echo "Waiting 24 hours for token refresh..."
sleep 86400

# 5. Make new key the primary
aws secretsmanager update-secret-version-stage \
  --secret-id flamoral/production/jwt-private-key \
  --version-stage AWSCURRENT \
  --move-to-version-id $(aws secretsmanager get-secret-value \
    --secret-id flamoral/production/jwt-private-key \
    --version-stage AWSPENDING --query VersionId --output text)

# 6. Remove old key
kubectl set env deployment/user-service -n flamoral-prod \
  JWT_PUBLIC_KEY_V1-

# 7. Cleanup
rm -f new-jwt-private.pem new-jwt-public.pem

echo "JWT key rotation completed"
```

### 6.2 Security Patching Process

#### Patch Assessment Schedule

| Severity | Assessment Time | Deployment Time |
|----------|-----------------|-----------------|
| Critical (CVE 9.0+) | 24 hours | 48 hours |
| High (CVE 7.0-8.9) | 72 hours | 1 week |
| Medium (CVE 4.0-6.9) | 1 week | 2 weeks |
| Low (CVE 0.1-3.9) | 2 weeks | Next release |

#### Container Image Patching

```bash
#!/bin/bash
# security-patch-scan.sh

# 1. Scan all images for vulnerabilities
for image in $(kubectl get pods -n flamoral-prod -o jsonpath='{.items[*].spec.containers[*].image}' | tr ' ' '\n' | sort -u); do
  echo "Scanning: $image"
  trivy image --severity HIGH,CRITICAL $image
done

# 2. Rebuild images with latest base
for service in user-service messaging-service matching-service; do
  docker build --no-cache -t flamoral/$service:patched ./services/$service
  docker push flamoral/$service:patched
done

# 3. Rolling update with patched images
kubectl set image deployment/user-service -n flamoral-prod \
  user-service=flamoral/user-service:patched
```

#### OS-Level Patching (EKS Nodes)

```bash
# 1. Update node group AMI
aws eks update-nodegroup-version \
  --cluster-name flamoral-production \
  --nodegroup-name general \
  --release-version 1.28.5-20240110

# 2. Monitor update progress
aws eks describe-update \
  --name UPDATE_ID \
  --cluster-name flamoral-production \
  --nodegroup-name general

# 3. Verify nodes are updated
kubectl get nodes -o custom-columns=NAME:.metadata.name,VERSION:.status.nodeInfo.kubeletVersion,AMI:.metadata.labels.eks\\.amazonaws\\.com/nodegroup-image
```

### 6.3 Compliance Audit Procedures

#### Pre-Audit Checklist

```markdown
## SOC 2 / GDPR Audit Preparation

### Access Controls
- [ ] Review IAM policies and remove unused permissions
- [ ] Verify MFA enforcement for all users
- [ ] Audit service account permissions
- [ ] Review security group rules
- [ ] Check for public S3 buckets

### Logging & Monitoring
- [ ] Verify CloudTrail is enabled in all regions
- [ ] Confirm log retention policies (minimum 1 year)
- [ ] Test log integrity verification
- [ ] Review GuardDuty findings
- [ ] Validate Security Hub compliance scores

### Data Protection
- [ ] Verify encryption at rest (RDS, S3, EBS)
- [ ] Confirm encryption in transit (TLS 1.2+)
- [ ] Review data classification labels
- [ ] Test data deletion procedures
- [ ] Verify backup encryption

### Incident Response
- [ ] Review incident response plan
- [ ] Test security alerting
- [ ] Verify contact information
- [ ] Review previous incidents
```

#### Compliance Evidence Collection

```bash
#!/bin/bash
# collect-compliance-evidence.sh

OUTPUT_DIR="compliance-evidence-$(date +%Y%m%d)"
mkdir -p $OUTPUT_DIR

# IAM Configuration
aws iam get-account-summary > $OUTPUT_DIR/iam-summary.json
aws iam list-users > $OUTPUT_DIR/iam-users.json
aws iam list-policies --scope Local > $OUTPUT_DIR/iam-policies.json

# CloudTrail Status
aws cloudtrail describe-trails > $OUTPUT_DIR/cloudtrail-config.json

# Encryption Status
aws rds describe-db-clusters \
  --query 'DBClusters[*].[DBClusterIdentifier,StorageEncrypted,KmsKeyId]' \
  > $OUTPUT_DIR/rds-encryption.json

aws s3api list-buckets --query 'Buckets[*].Name' --output text | \
  xargs -I{} aws s3api get-bucket-encryption --bucket {} \
  > $OUTPUT_DIR/s3-encryption.json 2>&1

# Security Hub Scores
aws securityhub get-findings \
  --filters '{"ComplianceStatus": [{"Value": "FAILED", "Comparison": "EQUALS"}]}' \
  > $OUTPUT_DIR/security-hub-failures.json

# GuardDuty Summary
aws guardduty list-findings --detector-id $DETECTOR_ID \
  > $OUTPUT_DIR/guardduty-findings.json

echo "Evidence collected in $OUTPUT_DIR"
```

---

## 7. Disaster Recovery

### 7.1 Recovery Objectives

| Metric | Target | Current Capability |
|--------|--------|-------------------|
| **RTO** (Recovery Time Objective) | 4 hours | 2-3 hours tested |
| **RPO** (Recovery Point Objective) | 1 hour | 5 minutes (Aurora) |
| **MTTR** (Mean Time to Recovery) | 2 hours | 1.5 hours average |

### 7.2 Multi-Region Architecture

```
                    ┌─────────────────────────────────────┐
                    │           Route 53                  │
                    │    (Health-check based routing)     │
                    └──────────────┬──────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
     ┌────────▼────────┐          │          ┌─────────▼────────┐
     │   US-EAST-1     │          │          │    US-WEST-2     │
     │   (Primary)     │          │          │    (Secondary)   │
     └────────┬────────┘          │          └─────────┬────────┘
              │                    │                    │
     ┌────────▼────────┐          │          ┌─────────▼────────┐
     │   ECS Cluster   │          │          │   ECS Cluster    │
     │   ALB + Services│◄─────────┼─────────►│   ALB + Services │
     └────────┬────────┘          │          └─────────┬────────┘
              │                    │                    │
     ┌────────▼────────┐          │          ┌─────────▼────────┐
     │  Aurora Primary │          │          │  Aurora Replica  │
     │  (Writer)       │──────────┼─────────►│  (Reader)        │
     └────────┬────────┘     Replication     └─────────┬────────┘
              │                    │                    │
     ┌────────▼────────┐          │          ┌─────────▼────────┐
     │  ElastiCache    │          │          │  ElastiCache     │
     │  (Primary)      │          │          │  (Standby)       │
     └─────────────────┘          │          └──────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │         S3               │
                    │  (Cross-region replicated)│
                    └───────────────────────────┘
```

### 7.3 Multi-Region Failover Procedure

#### Automated Failover (Route 53 Health Check)

```bash
# Health check configuration
aws route53 create-health-check \
  --caller-reference $(date +%s) \
  --health-check-config '{
    "IPAddress": "PRIMARY_ALB_IP",
    "Port": 443,
    "Type": "HTTPS",
    "ResourcePath": "/health",
    "RequestInterval": 10,
    "FailureThreshold": 3
  }'
```

#### Manual Regional Failover

```bash
#!/bin/bash
# regional-failover.sh

PRIMARY_REGION="us-east-1"
DR_REGION="us-west-2"
HOSTED_ZONE_ID="Z1234567890"
DOMAIN="api.flamoral.com"

echo "=== REGIONAL FAILOVER INITIATED ==="
echo "Failing over from $PRIMARY_REGION to $DR_REGION"
echo "Time: $(date -u)"

# 1. Verify DR region is healthy
echo "Checking DR region health..."
DR_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" https://api-dr.flamoral.com/health)
if [ "$DR_HEALTH" != "200" ]; then
  echo "ERROR: DR region is not healthy. Aborting failover."
  exit 1
fi

# 2. Promote Aurora replica to primary
echo "Promoting Aurora replica in $DR_REGION..."
aws rds failover-global-cluster \
  --global-cluster-identifier flamoral-global-cluster \
  --target-db-cluster-identifier arn:aws:rds:$DR_REGION:ACCOUNT_ID:cluster:flamoral-dr-cluster \
  --region $DR_REGION

# 3. Wait for database failover
echo "Waiting for database failover..."
sleep 120

# 4. Verify database is writable
aws rds describe-db-clusters \
  --db-cluster-identifier flamoral-dr-cluster \
  --region $DR_REGION \
  --query 'DBClusters[0].Status'

# 5. Update Route 53 to point to DR region
echo "Updating DNS to DR region..."
aws route53 change-resource-record-sets \
  --hosted-zone-id $HOSTED_ZONE_ID \
  --change-batch '{
    "Changes": [{
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "'$DOMAIN'",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "DR_ALB_HOSTED_ZONE",
          "DNSName": "DR_ALB_DNS_NAME",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'

# 6. Invalidate CDN cache
echo "Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id DISTRIBUTION_ID \
  --paths "/*"

# 7. Warm cache in DR region
echo "Warming cache in DR region..."
./scripts/cache-warming.sh --region $DR_REGION

# 8. Scale up DR region
echo "Scaling up DR region services..."
kubectl --context=flamoral-dr scale deployment --all -n flamoral-prod --replicas=10

# 9. Final verification
echo "Running smoke tests against DR..."
./scripts/smoke-tests.sh https://api.flamoral.com

echo "=== FAILOVER COMPLETED ==="
echo "Time: $(date -u)"
echo "Primary region is now: $DR_REGION"
```

### 7.4 Disaster Recovery Runbook

#### DR Scenario 1: Primary Region Outage

**Trigger:** AWS region-wide outage or multiple AZ failures

**Steps:**
1. Confirm primary region is unavailable
2. Notify stakeholders via incident channel
3. Execute `regional-failover.sh`
4. Monitor DR region performance
5. Update status page
6. Plan failback when primary recovers

#### DR Scenario 2: Database Corruption

**Trigger:** Data corruption detected, accidental deletion

**Steps:**
```bash
# 1. Identify corruption scope
psql -h $DB_ENDPOINT -c "SELECT * FROM corruption_check_view;"

# 2. Determine restore point (before corruption)
aws rds describe-db-cluster-snapshots \
  --db-cluster-identifier flamoral-production-cluster

# 3. Restore to point-in-time
./scripts/pitr-recovery.sh --restore-time "2026-01-04T10:00:00Z"

# 4. Verify restored data
psql -h $RECOVERED_ENDPOINT -c "SELECT COUNT(*) FROM users;"

# 5. Switch application to recovered database
kubectl set env deployment --all -n flamoral-prod \
  DATABASE_URL="postgresql://...$RECOVERED_ENDPOINT..."

# 6. Verify application health
./scripts/smoke-tests.sh
```

#### DR Scenario 3: Security Breach

**Trigger:** Confirmed unauthorized access or data exfiltration

**Steps:**
1. **Isolate:** Remove compromised resources from network
2. **Preserve:** Create forensic snapshots
3. **Contain:** Rotate all credentials
4. **Eradicate:** Remove malicious access
5. **Recover:** Restore from clean backup
6. **Review:** Conduct post-incident analysis

```bash
#!/bin/bash
# security-breach-response.sh

echo "=== SECURITY BREACH RESPONSE ==="

# 1. Isolate compromised instances
INSTANCE_IDS="i-xxxxxxxxx i-yyyyyyyyy"
for instance in $INSTANCE_IDS; do
  # Create forensic snapshot
  aws ec2 create-snapshot \
    --volume-id $(aws ec2 describe-instances --instance-ids $instance \
      --query 'Reservations[0].Instances[0].BlockDeviceMappings[0].Ebs.VolumeId' --output text) \
    --description "Forensic snapshot - breach response"

  # Isolate instance
  aws ec2 modify-instance-attribute \
    --instance-id $instance \
    --groups sg-isolation-only
done

# 2. Rotate all credentials
./scripts/rotate-all-credentials.sh --emergency

# 3. Invalidate all user sessions
redis-cli -h $REDIS_ENDPOINT FLUSHDB

# 4. Force password reset for all users
psql -h $DB_ENDPOINT -c "UPDATE users SET force_password_reset = true;"

# 5. Enable enhanced logging
aws cloudtrail update-trail \
  --name flamoral-trail \
  --enable-log-file-validation

echo "Initial containment complete. Proceed with investigation."
```

### 7.5 DR Testing Schedule

| Test Type | Frequency | Duration | Participants |
|-----------|-----------|----------|--------------|
| Tabletop exercise | Quarterly | 2 hours | All teams |
| Component failover | Monthly | 1 hour | Platform team |
| Full DR drill | Semi-annually | 4 hours | All teams |
| Backup restoration | Monthly | 2 hours | Platform team |

#### DR Test Checklist

```markdown
## DR Test Execution Checklist

### Pre-Test
- [ ] Schedule maintenance window
- [ ] Notify stakeholders
- [ ] Verify DR environment is current
- [ ] Prepare rollback plan
- [ ] Brief all participants

### Execution
- [ ] Document start time
- [ ] Execute failover procedure
- [ ] Verify all services in DR
- [ ] Run full test suite
- [ ] Measure RTO achieved
- [ ] Verify RPO (data loss)
- [ ] Test write operations
- [ ] Verify external integrations

### Post-Test
- [ ] Execute failback
- [ ] Verify primary restored
- [ ] Document lessons learned
- [ ] Update runbooks
- [ ] File test report
```

---

## 8. Appendix

### 8.1 Contact Information

| Role | Name | Phone | Email |
|------|------|-------|-------|
| VP Engineering | [Name] | +1-XXX-XXX-XXXX | vp-eng@flamoral.com |
| Platform Lead | [Name] | +1-XXX-XXX-XXXX | platform-lead@flamoral.com |
| Security Lead | [Name] | +1-XXX-XXX-XXXX | security@flamoral.com |
| DBA Lead | [Name] | +1-XXX-XXX-XXXX | dba@flamoral.com |
| AWS TAM | [Name] | +1-XXX-XXX-XXXX | tam@aws.com |

### 8.2 External Resources

| Resource | URL |
|----------|-----|
| AWS Service Health | https://health.aws.amazon.com |
| PagerDuty | https://flamoral.pagerduty.com |
| Status Page Admin | https://manage.statuspage.io/flamoral |
| Datadog | https://app.datadoghq.com/flamoral |
| Sentry | https://sentry.io/flamoral |

### 8.3 Useful Commands Quick Reference

```bash
# ECS cluster info
aws ecs describe-clusters --clusters flamoral-prod-ecs

# List all ECS services
aws ecs list-services --cluster flamoral-prod-ecs

# View service details
aws ecs describe-services \
  --cluster flamoral-prod-ecs \
  --services auth-service user-service matching-service

# List running tasks
aws ecs list-tasks --cluster flamoral-prod-ecs --service-name auth-service

# Get task logs
aws logs get-log-events \
  --log-group-name /ecs/flamoral-prod/auth-service \
  --log-stream-name ecs/auth-service/TASK_ID

# Execute command in running container
aws ecs execute-command \
  --cluster flamoral-prod-ecs \
  --task TASK_ARN \
  --container auth-service \
  --interactive \
  --command "/bin/sh"

# Check ALB health
aws elbv2 describe-target-health --target-group-arn $TG_ARN

# Database connection test
psql -h flamoral-prod.cluster-xxxxx.us-east-1.rds.amazonaws.com -U admin -d flamoral -c "SELECT 1"

# Redis connection test
redis-cli -h flamoral-prod.xxxxx.cache.amazonaws.com PING

# View CloudWatch alarms in ALARM state
aws cloudwatch describe-alarms --state-value ALARM

# Get GuardDuty high-severity findings
aws guardduty list-findings --detector-id $DETECTOR_ID --finding-criteria '{"Criterion":{"severity":{"Gte":7}}}'

# ECR image list
aws ecr describe-images --repository-name flamoral/auth-service --query 'imageDetails | sort_by(@, &imagePushedAt) | [-5:]'
```

### 8.4 Glossary

| Term | Definition |
|------|------------|
| ALB | Application Load Balancer |
| AZ | Availability Zone |
| ECR | Elastic Container Registry |
| ECS | Elastic Container Service |
| Fargate | Serverless compute for containers |
| MTTR | Mean Time To Recovery |
| PITR | Point-In-Time Recovery |
| RPO | Recovery Point Objective |
| RTO | Recovery Time Objective |
| WAF | Web Application Firewall |

### 8.5 Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-04 | Platform Team | Initial release |
| 1.1.0 | 2026-01-10 | Platform Team | Updated for ECS Fargate (replaced EKS/Kubernetes) |

---

**Document Classification:** Internal - Operations
**Infrastructure:** AWS ECS Fargate (27 microservices, ports 3000-3026)
**Review Frequency:** Quarterly
**Next Review Date:** 2026-04-10

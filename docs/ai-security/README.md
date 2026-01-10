# AI Security Documentation

## Overview

Flamoral implements comprehensive AI security measures to ensure safe, fair, and responsible use of AI/ML features across the platform.

## Documentation Index

- [AI Governance Policy](AI_GOVERNANCE_POLICY.md) - Governance framework and policies
- [AI Incident Response](AI_INCIDENT_RESPONSE.md) - Incident procedures and kill switch
- [AI Threat Model](AI_THREAT_MODEL.md) - Security threat analysis

## AI Services

The following services use AI/ML capabilities:

| Service | AI Provider | Purpose |
|---------|-------------|---------|
| Matching Service | AWS Bedrock | Profile recommendations |
| Moderation Service | AWS Rekognition | Content moderation |
| Recommendation Service | AWS Bedrock | Personalized suggestions |
| Media Service | AWS Rekognition | Image analysis |
| Verification Service | AWS Rekognition | Identity verification |

## Kill Switch System

Emergency AI shutdown is available per-service via SSM Parameter Store:

```bash
# Disable AI for matching service
aws ssm put-parameter \
  --name "/flamoral/prod/ai/matching-service/enabled" \
  --value "false" \
  --overwrite

# Re-enable AI
aws ssm put-parameter \
  --name "/flamoral/prod/ai/matching-service/enabled" \
  --value "true" \
  --overwrite
```

## Circuit Breaker

Services implement circuit breaker pattern for AI resilience:

- **Failure Threshold**: 5 consecutive failures
- **Recovery Time**: 30 seconds in half-open state
- **Fallback**: Non-AI behavior when circuit is open

## Security Features

| Feature | Description |
|---------|-------------|
| Kill Switch | Per-service AI disable via SSM |
| Circuit Breaker | Automatic failure protection |
| Prompt Injection Detection | Pattern matching and sanitization |
| Output Validation | Hallucination and bias detection |
| Audit Logging | 90-day AI decision retention |
| Cost Anomaly Detection | Bedrock/Rekognition spend alerts |

## Monitoring

### CloudWatch Metrics

- `AIServiceErrors` - AI service error count
- `AILatency` - AI request latency
- `PromptInjectionAttempts` - Detected injection attempts
- `BiasScore` - Output bias metrics
- `HallucinationScore` - Output validation scores

### Dashboards

- AI Fairness Dashboard: `/flamoral/prod/ai/fairness`
- AI Cost Dashboard: AWS Cost Explorer

## Terraform Module

AI security infrastructure is managed via Terraform:

```hcl
module "ai_security" {
  source = "../../modules/ai-security"
  
  environment = "prod"
  project     = "flamoral"
  
  ai_services = [
    "matching-service",
    "moderation-service",
    "recommendation-service"
  ]
  
  alert_email = "ai-security@flamoral.com"
}
```

## Quick Reference

### Check AI Status
```bash
aws ssm get-parameters-by-path \
  --path "/flamoral/prod/ai" \
  --recursive
```

### View AI Logs
```bash
aws logs tail /flamoral/prod/ai/decisions --follow
```

### Cost Alerts
Configured via AWS Cost Explorer anomaly detection for:
- Amazon Bedrock
- Amazon Rekognition

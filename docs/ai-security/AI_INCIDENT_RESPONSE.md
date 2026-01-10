# AI Incident Response

## Overview

This document outlines procedures for responding to AI-related incidents in the Flamoral platform.

## Incident Categories

### Severity 1 (Critical)
- AI system producing harmful content
- Widespread bias affecting user safety
- Data breach involving AI models
- Complete AI system failure

### Severity 2 (High)
- Localized bias detection
- AI cost anomaly >$500/hour
- Prompt injection attempt successful
- AI feature degradation

### Severity 3 (Medium)
- Elevated error rates
- Minor fairness metric violations
- Performance degradation
- Unusual usage patterns

## Kill Switch Procedure

### Immediate Disable (SEV-1)

```bash
# Disable AI for specific service
aws ssm put-parameter \
  --name "/flamoral/prod/ai/matching-service/enabled" \
  --value "false" \
  --overwrite

# Disable ALL AI services
for service in matching-service moderation-service recommendation-service media-service verification-service; do
  aws ssm put-parameter \
    --name "/flamoral/prod/ai/${service}/enabled" \
    --value "false" \
    --overwrite
done
```

### Verification
```bash
# Verify AI is disabled
aws ssm get-parameter \
  --name "/flamoral/prod/ai/matching-service/enabled" \
  --query "Parameter.Value"
```

## Response Procedures

### SEV-1 Response

1. **Immediate** (0-5 minutes)
   - Activate kill switch
   - Page on-call engineer
   - Notify AI Security Lead

2. **Triage** (5-30 minutes)
   - Identify affected services
   - Assess user impact
   - Document timeline

3. **Mitigation** (30-120 minutes)
   - Deploy fallback behavior
   - Communicate to users
   - Begin root cause analysis

4. **Recovery** (2-24 hours)
   - Fix identified issues
   - Gradual re-enablement
   - Monitor closely

### SEV-2 Response

1. Enable circuit breaker if needed
2. Notify AI team
3. Investigate within 4 hours
4. Remediate within 24 hours

## Escalation

| Time | Action |
|------|--------|
| 0 min | Kill switch if needed |
| 5 min | On-call engineer paged |
| 15 min | AI Security Lead notified |
| 30 min | Incident channel created |
| 1 hour | Executive briefing (SEV-1) |

## Post-Incident

### Review Template
- Timeline of events
- Root cause analysis
- User impact assessment
- Remediation actions
- Prevention measures

### Required Actions
- Post-incident review within 72 hours
- Update runbooks if needed
- Implement preventive measures
- Update monitoring/alerting

## Contacts

| Role | Contact |
|------|---------|
| On-Call | PagerDuty |
| AI Security Lead | ai-security@flamoral.com |
| CTO | cto@flamoral.com |

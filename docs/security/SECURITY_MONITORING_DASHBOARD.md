# SECURITY MONITORING DASHBOARD SPECIFICATION
## Flamoral Dating Platform

**Document Classification:** INTERNAL USE - SECURITY & DEVOPS
**Version:** 1.0.0
**Last Updated:** December 11, 2025
**Owner:** Security Team, DevOps Team

---

## 1. EXECUTIVE SUMMARY

This document specifies the comprehensive security monitoring dashboard for the Flamoral Dating Platform. The dashboard provides real-time visibility into security posture, threat detection, compliance status, and operational security metrics.

### Dashboard Objectives
1. **Real-time Threat Detection:** Immediate visibility into active security threats
2. **Compliance Monitoring:** Track compliance with security policies and regulations
3. **Incident Response:** Rapid identification and response to security incidents
4. **Trend Analysis:** Identify security trends and patterns over time
5. **Executive Reporting:** High-level security metrics for leadership

### Technology Stack
- **Metrics Collection:** Prometheus
- **Visualization:** Grafana
- **Log Aggregation:** Elasticsearch, Fluentd, Kibana (EFK Stack)
- **Alerting:** PagerDuty integration
- **SIEM:** Azure Sentinel (Planned for Q1 2026)

---

## 2. DASHBOARD ARCHITECTURE

### 2.1 Dashboard Hierarchy

```
Level 1: Executive Dashboard (CEO, CTO, Board)
├── Security Posture Score
├── Critical Alerts (last 24h)
├── Compliance Status
├── Incident Summary
└── Cost/Risk Metrics

Level 2: Security Operations Dashboard (Security Team, DevOps)
├── Threat Detection
├── Authentication Security
├── API Security
├── Infrastructure Security
├── Application Security
├── Network Security
└── Data Protection

Level 3: Detailed Technical Dashboards (Security Engineers)
├── WAF Analytics
├── Authentication Deep Dive
├── Database Security
├── Container Security
├── Network Traffic Analysis
├── Vulnerability Management
└── Compliance Details
```

---

## 3. LEVEL 1: EXECUTIVE DASHBOARD

**Audience:** CEO, CTO, CFO, Board of Directors
**Update Frequency:** Real-time
**Access:** `/grafana/dashboards/security-executive`

### 3.1 Dashboard Panels

#### Panel 1: Security Posture Score (Gauge)
```yaml
Description: Overall security health score (0-100)
Data Source: Prometheus (aggregated metrics)
Calculation:
  - Authentication Security: 25%
  - Data Protection: 25%
  - Infrastructure Security: 20%
  - Compliance: 15%
  - Incident Response: 10%
  - Vulnerability Management: 5%

Thresholds:
  - Green (85-100): Excellent
  - Yellow (70-84): Good
  - Orange (50-69): Needs Improvement
  - Red (0-49): Critical

Current Target: > 80
```

**Sample Query:**
```promql
(
  (authentication_security_score * 0.25) +
  (data_protection_score * 0.25) +
  (infrastructure_security_score * 0.20) +
  (compliance_score * 0.15) +
  (incident_response_score * 0.10) +
  (vulnerability_score * 0.05)
)
```

---

#### Panel 2: Critical Security Alerts (Stat + Table)
```yaml
Description: Count and list of critical security alerts in last 24 hours
Data Source: Prometheus Alertmanager
Time Range: Last 24 hours
Alert Severity: Critical only

Metrics Displayed:
  - Total critical alerts
  - Active critical alerts
  - Resolved critical alerts
  - Mean time to resolve

Table Columns:
  - Timestamp
  - Alert Name
  - Severity
  - Service
  - Status
  - Duration
```

**Sample Query:**
```promql
sum(
  ALERTS{alertstate="firing", severity="critical"}
)
```

---

#### Panel 3: Compliance Status (Gauge + Stats)
```yaml
Description: Current compliance levels with major regulations
Data Sources: Custom compliance metrics

Compliance Frameworks:
  - GDPR: XX%
  - PCI DSS: XX%
  - CCPA: XX%
  - SOC 2: XX%

Thresholds:
  - Green: > 90%
  - Yellow: 75-90%
  - Red: < 75%

Additional Metrics:
  - Days until next audit
  - Open compliance gaps
  - Critical compliance issues
```

---

#### Panel 4: Security Incidents Summary (Stats + Timeline)
```yaml
Description: Security incident statistics and timeline
Data Source: Incident tracking system (Jira/custom)
Time Range: Last 30 days

Metrics:
  - Total incidents
  - By severity (P0, P1, P2, P3)
  - Mean time to detect (MTTD)
  - Mean time to respond (MTTR)
  - Mean time to resolve

Timeline:
  - Incident occurrences over time
  - Incident type distribution
  - Trend line
```

---

#### Panel 5: Failed Authentication Attempts (Graph)
```yaml
Description: Failed login attempts over time
Data Source: Prometheus (authentication_failed_total)
Time Range: Last 7 days
Aggregation: 1 hour intervals

Thresholds:
  - Normal: < 100/hour
  - Elevated: 100-500/hour (Yellow)
  - High: 500-1000/hour (Orange)
  - Critical: > 1000/hour (Red)

Annotations:
  - Known attack events
  - Security patches deployed
```

---

#### Panel 6: Data Breach Risk Score (Gauge)
```yaml
Description: Calculated risk score for data breach
Data Source: Custom risk calculation
Factors:
  - Unpatched vulnerabilities (weight: 30%)
  - Failed auth attempts (weight: 20%)
  - Data access anomalies (weight: 20%)
  - Compliance gaps (weight: 15%)
  - Insider threat indicators (weight: 15%)

Score Range: 0-100 (lower is better)
Thresholds:
  - Green: 0-25 (Low Risk)
  - Yellow: 26-50 (Medium Risk)
  - Orange: 51-75 (High Risk)
  - Red: 76-100 (Critical Risk)
```

---

#### Panel 7: Security Investment ROI (Stats)
```yaml
Description: Security spending vs. incidents prevented
Data Source: Financial system + incident tracking
Metrics:
  - Monthly security spend
  - Estimated cost of prevented incidents
  - ROI percentage
  - Cost per prevented incident

Calculation:
  ROI = (Value of Prevented Incidents - Security Spend) / Security Spend * 100
```

---

#### Panel 8: Certificate & Secret Expiry (Table)
```yaml
Description: Upcoming expirations of certificates and secrets
Data Source: Prometheus (cert-manager, Azure Key Vault)
Time Range: Next 90 days

Table Columns:
  - Resource Type (Certificate, Secret, API Key)
  - Name
  - Service
  - Expiration Date
  - Days Remaining
  - Renewal Status

Alerts:
  - Red: < 7 days
  - Orange: 7-30 days
  - Yellow: 31-60 days
```

---

### 3.2 Executive Dashboard Alerts

**Email Digest:** Daily at 8:00 AM
**SMS Alerts:** Critical incidents only
**Report Format:** PDF summary with charts

---

## 4. LEVEL 2: SECURITY OPERATIONS DASHBOARD

**Audience:** Security Team, DevOps Team, Engineering Leads
**Update Frequency:** Real-time (15-second refresh)
**Access:** `/grafana/dashboards/security-operations`

### 4.1 Authentication Security Panel

#### Panel: Failed Login Attempts (Time Series)
```yaml
Metrics:
  - failed_login_attempts_total (by service, by IP)
  - account_lockouts_total
  - password_reset_requests_total
  - suspicious_login_locations_total

Visualizations:
  - Line graph: Failed logins over time
  - Heat map: Failed logins by geographic location
  - Bar chart: Top 10 IP addresses with failed logins
  - Stat: Current account lockouts

Alerts:
  - > 5 failed attempts in 5 minutes from single IP
  - > 100 failed attempts in 1 hour globally
  - Impossible travel detected (logins from multiple countries within short time)
```

**Sample Queries:**
```promql
# Failed login rate
rate(authentication_failed_attempts_total[5m])

# Failed logins by IP
topk(10, sum by (source_ip) (authentication_failed_attempts_total))

# Impossible travel detection
authentication_login_location_changes{time_window="1h", distance_km=">500"}
```

---

#### Panel: Authentication Method Distribution (Pie Chart)
```yaml
Description: Distribution of authentication methods used
Metrics:
  - password_logins_total
  - oauth_logins_total (by provider)
  - biometric_logins_total
  - mfa_logins_total

Purpose: Track adoption of secure authentication methods
```

---

#### Panel: Multi-Factor Authentication Status (Stats)
```yaml
Metrics:
  - MFA enabled users: XX%
  - MFA disabled users: XX%
  - MFA methods: TOTP, SMS, Email, Biometric
  - MFA bypass attempts
  - MFA failure rate

Target: > 95% MFA adoption
```

---

#### Panel: Session Security (Table)
```yaml
Description: Active sessions with security indicators
Columns:
  - User ID (anonymized)
  - Session Age
  - IP Address
  - Location
  - Device Type
  - Risk Score
  - Last Activity

Filters:
  - High-risk sessions
  - Long-lived sessions (> 24 hours)
  - Suspicious locations
```

---

### 4.2 API Security Panel

#### Panel: API Request Rate (Graph)
```yaml
Metrics:
  - api_requests_total (by endpoint, by status code)
  - api_request_duration_seconds (histogram)
  - api_rate_limit_exceeded_total
  - api_authentication_failures_total

Visualizations:
  - Line graph: Requests per second by endpoint
  - Heat map: Response times
  - Bar chart: Error rates by endpoint
  - Stat: Rate limit violations

Alerts:
  - Sudden spike in requests (> 200% of baseline)
  - Error rate > 5%
  - Response time > 2 seconds (P95)
```

**Sample Queries:**
```promql
# Request rate by endpoint
rate(api_requests_total[5m])

# P95 response time
histogram_quantile(0.95, rate(api_request_duration_seconds_bucket[5m]))

# Error rate
sum(rate(api_requests_total{status_code=~"5.."}[5m])) /
sum(rate(api_requests_total[5m])) * 100
```

---

#### Panel: API Authentication Failures (Time Series)
```yaml
Description: Failed API authentication attempts over time
Metrics:
  - api_auth_failures_total (by endpoint, by token_type)
  - api_invalid_token_total
  - api_expired_token_total
  - api_missing_token_total

Alerts:
  - Spike in auth failures (> 50/min)
  - Specific endpoint targeted (> 10/min)
```

---

#### Panel: Rate Limiting Effectiveness (Stats)
```yaml
Metrics:
  - Total rate limit rules
  - Rate limits triggered
  - Blocked requests
  - Top rate-limited IPs
  - Rate limit bypass attempts

Visualization:
  - Stat: Requests blocked today
  - Table: Top 20 rate-limited IPs
  - Graph: Rate limit triggers over time
```

---

#### Panel: API Security Events (Table)
```yaml
Description: Recent API security events requiring attention
Columns:
  - Timestamp
  - Event Type (Auth Failure, Rate Limit, Injection Attempt, etc.)
  - Endpoint
  - Source IP
  - User Agent
  - Details
  - Action Taken

Filters:
  - Event Type
  - Severity
  - Time Range
  - Source IP
```

---

### 4.3 Infrastructure Security Panel

#### Panel: Container Security Vulnerabilities (Bar Chart)
```yaml
Description: Vulnerability counts in container images
Data Source: Trivy scan results
Metrics:
  - Critical vulnerabilities: XX
  - High vulnerabilities: XX
  - Medium vulnerabilities: XX
  - Low vulnerabilities: XX

By Image:
  - user-service: X critical, X high
  - matching-service: X critical, X high
  - [other services]

Target: 0 critical, < 5 high
```

---

#### Panel: Kubernetes Security Violations (Time Series)
```yaml
Description: Pod Security Policy and Network Policy violations
Metrics:
  - pod_security_violations_total (by policy, by namespace)
  - network_policy_violations_total
  - privileged_container_attempts_total
  - root_user_violations_total

Alerts:
  - Any privileged container attempt
  - Network policy violation in production namespace
  - Root user violation in production
```

---

#### Panel: Infrastructure Compliance (Gauge)
```yaml
Description: Infrastructure security compliance score
Checks:
  - Pod security policies: 100%
  - Network policies: 100%
  - Resource limits: 95%
  - Security contexts: 100%
  - Image pull policies: 100%
  - RBAC rules: 100%
  - Secrets in Key Vault: 100%

Overall Score: XX%
Target: > 95%
```

---

#### Panel: Azure Security Center Alerts (Table)
```yaml
Description: Active security alerts from Azure Security Center
Columns:
  - Severity
  - Alert Name
  - Affected Resource
  - Description
  - Recommendation
  - Status
  - Age

Integration: Azure Monitor → Prometheus → Grafana
```

---

### 4.4 Data Protection Panel

#### Panel: Encryption Status (Stats)
```yaml
Metrics:
  - TLS connections: 100%
  - Database encryption at rest: 100%
  - Message E2E encryption: 100%
  - Backup encryption: 100%
  - Azure Storage encryption: 100%

Alerts:
  - Any unencrypted connection detected
  - Encryption key access anomalies
  - Key expiration warnings
```

---

#### Panel: Data Access Anomalies (Table)
```yaml
Description: Unusual data access patterns
Detection Criteria:
  - Large data exports
  - After-hours database access
  - Unusual query patterns
  - Privileged data access
  - Cross-service data access

Table Columns:
  - Timestamp
  - User/Service
  - Data Accessed
  - Volume
  - Risk Score
  - Action Required
```

---

#### Panel: GDPR Data Requests (Stats)
```yaml
Metrics:
  - Data export requests pending: XX
  - Data export requests completed (24h): XX
  - Deletion requests pending: XX
  - Deletion requests completed (24h): XX
  - Average processing time: XX hours

SLA Targets:
  - Export completion: < 48 hours
  - Deletion grace period: 30 days
```

---

### 4.5 Network Security Panel

#### Panel: WAF Threat Detections (Time Series)
```yaml
Description: Web Application Firewall threat detections over time
Metrics:
  - waf_blocked_requests_total (by rule)
  - waf_sql_injection_attempts_total
  - waf_xss_attempts_total
  - waf_lfi_attempts_total (Local File Inclusion)
  - waf_rfi_attempts_total (Remote File Inclusion)

Visualizations:
  - Line graph: Blocked requests over time
  - Bar chart: Top WAF rules triggered
  - Heat map: Attack sources (geographic)
  - Stat: Threats blocked today
```

---

#### Panel: DDoS Protection Status (Stats)
```yaml
Metrics:
  - Azure DDoS Protection status: Enabled/Disabled
  - Current traffic volume: XX Gbps
  - Baseline traffic: XX Gbps
  - Traffic anomaly detected: Yes/No
  - DDoS attacks mitigated (24h): XX

Alerts:
  - Traffic > 150% of baseline
  - DDoS attack detected
```

---

#### Panel: Network Traffic Anomalies (Graph)
```yaml
Description: Unusual network traffic patterns
Metrics:
  - Inbound traffic volume (by source)
  - Outbound traffic volume (by destination)
  - East-west traffic (service-to-service)
  - Traffic to known malicious IPs
  - Unusual port usage

Alerts:
  - Traffic to/from blacklisted IPs
  - Unusual outbound traffic spikes (data exfiltration?)
  - Connections to unexpected ports
```

---

#### Panel: Firewall Rule Violations (Table)
```yaml
Description: Attempted connections blocked by firewall rules
Columns:
  - Timestamp
  - Source IP
  - Destination IP/Port
  - Protocol
  - Rule Violated
  - Action (Block/Log)
  - Count

Filters:
  - Time range
  - Source/Destination
  - Rule
```

---

### 4.6 Vulnerability Management Panel

#### Panel: Vulnerability Trend (Line Graph)
```yaml
Description: Vulnerability count over time by severity
Metrics:
  - vulnerabilities_critical_total
  - vulnerabilities_high_total
  - vulnerabilities_medium_total
  - vulnerabilities_low_total

Time Range: Last 90 days
Annotations:
  - Security patches deployed
  - Dependency updates
```

---

#### Panel: Time to Remediate (Stats)
```yaml
Metrics:
  - Critical vulnerabilities:
    - Average time to remediate: XX days
    - Target: < 7 days
  - High vulnerabilities:
    - Average time to remediate: XX days
    - Target: < 30 days

SLA Compliance: XX%
```

---

#### Panel: Vulnerability by Component (Table)
```yaml
Description: Current vulnerabilities organized by component
Columns:
  - Component (Service/Library)
  - Critical Count
  - High Count
  - Medium Count
  - Low Count
  - CVSS Score (highest)
  - Fix Available
  - Owner
  - Status

Sort: By critical count (descending)
```

---

#### Panel: Dependency Update Status (Stats)
```yaml
Metrics:
  - Total dependencies: XXX
  - Outdated dependencies: XX
  - Security updates available: XX
  - Update compliance: XX%

Dependabot PR Status:
  - Open PRs: XX
  - Merged this week: XX
  - Average time to merge: XX hours
```

---

## 5. LEVEL 3: DETAILED TECHNICAL DASHBOARDS

### 5.1 WAF Analytics Dashboard

**Access:** `/grafana/dashboards/waf-analytics`

#### Panels:
```yaml
1. WAF Request Overview
   - Total requests
   - Allowed requests
   - Blocked requests
   - Block rate

2. Top Triggered Rules
   - Bar chart of most triggered WAF rules
   - Rule ID, description, count

3. Attack Vector Distribution
   - Pie chart: SQL Injection, XSS, LFI, RFI, etc.
   - Count and percentage

4. Geographic Threat Map
   - World map with attack sources
   - Color intensity by threat volume

5. Blocked IPs and User Agents
   - Table of top blocked sources
   - IP, country, requests blocked, last seen

6. Request Analysis
   - Time series of requests by method (GET, POST, etc.)
   - Status code distribution
   - Response time impact of WAF

7. False Positive Tracking
   - Potential false positives flagged
   - Manual review queue
   - False positive rate trend
```

---

### 5.2 Authentication Deep Dive Dashboard

**Access:** `/grafana/dashboards/authentication-deepdive`

#### Panels:
```yaml
1. Authentication Flow Funnel
   - Login attempts
   - MFA challenges
   - Successful authentications
   - Session creations
   - Conversion rate at each step

2. Password Security Metrics
   - Average password strength score
   - Weak password usage: XX%
   - Password reuse detected: XX
   - Compromised password alerts: XX

3. OAuth Provider Performance
   - Success rate by provider (Google, Facebook, Apple)
   - Average authentication time
   - Failure reasons

4. Token Security
   - JWT tokens issued (24h)
   - Refresh tokens used (24h)
   - Expired tokens: XX
   - Invalid tokens: XX
   - Blacklisted tokens: XX

5. Biometric Authentication
   - Biometric enrollment rate: XX%
   - Biometric auth success rate: XX%
   - Biometric failures and fallback to password

6. Session Management
   - Active sessions: XXX
   - Average session duration: XX minutes
   - Long-lived sessions (> 24h): XX
   - Concurrent sessions per user (avg)
```

---

### 5.3 Database Security Dashboard

**Access:** `/grafana/dashboards/database-security`

#### Panels:
```yaml
1. Database Connections
   - Active connections by service
   - Connection pool utilization
   - Failed connection attempts
   - Unusual connection patterns

2. Query Security
   - Slow queries (potential SQL injection attempts)
   - Dangerous queries detected (DROP, TRUNCATE, etc.)
   - Parameterized queries: XX%
   - Query anomaly detections

3. Data Access Patterns
   - Read/write operations by service
   - Large data exports (> 1000 rows)
   - After-hours access
   - Privileged user activity

4. Encryption Status
   - TLS connections: 100%
   - Transparent Data Encryption: Enabled
   - Backup encryption: Enabled
   - Column-level encryption usage

5. Database Auditing
   - Audit log entries (24h)
   - Schema changes detected
   - Permission changes
   - Failed authorization attempts
```

---

### 5.4 Container Security Dashboard

**Access:** `/grafana/dashboards/container-security`

#### Panels:
```yaml
1. Container Image Security
   - Total images in use: XX
   - Images with vulnerabilities: XX
   - Vulnerability distribution (Critical/High/Medium/Low)
   - Average image age: XX days

2. Runtime Security (Falco)
   - Runtime security alerts (24h)
   - Suspicious process executions
   - Unexpected network connections
   - File integrity violations
   - Privilege escalation attempts

3. Container Compliance
   - Running as non-root: XX%
   - Read-only file systems: XX%
   - Resource limits defined: XX%
   - Security contexts applied: XX%
   - Image pull policy compliance: XX%

4. Container Resource Usage
   - CPU usage by container
   - Memory usage by container
   - Containers near resource limits
   - OOMKilled containers (24h)

5. Pod Security
   - Privileged pods: XX (should be 0)
   - HostNetwork pods: XX
   - HostPID pods: XX
   - Capabilities used
```

---

## 6. ALERTING CONFIGURATION

### 6.1 Critical Alerts (P0) - Immediate Response

```yaml
Alert: CriticalAuthenticationFailureSpike
Description: Unusual spike in authentication failures
Condition: rate(authentication_failed_attempts_total[5m]) > 100
Severity: Critical
Notification: PagerDuty (SMS + Phone Call), Slack #security-critical
Response Time: 15 minutes

---

Alert: DataBreachIndicator
Description: Large data export detected
Condition: data_export_rows_total > 10000 AND user_role != "admin"
Severity: Critical
Notification: PagerDuty, Slack #security-critical, Email to security team
Response Time: 15 minutes

---

Alert: WAFRuleViolationCritical
Description: Critical WAF rule triggered (SQL injection, RCE attempts)
Condition: waf_blocked_requests_total{severity="critical"} > 0
Severity: Critical
Notification: PagerDuty, Slack #security-critical
Response Time: 15 minutes

---

Alert: KubernetesSecurityViolation
Description: Privileged container or security policy violation
Condition: pod_security_violations_total{type="privileged"} > 0
Severity: Critical
Notification: PagerDuty, Slack #security-critical, #devops
Response Time: 15 minutes

---

Alert: DatabaseSecurityBreach
Description: Unauthorized database access detected
Condition: database_unauthorized_access_total > 0
Severity: Critical
Notification: PagerDuty, Slack #security-critical, #database
Response Time: 15 minutes

---

Alert: CertificateExpiringSoon
Description: Production SSL certificate expiring within 7 days
Condition: cert_expiry_days{environment="production"} < 7
Severity: Critical
Notification: PagerDuty, Slack #devops, Email to DevOps team
Response Time: Immediate
```

---

### 6.2 High Priority Alerts (P1) - Urgent Response

```yaml
Alert: ElevatedFailedLoginRate
Description: Higher than normal failed login rate
Condition: rate(authentication_failed_attempts_total[15m]) > 50
Severity: High
Notification: Slack #security, Email to security team
Response Time: 1 hour

---

Alert: APIErrorRateHigh
Description: API error rate above threshold
Condition: sum(rate(api_requests_total{status_code=~"5.."}[5m])) / sum(rate(api_requests_total[5m])) > 0.05
Severity: High
Notification: Slack #devops, #backend
Response Time: 1 hour

---

Alert: VulnerabilityDetected
Description: New critical or high vulnerability detected
Condition: vulnerabilities_new_total{severity=~"critical|high"} > 0
Severity: High
Notification: Slack #security, Email to security team
Response Time: 1 hour (4 hours for remediation SLA)

---

Alert: UnusualDataAccess
Description: Unusual data access pattern detected
Condition: data_access_anomaly_score > 75
Severity: High
Notification: Slack #security, Email to security team
Response Time: 1 hour

---

Alert: RateLimitBypassAttempt
Description: Possible rate limit bypass detected
Condition: rate_limit_bypass_attempts_total > 10
Severity: High
Notification: Slack #security
Response Time: 1 hour
```

---

### 6.3 Medium Priority Alerts (P2) - Standard Response

```yaml
Alert: ModerateFailedLoginRate
Description: Moderate increase in failed logins
Condition: rate(authentication_failed_attempts_total[30m]) > 25
Severity: Medium
Notification: Slack #security
Response Time: 4 hours

---

Alert: CertificateExpiringWithin30Days
Description: Certificate expiring within 30 days (non-production)
Condition: cert_expiry_days{environment!="production"} < 30
Severity: Medium
Notification: Slack #devops
Response Time: 24 hours

---

Alert: BackupFailure
Description: Scheduled backup failed
Condition: backup_success_total == 0 for 24 hours
Severity: Medium
Notification: Slack #devops, Email to DevOps team
Response Time: 4 hours

---

Alert: ComplianceGapDetected
Description: Compliance check failed
Condition: compliance_check_failures_total > 0
Severity: Medium
Notification: Slack #security, Email to compliance team
Response Time: 24 hours
```

---

## 7. DASHBOARD ACCESS CONTROL

### 7.1 Role-Based Access

```yaml
Role: Security Administrator
Access:
  - All dashboards (read/write)
  - Alert configuration (read/write)
  - User management (read/write)
Members:
  - Security Lead
  - Security Engineers

---

Role: Security Viewer
Access:
  - All dashboards (read only)
  - Alert configuration (read only)
Members:
  - DevOps Team
  - Engineering Leads
  - CTO

---

Role: Executive Viewer
Access:
  - Executive Dashboard (read only)
  - Monthly reports (read only)
Members:
  - CEO
  - CFO
  - CTO
  - Board Members

---

Role: On-Call Engineer
Access:
  - Security Operations Dashboard (read only)
  - Infrastructure Security Dashboard (read only)
  - Alert acknowledgement (write)
Members:
  - On-call rotation members
```

---

## 8. IMPLEMENTATION GUIDE

### 8.1 Prometheus Configuration

**File:** `/DatingPlatform/infrastructure/monitoring/prometheus/prometheus.yml`

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'flamoral-production'
    environment: 'production'

# Alertmanager configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

# Load alerting rules
rule_files:
  - /etc/prometheus/rules/security-alerts.yml
  - /etc/prometheus/rules/authentication-alerts.yml
  - /etc/prometheus/rules/api-security-alerts.yml
  - /etc/prometheus/rules/infrastructure-alerts.yml

# Scrape configurations
scrape_configs:
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
    relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__

  - job_name: 'authentication-service'
    static_configs:
      - targets: ['authentication-service:9090']
    metrics_path: '/metrics'

  - job_name: 'api-gateway'
    static_configs:
      - targets: ['api-gateway:9090']
    metrics_path: '/metrics'

  # Add more services...
```

---

### 8.2 Grafana Dashboard JSON

**File:** `/DatingPlatform/infrastructure/monitoring/grafana/dashboards/security-executive.json`

*Full JSON export available - example panel:*

```json
{
  "dashboard": {
    "title": "Security Executive Dashboard",
    "panels": [
      {
        "id": 1,
        "title": "Security Posture Score",
        "type": "gauge",
        "targets": [
          {
            "expr": "(\n  (authentication_security_score * 0.25) +\n  (data_protection_score * 0.25) +\n  (infrastructure_security_score * 0.20) +\n  (compliance_score * 0.15) +\n  (incident_response_score * 0.10) +\n  (vulnerability_score * 0.05)\n)",
            "refId": "A"
          }
        ],
        "options": {
          "orientation": "auto",
          "showThresholdLabels": true,
          "showThresholdMarkers": true
        },
        "fieldConfig": {
          "defaults": {
            "thresholds": {
              "mode": "absolute",
              "steps": [
                { "value": 0, "color": "red" },
                { "value": 50, "color": "orange" },
                { "value": 70, "color": "yellow" },
                { "value": 85, "color": "green" }
              ]
            },
            "min": 0,
            "max": 100,
            "unit": "percent"
          }
        }
      }
      // Additional panels...
    ]
  }
}
```

---

### 8.3 Alert Rules Configuration

**File:** `/DatingPlatform/infrastructure/monitoring/prometheus/rules/security-alerts.yml`

```yaml
groups:
  - name: security_critical_alerts
    interval: 30s
    rules:
      - alert: CriticalAuthenticationFailureSpike
        expr: rate(authentication_failed_attempts_total[5m]) > 100
        for: 2m
        labels:
          severity: critical
          category: authentication
        annotations:
          summary: "Critical spike in authentication failures"
          description: "{{ $value }} failed authentication attempts per second detected. Possible brute force attack."

      - alert: DataBreachIndicator
        expr: data_export_rows_total > 10000 AND on(user_id) user_role != "admin"
        for: 0m
        labels:
          severity: critical
          category: data_protection
        annotations:
          summary: "Large data export by non-admin user"
          description: "User {{ $labels.user_id }} exported {{ $value }} rows of data. Possible data breach."

      - alert: WAFCriticalViolation
        expr: increase(waf_blocked_requests_total{severity="critical"}[5m]) > 0
        for: 0m
        labels:
          severity: critical
          category: network_security
        annotations:
          summary: "Critical WAF rule violation"
          description: "{{ $value }} critical WAF violations in last 5 minutes. Rule: {{ $labels.rule_id }}"

  - name: security_high_alerts
    interval: 1m
    rules:
      - alert: ElevatedFailedLoginRate
        expr: rate(authentication_failed_attempts_total[15m]) > 50
        for: 5m
        labels:
          severity: high
          category: authentication
        annotations:
          summary: "Elevated failed login rate"
          description: "{{ $value }} failed logins per second over last 15 minutes."

      - alert: NewCriticalVulnerability
        expr: vulnerabilities_new_total{severity="critical"} > 0
        for: 0m
        labels:
          severity: high
          category: vulnerability_management
        annotations:
          summary: "New critical vulnerability detected"
          description: "{{ $value }} new critical vulnerabilities found. Immediate patching required."
```

---

## 9. MAINTENANCE & UPDATES

### 9.1 Dashboard Maintenance Schedule

```yaml
Daily:
  - Review critical alerts
  - Verify data sources are reporting
  - Check for anomalies in metrics

Weekly:
  - Review dashboard performance
  - Update alert thresholds based on baselines
  - Clean up old alerts and silences
  - Review false positive rate

Monthly:
  - Dashboard performance optimization
  - Add new panels based on feedback
  - Update documentation
  - Review access permissions
  - Archive old metrics

Quarterly:
  - Comprehensive dashboard review
  - User feedback sessions
  - Baseline recalculation
  - Compliance verification
```

---

### 9.2 Version Control

**Repository:** `/DatingPlatform/infrastructure/monitoring/`

```
Structure:
├── prometheus/
│   ├── prometheus.yml
│   ├── rules/
│   │   ├── security-alerts.yml
│   │   ├── authentication-alerts.yml
│   │   └── infrastructure-alerts.yml
│   └── alertmanager.yml
├── grafana/
│   ├── dashboards/
│   │   ├── security-executive.json
│   │   ├── security-operations.json
│   │   └── [other dashboards].json
│   ├── datasources/
│   │   └── prometheus.yml
│   └── provisioning/
│       ├── dashboards.yml
│       └── datasources.yml
└── docs/
    └── SECURITY_MONITORING_DASHBOARD.md (this document)
```

**Version Control:**
- All changes committed to Git
- Pull request required for modifications
- Peer review mandatory
- Deployment via GitOps (ArgoCD)

---

## 10. TRAINING & DOCUMENTATION

### 10.1 Dashboard Training

**Required Training for Security Team:**
1. Dashboard navigation and interpretation
2. Alert response procedures
3. Grafana query language basics
4. Custom dashboard creation
5. Alert configuration

**Training Materials:**
- Video tutorials: `/docs/security/training/videos/`
- User guide: `/docs/security/DASHBOARD_USER_GUIDE.md`
- Quick reference cards: `/docs/security/DASHBOARD_QUICK_REF.pdf`

---

### 10.2 Runbooks

**Alert Runbooks Location:** `/docs/security/runbooks/`

Each critical alert has a corresponding runbook:
- `CriticalAuthenticationFailureSpike.md`
- `DataBreachIndicator.md`
- `WAFCriticalViolation.md`
- `KubernetesSecurityViolation.md`
- [etc.]

**Runbook Format:**
1. Alert Description
2. Severity and Impact
3. Investigation Steps
4. Remediation Actions
5. Escalation Procedures
6. Related Documentation

---

## APPENDICES

### Appendix A: Metric Definitions

[Complete metric definitions available at: `/docs/security/METRICS_DICTIONARY.md`]

### Appendix B: Query Library

[PromQL query examples at: `/docs/security/PROMQL_QUERY_LIBRARY.md`]

### Appendix C: Dashboard Screenshots

[Visual examples at: `/docs/security/dashboard-screenshots/`]

### Appendix D: Integration Guide

[Third-party integrations at: `/docs/security/DASHBOARD_INTEGRATIONS.md`]

---

## DOCUMENT CONTROL

**Document Owner:** Security Team + DevOps Team
**Approvers:** Security Lead, DevOps Lead, CTO
**Review Frequency:** Quarterly
**Next Review Date:** March 11, 2026

**Change History:**
| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | Dec 11, 2025 | Security Team | Initial version |

---

**Classification:** INTERNAL USE - SECURITY & DEVOPS

**END OF DOCUMENT**

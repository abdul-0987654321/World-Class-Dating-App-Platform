# Flamoral Operations Documentation

**Version:** 1.0.0
**Last Updated:** December 11, 2025
**Document Owner:** DevOps Team

---

## Overview

This directory contains all operational documentation for the Flamoral Dating Platform, including launch procedures, incident response, monitoring guides, and operational runbooks.

---

## Documents in This Directory

### 1. Launch Runbook
**File:** `LAUNCH_RUNBOOK.md`

**Description:** Comprehensive production launch guide covering all aspects of launching Flamoral to production.

**Contents:**
- Complete pre-launch checklist (100+ items)
- Step-by-step launch day procedures
- Post-launch monitoring guidelines
- Incident response procedures
- Scaling strategies
- Emergency contacts and escalation paths

**When to Use:**
- During production launch preparation
- For launch day execution
- As a reference for future deployments
- During incident response
- For scaling decisions

**Key Sections:**
- Section 1: Pre-Launch Checklist (p. 1-45)
- Section 2: Launch Day Procedures (p. 46-72)
- Section 3: Post-Launch Monitoring (p. 73-95)
- Section 4: Incident Response (p. 96-128)
- Section 5: Scaling Procedures (p. 129-145)
- Section 6: Emergency Contacts (p. 146-152)

---

### 2. Launch Day Checklist
**File:** `LAUNCH_DAY_CHECKLIST.md`

**Description:** Printable, fillable checklist for launch day execution. Condensed version of the launch runbook for quick reference.

**Contents:**
- T-24 hours checklist
- T-4 hours checklist
- T-1 hour go/no-go decision
- Launch execution steps
- Post-launch checkpoints
- Incident log
- Quick reference commands

**When to Use:**
- Print before launch day
- Fill in during launch execution
- Archive after launch for historical record

**Format:** Designed to be printed on physical paper and filled in with pen during launch.

---

## Related Documentation

### Deployment Documentation
Located in `/docs/deployment/`

- **DEPLOYMENT_CHECKLIST.md** - General deployment checklist (all environments)
- **CICD_PIPELINE_GUIDE.md** - CI/CD pipeline documentation
- **MONITORING_SETUP_GUIDE.md** - Monitoring and logging setup
- **PRODUCTION_STRIPE_SETUP.md** - Stripe production configuration

### Infrastructure Documentation
Located in `/docs/`

- **ARCHITECTURE.md** - System architecture overview
- **DNS_SETUP.md** - DNS configuration
- **KUBERNETES_DEPLOYMENT.md** - Kubernetes deployment guide
- **INFRASTRUCTURE_DESIGN.md** - Azure infrastructure design

### Security Documentation
Located in `/docs/`

- **SECURITY-AUDIT-REPORT.md** - Security audit findings
- **CICD_PIPELINES.md** - Pipeline security

### Compliance Documentation
Located in `/docs/guides/`

- **50-App-Store-Compliance.md** - App store requirements
- **51-Privacy-Policy.md** - Privacy policy
- **52-Terms-of-Service.md** - Terms of service

---

## Quick Start Guides

### For Launch Preparation
1. Read `LAUNCH_RUNBOOK.md` sections 1-2
2. Review `DEPLOYMENT_CHECKLIST.md`
3. Verify all pre-launch items in `LAUNCH_DAY_CHECKLIST.md`
4. Review `MONITORING_SETUP_GUIDE.md`
5. Set up emergency contacts from section 6

### For Launch Day
1. Print `LAUNCH_DAY_CHECKLIST.md`
2. Keep `LAUNCH_RUNBOOK.md` open (sections 2-3)
3. Have monitoring dashboards ready
4. Keep emergency contact list accessible
5. Have war room (video call) ready

### For Incident Response
1. Go to `LAUNCH_RUNBOOK.md` section 4
2. Follow incident classification guide
3. Execute incident response workflow
4. Use communication templates
5. Complete post-incident review

### For Scaling
1. Go to `LAUNCH_RUNBOOK.md` section 5
2. Identify scaling trigger
3. Follow appropriate scaling playbook
4. Monitor during and after scaling
5. Document lessons learned

---

## Document Maintenance

### Update Schedule
- **Weekly:** First month post-launch
- **Monthly:** Months 2-6
- **Quarterly:** After 6 months
- **As Needed:** After incidents, infrastructure changes

### Update Triggers
- Incidents resolved (update procedures)
- Infrastructure changes
- Contact changes (team, vendors)
- Process improvements
- New services added
- Compliance requirements

### Review Process
1. DevOps team reviews all documents
2. Engineering leads provide feedback
3. Updates made and version incremented
4. Team notified of changes
5. Training updated if needed

---

## Operational Best Practices

### Daily Operations
- Review automated monitoring reports
- Check alert history for trends
- Monitor key business metrics
- Review support tickets
- Update incident tracker

### Weekly Operations
- Review incident log
- Team sync meeting (30 min)
- Review and triage bugs
- Check system capacity
- Review cost reports

### Monthly Operations
- Comprehensive metrics review
- Infrastructure optimization review
- Cost optimization review
- Security audit
- Documentation updates
- Training and knowledge sharing

### Quarterly Operations
- Full system audit
- Disaster recovery drill
- Security penetration testing
- Vendor relationship review
- Capacity planning
- Major documentation review

---

## Key Metrics to Monitor

### System Health (Real-time)
- Error rate (target: < 0.5%)
- Response time p95 (target: < 500ms)
- CPU usage (target: < 70%)
- Memory usage (target: < 80%)
- Pod availability (target: 100%)

### Application Performance (Hourly)
- API endpoint response times
- Database query performance
- Cache hit rate (target: > 80%)
- Webhook success rate (target: > 99%)
- External API call latency

### Business Metrics (Daily)
- New user registrations
- Daily active users (DAU)
- Match rate
- Message rate
- Subscription conversions
- Revenue (daily, monthly recurring)
- Churn rate

### Reliability Metrics (Weekly/Monthly)
- Uptime (target: > 99.9%)
- Mean time to detection (MTTD)
- Mean time to resolution (MTTR)
- Incident frequency
- Change failure rate
- Deployment frequency

---

## Emergency Procedures

### Service Down
1. Check Sentry for errors
2. Check pod status: `kubectl get pods -n flamoral-prod`
3. Check logs: `kubectl logs deployment/[SERVICE] -n flamoral-prod`
4. If recent deployment, rollback: `kubectl rollout undo deployment/[SERVICE]`
5. Escalate if not resolved in 15 minutes

### High Error Rate
1. Identify error source (Sentry dashboard)
2. Check recent changes (deployments, config)
3. Rollback if deployment-related
4. Check external service status pages
5. Scale up if load-related

### Slow Performance
1. Check resource usage: `kubectl top pods -n flamoral-prod`
2. Check database performance
3. Scale up pods if needed
4. Check for slow queries
5. Clear cache if stale

### Payment Issues
1. Check Stripe status page
2. Check payment service logs
3. Verify webhook configuration
4. Check API key validity
5. Restart payment service if needed

---

## Contact Information

### Internal Teams
- **DevOps Team:** devops@flamoral.com
- **On-Call Engineer:** oncall@flamoral.com
- **Engineering Manager:** engineering-manager@flamoral.com
- **CTO:** cto@flamoral.com
- **Support Team:** support@flamoral.com

### Vendor Support
- **Azure Support:** +1-800-642-7676
- **Stripe Support:** Chat in dashboard
- **SendGrid Support:** +1-877-969-8647
- **Twilio Support:** +1-855-853-2235

### Escalation Path
1. On-Call Engineer (< 15 min)
2. Team Lead (< 30 min)
3. Engineering Manager (< 1 hour)
4. CTO (< 2 hours)

---

## Training & Onboarding

### New Team Member Onboarding
**Required Reading:**
1. `README.md` (this file)
2. `LAUNCH_RUNBOOK.md` sections 1, 3, 4, 6
3. `/docs/ARCHITECTURE.md`
4. `/docs/deployment/CICD_PIPELINE_GUIDE.md`
5. `/docs/SECURITY-AUDIT-REPORT.md`

**Hands-on Training:**
1. Access to monitoring dashboards
2. Kubernetes cluster access (staging)
3. Practice rollback in staging
4. Practice scaling in staging
5. Shadow on-call engineer for 1 week

**Certification:**
- Complete incident response simulation
- Successfully deploy to staging
- Shadow 1 production deployment
- Complete security training

### On-Call Training
**Prerequisites:**
- 3+ months with team
- Completed new team member onboarding
- Shadowed on-call engineer
- Kubernetes proficiency

**On-Call Responsibilities:**
- Monitor alerts 24/7
- Respond to incidents < 15 minutes
- Execute incident response procedures
- Escalate when needed
- Document all incidents
- Weekly handoff to next on-call

**On-Call Resources:**
- `LAUNCH_RUNBOOK.md` section 4 (Incident Response)
- Emergency contact card (print and keep)
- Access to all monitoring systems
- VPN access
- Escalation phone numbers

---

## Tools & Systems

### Monitoring & Alerting
- **Application Insights:** System metrics, logs
- **Sentry:** Error tracking, performance
- **UptimeRobot:** Uptime monitoring
- **Grafana:** Custom dashboards (if deployed)
- **Prometheus:** Metrics collection (if deployed)

### Infrastructure
- **Azure Portal:** Cloud infrastructure management
- **Kubernetes Dashboard:** Cluster management
- **Azure DevOps:** CI/CD pipelines (if applicable)
- **GitHub Actions:** CI/CD workflows

### External Services
- **Stripe Dashboard:** Payment processing
- **SendGrid Dashboard:** Email delivery
- **Twilio Console:** SMS delivery
- **Azure Storage Explorer:** File management

### Communication
- **Slack:** #incidents, #on-call, #devops, #engineering
- **Email:** Distribution lists
- **PagerDuty/Opsgenie:** On-call management (if deployed)
- **Status Page:** https://status.flamoral.com

---

## Troubleshooting Common Issues

### "Pod stuck in Pending state"
```bash
kubectl describe pod [POD-NAME] -n flamoral-prod
# Check events for reason (usually insufficient resources)
# Solution: Scale up cluster or reduce resource requests
```

### "ImagePullBackOff error"
```bash
# Check image name and tag
kubectl describe pod [POD-NAME] -n flamoral-prod
# Solution: Verify image exists in registry, check pull secrets
```

### "Database connection timeout"
```bash
# Check database status
# Check connection pool settings
# Check network connectivity
# Solution: Restart service or scale up database
```

### "High memory usage"
```bash
kubectl top pods -n flamoral-prod
kubectl describe pod [POD-NAME] -n flamoral-prod
# Check for memory leaks in application
# Solution: Restart pod, investigate and fix memory leak
```

### "Certificate expired"
```bash
kubectl get certificate -n flamoral-prod
kubectl describe certificate [CERT-NAME] -n flamoral-prod
# Check cert-manager logs
# Solution: Cert-manager should auto-renew, check configuration
```

---

## Runbook Commands Quick Reference

### Health Checks
```bash
# All services health
curl https://api.flamoral.com/health

# Specific service
curl https://api.flamoral.com/api/user-service/health

# Website
curl -I https://flamoral.com
```

### Kubernetes Status
```bash
# Cluster info
kubectl cluster-info
kubectl get nodes

# All pods
kubectl get pods -n flamoral-prod

# Specific service
kubectl get deployment user-service -n flamoral-prod
kubectl logs deployment/user-service -n flamoral-prod --tail=100
```

### Scaling
```bash
# Scale service
kubectl scale deployment/user-service --replicas=10 -n flamoral-prod

# Scale cluster
az aks scale --resource-group rg-flamoral-prod-westus2 \
             --name flamoral-prod-aks \
             --node-count 8
```

### Rollback
```bash
# Rollback deployment
kubectl rollout undo deployment/user-service -n flamoral-prod

# Check rollout status
kubectl rollout status deployment/user-service -n flamoral-prod
```

### Restart
```bash
# Restart service
kubectl rollout restart deployment/user-service -n flamoral-prod
```

---

## Success Metrics

### Launch Success Criteria
- ✅ All services deployed without errors
- ✅ Error rate < 0.5% for first hour
- ✅ Response time p95 < 500ms
- ✅ Zero critical incidents
- ✅ All smoke tests passed
- ✅ User registration working
- ✅ Payment processing working

### Operational Excellence Targets
- **Uptime:** > 99.9% (< 43 minutes downtime/month)
- **MTTR:** < 30 minutes (mean time to resolution)
- **MTTD:** < 5 minutes (mean time to detection)
- **Change Failure Rate:** < 5%
- **Deployment Frequency:** 2-5 times/week
- **Lead Time:** < 1 hour (commit to production)

---

## Compliance & Security

### Data Protection
- All data encrypted in transit (HTTPS/TLS)
- All data encrypted at rest (Azure encryption)
- User data deletion within 30 days of request
- Regular security audits
- Incident response plan in place

### Compliance
- GDPR compliant (privacy policy, data deletion, consent)
- PCI-DSS Level 1 (Stripe handles all card data)
- SOC 2 Type II (in progress)
- Regular security training for team

### Audit Trail
- All deployments logged
- All configuration changes tracked
- All incidents documented
- All access logged and monitored

---

## Continuous Improvement

### Post-Launch Review (Week 1)
- Review all incidents
- Identify bottlenecks
- Optimize slow queries
- Improve monitoring
- Update documentation

### Monthly Review
- Review metrics trends
- Cost optimization
- Capacity planning
- Security updates
- Process improvements

### Quarterly Planning
- Infrastructure roadmap
- New features planning
- Major upgrades
- Team training needs
- Tool evaluation

---

## Additional Resources

### External Documentation
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Azure Documentation](https://docs.microsoft.com/azure/)
- [Stripe API Documentation](https://stripe.com/docs/api)
- [OWASP Top 10](https://owasp.org/Top10/)

### Internal Wikis & Knowledge Base
- Engineering Wiki: [LINK]
- Runbooks: [LINK]
- Architecture Diagrams: [LINK]
- API Documentation: [LINK]

### Training Resources
- Kubernetes Fundamentals
- Azure Administrator
- Incident Response Training
- Security Best Practices
- On-Call Training

---

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-12-11 | DevOps Team | Initial operations documentation |
| | | | |
| | | | |

---

## Feedback & Contributions

**Feedback:** devops@flamoral.com

**Contributing:**
1. Suggest improvements via email or Slack (#devops)
2. Submit pull request for documentation updates
3. Attend weekly DevOps meetings to discuss changes

**Document Owners:**
- Launch Runbook: DevOps Lead
- Incident Response: On-Call Lead
- Scaling Procedures: Infrastructure Lead

---

**Last Updated:** December 11, 2025
**Next Review:** December 18, 2025

---

**END OF OPERATIONS README**

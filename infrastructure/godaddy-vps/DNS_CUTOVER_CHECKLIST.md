# Flamoral DNS Cutover Checklist

## Pre-Cutover (24-48 Hours Before)

### DNS Preparation

- [ ] Lower TTL to 60 seconds on all A/CNAME records
- [ ] Document current DNS configuration (screenshot or export)
- [ ] Verify new target IPs/CNAMEs are correct
- [ ] Test new endpoints independently (bypass DNS)

### Infrastructure Verification

- [ ] Vercel deployment is live and healthy
- [ ] Railway services are running and healthy
- [ ] All health endpoints returning 200
- [ ] SSL certificates provisioned on new infrastructure
- [ ] CDN/CloudFront configured (if applicable)

### Team Readiness

- [ ] On-call engineers identified
- [ ] Communication channels established
- [ ] Rollback plan documented and understood
- [ ] Stakeholders notified of maintenance window

---

## Cutover Execution

### Phase 1: Final Pre-flight (T-30 minutes)

- [ ] Re-verify all services are healthy
- [ ] Confirm TTLs have propagated (should be 60s)
- [ ] Take final database backup
- [ ] Notify team cutover is beginning

### Phase 2: DNS Changes (T-0)

- [ ] Update A record: @ → Vercel IP (76.76.21.21)
- [ ] Update CNAME: www → cname.vercel-dns.com
- [ ] Update CNAME: api → Railway production URL
- [ ] Update CNAME: ws → Railway production URL
- [ ] Save all DNS changes

### Phase 3: Verification (T+5 minutes)

- [ ] Check DNS propagation: `dig flamoral.com A +short`
- [ ] Check DNS propagation: `dig api.flamoral.com CNAME +short`
- [ ] Test frontend: `curl -I https://flamoral.com`
- [ ] Test API: `curl https://api.flamoral.com/health`
- [ ] Test SSL: Verify certificates in browser

### Phase 4: Functional Testing (T+10 minutes)

- [ ] Login flow works
- [ ] Signup flow works
- [ ] API requests succeed
- [ ] WebSocket connections establish
- [ ] Push notifications work
- [ ] Email sending works

---

## Post-Cutover (0-24 Hours After)

### Monitoring

- [ ] Watch error rates in Sentry
- [ ] Monitor response times
- [ ] Check database connection counts
- [ ] Verify no increase in 5xx errors
- [ ] Check user reports/support tickets

### DNS Finalization (After 24-48 Hours)

- [ ] Raise TTLs back to 300-3600 seconds
- [ ] Verify old infrastructure receives no traffic
- [ ] Document final DNS configuration

### Cleanup

- [ ] Remove old DNS records (if any)
- [ ] Update internal documentation
- [ ] Close maintenance ticket
- [ ] Send completion notification to stakeholders

---

## Rollback Procedure

### If Issues Detected Within 1 Hour

1. **Immediate**: Revert DNS records to previous values
2. **Wait**: DNS propagation (60 seconds with low TTL)
3. **Verify**: Old infrastructure still running
4. **Test**: Confirm services work on old infrastructure
5. **Notify**: Team of rollback and reason
6. **Document**: Issues encountered for post-mortem

### Rollback DNS Values (Keep These Ready)

```
# Previous configuration (update before cutover)
@ A [OLD_VERCEL_IP]
www CNAME [OLD_CNAME]
api CNAME [OLD_RAILWAY_URL]
```

---

## Success Criteria

All must be true to consider cutover successful:

- [ ] DNS resolves to new infrastructure globally
- [ ] SSL certificates valid and trusted
- [ ] All health checks passing
- [ ] No increase in error rates
- [ ] Core user flows functional
- [ ] No customer-reported issues
- [ ] WebSocket connections stable
- [ ] Email delivery working

---

## Emergency Contacts

| Role          | Name | Phone | Email |
| ------------- | ---- | ----- | ----- |
| DevOps Lead   | TBD  | TBD   | TBD   |
| Backend Lead  | TBD  | TBD   | TBD   |
| Frontend Lead | TBD  | TBD   | TBD   |
| On-Call       | TBD  | TBD   | TBD   |

---

## Timeline Template

```
T-48h: Lower TTLs
T-24h: Final infrastructure verification
T-2h:  Team standup, confirm readiness
T-30m: Pre-flight checks
T-0:   Execute DNS changes
T+5m:  DNS propagation check
T+10m: Functional testing
T+30m: Declare success or rollback
T+24h: Raise TTLs
T+48h: Close maintenance window
```

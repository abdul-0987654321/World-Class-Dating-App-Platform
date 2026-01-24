# Flamoral DNS Configuration Guide

## Overview

This document provides comprehensive DNS configuration instructions for the Flamoral dating platform using GoDaddy as the DNS provider.

## Architecture

```
                    GoDaddy DNS
                         |
         +---------------+---------------+
         |               |               |
    flamoral.com    api.flamoral.com   ws.flamoral.com
         |               |               |
      Vercel         Railway          Railway
    (Frontend)       (Backend)      (WebSocket)
```

## Required DNS Records

### Production Records

| Type  | Name        | Value                                                     | TTL | Purpose                |
| ----- | ----------- | --------------------------------------------------------- | --- | ---------------------- |
| A     | @           | 76.76.21.21                                               | 300 | Vercel (root domain)   |
| CNAME | www         | cname.vercel-dns.com                                      | 300 | Vercel (www subdomain) |
| CNAME | api         | world-class-dating-app-platform-production.up.railway.app | 300 | Railway API            |
| CNAME | ws          | world-class-dating-app-platform-production.up.railway.app | 300 | WebSocket server       |
| CNAME | staging     | staging-flamoral.vercel.app                               | 300 | Staging frontend       |
| CNAME | staging-api | world-class-dating-app-platform-staging.up.railway.app    | 300 | Staging API            |

### Email Authentication Records (AWS SES)

| Type  | Name                  | Value                                                 | TTL  |
| ----- | --------------------- | ----------------------------------------------------- | ---- |
| TXT   | @                     | v=spf1 include:amazonses.com ~all                     | 3600 |
| TXT   | \_dmarc               | v=DMARC1; p=quarantine; rua=mailto:dmarc@flamoral.com | 3600 |
| CNAME | selector1.\_domainkey | selector1.flamoral.com.dkim.amazonses.com             | 3600 |
| CNAME | selector2.\_domainkey | selector2.flamoral.com.dkim.amazonses.com             | 3600 |
| CNAME | selector3.\_domainkey | selector3.flamoral.com.dkim.amazonses.com             | 3600 |

### Verification Records

| Type | Name | Value                                             | TTL  |
| ---- | ---- | ------------------------------------------------- | ---- |
| TXT  | @    | google-site-verification=YOUR_GOOGLE_VERIFICATION | 3600 |
| TXT  | @    | apple-domain-verification=YOUR_APPLE_VERIFICATION | 3600 |

## TTL Strategy

### Pre-Cutover (24-48 hours before)

- Lower all TTLs to **60 seconds**
- This allows for quick propagation during cutover

### During Cutover

- Keep TTLs at **60 seconds**
- Monitor DNS propagation closely

### Post-Cutover (24-48 hours after)

- Raise TTLs back to **300-3600 seconds**
- This improves caching and reduces DNS lookups

## GoDaddy Configuration Steps

### Step 1: Access DNS Management

1. Log into GoDaddy at https://dcc.godaddy.com
2. Navigate to **My Products** > **Domains**
3. Click **DNS** next to flamoral.com

### Step 2: Configure Root Domain (Vercel)

1. Find or create an **A Record**
2. Set:
   - **Type**: A
   - **Name**: @
   - **Value**: 76.76.21.21
   - **TTL**: 300 (or Custom: 1 hour)

### Step 3: Configure WWW Subdomain (Vercel)

1. Find or create a **CNAME Record**
2. Set:
   - **Type**: CNAME
   - **Name**: www
   - **Value**: cname.vercel-dns.com
   - **TTL**: 300

### Step 4: Configure API Subdomain (Railway)

1. Create a new **CNAME Record**
2. Set:
   - **Type**: CNAME
   - **Name**: api
   - **Value**: world-class-dating-app-platform-production.up.railway.app
   - **TTL**: 300

### Step 5: Configure WebSocket Subdomain

1. Create a new **CNAME Record**
2. Set:
   - **Type**: CNAME
   - **Name**: ws
   - **Value**: world-class-dating-app-platform-production.up.railway.app
   - **TTL**: 300

### Step 6: Configure Email (SPF)

1. Create a **TXT Record**
2. Set:
   - **Type**: TXT
   - **Name**: @
   - **Value**: v=spf1 include:amazonses.com ~all
   - **TTL**: 3600

### Step 7: Configure Email (DMARC)

1. Create a **TXT Record**
2. Set:
   - **Type**: TXT
   - **Name**: \_dmarc
   - **Value**: v=DMARC1; p=quarantine; rua=mailto:dmarc@flamoral.com
   - **TTL**: 3600

### Step 8: Configure Email (DKIM)

For each DKIM selector (get these from AWS SES):

1. Create a **CNAME Record**
2. Set:
   - **Type**: CNAME
   - **Name**: selector1.\_domainkey
   - **Value**: (from AWS SES)
   - **TTL**: 3600

Repeat for selector2 and selector3.

## Vercel Domain Configuration

### Add Custom Domain in Vercel

1. Go to Vercel Dashboard > Project Settings > Domains
2. Add `flamoral.com`
3. Add `www.flamoral.com`
4. Vercel will verify DNS automatically

### SSL Configuration

Vercel automatically provisions SSL certificates for:

- flamoral.com
- www.flamoral.com

No manual SSL configuration is required.

## Railway Domain Configuration

### Add Custom Domain in Railway

1. Go to Railway Dashboard > Service > Settings > Networking
2. Add custom domain: `api.flamoral.com`
3. Railway will verify DNS and provision SSL

### SSL Configuration

Railway automatically provisions SSL via Let's Encrypt.

## Validation Commands

### Check DNS Propagation

```bash
# Check A record
dig flamoral.com A +short

# Check CNAME records
dig www.flamoral.com CNAME +short
dig api.flamoral.com CNAME +short

# Check TXT records (SPF)
dig flamoral.com TXT +short

# Check DMARC
dig _dmarc.flamoral.com TXT +short
```

### Check SSL Certificates

```bash
# Check SSL for frontend
echo | openssl s_client -servername flamoral.com -connect flamoral.com:443 2>/dev/null | openssl x509 -noout -dates

# Check SSL for API
echo | openssl s_client -servername api.flamoral.com -connect api.flamoral.com:443 2>/dev/null | openssl x509 -noout -dates
```

### Check Health Endpoints

```bash
# Frontend
curl -I https://flamoral.com

# API
curl https://api.flamoral.com/health

# WebSocket (basic check)
curl -I https://ws.flamoral.com
```

## Monitoring DNS Health

### Recommended Tools

1. **DNSChecker.org** - Check global propagation
2. **MXToolbox** - Email DNS verification
3. **SSL Labs** - SSL certificate analysis
4. **UptimeRobot** - Continuous monitoring

### Alerts to Configure

1. SSL expiration warnings (30, 14, 7 days)
2. DNS record changes
3. Email deliverability issues

## Troubleshooting

### Domain Not Resolving

1. Check TTL hasn't expired (may take up to old TTL to propagate)
2. Verify record values are correct
3. Use `dig` to check from multiple locations
4. Wait for DNS propagation (up to 48 hours in worst case)

### SSL Certificate Issues

1. Verify DNS is pointing correctly
2. Check Vercel/Railway dashboard for cert status
3. Force certificate renewal if needed

### Email Not Delivered

1. Check SPF record
2. Verify DKIM signatures
3. Check DMARC policy
4. Review AWS SES sending statistics

## Emergency Contacts

- **GoDaddy Support**: 1-480-505-8877
- **Vercel Support**: support@vercel.com
- **Railway Support**: support@railway.app

## Related Documents

- [DNS_CUTOVER_CHECKLIST.md](./DNS_CUTOVER_CHECKLIST.md)
- [VERCEL_RAILWAY_INTEGRATION.md](../../docs/VERCEL_RAILWAY_INTEGRATION.md)
- [PRODUCTION_CHECKLIST.md](../qa/PRODUCTION_CHECKLIST.md)

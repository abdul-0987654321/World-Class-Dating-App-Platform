# Flamoral GoDaddy VPS Infrastructure

Production server bootstrap and deployment scripts for deploying Flamoral on a GoDaddy VPS running Ubuntu 22.04 LTS.

## Directory Structure

```
godaddy-vps/
├── bootstrap.sh              # Main server setup script
├── nginx/
│   └── flamoral.conf         # Nginx reverse proxy configuration
├── pm2/
│   └── ecosystem.config.js   # PM2 process management configuration
├── scripts/
│   ├── deploy.sh             # Deployment automation script
│   ├── backup-db.sh          # Database backup script
│   └── restore-db.sh         # Database restore script
├── env/
│   └── .env.production.template  # Production environment template
└── README.md                 # This file
```

## Quick Start

### 1. Initial Server Setup

SSH into your GoDaddy VPS and run:

```bash
# Download bootstrap script
curl -O https://raw.githubusercontent.com/flamoral/flamoral-app/main/infrastructure/godaddy-vps/bootstrap.sh

# Make executable and run
chmod +x bootstrap.sh
sudo ./bootstrap.sh
```

### 2. Configure Environment

```bash
# Copy environment template
cp env/.env.production.template /home/flamoral/app/.env.production

# Edit with your actual values
nano /home/flamoral/app/.env.production

# Set proper permissions
chmod 600 /home/flamoral/app/.env.production
```

### 3. Configure Nginx

```bash
# Copy Nginx configuration
sudo cp nginx/flamoral.conf /etc/nginx/sites-available/
sudo ln -s /etc/nginx/sites-available/flamoral.conf /etc/nginx/sites-enabled/

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### 4. Obtain SSL Certificates

```bash
sudo certbot --nginx -d flamoral.com -d www.flamoral.com -d api.flamoral.com -d ws.flamoral.com
```

### 5. Deploy Application

```bash
# As flamoral user
sudo -u flamoral -i

# Clone repository
cd /home/flamoral/app
git clone git@github.com:flamoral/flamoral-app.git .

# Run deployment
./infrastructure/godaddy-vps/scripts/deploy.sh
```

## Component Details

### bootstrap.sh

Main server provisioning script that installs:

| Component  | Version | Purpose                    |
| ---------- | ------- | -------------------------- |
| Node.js    | 20 LTS  | JavaScript runtime via nvm |
| PM2        | Latest  | Process manager            |
| PostgreSQL | 15      | Primary database           |
| Redis      | 7       | Cache and sessions         |
| Nginx      | Latest  | Reverse proxy              |
| Certbot    | Latest  | SSL certificates           |
| UFW        | -       | Firewall                   |
| Fail2ban   | -       | Intrusion prevention       |
| AWS CLI    | v2      | Backup management          |

**Created directories:**

- `/home/flamoral/app` - Application code
- `/var/log/flamoral` - Application logs
- `/var/backups/flamoral` - Backups

### nginx/flamoral.conf

Nginx reverse proxy configuration with:

- **flamoral.com** → localhost:5173 (Frontend)
- **api.flamoral.com** → localhost:4000 (API Gateway)
- **ws.flamoral.com** → localhost:5000 (WebSocket)

Features:

- SSL termination with Let's Encrypt
- HTTP/2 support
- Security headers (CSP, HSTS, X-Frame-Options, etc.)
- Gzip compression
- Rate limiting (API: 10r/s, Auth: 5r/m)
- WebSocket support with proper timeouts
- Static asset caching (1 year for immutable assets)

### pm2/ecosystem.config.js

PM2 process configuration for 30+ services:

| Service Group | Port Range | Services                                     |
| ------------- | ---------- | -------------------------------------------- |
| API Gateway   | 4000       | Main entry point                             |
| Core Services | 4001-4010  | Auth, User, Matching, Messaging, Video, etc. |
| Supporting    | 4011-4020  | Verification, Moderation, Location, etc.     |
| Utility       | 4021-4030  | Email, SMS, Admin, Audit, etc.               |
| WebSocket     | 5000       | Real-time connections                        |
| Frontend      | 5173       | Static file server                           |

Features:

- Cluster mode for high-traffic services
- Memory limits per service type
- Automatic restarts on failure
- Log rotation
- Zero-downtime reloads

### scripts/deploy.sh

Automated deployment script with:

```bash
./deploy.sh              # Full deployment
./deploy.sh --backend    # Backend only
./deploy.sh --frontend   # Frontend only
./deploy.sh --quick      # Restart services only
./deploy.sh --rollback   # Rollback to previous
```

Features:

- Pre-deployment checks (disk space, connectivity)
- Automatic backup before deploy
- Git pull with branch selection
- Dependency installation
- TypeScript compilation
- Database migrations
- Zero-downtime PM2 reload
- Health checks with automatic rollback
- Slack/Discord notifications

### scripts/backup-db.sh

Database backup script with:

```bash
./backup-db.sh              # Full backup + S3 upload
./backup-db.sh --local-only # Local backup only
./backup-db.sh --schema     # Schema only
./backup-db.sh --list       # List backups
```

Features:

- PostgreSQL pg_dump with compression
- Custom format for faster restores
- S3 upload with encryption
- Retention policy (local: 7 days, S3: 30 days)
- Backup verification
- Slack notifications

**Recommended cron:**

```bash
# Daily full backup at 2 AM
0 2 * * * /home/flamoral/app/infrastructure/godaddy-vps/scripts/backup-db.sh --upload-s3

# Hourly local backup
0 * * * * /home/flamoral/app/infrastructure/godaddy-vps/scripts/backup-db.sh --local-only
```

### scripts/restore-db.sh

Database restore script with:

```bash
./restore-db.sh <backup_file>    # Restore from file
./restore-db.sh --latest         # Restore latest local
./restore-db.sh --latest-s3      # Restore latest S3
./restore-db.sh --list           # List available backups
```

Features:

- Supports both custom (.dump) and SQL (.sql.gz) formats
- Creates pre-restore safety backup
- Terminates existing connections
- Stops services during restore
- Verification after restore
- Automatic service restart

### env/.env.production.template

Comprehensive environment template with placeholders for:

- Application settings
- Security (JWT, encryption, sessions)
- Database (PostgreSQL)
- Cache (Redis)
- Cloud storage (AWS S3)
- Email (SendGrid/SES)
- SMS (Twilio)
- Push notifications (Firebase)
- Payments (Stripe)
- Video calling (Agora)
- Identity verification (Onfido)
- AI services (OpenAI)
- Analytics (GA, Mixpanel, Sentry)
- Social OAuth (Google, Apple, Facebook)
- Feature flags
- And more...

## Security Considerations

### Firewall Rules (UFW)

- Port 22: SSH
- Port 80: HTTP (redirects to HTTPS)
- Port 443: HTTPS

### Fail2ban Jails

- SSH: 3 failed attempts = 24h ban
- Nginx HTTP Auth: 3 attempts = 1h ban
- Nginx Rate Limit: 10 attempts = 1h ban

### SSL/TLS

- TLS 1.2 and 1.3 only
- Strong cipher suites
- HSTS enabled
- OCSP stapling

### System Hardening

- Root SSH login disabled
- SYN flood protection
- Source routing disabled
- ICMP redirects ignored
- Reverse path filtering

## Monitoring

### PM2 Monitoring

```bash
pm2 monit          # Real-time dashboard
pm2 logs           # View logs
pm2 status         # Service status
```

### Log Locations

- Application: `/var/log/flamoral/pm2/`
- Nginx: `/var/log/flamoral/nginx/`
- PostgreSQL: `/var/log/postgresql/`
- System: `/var/log/syslog`

### Health Endpoints

- Frontend: `https://flamoral.com/health`
- API: `https://api.flamoral.com/health`
- WebSocket: `https://ws.flamoral.com/health`

## Troubleshooting

### Service Not Starting

```bash
pm2 logs <service-name> --lines 100
pm2 describe <service-name>
```

### Database Connection Issues

```bash
sudo -u postgres psql -c "\l"
sudo systemctl status postgresql
```

### Nginx Errors

```bash
sudo nginx -t
sudo tail -f /var/log/flamoral/nginx/error.log
```

### SSL Certificate Issues

```bash
sudo certbot certificates
sudo certbot renew --dry-run
```

## Support

For issues with this infrastructure:

1. Check logs first
2. Verify environment variables
3. Ensure all services are running
4. Check disk space and memory

## License

Proprietary - Flamoral Inc.

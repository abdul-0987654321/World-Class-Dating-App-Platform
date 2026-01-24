# Flamoral GoDaddy VPS Quick Start Guide

## Server Credentials

- **IP**: 208.109.37.206
- **Username**: flamoral
- **Password**: flamoral123

## Step 1: Connect to Server

Open a terminal and run:

```bash
ssh flamoral@208.109.37.206
# Enter password: flamoral123
```

## Step 2: Run Bootstrap Script

Once connected, run these commands:

```bash
# Download and run bootstrap script
curl -sL https://raw.githubusercontent.com/flamoral/flamoral-app/main/infrastructure/godaddy-vps/bootstrap.sh -o bootstrap.sh
chmod +x bootstrap.sh
sudo ./bootstrap.sh
```

**OR** if the repo isn't public, copy the script content manually:

```bash
# Create bootstrap script
cat > bootstrap.sh << 'BOOTSTRAP'
#!/bin/bash
# Flamoral VPS Bootstrap - Quick Version
set -e

echo "=== Flamoral VPS Bootstrap ==="

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install PostgreSQL 15
sudo apt install -y postgresql postgresql-contrib

# Install Redis
sudo apt install -y redis-server
sudo systemctl enable redis-server

# Install Nginx
sudo apt install -y nginx
sudo systemctl enable nginx

# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Install Git
sudo apt install -y git

# Create app directory
sudo mkdir -p /home/flamoral/app
sudo chown flamoral:flamoral /home/flamoral/app

# Configure firewall
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

echo "=== Bootstrap Complete ==="
echo "Node: $(node -v)"
echo "NPM: $(npm -v)"
echo "PostgreSQL: $(psql --version)"
echo "Redis: $(redis-server --version)"
echo "Nginx: $(nginx -v 2>&1)"
BOOTSTRAP

chmod +x bootstrap.sh
sudo ./bootstrap.sh
```

## Step 3: Configure PostgreSQL

```bash
# Create database and user
sudo -u postgres psql << SQL
CREATE DATABASE flamoral;
CREATE USER flamoral WITH PASSWORD 'CHANGE_THIS_SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE flamoral TO flamoral;
\q
SQL
```

## Step 4: Configure Nginx

```bash
# Create Nginx config
sudo tee /etc/nginx/sites-available/flamoral.conf << 'NGINX'
# Frontend
server {
    listen 80;
    server_name flamoral.com www.flamoral.com;

    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

# API
server {
    listen 80;
    server_name api.flamoral.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
NGINX

# Enable site
sudo ln -sf /etc/nginx/sites-available/flamoral.conf /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

## Step 5: Get SSL Certificates

```bash
# Get SSL certificates (after DNS is pointed to this server)
sudo certbot --nginx -d flamoral.com -d www.flamoral.com -d api.flamoral.com
```

## Step 6: Clone and Deploy Application

```bash
cd /home/flamoral/app

# Clone repository (use your actual repo URL)
git clone https://github.com/flamoral/flamoral-app.git .

# Or upload files via SCP from your local machine:
# scp -r /path/to/flamoral/* flamoral@208.109.37.206:/home/flamoral/app/

# Install dependencies
npm install --legacy-peer-deps

# Build backend
cd backend
npm run build

# Build frontend
cd ../apps/web-app
npm run build

# Create environment file
cp .env.example .env.production
nano .env.production  # Edit with production values
```

## Step 7: Start Services with PM2

```bash
cd /home/flamoral/app

# Start API Gateway
pm2 start backend/services/api-gateway/dist/index.js --name api-gateway -i 2

# Start Auth Service
pm2 start backend/services/auth-service/dist/index.js --name auth-service

# Start all other services...
# (Use the pm2 ecosystem file for full deployment)

# Save PM2 config
pm2 save
pm2 startup
```

## Step 8: Verify

```bash
# Check services
pm2 status

# Test health endpoint
curl http://localhost:4000/health

# Check logs
pm2 logs
```

## Step 9: Update DNS in GoDaddy

Go to: https://dcc.godaddy.com/control/portfolio/flamoral.com/settings

Update DNS records:

- @ → A → 208.109.37.206
- www → A → 208.109.37.206
- api → A → 208.109.37.206

## Troubleshooting

### Service not starting

```bash
pm2 logs <service-name>
pm2 describe <service-name>
```

### Database connection issues

```bash
sudo systemctl status postgresql
sudo -u postgres psql -c "\l"
```

### Nginx errors

```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

## Support Commands

```bash
# View all services
pm2 status

# Restart all services
pm2 restart all

# View logs
pm2 logs

# Monitor resources
pm2 monit

# Check disk space
df -h

# Check memory
free -h
```

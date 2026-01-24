#!/bin/bash
#===============================================================================
# Flamoral Server Bootstrap Script
# Target: GoDaddy VPS - Ubuntu 22.04 LTS
#
# This script sets up a production-ready server for the Flamoral dating platform.
# It installs all required dependencies and configures the server environment.
#
# Usage: sudo ./bootstrap.sh
#
# Author: Flamoral DevOps Team
# Version: 1.0.0
#===============================================================================

set -euo pipefail

#-------------------------------------------------------------------------------
# Configuration
#-------------------------------------------------------------------------------
FLAMORAL_USER="flamoral"
FLAMORAL_HOME="/home/${FLAMORAL_USER}"
APP_DIR="${FLAMORAL_HOME}/app"
LOG_DIR="/var/log/flamoral"
BACKUP_DIR="/var/backups/flamoral"
NODE_VERSION="20"
POSTGRES_VERSION="15"
REDIS_VERSION="7"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

#-------------------------------------------------------------------------------
# Helper Functions
#-------------------------------------------------------------------------------
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

#-------------------------------------------------------------------------------
# System Update
#-------------------------------------------------------------------------------
update_system() {
    log_info "Updating system packages..."
    apt-get update -y
    apt-get upgrade -y
    apt-get dist-upgrade -y
    apt-get autoremove -y
    apt-get autoclean -y
    log_success "System packages updated"
}

#-------------------------------------------------------------------------------
# Install Essential Tools
#-------------------------------------------------------------------------------
install_essentials() {
    log_info "Installing essential tools..."
    apt-get install -y \
        curl \
        wget \
        git \
        vim \
        htop \
        unzip \
        zip \
        build-essential \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release \
        jq \
        tree \
        ncdu \
        rsync \
        acl
    log_success "Essential tools installed"
}

#-------------------------------------------------------------------------------
# Create Flamoral User
#-------------------------------------------------------------------------------
create_user() {
    log_info "Creating flamoral user..."

    if id "${FLAMORAL_USER}" &>/dev/null; then
        log_warning "User ${FLAMORAL_USER} already exists"
    else
        useradd -m -s /bin/bash "${FLAMORAL_USER}"
        usermod -aG sudo "${FLAMORAL_USER}"

        # Set up SSH directory
        mkdir -p "${FLAMORAL_HOME}/.ssh"
        chmod 700 "${FLAMORAL_HOME}/.ssh"
        touch "${FLAMORAL_HOME}/.ssh/authorized_keys"
        chmod 600 "${FLAMORAL_HOME}/.ssh/authorized_keys"
        chown -R "${FLAMORAL_USER}:${FLAMORAL_USER}" "${FLAMORAL_HOME}/.ssh"

        log_success "User ${FLAMORAL_USER} created"
    fi
}

#-------------------------------------------------------------------------------
# Set Up Directory Structure
#-------------------------------------------------------------------------------
setup_directories() {
    log_info "Setting up directory structure..."

    # Application directories
    mkdir -p "${APP_DIR}"
    mkdir -p "${APP_DIR}/frontend"
    mkdir -p "${APP_DIR}/backend"
    mkdir -p "${APP_DIR}/shared"
    mkdir -p "${APP_DIR}/uploads"
    mkdir -p "${APP_DIR}/temp"

    # Log directories
    mkdir -p "${LOG_DIR}"
    mkdir -p "${LOG_DIR}/nginx"
    mkdir -p "${LOG_DIR}/pm2"
    mkdir -p "${LOG_DIR}/postgresql"
    mkdir -p "${LOG_DIR}/redis"

    # Backup directories
    mkdir -p "${BACKUP_DIR}"
    mkdir -p "${BACKUP_DIR}/database"
    mkdir -p "${BACKUP_DIR}/uploads"

    # Set permissions
    chown -R "${FLAMORAL_USER}:${FLAMORAL_USER}" "${APP_DIR}"
    chown -R "${FLAMORAL_USER}:${FLAMORAL_USER}" "${LOG_DIR}/pm2"
    chown -R "${FLAMORAL_USER}:${FLAMORAL_USER}" "${BACKUP_DIR}"

    # Set ACL for log directory
    setfacl -R -m u:${FLAMORAL_USER}:rwx "${LOG_DIR}"
    setfacl -R -d -m u:${FLAMORAL_USER}:rwx "${LOG_DIR}"

    log_success "Directory structure created"
}

#-------------------------------------------------------------------------------
# Install Node.js via NVM
#-------------------------------------------------------------------------------
install_nodejs() {
    log_info "Installing Node.js ${NODE_VERSION} via nvm..."

    # Install nvm for flamoral user
    sudo -u "${FLAMORAL_USER}" bash -c '
        export HOME=/home/flamoral
        curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        nvm install '"${NODE_VERSION}"'
        nvm alias default '"${NODE_VERSION}"'
        nvm use default
    '

    # Add nvm to bashrc if not already present
    if ! grep -q "NVM_DIR" "${FLAMORAL_HOME}/.bashrc"; then
        cat >> "${FLAMORAL_HOME}/.bashrc" << 'EOF'

# NVM Configuration
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
EOF
    fi

    log_success "Node.js ${NODE_VERSION} installed"
}

#-------------------------------------------------------------------------------
# Install PM2
#-------------------------------------------------------------------------------
install_pm2() {
    log_info "Installing PM2 globally..."

    sudo -u "${FLAMORAL_USER}" bash -c '
        export HOME=/home/flamoral
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        npm install -g pm2
        pm2 install pm2-logrotate
        pm2 set pm2-logrotate:max_size 50M
        pm2 set pm2-logrotate:retain 10
        pm2 set pm2-logrotate:compress true
    '

    # Set up PM2 startup script
    sudo -u "${FLAMORAL_USER}" bash -c '
        export HOME=/home/flamoral
        export NVM_DIR="$HOME/.nvm"
        [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
        pm2 startup systemd -u flamoral --hp /home/flamoral
    '

    log_success "PM2 installed and configured"
}

#-------------------------------------------------------------------------------
# Install PostgreSQL
#-------------------------------------------------------------------------------
install_postgresql() {
    log_info "Installing PostgreSQL ${POSTGRES_VERSION}..."

    # Add PostgreSQL repository
    curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor -o /usr/share/keyrings/postgresql-keyring.gpg
    echo "deb [signed-by=/usr/share/keyrings/postgresql-keyring.gpg] http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list

    apt-get update -y
    apt-get install -y "postgresql-${POSTGRES_VERSION}" "postgresql-contrib-${POSTGRES_VERSION}"

    # Start and enable PostgreSQL
    systemctl start postgresql
    systemctl enable postgresql

    # Configure PostgreSQL
    log_info "Configuring PostgreSQL..."

    # Update pg_hba.conf for local connections
    PG_HBA="/etc/postgresql/${POSTGRES_VERSION}/main/pg_hba.conf"
    if ! grep -q "flamoral" "${PG_HBA}"; then
        echo "local   flamoral_production    flamoral                                md5" >> "${PG_HBA}"
        echo "host    flamoral_production    flamoral        127.0.0.1/32            md5" >> "${PG_HBA}"
    fi

    # Update postgresql.conf for performance
    PG_CONF="/etc/postgresql/${POSTGRES_VERSION}/main/postgresql.conf"
    sed -i "s/#listen_addresses = 'localhost'/listen_addresses = 'localhost'/" "${PG_CONF}"
    sed -i "s/shared_buffers = 128MB/shared_buffers = 256MB/" "${PG_CONF}"
    sed -i "s/#effective_cache_size = 4GB/effective_cache_size = 1GB/" "${PG_CONF}"
    sed -i "s/#maintenance_work_mem = 64MB/maintenance_work_mem = 128MB/" "${PG_CONF}"
    sed -i "s/#work_mem = 4MB/work_mem = 16MB/" "${PG_CONF}"

    # Restart PostgreSQL to apply changes
    systemctl restart postgresql

    # Create database and user (password should be set manually)
    sudo -u postgres psql << EOF
CREATE USER flamoral WITH PASSWORD 'CHANGE_ME_IMMEDIATELY';
CREATE DATABASE flamoral_production OWNER flamoral;
GRANT ALL PRIVILEGES ON DATABASE flamoral_production TO flamoral;
\c flamoral_production
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
EOF

    log_warning "PostgreSQL installed. IMPORTANT: Change the flamoral user password!"
    log_success "PostgreSQL ${POSTGRES_VERSION} installed and configured"
}

#-------------------------------------------------------------------------------
# Install Redis
#-------------------------------------------------------------------------------
install_redis() {
    log_info "Installing Redis ${REDIS_VERSION}..."

    # Add Redis repository
    curl -fsSL https://packages.redis.io/gpg | gpg --dearmor -o /usr/share/keyrings/redis-archive-keyring.gpg
    echo "deb [signed-by=/usr/share/keyrings/redis-archive-keyring.gpg] https://packages.redis.io/deb $(lsb_release -cs) main" > /etc/apt/sources.list.d/redis.list

    apt-get update -y
    apt-get install -y redis

    # Configure Redis
    log_info "Configuring Redis..."

    REDIS_CONF="/etc/redis/redis.conf"

    # Security settings
    sed -i "s/# requirepass foobared/requirepass CHANGE_ME_IMMEDIATELY/" "${REDIS_CONF}"
    sed -i "s/bind 127.0.0.1 -::1/bind 127.0.0.1/" "${REDIS_CONF}"

    # Performance settings
    sed -i "s/# maxmemory <bytes>/maxmemory 512mb/" "${REDIS_CONF}"
    sed -i "s/# maxmemory-policy noeviction/maxmemory-policy allkeys-lru/" "${REDIS_CONF}"

    # Persistence settings
    sed -i "s/appendonly no/appendonly yes/" "${REDIS_CONF}"

    # Start and enable Redis
    systemctl restart redis-server
    systemctl enable redis-server

    log_warning "Redis installed. IMPORTANT: Change the Redis password in /etc/redis/redis.conf!"
    log_success "Redis ${REDIS_VERSION} installed and configured"
}

#-------------------------------------------------------------------------------
# Install Nginx
#-------------------------------------------------------------------------------
install_nginx() {
    log_info "Installing Nginx..."

    apt-get install -y nginx

    # Remove default site
    rm -f /etc/nginx/sites-enabled/default

    # Create Nginx configuration directories
    mkdir -p /etc/nginx/sites-available
    mkdir -p /etc/nginx/sites-enabled
    mkdir -p /etc/nginx/ssl
    mkdir -p /etc/nginx/snippets

    # Create security snippets
    cat > /etc/nginx/snippets/security-headers.conf << 'EOF'
# Security headers
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://www.google-analytics.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https: blob:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://api.flamoral.com wss://ws.flamoral.com https://www.google-analytics.com; frame-ancestors 'self'; base-uri 'self'; form-action 'self';" always;
add_header Permissions-Policy "accelerometer=(), camera=(), geolocation=(self), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=()" always;
EOF

    # Create SSL snippet (will be updated by certbot)
    cat > /etc/nginx/snippets/ssl-params.conf << 'EOF'
# SSL parameters
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers on;
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
ssl_session_timeout 1d;
ssl_session_cache shared:SSL:50m;
ssl_session_tickets off;
ssl_stapling on;
ssl_stapling_verify on;
resolver 8.8.8.8 8.8.4.4 valid=300s;
resolver_timeout 5s;
EOF

    # Create gzip configuration
    cat > /etc/nginx/snippets/gzip.conf << 'EOF'
# Gzip compression
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;
gzip_min_length 1000;
EOF

    # Update main nginx.conf
    cat > /etc/nginx/nginx.conf << 'EOF'
user www-data;
worker_processes auto;
pid /run/nginx.pid;
include /etc/nginx/modules-enabled/*.conf;

events {
    worker_connections 2048;
    use epoll;
    multi_accept on;
}

http {
    ##
    # Basic Settings
    ##
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    server_tokens off;

    # Increase buffer sizes
    client_body_buffer_size 16k;
    client_header_buffer_size 1k;
    client_max_body_size 50m;
    large_client_header_buffers 4 16k;

    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    ##
    # SSL Settings
    ##
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    ##
    # Logging Settings
    ##
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for" '
                    'rt=$request_time uct="$upstream_connect_time" '
                    'uht="$upstream_header_time" urt="$upstream_response_time"';

    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log;

    ##
    # Rate Limiting
    ##
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=login_limit:10m rate=5r/m;
    limit_conn_zone $binary_remote_addr zone=conn_limit:10m;

    ##
    # Gzip Settings
    ##
    include /etc/nginx/snippets/gzip.conf;

    ##
    # Virtual Host Configs
    ##
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
EOF

    # Test and start Nginx
    nginx -t
    systemctl restart nginx
    systemctl enable nginx

    log_success "Nginx installed and configured"
}

#-------------------------------------------------------------------------------
# Install Certbot
#-------------------------------------------------------------------------------
install_certbot() {
    log_info "Installing Certbot for SSL certificates..."

    apt-get install -y certbot python3-certbot-nginx

    # Create renewal hook script
    mkdir -p /etc/letsencrypt/renewal-hooks/post
    cat > /etc/letsencrypt/renewal-hooks/post/reload-nginx.sh << 'EOF'
#!/bin/bash
systemctl reload nginx
EOF
    chmod +x /etc/letsencrypt/renewal-hooks/post/reload-nginx.sh

    # Set up automatic renewal
    systemctl enable certbot.timer
    systemctl start certbot.timer

    log_success "Certbot installed"
    log_info "To obtain SSL certificates, run:"
    log_info "  sudo certbot --nginx -d flamoral.com -d www.flamoral.com -d api.flamoral.com -d ws.flamoral.com"
}

#-------------------------------------------------------------------------------
# Configure UFW Firewall
#-------------------------------------------------------------------------------
configure_firewall() {
    log_info "Configuring UFW firewall..."

    # Reset UFW to defaults
    ufw --force reset

    # Set default policies
    ufw default deny incoming
    ufw default allow outgoing

    # Allow SSH
    ufw allow 22/tcp comment 'SSH'

    # Allow HTTP and HTTPS
    ufw allow 80/tcp comment 'HTTP'
    ufw allow 443/tcp comment 'HTTPS'

    # Enable UFW
    ufw --force enable

    log_success "UFW firewall configured"
    ufw status verbose
}

#-------------------------------------------------------------------------------
# Install and Configure Fail2ban
#-------------------------------------------------------------------------------
install_fail2ban() {
    log_info "Installing and configuring Fail2ban..."

    apt-get install -y fail2ban

    # Create local configuration
    cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
# Ban hosts for 1 hour
bantime = 3600

# Find time - 10 minutes
findtime = 600

# Max retry attempts
maxretry = 5

# Email settings (configure if needed)
# destemail = admin@flamoral.com
# sender = fail2ban@flamoral.com
# action = %(action_mwl)s

# Ignore local addresses
ignoreip = 127.0.0.1/8 ::1

[sshd]
enabled = true
port = ssh
filter = sshd
logpath = /var/log/auth.log
maxretry = 3
bantime = 86400

[nginx-http-auth]
enabled = true
filter = nginx-http-auth
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 3

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
port = http,https
logpath = /var/log/nginx/error.log
maxretry = 10

[nginx-botsearch]
enabled = true
filter = nginx-botsearch
port = http,https
logpath = /var/log/nginx/access.log
maxretry = 2
EOF

    # Create Nginx limit-req filter
    cat > /etc/fail2ban/filter.d/nginx-limit-req.conf << 'EOF'
[Definition]
failregex = limiting requests, excess:.* by zone.*client: <HOST>
ignoreregex =
EOF

    # Start and enable Fail2ban
    systemctl restart fail2ban
    systemctl enable fail2ban

    log_success "Fail2ban installed and configured"
}

#-------------------------------------------------------------------------------
# Install AWS CLI (for S3 backups)
#-------------------------------------------------------------------------------
install_aws_cli() {
    log_info "Installing AWS CLI for backup management..."

    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "/tmp/awscliv2.zip"
    unzip -q /tmp/awscliv2.zip -d /tmp
    /tmp/aws/install
    rm -rf /tmp/aws /tmp/awscliv2.zip

    log_success "AWS CLI installed"
    log_info "Configure AWS credentials with: aws configure"
}

#-------------------------------------------------------------------------------
# Set Up Log Rotation
#-------------------------------------------------------------------------------
setup_logrotate() {
    log_info "Setting up log rotation..."

    cat > /etc/logrotate.d/flamoral << 'EOF'
/var/log/flamoral/*.log
/var/log/flamoral/**/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 flamoral flamoral
    sharedscripts
    postrotate
        [ -f /var/run/nginx.pid ] && kill -USR1 `cat /var/run/nginx.pid`
    endscript
}
EOF

    log_success "Log rotation configured"
}

#-------------------------------------------------------------------------------
# Final Security Hardening
#-------------------------------------------------------------------------------
security_hardening() {
    log_info "Applying security hardening..."

    # Disable root login via SSH
    sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
    sed -i 's/^#PermitRootLogin prohibit-password/PermitRootLogin no/' /etc/ssh/sshd_config

    # Disable password authentication (enable if using SSH keys)
    # sed -i 's/^#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config

    # Set SSH idle timeout
    echo "ClientAliveInterval 300" >> /etc/ssh/sshd_config
    echo "ClientAliveCountMax 2" >> /etc/ssh/sshd_config

    # Restart SSH
    systemctl restart sshd

    # Set secure permissions on sensitive files
    chmod 600 /etc/ssh/sshd_config

    # Disable unused network protocols
    cat >> /etc/sysctl.conf << 'EOF'

# Flamoral Security Hardening
# Disable IPv6 (if not needed)
# net.ipv6.conf.all.disable_ipv6 = 1
# net.ipv6.conf.default.disable_ipv6 = 1

# Enable SYN flood protection
net.ipv4.tcp_syncookies = 1

# Disable source routing
net.ipv4.conf.all.accept_source_route = 0
net.ipv4.conf.default.accept_source_route = 0

# Enable reverse path filtering
net.ipv4.conf.all.rp_filter = 1
net.ipv4.conf.default.rp_filter = 1

# Ignore ICMP redirects
net.ipv4.conf.all.accept_redirects = 0
net.ipv4.conf.default.accept_redirects = 0

# Ignore send redirects
net.ipv4.conf.all.send_redirects = 0
net.ipv4.conf.default.send_redirects = 0

# Log martians
net.ipv4.conf.all.log_martians = 1
EOF

    sysctl -p

    log_success "Security hardening applied"
}

#-------------------------------------------------------------------------------
# Print Summary
#-------------------------------------------------------------------------------
print_summary() {
    echo ""
    echo "==============================================================================="
    echo -e "${GREEN}Flamoral Server Bootstrap Complete!${NC}"
    echo "==============================================================================="
    echo ""
    echo "Installed Components:"
    echo "  - Node.js ${NODE_VERSION} (via nvm)"
    echo "  - PM2 (process manager)"
    echo "  - PostgreSQL ${POSTGRES_VERSION}"
    echo "  - Redis ${REDIS_VERSION}"
    echo "  - Nginx (reverse proxy)"
    echo "  - Certbot (SSL certificates)"
    echo "  - UFW (firewall)"
    echo "  - Fail2ban (intrusion prevention)"
    echo "  - AWS CLI (for backups)"
    echo ""
    echo "Created User: ${FLAMORAL_USER}"
    echo ""
    echo "Directory Structure:"
    echo "  - Application: ${APP_DIR}"
    echo "  - Logs: ${LOG_DIR}"
    echo "  - Backups: ${BACKUP_DIR}"
    echo ""
    echo "==============================================================================="
    echo -e "${YELLOW}IMPORTANT: Complete these steps manually:${NC}"
    echo "==============================================================================="
    echo ""
    echo "1. Change PostgreSQL password:"
    echo "   sudo -u postgres psql -c \"ALTER USER flamoral PASSWORD 'your-secure-password';\""
    echo ""
    echo "2. Change Redis password in /etc/redis/redis.conf"
    echo "   Then restart Redis: sudo systemctl restart redis-server"
    echo ""
    echo "3. Copy Nginx configuration:"
    echo "   sudo cp /path/to/flamoral.conf /etc/nginx/sites-available/"
    echo "   sudo ln -s /etc/nginx/sites-available/flamoral.conf /etc/nginx/sites-enabled/"
    echo "   sudo nginx -t && sudo systemctl reload nginx"
    echo ""
    echo "4. Obtain SSL certificates:"
    echo "   sudo certbot --nginx -d flamoral.com -d www.flamoral.com -d api.flamoral.com -d ws.flamoral.com"
    echo ""
    echo "5. Configure AWS CLI for backups:"
    echo "   aws configure"
    echo ""
    echo "6. Set up SSH keys for the flamoral user"
    echo ""
    echo "7. Clone your repository and set up the application"
    echo ""
    echo "==============================================================================="
}

#-------------------------------------------------------------------------------
# Main Execution
#-------------------------------------------------------------------------------
main() {
    log_info "Starting Flamoral server bootstrap..."
    echo ""

    check_root
    update_system
    install_essentials
    create_user
    setup_directories
    install_nodejs
    install_pm2
    install_postgresql
    install_redis
    install_nginx
    install_certbot
    configure_firewall
    install_fail2ban
    install_aws_cli
    setup_logrotate
    security_hardening
    print_summary
}

# Run main function
main "$@"

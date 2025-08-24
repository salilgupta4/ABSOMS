#!/bin/bash

# ABS OMS VPS Deployment with SSH Key + Passphrase
# Using expect to handle SSH key passphrase
# Username: root, Server: 213.210.21.76, Domain: adaptec.pro

set -e

# Configuration
VPS_IP="213.210.21.76"
SSH_USER="root"
DOMAIN="adaptec.pro"
APP_DIR="/var/www/$DOMAIN"
DB_NAME="abs_oms"
DB_USER="abs_oms_user"

# Credentials
SSH_PASSPHRASE="almora"
MYSQL_ROOT_PASSWORD="SecureMySQLRoot2024!"
DB_PASSWORD="SecureDBUser2024!"
JWT_SECRET="my-super-secure-jwt-secret-key-with-32-plus-characters-for-abs-oms"
SSL_EMAIL="salil@adaptec.in"
REPO_URL="https://github.com/salilgupta4/ABSOMS.git"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

echo -e "${BLUE}🚀 ABS OMS VPS Deployment (SSH Key + Passphrase)${NC}"
echo -e "${BLUE}===============================================${NC}"

# Create expect script for SSH key authentication
log_info "Setting up SSH key authentication with passphrase..."

cat > /tmp/ssh_setup.exp << 'EOF'
#!/usr/bin/expect -f
set timeout 30

# Start SSH agent if not running
spawn ssh-agent bash
expect -re "SSH_AUTH_SOCK=.*; export SSH_AUTH_SOCK;"
set ssh_auth_sock $expect_out(0,string)
eval $ssh_auth_sock

# Add SSH key with passphrase
spawn ssh-add ~/.ssh/id_ed25519
expect {
    "Enter passphrase for" {
        send "almora\r"
        expect {
            "Identity added" {
                puts "SSH key added successfully"
                exit 0
            }
            "Bad passphrase" {
                puts "Bad passphrase"
                exit 1
            }
            timeout {
                puts "Timeout adding SSH key"
                exit 1
            }
        }
    }
    "Could not open" {
        puts "SSH key file not found"
        exit 1
    }
    timeout {
        puts "Timeout waiting for passphrase prompt"
        exit 1
    }
}
EOF

chmod +x /tmp/ssh_setup.exp

# Run SSH setup
if /tmp/ssh_setup.exp; then
    log_success "SSH key setup successful!"
else
    log_error "SSH key setup failed"
    rm -f /tmp/ssh_setup.exp
    exit 1
fi

# Test SSH connection
log_info "Testing SSH connection..."
if ssh -o ConnectTimeout=10 -o BatchMode=yes root@$VPS_IP "echo 'SSH connection successful!'" 2>/dev/null; then
    log_success "SSH key authentication working!"
else
    log_error "SSH key authentication failed"
    rm -f /tmp/ssh_setup.exp
    exit 1
fi

# Create deployment script
log_info "Creating deployment script..."

cat > /tmp/vps_setup.sh << EOF
#!/bin/bash
set -e

echo "🔄 Starting ABS OMS deployment on \$(hostname)..."

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Node.js 18.x
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

echo "✅ Node.js version: \$(node --version)"
echo "✅ NPM version: \$(npm --version)"

# Install MySQL
echo "📦 Installing MySQL..."
export DEBIAN_FRONTEND=noninteractive
apt install -y mysql-server

# Install additional tools
echo "📦 Installing additional tools..."
apt install -y git nginx certbot python3-certbot-nginx unzip htop curl wget

# Secure MySQL installation
echo "🔐 Securing MySQL installation..."
mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '$MYSQL_ROOT_PASSWORD';"
mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DELETE FROM mysql.user WHERE User='';"
mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');"
mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DROP DATABASE IF EXISTS test;"
mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DELETE FROM mysql.db WHERE Db='test' OR Db='test\\\\_%';"
mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "FLUSH PRIVILEGES;"

echo "✅ MySQL secured successfully"

# Create database and user
echo "🗄️  Setting up database..."
mysql -u root -p"$MYSQL_ROOT_PASSWORD" << MYSQL_SCRIPT
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
MYSQL_SCRIPT

echo "✅ Database $DB_NAME created with user $DB_USER"

# Create application directory
echo "📁 Creating application directory..."
mkdir -p $APP_DIR
cd $APP_DIR

# Clone repository
echo "📥 Cloning repository..."
if [ -d ".git" ]; then
    echo "Repository exists, pulling latest changes..."
    git pull origin OMSSQL
else
    echo "Cloning fresh repository..."
    git clone $REPO_URL .
    git checkout OMSSQL
fi

echo "✅ Repository cloned/updated successfully"

# Install PM2 globally
echo "📦 Installing PM2..."
npm install -g pm2

# Install dependencies
echo "📦 Installing application dependencies..."
npm install

echo "✅ Dependencies installed successfully"

# Create environment file
echo "⚙️  Creating environment configuration..."
cat > .env << ENV_FILE
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME
DB_CONNECTION_LIMIT=20

# JWT Configuration
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h

# Application Configuration
NODE_ENV=production
PORT=3000
API_BASE_URL=https://$DOMAIN/api
FRONTEND_URL=https://$DOMAIN

# Security Settings
SESSION_TIMEOUT=24h
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=15m

# Logging
LOG_LEVEL=info
LOG_QUERIES=false

# Backup Configuration
BACKUP_DIR=/backups
BACKUP_RETENTION_DAYS=30
ENV_FILE

chmod 600 .env
echo "✅ Environment file created"

# Load database schema
echo "🗄️  Loading database schema..."
if [ -f "database/schema.sql" ]; then
    mysql -u $DB_USER -p"$DB_PASSWORD" $DB_NAME < database/schema.sql
    echo "✅ Database schema loaded successfully"
else
    echo "⚠️  No database schema file found - will need manual setup"
fi

# Build application
echo "🔨 Building application..."
npm run build

echo "✅ Application built successfully"

# Create log directory
mkdir -p /var/log/abs-oms
chown -R www-data:www-data /var/log/abs-oms

# Configure Nginx
echo "🌐 Configuring Nginx..."
cat > /etc/nginx/sites-available/$DOMAIN << NGINX_CONFIG
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\$host;
        proxy_set_header X-Real-IP \\$remote_addr;
        proxy_set_header X-Forwarded-For \\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\$scheme;
        proxy_cache_bypass \\$http_upgrade;
        
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        client_max_body_size 50M;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;
}
NGINX_CONFIG

# Enable site
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t
echo "✅ Nginx configured successfully"

# Start services
echo "🚀 Starting services..."
systemctl restart nginx
systemctl enable nginx
echo "✅ Nginx started"

# Set proper ownership
chown -R www-data:www-data $APP_DIR

# Start application with PM2
echo "🚀 Starting application with PM2..."
su -s /bin/bash www-data -c "cd $APP_DIR && pm2 start ecosystem.config.js --name abs-oms"
su -s /bin/bash www-data -c "pm2 startup"
su -s /bin/bash www-data -c "pm2 save"
echo "✅ Application started with PM2"

# Setup firewall
echo "🔐 Configuring firewall..."
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
echo "✅ Firewall configured"

# Install SSL certificate
echo "🔒 Installing SSL certificate..."
certbot --nginx --non-interactive --agree-tos --email $SSL_EMAIL -d $DOMAIN -d www.$DOMAIN && echo "✅ SSL certificate installed" || echo "⚠️  SSL may need manual setup after DNS propagation"

# Create backup script
echo "💾 Setting up backup system..."
mkdir -p /backups
cat > /opt/backup-db.sh << BACKUP_SCRIPT
#!/bin/bash
DATE=\\$(date +%Y%m%d_%H%M%S)
mysqldump -u $DB_USER -p'$DB_PASSWORD' $DB_NAME > /backups/abs_oms_\\$DATE.sql
gzip /backups/abs_oms_\\$DATE.sql
find /backups -name "abs_oms_*.sql.gz" -mtime +30 -delete
echo "Database backup completed: abs_oms_\\$DATE.sql.gz"
BACKUP_SCRIPT

chmod +x /opt/backup-db.sh
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/backup-db.sh >> /var/log/backup.log 2>&1") | crontab -

# Create update script
cat > /opt/update-app.sh << UPDATE_SCRIPT
#!/bin/bash
cd $APP_DIR
echo "Pulling latest changes..."
git pull origin OMSSQL
echo "Installing dependencies..."
npm install
echo "Building application..."
npm run build
echo "Restarting application..."
su -s /bin/bash www-data -c "pm2 restart abs-oms"
echo "Application updated successfully!"
UPDATE_SCRIPT

chmod +x /opt/update-app.sh
echo "✅ Backup and update scripts created"

echo ""
echo "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo "=================================="
echo "🌐 Your application: https://$DOMAIN"
echo "📊 Service Status:"
systemctl status nginx --no-pager -l | head -3
echo ""
su -s /bin/bash www-data -c "pm2 status"
echo ""
echo "✅ Your ABS OMS system is now LIVE!"

EOF

# Copy and execute deployment script
log_info "Copying deployment script to VPS..."
scp /tmp/vps_setup.sh root@$VPS_IP:/tmp/

log_info "Executing deployment on VPS..."
ssh root@$VPS_IP "chmod +x /tmp/vps_setup.sh && /tmp/vps_setup.sh"

# Clean up
rm -f /tmp/vps_setup.sh /tmp/ssh_setup.exp

log_success "🎉 DEPLOYMENT COMPLETED SUCCESSFULLY!"
echo
echo -e "${GREEN}📋 FINAL SUMMARY${NC}"
echo -e "${GREEN}===============${NC}"
echo -e "🌐 Application URL: ${BLUE}https://$DOMAIN${NC}"
echo -e "👤 Database: ${BLUE}$DB_NAME${NC}"
echo -e "🔐 Database User: ${BLUE}$DB_USER${NC}"
echo -e "📧 SSL Email: ${BLUE}$SSL_EMAIL${NC}"
echo
echo -e "${YELLOW}🎯 NEXT STEPS:${NC}"
echo -e "1. Wait 5-10 minutes for DNS/SSL propagation"
echo -e "2. Visit https://$DOMAIN"
echo -e "3. Your ABS OMS system should be fully operational!"
echo
echo -e "${GREEN}✅ Your professional ERP system is now LIVE at https://$DOMAIN!${NC}"
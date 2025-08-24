#!/bin/bash

# ABS OMS Automated VPS Deployment Script
# For Hostinger VPS with HestiaCP on Ubuntu 22.04
# Domain: adaptec.pro
# Server: 213.210.21.76

set -e  # Exit on any error

# Configuration
VPS_IP="213.210.21.76"
DOMAIN="adaptec.pro"
APP_DIR="/var/www/$DOMAIN"
DB_NAME="abs_oms"
DB_USER="abs_oms_user"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 ABS OMS Automated VPS Deployment${NC}"
echo -e "${BLUE}====================================${NC}"

# Function to print colored output
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Function to run commands on VPS
run_remote() {
    ssh root@$VPS_IP "$1"
}

# Function to copy files to VPS
copy_to_vps() {
    scp -r "$1" root@$VPS_IP:"$2"
}

# Collect required information
log_info "Collecting deployment information..."

read -p "Enter VPS root password: " -s VPS_PASSWORD
echo
read -p "Enter MySQL root password (will be created): " -s MYSQL_ROOT_PASSWORD
echo
read -p "Enter MySQL app user password: " -s DB_PASSWORD
echo
read -p "Enter JWT secret (min 32 chars): " JWT_SECRET
echo
read -p "Enter your email for SSL certificate: " SSL_EMAIL
echo
read -p "Enter GitHub repository URL: " REPO_URL
echo

if [ ${#JWT_SECRET} -lt 32 ]; then
    log_error "JWT secret must be at least 32 characters long"
    exit 1
fi

log_info "Starting deployment to $DOMAIN ($VPS_IP)..."

# Test SSH connection
log_info "Testing SSH connection..."
if sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no root@$VPS_IP "echo 'SSH connection successful'"; then
    log_success "SSH connection established"
else
    log_error "Failed to connect to VPS. Check IP and password."
    exit 1
fi

# Create deployment script on VPS
log_info "Creating deployment script on VPS..."

cat > /tmp/vps_setup.sh << 'EOF'
#!/bin/bash
set -e

# Configuration variables will be replaced
VPS_IP="__VPS_IP__"
DOMAIN="__DOMAIN__"
APP_DIR="__APP_DIR__"
DB_NAME="__DB_NAME__"
DB_USER="__DB_USER__"
DB_PASSWORD="__DB_PASSWORD__"
MYSQL_ROOT_PASSWORD="__MYSQL_ROOT_PASSWORD__"
JWT_SECRET="__JWT_SECRET__"
SSL_EMAIL="__SSL_EMAIL__"
REPO_URL="__REPO_URL__"

echo "🔄 Starting server setup..."

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Node.js 18.x
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# Install MySQL
echo "📦 Installing MySQL..."
export DEBIAN_FRONTEND=noninteractive
apt install -y mysql-server

# Install additional tools
echo "📦 Installing additional tools..."
apt install -y git nginx certbot python3-certbot-nginx unzip htop

# Secure MySQL installation
echo "🔐 Securing MySQL installation..."
mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '$MYSQL_ROOT_PASSWORD';"
mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DELETE FROM mysql.user WHERE User='';"
mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');"
mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DROP DATABASE IF EXISTS test;"
mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';"
mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "FLUSH PRIVILEGES;"

# Create database and user
echo "🗄️  Setting up database..."
mysql -u root -p"$MYSQL_ROOT_PASSWORD" << MYSQL_SCRIPT
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
MYSQL_SCRIPT

# Create application directory
echo "📁 Creating application directory..."
mkdir -p $APP_DIR
cd $APP_DIR

# Clone repository
echo "📥 Cloning repository..."
if [ -d ".git" ]; then
    git pull origin OMSSQL
else
    git clone $REPO_URL .
    git checkout OMSSQL
fi

# Install PM2 globally
echo "📦 Installing PM2..."
npm install -g pm2

# Install dependencies
echo "📦 Installing application dependencies..."
npm install

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

# Set proper permissions
chown -R www-data:www-data $APP_DIR
chmod 600 $APP_DIR/.env

# Initialize database
echo "🗄️  Initializing database..."
npm run db:init << DB_INIT
Admin User
admin@$DOMAIN
SecureAdmin123
DB_INIT

# Build application
echo "🔨 Building application..."
npm run build

# Create PM2 ecosystem file
echo "⚙️  Creating PM2 configuration..."
cat > ecosystem.config.js << PM2_CONFIG
module.exports = {
  apps: [{
    name: 'abs-oms',
    script: 'dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/abs-oms/error.log',
    out_file: '/var/log/abs-oms/out.log',
    log_file: '/var/log/abs-oms/combined.log',
    time: true,
    max_memory_restart: '1G'
  }]
};
PM2_CONFIG

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
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # Increase timeout for large operations
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
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
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss;
}
NGINX_CONFIG

# Enable site
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Start services
echo "🚀 Starting services..."
systemctl restart nginx
systemctl enable nginx

# Start application with PM2
pm2 start ecosystem.config.js
pm2 startup
pm2 save

# Setup firewall
echo "🔐 Configuring firewall..."
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'

# Install SSL certificate
echo "🔒 Installing SSL certificate..."
certbot --nginx --non-interactive --agree-tos --email $SSL_EMAIL -d $DOMAIN -d www.$DOMAIN

# Create backup script
echo "💾 Setting up backup system..."
mkdir -p /backups
cat > /opt/backup-db.sh << BACKUP_SCRIPT
#!/bin/bash
DATE=\$(date +%Y%m%d_%H%M%S)
mysqldump -u $DB_USER -p'$DB_PASSWORD' $DB_NAME > /backups/abs_oms_\$DATE.sql
gzip /backups/abs_oms_\$DATE.sql
find /backups -name "abs_oms_*.sql.gz" -mtime +30 -delete
echo "Database backup completed: abs_oms_\$DATE.sql.gz"
BACKUP_SCRIPT

chmod +x /opt/backup-db.sh

# Add to crontab
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
pm2 restart abs-oms
echo "Application updated successfully!"
UPDATE_SCRIPT

chmod +x /opt/update-app.sh

# Final status check
echo "✅ Deployment completed successfully!"
echo "🌐 Your application should be accessible at: https://$DOMAIN"
echo "👤 Admin login: admin@$DOMAIN / SecureAdmin123"
echo ""
echo "📊 Service Status:"
systemctl status nginx --no-pager -l
echo ""
pm2 status
echo ""
echo "🔧 Useful commands:"
echo "- View logs: pm2 logs abs-oms"
echo "- Restart app: pm2 restart abs-oms"
echo "- Update app: /opt/update-app.sh"
echo "- Backup DB: /opt/backup-db.sh"
echo ""
echo "⚠️  Please change the default admin password after first login!"

EOF

# Replace variables in the script
sed -i "s|__VPS_IP__|$VPS_IP|g" /tmp/vps_setup.sh
sed -i "s|__DOMAIN__|$DOMAIN|g" /tmp/vps_setup.sh
sed -i "s|__APP_DIR__|$APP_DIR|g" /tmp/vps_setup.sh
sed -i "s|__DB_NAME__|$DB_NAME|g" /tmp/vps_setup.sh
sed -i "s|__DB_USER__|$DB_USER|g" /tmp/vps_setup.sh
sed -i "s|__DB_PASSWORD__|$DB_PASSWORD|g" /tmp/vps_setup.sh
sed -i "s|__MYSQL_ROOT_PASSWORD__|$MYSQL_ROOT_PASSWORD|g" /tmp/vps_setup.sh
sed -i "s|__JWT_SECRET__|$JWT_SECRET|g" /tmp/vps_setup.sh
sed -i "s|__SSL_EMAIL__|$SSL_EMAIL|g" /tmp/vps_setup.sh
sed -i "s|__REPO_URL__|$REPO_URL|g" /tmp/vps_setup.sh

# Copy script to VPS
log_info "Copying deployment script to VPS..."
sshpass -p "$VPS_PASSWORD" scp /tmp/vps_setup.sh root@$VPS_IP:/tmp/

# Execute deployment script on VPS
log_info "Executing deployment on VPS..."
sshpass -p "$VPS_PASSWORD" ssh root@$VPS_IP "chmod +x /tmp/vps_setup.sh && /tmp/vps_setup.sh"

# Clean up
rm -f /tmp/vps_setup.sh

log_success "🎉 Deployment completed successfully!"
echo
echo -e "${GREEN}📋 DEPLOYMENT SUMMARY${NC}"
echo -e "${GREEN}===================${NC}"
echo -e "🌐 Application URL: ${BLUE}https://$DOMAIN${NC}"
echo -e "👤 Admin Email: ${BLUE}admin@$DOMAIN${NC}"
echo -e "🔑 Admin Password: ${BLUE}SecureAdmin123${NC}"
echo -e "🗄️  Database: ${BLUE}$DB_NAME${NC}"
echo -e "🔐 Database User: ${BLUE}$DB_USER${NC}"
echo
echo -e "${YELLOW}⚠️  IMPORTANT NEXT STEPS:${NC}"
echo -e "1. Visit https://$DOMAIN and log in"
echo -e "2. Change the default admin password"
echo -e "3. Configure company details in Settings"
echo -e "4. Test all functionality"
echo -e "5. Set up monitoring alerts"
echo
echo -e "${GREEN}🔧 USEFUL SSH COMMANDS:${NC}"
echo -e "ssh root@$VPS_IP"
echo -e "pm2 logs abs-oms                 # View application logs"
echo -e "pm2 status                       # Check application status"
echo -e "/opt/update-app.sh               # Update application"
echo -e "/opt/backup-db.sh                # Manual database backup"
echo -e "systemctl status nginx           # Check web server"
echo
echo -e "${GREEN}✅ Your ABS OMS system is now live!${NC}"
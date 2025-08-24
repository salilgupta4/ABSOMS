#!/bin/bash

# ABS OMS VPS Deployment with Password Authentication
# Username: root
# Server: 213.210.21.76
# Domain: adaptec.pro

set -e

# Configuration
VPS_IP="213.210.21.76"
SSH_USER="root"
DOMAIN="adaptec.pro"
APP_DIR="/var/www/$DOMAIN"
DB_NAME="abs_oms"
DB_USER="abs_oms_user"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

echo -e "${BLUE}🚀 ABS OMS VPS Deployment (Password Auth)${NC}"
echo -e "${BLUE}========================================${NC}"

# Check for sshpass
if ! command -v sshpass >/dev/null 2>&1; then
    log_warning "Installing sshpass for password authentication..."
    if command -v brew >/dev/null 2>&1; then
        brew install hudochenkov/sshpass/sshpass
    else
        log_error "Please install sshpass manually"
        exit 1
    fi
fi

# Get VPS password
log_info "Please enter your VPS root password:"
read -p "Root password: " -s VPS_PASSWORD
echo ""

# Test SSH connection
log_info "Testing SSH connection to $SSH_USER@$VPS_IP..."
if sshpass -p "$VPS_PASSWORD" ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no $SSH_USER@$VPS_IP "echo 'SSH connection successful!'" 2>/dev/null; then
    log_success "Password authentication working!"
else
    log_error "SSH connection failed. Please check your password and try again."
    exit 1
fi

# Collect deployment information
log_info "Collecting deployment configuration..."

read -p "Enter MySQL root password (will be created): " -s MYSQL_ROOT_PASSWORD
echo
read -p "Enter MySQL app user password: " -s DB_PASSWORD
echo
read -p "Enter JWT secret (min 32 chars): " JWT_SECRET
echo
read -p "Enter your email for SSL certificate: " SSL_EMAIL
echo

# Default to your GitHub repo
REPO_URL="https://github.com/salilgupta4/ABSOMS.git"
read -p "GitHub repository URL [$REPO_URL]: " input_repo
REPO_URL=${input_repo:-$REPO_URL}
echo

if [ ${#JWT_SECRET} -lt 32 ]; then
    log_error "JWT secret must be at least 32 characters long"
    exit 1
fi

# Create deployment script
log_info "Creating deployment script..."

cat > /tmp/vps_setup.sh << 'EOF'
#!/bin/bash
set -e

# Configuration
DOMAIN="__DOMAIN__"
APP_DIR="__APP_DIR__"
DB_NAME="__DB_NAME__"
DB_USER="__DB_USER__"
DB_PASSWORD="__DB_PASSWORD__"
MYSQL_ROOT_PASSWORD="__MYSQL_ROOT_PASSWORD__"
JWT_SECRET="__JWT_SECRET__"
SSL_EMAIL="__SSL_EMAIL__"
REPO_URL="__REPO_URL__"

echo "🔄 Starting ABS OMS deployment..."

# Update system
echo "📦 Updating system packages..."
apt update && apt upgrade -y

# Install Node.js 18.x
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verify Node.js installation
echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"

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
chmod 600 .env

# Load database schema
echo "🗄️  Loading database schema..."
if [ -f "database/schema.sql" ]; then
    mysql -u $DB_USER -p"$DB_PASSWORD" $DB_NAME < database/schema.sql
    echo "Database schema loaded successfully"
else
    echo "No database schema file found at database/schema.sql"
fi

# Build application
echo "🔨 Building application..."
npm run build

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
        
        # Increase timeout
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        
        # Handle large requests
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

# Start services
echo "🚀 Starting services..."
systemctl restart nginx
systemctl enable nginx

# Set proper ownership for app directory
chown -R www-data:www-data $APP_DIR

# Start application with PM2 as www-data
echo "🚀 Starting application..."
su -s /bin/bash www-data -c "cd $APP_DIR && pm2 start ecosystem.config.js --name abs-oms"
su -s /bin/bash www-data -c "pm2 startup"
su -s /bin/bash www-data -c "pm2 save"

# Setup firewall
echo "🔐 Configuring firewall..."
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'

# Install SSL certificate
echo "🔒 Installing SSL certificate..."
sleep 5  # Wait for DNS propagation
certbot --nginx --non-interactive --agree-tos --email $SSL_EMAIL -d $DOMAIN -d www.$DOMAIN || echo "SSL installation may need manual setup after DNS propagation"

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

# Add to crontab for daily backups
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

# Final status check
echo ""
echo "✅ Deployment completed successfully!"
echo "🌐 Your application should be accessible at: http://$DOMAIN"
echo "🔒 SSL: https://$DOMAIN (may take a few minutes for DNS propagation)"
echo ""
echo "📊 Service Status:"
systemctl status nginx --no-pager -l | head -5
echo ""
su -s /bin/bash www-data -c "pm2 status"
echo ""
echo "🔧 Useful commands:"
echo "- View logs: su -s /bin/bash www-data -c 'pm2 logs abs-oms'"
echo "- Restart app: su -s /bin/bash www-data -c 'pm2 restart abs-oms'"
echo "- Update app: /opt/update-app.sh"
echo "- Backup DB: /opt/backup-db.sh"
echo ""
echo "🎯 Next Steps:"
echo "1. Wait for DNS propagation"
echo "2. Visit https://$DOMAIN"
echo "3. Set up admin user if needed"
echo ""

EOF

# Replace variables
sed -i.bak "s|__DOMAIN__|$DOMAIN|g" /tmp/vps_setup.sh
sed -i.bak "s|__APP_DIR__|$APP_DIR|g" /tmp/vps_setup.sh
sed -i.bak "s|__DB_NAME__|$DB_NAME|g" /tmp/vps_setup.sh
sed -i.bak "s|__DB_USER__|$DB_USER|g" /tmp/vps_setup.sh
sed -i.bak "s|__DB_PASSWORD__|$DB_PASSWORD|g" /tmp/vps_setup.sh
sed -i.bak "s|__MYSQL_ROOT_PASSWORD__|$MYSQL_ROOT_PASSWORD|g" /tmp/vps_setup.sh
sed -i.bak "s|__JWT_SECRET__|$JWT_SECRET|g" /tmp/vps_setup.sh
sed -i.bak "s|__SSL_EMAIL__|$SSL_EMAIL|g" /tmp/vps_setup.sh
sed -i.bak "s|__REPO_URL__|$REPO_URL|g" /tmp/vps_setup.sh

# Copy and execute deployment script
log_info "Copying deployment script to VPS..."
sshpass -p "$VPS_PASSWORD" scp -o StrictHostKeyChecking=no /tmp/vps_setup.sh root@$VPS_IP:/tmp/

log_info "Executing deployment on VPS..."
sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no root@$VPS_IP "chmod +x /tmp/vps_setup.sh && /tmp/vps_setup.sh"

# Clean up
rm -f /tmp/vps_setup.sh /tmp/vps_setup.sh.bak

log_success "🎉 Deployment completed!"
echo
echo -e "${GREEN}📋 DEPLOYMENT SUMMARY${NC}"
echo -e "${GREEN}===================${NC}"
echo -e "🌐 Application URL: ${BLUE}https://$DOMAIN${NC}"
echo -e "🗄️  Database: ${BLUE}$DB_NAME${NC}"
echo -e "🔐 Database User: ${BLUE}$DB_USER${NC}"
echo
echo -e "${YELLOW}⚠️  NEXT STEPS:${NC}"
echo -e "1. Wait for DNS propagation (5-10 minutes)"
echo -e "2. Visit https://$DOMAIN"
echo -e "3. Complete application setup if needed"
echo
echo -e "${GREEN}🔧 SSH COMMANDS:${NC}"
echo -e "ssh root@$VPS_IP"
echo -e "su -s /bin/bash www-data -c 'pm2 logs abs-oms'"
echo -e "su -s /bin/bash www-data -c 'pm2 status'"
echo -e "/opt/update-app.sh"
echo
echo -e "${GREEN}✅ Your ABS OMS system should now be live!${NC}"
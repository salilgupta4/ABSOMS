#!/bin/bash

# Simple VPS Deployment - Direct SSH with Password
# All credentials hardcoded for automation

set -e

# Configuration  
VPS_IP="213.210.21.76"
SSH_USER="root"
DOMAIN="adaptec.pro"
APP_DIR="/var/www/$DOMAIN"
DB_NAME="abs_oms"
DB_USER="abs_oms_user"

# Credentials
VPS_PASSWORD="Salilgupta2114#"
MYSQL_ROOT_PASSWORD="SecureMySQLRoot2024!"
DB_PASSWORD="SecureDBUser2024!"
JWT_SECRET="my-super-secure-jwt-secret-key-with-32-plus-characters-for-abs-oms"
SSL_EMAIL="salil@adaptec.in"
REPO_URL="https://github.com/salilgupta4/ABSOMS.git"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }

echo -e "${BLUE}🚀 ABS OMS Simple VPS Deployment${NC}"
echo -e "${BLUE}================================${NC}"

# Install sshpass if needed
if ! command -v sshpass >/dev/null 2>&1; then
    log_info "Installing sshpass..."
    brew install hudochenkov/sshpass/sshpass
fi

# Test connection
log_info "Testing VPS connection..."
if sshpass -p "$VPS_PASSWORD" ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no root@$VPS_IP "echo 'Connection successful'"; then
    log_success "VPS connection working!"
else
    echo "❌ Connection failed"
    exit 1
fi

# Execute deployment directly on VPS
log_info "Starting deployment..."

sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no root@$VPS_IP << EOF
set -e

echo "🔄 Starting ABS OMS deployment..."

# Update system
echo "📦 Updating packages..."
apt update && apt upgrade -y

# Install Node.js
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

echo "Node.js: \$(node --version), NPM: \$(npm --version)"

# Install MySQL
echo "📦 Installing MySQL..."
export DEBIAN_FRONTEND=noninteractive
apt install -y mysql-server git nginx certbot python3-certbot-nginx

# Setup MySQL
echo "🔐 Setting up MySQL..."
mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '$MYSQL_ROOT_PASSWORD';"
mysql -u root -p'$MYSQL_ROOT_PASSWORD' -e "
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
"

echo "✅ Database setup complete"

# Clone app
echo "📥 Setting up application..."
mkdir -p $APP_DIR
cd $APP_DIR
git clone $REPO_URL .
git checkout OMSSQL

# Install deps
npm install -g pm2
npm install

# Create env
cat > .env << ENV_FILE
DB_HOST=localhost
DB_PORT=3306
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME
JWT_SECRET=$JWT_SECRET
NODE_ENV=production
PORT=3000
API_BASE_URL=https://$DOMAIN/api
FRONTEND_URL=https://$DOMAIN
ENV_FILE

chmod 600 .env

# Load schema if exists
if [ -f "database/schema.sql" ]; then
    mysql -u $DB_USER -p'$DB_PASSWORD' $DB_NAME < database/schema.sql
    echo "✅ Database schema loaded"
fi

# Build app
npm run build
echo "✅ Application built"

# Setup nginx
cat > /etc/nginx/sites-available/$DOMAIN << 'NGINX_CONFIG'
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
    }
}
NGINX_CONFIG

ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t

# Start services
systemctl restart nginx
systemctl enable nginx

# Start app
chown -R www-data:www-data $APP_DIR
su -c "cd $APP_DIR && pm2 start ecosystem.config.js --name abs-oms" www-data
su -c "pm2 startup && pm2 save" www-data

# SSL
certbot --nginx --non-interactive --agree-tos --email $SSL_EMAIL -d $DOMAIN -d www.$DOMAIN || echo "SSL setup later"

# Firewall
ufw --force enable
ufw allow ssh
ufw allow 'Nginx Full'

echo ""
echo "🎉 DEPLOYMENT COMPLETE!"
echo "🌐 Visit: https://$DOMAIN"
pm2 status

EOF

log_success "🎉 Deployment completed!"
echo -e "${GREEN}🌐 Your ABS OMS is now live at: https://$DOMAIN${NC}"
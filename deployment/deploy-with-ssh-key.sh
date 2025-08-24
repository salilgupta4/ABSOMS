#!/bin/bash

# ABS OMS VPS Deployment with SSH Key Authentication
# Username: user
# Server: 213.210.21.76
# Domain: adaptec.pro

set -e

# Configuration
VPS_IP="213.210.21.76"
SSH_USER="user"
SSH_PORT="22"
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

echo -e "${BLUE}🚀 ABS OMS Deployment with SSH Key Authentication${NC}"
echo -e "${BLUE}===============================================${NC}"

# Check for SSH key
if [ ! -f ~/.ssh/id_ed25519 ]; then
    log_error "SSH key not found at ~/.ssh/id_ed25519"
    log_info "Generate one with: ssh-keygen -t ed25519 -C 'your-email@example.com'"
    exit 1
fi

# Step 1: Add SSH key to server (if not already added)
log_info "Step 1: Setting up SSH key authentication..."

echo "First, we need to add your SSH key to the server."
echo "Your public key:"
cat ~/.ssh/id_ed25519.pub
echo ""

read -p "Enter your VPS password to add the SSH key: " -s VPS_PASSWORD
echo ""

log_info "Adding SSH key to server..."

# Install sshpass if not available
if ! command -v sshpass >/dev/null 2>&1; then
    log_warning "Installing sshpass for password authentication..."
    if command -v brew >/dev/null 2>&1; then
        brew install hudochenkov/sshpass/sshpass
    else
        log_error "Please install sshpass manually or use manual key setup"
        log_info "Manual setup:"
        echo "1. ssh user@213.210.21.76"
        echo "2. mkdir -p ~/.ssh"
        echo "3. echo '$(cat ~/.ssh/id_ed25519.pub)' >> ~/.ssh/authorized_keys"
        echo "4. chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys"
        exit 1
    fi
fi

# Copy SSH key to server
log_info "Copying SSH key to server..."
ssh-copy-id -i ~/.ssh/id_ed25519.pub user@$VPS_IP || {
    log_warning "ssh-copy-id failed, trying manual method..."
    sshpass -p "$VPS_PASSWORD" ssh -o StrictHostKeyChecking=no user@$VPS_IP "
        mkdir -p ~/.ssh
        chmod 700 ~/.ssh
    "
    cat ~/.ssh/id_ed25519.pub | sshpass -p "$VPS_PASSWORD" ssh user@$VPS_IP "cat >> ~/.ssh/authorized_keys"
    sshpass -p "$VPS_PASSWORD" ssh user@$VPS_IP "chmod 600 ~/.ssh/authorized_keys"
}

# Test SSH key authentication
log_info "Testing SSH key authentication..."
if ssh -o ConnectTimeout=10 user@$VPS_IP "echo 'SSH key authentication successful'"; then
    log_success "SSH key authentication working!"
else
    log_error "SSH key authentication failed"
    exit 1
fi

# Step 2: Collect deployment information
log_info "Step 2: Collecting deployment configuration..."

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

# Step 3: Create and execute deployment script
log_info "Step 3: Creating deployment script..."

# Function to run commands on VPS
run_remote() {
    ssh user@$VPS_IP "$1"
}

# Create deployment script
cat > /tmp/vps_setup.sh << 'EOF'
#!/bin/bash
set -e

# Configuration variables will be replaced
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
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
echo "📦 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install MySQL
echo "📦 Installing MySQL..."
export DEBIAN_FRONTEND=noninteractive
sudo apt install -y mysql-server

# Install additional tools
echo "📦 Installing additional tools..."
sudo apt install -y git nginx certbot python3-certbot-nginx unzip htop curl wget

# Secure MySQL installation
echo "🔐 Securing MySQL installation..."
sudo mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '$MYSQL_ROOT_PASSWORD';"
sudo mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DELETE FROM mysql.user WHERE User='';"
sudo mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');"
sudo mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DROP DATABASE IF EXISTS test;"
sudo mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';"
sudo mysql -u root -p"$MYSQL_ROOT_PASSWORD" -e "FLUSH PRIVILEGES;"

# Create database and user
echo "🗄️  Setting up database..."
sudo mysql -u root -p"$MYSQL_ROOT_PASSWORD" << MYSQL_SCRIPT
CREATE DATABASE IF NOT EXISTS $DB_NAME CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'localhost' IDENTIFIED BY '$DB_PASSWORD';
GRANT ALL PRIVILEGES ON $DB_NAME.* TO '$DB_USER'@'localhost';
FLUSH PRIVILEGES;
MYSQL_SCRIPT

# Create application directory
echo "📁 Creating application directory..."
sudo mkdir -p $APP_DIR
cd $APP_DIR

# Clone repository
echo "📥 Cloning repository..."
if [ -d ".git" ]; then
    sudo git pull origin OMSSQL
else
    sudo git clone $REPO_URL .
    sudo git checkout OMSSQL
fi

# Install PM2 globally
echo "📦 Installing PM2..."
sudo npm install -g pm2

# Install dependencies
echo "📦 Installing application dependencies..."
sudo npm install

# Create environment file
echo "⚙️  Creating environment configuration..."
sudo tee .env > /dev/null << ENV_FILE
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
sudo chown -R www-data:www-data $APP_DIR
sudo chmod 600 $APP_DIR/.env

# Initialize database (if script exists)
echo "🗄️  Initializing database..."
if [ -f "package.json" ] && npm run | grep -q "db:init"; then
    echo -e "Admin User\nadmin@$DOMAIN\nSecureAdmin123" | sudo npm run db:init || echo "Database initialization may need manual setup"
else
    echo "Database initialization script not found - will need manual setup"
fi

# Build application
echo "🔨 Building application..."
sudo npm run build

# Create log directory
sudo mkdir -p /var/log/abs-oms
sudo chown -R www-data:www-data /var/log/abs-oms

# Configure Nginx
echo "🌐 Configuring Nginx..."
sudo tee /etc/nginx/sites-available/$DOMAIN > /dev/null << NGINX_CONFIG
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
sudo ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Start services
echo "🚀 Starting services..."
sudo systemctl restart nginx
sudo systemctl enable nginx

# Start application with PM2
sudo -u www-data pm2 start ecosystem.config.js --name abs-oms
sudo pm2 startup
sudo pm2 save

# Setup firewall
echo "🔐 Configuring firewall..."
sudo ufw --force enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'

# Install SSL certificate
echo "🔒 Installing SSL certificate..."
sudo certbot --nginx --non-interactive --agree-tos --email $SSL_EMAIL -d $DOMAIN -d www.$DOMAIN || echo "SSL installation failed - may need manual setup"

# Create backup script
echo "💾 Setting up backup system..."
sudo mkdir -p /backups
sudo tee /opt/backup-db.sh > /dev/null << BACKUP_SCRIPT
#!/bin/bash
DATE=\$(date +%Y%m%d_%H%M%S)
mysqldump -u $DB_USER -p'$DB_PASSWORD' $DB_NAME > /backups/abs_oms_\$DATE.sql
gzip /backups/abs_oms_\$DATE.sql
find /backups -name "abs_oms_*.sql.gz" -mtime +30 -delete
echo "Database backup completed: abs_oms_\$DATE.sql.gz"
BACKUP_SCRIPT

sudo chmod +x /opt/backup-db.sh

# Add to crontab
(sudo crontab -l 2>/dev/null; echo "0 2 * * * /opt/backup-db.sh >> /var/log/backup.log 2>&1") | sudo crontab -

# Create update script
sudo tee /opt/update-app.sh > /dev/null << UPDATE_SCRIPT
#!/bin/bash
cd $APP_DIR
echo "Pulling latest changes..."
sudo git pull origin OMSSQL
echo "Installing dependencies..."
sudo npm install
echo "Building application..."
sudo npm run build
echo "Restarting application..."
sudo -u www-data pm2 restart abs-oms
echo "Application updated successfully!"
UPDATE_SCRIPT

sudo chmod +x /opt/update-app.sh

# Final status check
echo "✅ Deployment completed successfully!"
echo "🌐 Your application should be accessible at: https://$DOMAIN"
echo "👤 Admin login: admin@$DOMAIN / SecureAdmin123"
echo ""
echo "📊 Service Status:"
sudo systemctl status nginx --no-pager -l
echo ""
sudo -u www-data pm2 status
echo ""
echo "🔧 Useful commands:"
echo "- View logs: sudo -u www-data pm2 logs abs-oms"
echo "- Restart app: sudo -u www-data pm2 restart abs-oms"
echo "- Update app: sudo /opt/update-app.sh"
echo "- Backup DB: sudo /opt/backup-db.sh"
echo ""
echo "⚠️  Please change the default admin password after first login!"

EOF

# Replace variables in the script
sed -i.bak "s|__DOMAIN__|$DOMAIN|g" /tmp/vps_setup.sh
sed -i.bak "s|__APP_DIR__|$APP_DIR|g" /tmp/vps_setup.sh
sed -i.bak "s|__DB_NAME__|$DB_NAME|g" /tmp/vps_setup.sh
sed -i.bak "s|__DB_USER__|$DB_USER|g" /tmp/vps_setup.sh
sed -i.bak "s|__DB_PASSWORD__|$DB_PASSWORD|g" /tmp/vps_setup.sh
sed -i.bak "s|__MYSQL_ROOT_PASSWORD__|$MYSQL_ROOT_PASSWORD|g" /tmp/vps_setup.sh
sed -i.bak "s|__JWT_SECRET__|$JWT_SECRET|g" /tmp/vps_setup.sh
sed -i.bak "s|__SSL_EMAIL__|$SSL_EMAIL|g" /tmp/vps_setup.sh
sed -i.bak "s|__REPO_URL__|$REPO_URL|g" /tmp/vps_setup.sh

# Copy script to VPS
log_info "Copying deployment script to VPS..."
scp /tmp/vps_setup.sh user@$VPS_IP:/tmp/

# Execute deployment script on VPS
log_info "Executing deployment on VPS..."
ssh user@$VPS_IP "chmod +x /tmp/vps_setup.sh && /tmp/vps_setup.sh"

# Clean up
rm -f /tmp/vps_setup.sh /tmp/vps_setup.sh.bak

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
echo
echo -e "${GREEN}🔧 USEFUL SSH COMMANDS:${NC}"
echo -e "ssh user@$VPS_IP"
echo -e "sudo -u www-data pm2 logs abs-oms     # View application logs"
echo -e "sudo -u www-data pm2 status           # Check application status"
echo -e "sudo /opt/update-app.sh               # Update application"
echo -e "sudo /opt/backup-db.sh                # Manual database backup"
echo -e "sudo systemctl status nginx           # Check web server"
echo
echo -e "${GREEN}✅ Your ABS OMS system is now live at https://$DOMAIN!${NC}"
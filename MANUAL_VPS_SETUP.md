# 🚀 Manual VPS Setup Guide - Fixed Repository

## ✅ Repository Issue Fixed!

The OMSSQL branch is now properly committed and pushed to GitHub. You can continue with manual deployment.

## 📋 Step-by-Step Manual Deployment

### 1. Connect to VPS
```bash
ssh root@213.210.21.76
```

### 2. System Updates
```bash
apt update && apt upgrade -y
```

### 3. Install Node.js 18.x
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
node --version  # Should show v18.x.x
npm --version
```

### 4. Install MySQL
```bash
export DEBIAN_FRONTEND=noninteractive
apt install -y mysql-server
```

### 5. Install Additional Tools
```bash
apt install -y git nginx certbot python3-certbot-nginx unzip htop curl wget
```

### 6. Secure MySQL
```bash
# Set MySQL root password
mysql -e "ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'SecureMySQLRoot2024!';"

# Clean up MySQL installation
mysql -u root -p'SecureMySQLRoot2024!' -e "DELETE FROM mysql.user WHERE User='';"
mysql -u root -p'SecureMySQLRoot2024!' -e "DELETE FROM mysql.user WHERE User='root' AND Host NOT IN ('localhost', '127.0.0.1', '::1');"
mysql -u root -p'SecureMySQLRoot2024!' -e "DROP DATABASE IF EXISTS test;"
mysql -u root -p'SecureMySQLRoot2024!' -e "FLUSH PRIVILEGES;"
```

### 7. Create Database and User
```bash
mysql -u root -p'SecureMySQLRoot2024!' << 'EOF'
CREATE DATABASE IF NOT EXISTS abs_oms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'abs_oms_user'@'localhost' IDENTIFIED BY 'SecureDBUser2024!';
GRANT ALL PRIVILEGES ON abs_oms.* TO 'abs_oms_user'@'localhost';
FLUSH PRIVILEGES;
EOF
```

### 8. Clone Application (FIXED!)
```bash
mkdir -p /var/www/adaptec.pro
cd /var/www/adaptec.pro

# Clone the repository
git clone https://github.com/salilgupta4/ABSOMS.git .

# NOW checkout the OMSSQL branch (this will work now!)
git checkout OMSSQL

# Verify you're on the right branch
git branch
```

### 9. Install PM2 and Dependencies
```bash
npm install -g pm2
npm install
```

### 10. Create Environment File
```bash
cat > .env << 'EOF'
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=abs_oms_user
DB_PASSWORD=SecureDBUser2024!
DB_NAME=abs_oms
DB_CONNECTION_LIMIT=20

# JWT Configuration
JWT_SECRET=my-super-secure-jwt-secret-key-with-32-plus-characters-for-abs-oms
JWT_EXPIRES_IN=24h

# Application Configuration
NODE_ENV=production
PORT=3000
API_BASE_URL=https://adaptec.pro/api
FRONTEND_URL=https://adaptec.pro

# Security Settings
SESSION_TIMEOUT=24h
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=15m
EOF

chmod 600 .env
```

### 11. Load Database Schema
```bash
# Check if schema file exists
ls -la database/

# If schema.sql exists, load it:
mysql -u abs_oms_user -p'SecureDBUser2024!' abs_oms < database/schema.sql
```

### 12. Build Application
```bash
npm run build
```

### 13. Configure Nginx
```bash
cat > /etc/nginx/sites-available/adaptec.pro << 'EOF'
server {
    listen 80;
    server_name adaptec.pro www.adaptec.pro;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
        client_max_body_size 50M;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/adaptec.pro /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test configuration
nginx -t
```

### 14. Start Services
```bash
# Start Nginx
systemctl restart nginx
systemctl enable nginx

# Set proper ownership
mkdir -p /var/log/abs-oms
chown -R www-data:www-data /var/www/adaptec.pro
chown -R www-data:www-data /var/log/abs-oms

# Start application with PM2
su -s /bin/bash www-data -c "cd /var/www/adaptec.pro && pm2 start ecosystem.config.js --name abs-oms"
su -s /bin/bash www-data -c "pm2 startup"
su -s /bin/bash www-data -c "pm2 save"
```

### 15. Setup Firewall
```bash
ufw --force enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
```

### 16. Install SSL Certificate
```bash
certbot --nginx --non-interactive --agree-tos --email salil@adaptec.in -d adaptec.pro -d www.adaptec.pro
```

## 🎯 Verify Deployment

### Check Services
```bash
# Check Nginx
systemctl status nginx

# Check application
su -s /bin/bash www-data -c "pm2 status"
su -s /bin/bash www-data -c "pm2 logs abs-oms --lines 20"

# Check database connection
mysql -u abs_oms_user -p'SecureDBUser2024!' abs_oms -e "SHOW TABLES;"
```

### Test Application
1. Visit: http://adaptec.pro (should redirect to HTTPS)
2. Visit: https://adaptec.pro
3. Should see your ABS OMS application

## 🔧 Troubleshooting

### If Git Checkout Still Fails:
```bash
cd /var/www/adaptec.pro
rm -rf .git
git init
git remote add origin https://github.com/salilgupta4/ABSOMS.git
git fetch origin
git checkout -b OMSSQL origin/OMSSQL
```

### If Application Won't Start:
```bash
# Check build errors
npm run build

# Check PM2 logs
su -s /bin/bash www-data -c "pm2 logs abs-oms"

# Restart application
su -s /bin/bash www-data -c "pm2 restart abs-oms"
```

### If Database Connection Fails:
```bash
# Test database connection
mysql -u abs_oms_user -p'SecureDBUser2024!' abs_oms -e "SELECT 1;"

# Check .env file
cat /var/www/adaptec.pro/.env
```

## ✅ Success!

Your ABS OMS MySQL system should now be live at:
**https://adaptec.pro**

The system includes:
- ✅ Complete MySQL backend
- ✅ JWT authentication
- ✅ All ERP modules (Sales, Purchase, Payroll, Transport)
- ✅ SSL certificates
- ✅ Professional deployment setup
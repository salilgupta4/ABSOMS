# VPS Deployment Guide - Hostinger HestiaCP Ubuntu 22.04

## Server Information
- **Server IP**: 213.210.21.76
- **Domain**: adaptec.pro
- **OS**: Ubuntu 22.04
- **Control Panel**: HestiaCP
- **SSL**: Automatic setup with Let's Encrypt

## Complete Deployment Process

This guide provides step-by-step instructions for deploying the ABS OMS MySQL system to your Hostinger VPS.

---

## 🚀 AUTOMATED DEPLOYMENT

Run the automated deployment script:
```bash
# Make script executable and run
chmod +x deployment/deploy-to-vps.sh
./deployment/deploy-to-vps.sh
```

**The script will automatically:**
1. Connect to your VPS server
2. Install all required dependencies
3. Set up MySQL database
4. Configure Node.js application  
5. Set up SSL with Let's Encrypt
6. Configure domain and DNS
7. Start the application with PM2

---

## 📋 MANUAL DEPLOYMENT STEPS

If you prefer manual setup or need to troubleshoot:

### Step 1: Connect to Your VPS

```bash
# SSH into your server
ssh root@213.210.21.76

# You'll be prompted for password - enter your VPS root password
```

### Step 2: Update System and Install Dependencies

```bash
# Update system packages
apt update && apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt install -y nodejs

# Install MySQL
apt install -y mysql-server

# Install additional tools
apt install -y git nginx certbot python3-certbot-nginx unzip
```

### Step 3: Secure MySQL Installation

```bash
# Run MySQL security script
mysql_secure_installation

# Follow prompts:
# - Set root password
# - Remove anonymous users: Y
# - Disallow root login remotely: Y
# - Remove test database: Y
# - Reload privilege tables: Y
```

### Step 4: Create Database and User

```bash
# Login to MySQL
mysql -u root -p

# Run these commands in MySQL:
CREATE DATABASE abs_oms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'abs_oms_user'@'localhost' IDENTIFIED BY 'your_secure_password_here';
GRANT ALL PRIVILEGES ON abs_oms.* TO 'abs_oms_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Step 5: Deploy Application

```bash
# Create application directory
mkdir -p /var/www/adaptec.pro
cd /var/www/adaptec.pro

# Clone your repository (replace with your actual repo URL)
git clone https://github.com/your-username/your-repo.git .
git checkout OMSSQL

# Install dependencies
npm install

# Install PM2 globally
npm install -g pm2
```

### Step 6: Configure Environment

```bash
# Create production environment file
cp .env.example .env

# Edit environment variables
nano .env
```

**Configure these values in .env:**
```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=abs_oms_user
DB_PASSWORD=your_secure_password_here
DB_NAME=abs_oms

# JWT Configuration  
JWT_SECRET=your-super-secure-jwt-secret-at-least-32-characters
JWT_EXPIRES_IN=24h

# Application Configuration
NODE_ENV=production
PORT=3000
API_BASE_URL=https://adaptec.pro/api
FRONTEND_URL=https://adaptec.pro
```

### Step 7: Initialize Database

```bash
# Run database initialization
npm run db:init

# Follow prompts to create admin user
```

### Step 8: Build and Start Application

```bash
# Build the application
npm run build

# Start with PM2
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

### Step 9: Configure Nginx

```bash
# Create Nginx configuration
nano /etc/nginx/sites-available/adaptec.pro
```

**Nginx Configuration:**
```nginx
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
    }
}
```

```bash
# Enable site and restart Nginx
ln -s /etc/nginx/sites-available/adaptec.pro /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### Step 10: Setup SSL Certificate

```bash
# Install SSL certificate with Certbot
certbot --nginx -d adaptec.pro -d www.adaptec.pro

# Follow prompts:
# - Enter email address
# - Agree to terms
# - Choose redirect option (2)
```

---

## 🌐 DOMAIN AND DNS CONFIGURATION

### DNS Settings (Configure in your domain registrar):

**A Records:**
```
Type: A
Name: @
Value: 213.210.21.76
TTL: 3600

Type: A  
Name: www
Value: 213.210.21.76
TTL: 3600
```

**CNAME Records:**
```
Type: CNAME
Name: api
Value: adaptec.pro
TTL: 3600
```

### Cloudflare DNS (if using Cloudflare):
1. Add A record: `@` → `213.210.21.76`
2. Add A record: `www` → `213.210.21.76`
3. Add CNAME record: `api` → `adaptec.pro`
4. Enable SSL/TLS: Full (strict)
5. Enable "Always Use HTTPS"

---

## 🔧 APPLICATION CONFIGURATION

### PM2 Ecosystem File

Create `ecosystem.config.js`:
```javascript
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
    time: true
  }]
};
```

### Create Log Directory
```bash
mkdir -p /var/log/abs-oms
chown -R www-data:www-data /var/log/abs-oms
```

---

## 🔐 SECURITY CONFIGURATION

### Firewall Setup
```bash
# Enable UFW firewall
ufw enable
ufw default deny incoming
ufw default allow outgoing
ufw allow ssh
ufw allow 'Nginx Full'
ufw allow 3000/tcp
ufw status
```

### MySQL Security
```bash
# Edit MySQL config for security
nano /etc/mysql/mysql.conf.d/mysqld.cnf

# Add these lines under [mysqld]:
bind-address = 127.0.0.1
skip-networking = false
max_connections = 100

# Restart MySQL
systemctl restart mysql
```

### Application Security
```bash
# Create secure directories
chown -R www-data:www-data /var/www/adaptec.pro
chmod -R 755 /var/www/adaptec.pro
chmod 600 /var/www/adaptec.pro/.env
```

---

## 📊 MONITORING AND MAINTENANCE

### System Monitoring
```bash
# View application logs
pm2 logs abs-oms

# Monitor system resources
pm2 monit

# Check application status
pm2 status
```

### Database Maintenance
```bash
# Create backup script
nano /opt/backup-db.sh
```

**Backup Script:**
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u abs_oms_user -p'your_password' abs_oms > /backups/abs_oms_$DATE.sql
find /backups -name "abs_oms_*.sql" -mtime +7 -delete
```

```bash
# Make executable and add to crontab
chmod +x /opt/backup-db.sh
crontab -e

# Add daily backup at 2 AM
0 2 * * * /opt/backup-db.sh
```

---

## 🐛 TROUBLESHOOTING

### Common Issues

**Application Not Starting:**
```bash
pm2 logs abs-oms
npm run dev  # Test in development mode
```

**Database Connection Error:**
```bash
mysql -u abs_oms_user -p
systemctl status mysql
```

**Nginx Issues:**
```bash
nginx -t
systemctl status nginx
tail -f /var/log/nginx/error.log
```

**SSL Certificate Issues:**
```bash
certbot certificates
certbot renew --dry-run
```

### Health Check Commands
```bash
# Check all services
systemctl status nginx mysql
pm2 status
curl -I https://adaptec.pro

# Check ports
netstat -tulpn | grep :3000
netstat -tulpn | grep :80
netstat -tulpn | grep :443
```

---

## 🔄 UPDATES AND DEPLOYMENT

### Automated Update Script
Create `deployment/update-app.sh`:
```bash
#!/bin/bash
cd /var/www/adaptec.pro
git pull origin OMSSQL
npm install
npm run build
pm2 restart abs-oms
```

### Manual Update Process
```bash
cd /var/www/adaptec.pro
git pull origin OMSSQL
npm install
npm run build
pm2 restart abs-oms
```

---

## ✅ VERIFICATION CHECKLIST

After deployment, verify:

- [ ] Application accessible at https://adaptec.pro
- [ ] SSL certificate installed and working
- [ ] Admin login functional
- [ ] Database operations working
- [ ] All modules accessible
- [ ] File uploads working
- [ ] Backup scripts running
- [ ] Monitoring alerts configured
- [ ] Firewall properly configured
- [ ] PM2 auto-restart enabled

---

## 📞 SUPPORT

If you encounter issues:
1. Check the logs: `pm2 logs abs-oms`
2. Verify environment variables in `.env`
3. Test database connection
4. Check Nginx configuration
5. Verify SSL certificate status

**Log Locations:**
- Application: `/var/log/abs-oms/`
- Nginx: `/var/log/nginx/`
- MySQL: `/var/log/mysql/`
- System: `/var/log/syslog`

---

This deployment guide ensures your ABS OMS system runs securely and efficiently on your Hostinger VPS with proper SSL, monitoring, and backup procedures.
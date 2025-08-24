# 🚀 ABS OMS MySQL - VPS Deployment Instructions

## Quick Start - Automated Deployment

Your ABS OMS MySQL system is ready for deployment to your Hostinger VPS! 

### Prerequisites Checklist
- [ ] VPS Server: 213.210.21.76 (Hostinger Ubuntu 22.04)
- [ ] Domain: adaptec.pro (pointed to your VPS IP)
- [ ] Root SSH access to your VPS
- [ ] GitHub repository access
- [ ] Your VPS root password

## 🎯 ONE-COMMAND DEPLOYMENT

Run this single command from your project directory:

```bash
./deployment/deploy-to-vps.sh
```

**The script will prompt you for:**
1. VPS root password
2. MySQL root password (will be created)
3. Database user password
4. JWT secret (minimum 32 characters)
5. Email for SSL certificate
6. GitHub repository URL

**Example inputs:**
- JWT Secret: `my-super-secure-jwt-secret-key-with-32-plus-characters`
- SSL Email: `your-email@domain.com`
- GitHub URL: `https://github.com/salilgupta4/ABSOMS.git`

## 🔧 What the Script Does Automatically

### Server Setup
- ✅ Updates Ubuntu packages
- ✅ Installs Node.js 18.x
- ✅ Installs and secures MySQL
- ✅ Installs Nginx, Certbot, PM2
- ✅ Configures firewall (UFW)

### Database Setup
- ✅ Creates `abs_oms` database
- ✅ Creates `abs_oms_user` with secure password
- ✅ Sets up proper MySQL security

### Application Deployment
- ✅ Clones your OMSSQL branch
- ✅ Installs dependencies
- ✅ Creates production `.env` file
- ✅ Initializes database with admin user
- ✅ Builds the application
- ✅ Starts with PM2 process manager

### Web Server & SSL
- ✅ Configures Nginx reverse proxy
- ✅ Installs Let's Encrypt SSL certificate
- ✅ Sets up automatic HTTPS redirect
- ✅ Configures security headers

### Automation & Monitoring
- ✅ Daily database backups (2 AM)
- ✅ Application update script
- ✅ PM2 auto-restart on boot
- ✅ Log rotation and management

## 🌐 Domain Configuration

### DNS Settings (Configure in your domain registrar)

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

**CNAME Record:**
```
Type: CNAME
Name: api
Value: adaptec.pro
TTL: 3600
```

## 📋 Post-Deployment

After successful deployment:

### 1. Access Your Application
- **URL**: https://adaptec.pro
- **Admin Email**: admin@adaptec.pro
- **Admin Password**: SecureAdmin123

### 2. Important First Steps
1. **Change Admin Password**: Log in and update the default password immediately
2. **Configure Company Details**: Set up your company information in Settings
3. **Test All Modules**: Verify Sales, Purchase, Payroll, and Transport modules
4. **Check User Permissions**: Test role-based access control

### 3. Useful SSH Commands
```bash
# Connect to your server
ssh root@213.210.21.76

# Monitor application
pm2 status
pm2 logs abs-oms

# Update application
/opt/update-app.sh

# Backup database
/opt/backup-db.sh

# Check services
systemctl status nginx mysql
```

## 🔍 Troubleshooting

### If Deployment Fails

**Check SSH Connection:**
```bash
ssh root@213.210.21.76
```

**Common Issues:**
1. **Wrong VPS Password**: Verify with Hostinger panel
2. **Domain Not Pointing**: Check DNS propagation (use `nslookup adaptec.pro`)
3. **Port Blocked**: Ensure ports 22, 80, 443 are open
4. **SSL Certificate**: Domain must be pointing to server before SSL installation

### Check Application Status
```bash
# Application logs
pm2 logs abs-oms --lines 50

# Database connection
mysql -u abs_oms_user -p

# Nginx configuration
nginx -t
systemctl status nginx
```

## 🔐 Security Features

Your deployment includes:
- ✅ JWT-based authentication
- ✅ Bcrypt password hashing
- ✅ MySQL with secure configuration
- ✅ UFW firewall protection
- ✅ SSL/HTTPS encryption
- ✅ Nginx security headers
- ✅ Role-based access control
- ✅ Session management
- ✅ Daily backups

## 📱 Features Available

Your MySQL-based ABS OMS includes:
- ✅ Sales Management (Quotes, Orders, Delivery)
- ✅ Purchase Management (Orders, Tracking)
- ✅ Payroll System (Employee management, salary processing)
- ✅ Transport Module (Transporter management, cost tracking)
- ✅ Professional Accounting Ledgers
- ✅ User Management with role hierarchy
- ✅ Company Settings & WhatsApp integration
- ✅ Export capabilities (CSV/PDF)
- ✅ Dashboard with real-time data

## 🎉 Success!

Once deployed, your professional ERP system will be live at:
**https://adaptec.pro**

The system is production-ready with automatic backups, monitoring, and security best practices.

---

**Need Help?** 
- Check logs: `pm2 logs abs-oms`
- Review documentation: `deployment/README_VPS_DEPLOYMENT.md`
- Monitor system: `pm2 monit`
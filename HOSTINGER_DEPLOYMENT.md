# 🚀 Deploying ABS ERP to Hostinger Shared Hosting

## Overview
This guide shows how to deploy your React-based ABS ERP application to Hostinger shared hosting while keeping Firebase for backend services (database, authentication).

## 📋 Prerequisites

1. **Hostinger hosting account** with cPanel access
2. **Domain name** configured with Hostinger
3. **Node.js and npm** installed on your local machine
4. **Firebase project** already set up and configured

## 🛠️ Step-by-Step Deployment

### **Step 1: Build the Application**

1. **Navigate to your project directory:**
   ```bash
   cd "/Users/salilgupta/Library/CloudStorage/OneDrive-Personal/PC Desktop/ABS OMS with Payroll"
   ```

2. **Install dependencies (if not already done):**
   ```bash
   npm install
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```

4. **Verify the build:**
   - Check that a `dist` folder was created
   - Ensure it contains: `index.html`, `assets/` folder, and `.htaccess` file

### **Step 2: Access Hostinger cPanel**

1. **Log into Hostinger:**
   - Go to [hpanel.hostinger.com](https://hpanel.hostinger.com)
   - Select your hosting account
   - Click "Manage" next to your domain

2. **Open File Manager:**
   - In cPanel, find and click "File Manager"
   - Navigate to `public_html` folder (this is your website's root directory)

### **Step 3: Upload Files**

**Option A: Using cPanel File Manager (Recommended)**

1. **Clear existing files:**
   - In `public_html`, delete any existing files (like default index.html)
   - Keep: `.htaccess` (if it exists), `cgi-bin/` folder

2. **Upload the build:**
   - Click "Upload" in File Manager
   - Select all files from your local `dist` folder
   - Upload: `index.html`, entire `assets` folder, and `.htaccess`

3. **Extract if needed:**
   - If you uploaded a zip file, right-click and "Extract"
   - Move all contents from the extracted folder to `public_html` root

**Option B: Using FTP Client (Alternative)**

1. **Get FTP credentials:**
   - In cPanel, go to "FTP Accounts"
   - Create FTP account or use main account credentials

2. **Upload via FTP:**
   - Use FileZilla, WinSCP, or similar
   - Connect to your Hostinger server
   - Upload all files from `dist` folder to `public_html`

### **Step 4: Configure Domain & SSL**

1. **Set up domain:**
   - Ensure your domain points to Hostinger nameservers
   - Wait for DNS propagation (up to 24 hours)

2. **Enable SSL (Free):**
   - In Hostinger control panel, go to "SSL"
   - Enable free SSL certificate
   - Force HTTPS redirect

### **Step 5: Test Your Deployment**

1. **Visit your website:**
   ```
   https://yourdomain.com
   ```

2. **Test key features:**
   - [ ] Login page loads correctly
   - [ ] User authentication works (Firebase)
   - [ ] Navigation between pages works
   - [ ] Data loads from Firebase
   - [ ] All modules are accessible based on permissions

### **Step 6: Troubleshooting Common Issues**

#### **Issue 1: 404 Errors on Page Refresh**
**Cause:** React Router needs server-side routing support
**Solution:** Ensure `.htaccess` file is in place with rewrite rules

#### **Issue 2: Firebase Connection Issues**
**Cause:** Firebase configuration or network issues
**Solutions:**
- Check browser console for errors
- Verify Firebase project settings
- Ensure Firebase domains are configured correctly

#### **Issue 3: Blank White Page**
**Cause:** JavaScript errors or path issues
**Solutions:**
- Check browser console for errors
- Verify all assets are uploaded correctly
- Check if `.htaccess` is properly configured

#### **Issue 4: Slow Loading**
**Solutions:**
- Ensure GZIP compression is enabled (via .htaccess)
- Verify CDN is working if using one
- Check Hostinger server response times

## 🔧 File Structure After Deployment

Your `public_html` should contain:
```
public_html/
├── index.html                 # Main React app entry point
├── .htaccess                  # Server configuration for SPA routing
└── assets/                    # All your app's static files
    ├── index-[hash].js        # Main application bundle
    ├── vendor-[hash].js       # React, Router libraries
    ├── firebase-[hash].js     # Firebase libraries
    ├── pdf-[hash].js          # PDF generation libraries
    ├── ui-[hash].js           # UI components (Lucide icons)
    └── index-[hash].css       # All application styles
```

## 🚨 Important Notes

### **Backend Services (Firebase)**
- **Database:** Still hosted on Firebase (no changes needed)
- **Authentication:** Still handled by Firebase Auth
- **File Storage:** Still uses Firebase Storage
- **Security Rules:** Remain active and enforced

### **Domain Configuration**
- **Primary Domain:** Your main website (e.g., `yourdomain.com`)
- **Subdomain Option:** You can also use `erp.yourdomain.com`

### **Updates & Maintenance**
To update your application:
1. Make changes to your code
2. Run `npm run build`
3. Upload new `dist` contents to `public_html`
4. Clear browser cache to see changes

## 🔒 Security Considerations

1. **Firebase Security:**
   - Your Firebase security rules are still active
   - Authentication is handled server-side by Firebase
   - Database access is controlled by your Firestore rules

2. **Hosting Security:**
   - SSL certificate is enabled (HTTPS)
   - Security headers are set via .htaccess
   - Static files only (no server-side vulnerabilities)

## 📞 Support Resources

- **Hostinger Support:** [support.hostinger.com](https://support.hostinger.com)
- **cPanel Documentation:** Available in your hosting control panel
- **Firebase Console:** [console.firebase.google.com](https://console.firebase.google.com)

---

## ✅ Deployment Checklist

- [ ] Build created successfully (`npm run build`)
- [ ] All files uploaded to `public_html`
- [ ] `.htaccess` file is present and configured
- [ ] Domain/subdomain configured correctly
- [ ] SSL certificate enabled
- [ ] Website loads without errors
- [ ] Login functionality works
- [ ] All user permissions work correctly
- [ ] Firebase data loads properly
- [ ] All modules accessible according to user roles

**🎉 Congratulations! Your ABS ERP is now live on Hostinger!**
# 🚀 Deploy ABS ERP to oms.adaptec.in

## 📋 Two Deployment Options

### **Option 1: Subdomain (oms.adaptec.in) - RECOMMENDED ✅**
### **Option 2: Subdirectory (adaptec.in/oms)**

---

## 🎯 **OPTION 1: Subdomain Deployment (oms.adaptec.in)**

### **Step 1: Set Up Subdomain in Hostinger**

1. **Access Hostinger Control Panel:**
   - Login to hpanel.hostinger.com
   - Go to your domain management

2. **Create Subdomain:**
   - Go to "Subdomains" section
   - Create subdomain: `oms`
   - Point it to a folder: `public_html/oms`
   - Or point to separate document root if available

3. **SSL Certificate:**
   - Enable SSL for the subdomain `oms.adaptec.in`

### **Step 2: Build & Deploy**

```bash
# Navigate to project
cd "/Users/salilgupta/Library/CloudStorage/OneDrive-Personal/PC Desktop/ABS OMS with Payroll"

# Build for production (already configured for subdomain)
npm run build

# Your dist folder is ready for upload
```

### **Step 3: Upload Files**

**Upload Location:** 
- **If subdomain folder:** `public_html/oms/`
- **If separate document root:** Root folder of oms.adaptec.in

**Files to Upload:**
- All contents of `dist` folder
- `index.html`
- `assets/` folder (with all JS/CSS files)
- `.htaccess` file

### **Step 4: Access Your App**
Visit: **https://oms.adaptec.in**

---

## 🎯 **OPTION 2: Subdirectory Deployment (adaptec.in/oms)**

### **Step 1: Prepare Build Configuration**

```bash
# Use subdirectory configuration
mv vite.config.ts vite.config.subdomain.ts
mv vite.config.subdirectory.ts vite.config.ts

# Use subdirectory .htaccess
cp public/.htaccess.subdirectory public/.htaccess
```

### **Step 2: Build for Subdirectory**

```bash
npm run build
```

### **Step 3: Upload Files**

**Upload Location:** `public_html/oms/`

**Create folder structure:**
```
public_html/
├── (existing main website files)
└── oms/
    ├── index.html
    ├── .htaccess
    └── assets/
        ├── (all JS and CSS files)
```

### **Step 4: Configure Main Site .htaccess**

Add to your main `public_html/.htaccess`:

```apache
# Redirect /oms requests to subdirectory
RewriteEngine On
RewriteRule ^oms(/.*)?$ /oms/index.html [QSA,L]
```

### **Step 5: Access Your App**
Visit: **https://adaptec.in/oms**

---

## 🛠️ **Quick Deployment Commands**

### **For Subdomain (Option 1):**
```bash
# Already configured - just build and upload
npm run build
# Upload dist contents to oms.adaptec.in folder
```

### **For Subdirectory (Option 2):**
```bash
# Switch to subdirectory config
mv vite.config.ts vite.config.subdomain.ts
mv vite.config.subdirectory.ts vite.config.ts
cp public/.htaccess.subdirectory public/.htaccess

# Build and upload
npm run build
# Upload dist contents to public_html/oms/
```

---

## 🎯 **RECOMMENDED APPROACH: Subdomain**

**Why Subdomain is Better:**
✅ **Cleaner URLs:** `oms.adaptec.in/dashboard` vs `adaptec.in/oms/dashboard`
✅ **Easier Configuration:** No path conflicts with main site
✅ **Better SEO:** Search engines treat it as separate application
✅ **Independent SSL:** Separate SSL certificate management
✅ **Better Performance:** No routing conflicts with main website

---

## 🔧 **File Structure After Deployment**

### **Subdomain Structure:**
```
oms.adaptec.in/ (or public_html/oms/)
├── index.html
├── .htaccess
└── assets/
    ├── index-[hash].js      # Main app bundle
    ├── vendor-[hash].js     # React libraries  
    ├── firebase-[hash].js   # Firebase
    ├── pdf-[hash].js        # PDF generation
    ├── ui-[hash].js         # Icons
    └── index-[hash].css     # Styles
```

---

## ✅ **Testing Checklist**

After deployment, verify:

- [ ] **Website loads:** https://oms.adaptec.in (or adaptec.in/oms)
- [ ] **Login page appears** with "ADAPTEC" branding
- [ ] **Authentication works** (Firebase connection)
- [ ] **Navigation works** (React Router)
- [ ] **All modules load** based on user permissions
- [ ] **Page refresh works** (no 404 errors)
- [ ] **Month filters work** in payroll section
- [ ] **PDF generation works**
- [ ] **Mobile responsive design**

---

## 🚨 **Troubleshooting**

### **404 Errors on Page Refresh:**
- Verify `.htaccess` is uploaded and configured correctly
- Check that mod_rewrite is enabled on server

### **Assets Not Loading:**
- Check that all files from `assets/` folder uploaded correctly
- Verify file permissions (644 for files, 755 for folders)

### **Firebase Not Connecting:**
- Check browser console for errors
- Verify Firebase project configuration
- Ensure Firebase domains include your new domain

---

## 📞 **Quick Support**

**Current Configuration:** Ready for **oms.adaptec.in** subdomain deployment

**To Switch to Subdirectory:** Use the commands in Option 2

**Need Help?** Check browser console for errors and verify file uploads

---

**🎉 Your ABS ERP is ready to go live at oms.adaptec.in!**
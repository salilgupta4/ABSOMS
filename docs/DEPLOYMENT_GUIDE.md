# Deployment Guide

## 🚀 Overview

This guide covers various deployment strategies for ABS OMS with Payroll, from development to production environments. The application is designed to be deployed primarily on Firebase Hosting with Firebase services as the backend.

## 📋 Prerequisites

Before deploying, ensure you have:

- **Node.js** (v18.0.0 or higher)
- **Firebase CLI** installed globally (`npm install -g firebase-tools`)
- **Git** for version control
- **Firebase Project** with billing enabled (for production features)
- **Domain** (optional, for custom domains)

## 🔥 Firebase Deployment (Recommended)

Firebase Hosting provides the most seamless deployment experience with built-in CDN, SSL, and integration with other Firebase services.

### 1. Initial Firebase Setup

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init
```

When running `firebase init`, select:
- ✅ **Hosting**: Configure files for Firebase Hosting
- ✅ **Firestore**: Configure security rules and indexes
- ✅ **Storage**: Configure security rules for Cloud Storage
- ✅ **Functions**: (Optional) For server-side logic

### 2. Configure firebase.json

```json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ],
    "headers": [
      {
        "source": "/static/**",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      },
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "max-age=31536000"
          }
        ]
      }
    ]
  },
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "storage": {
    "rules": "storage.rules"
  }
}
```

### 3. Build and Deploy

```bash
# Build the project
npm run build

# Deploy to Firebase
firebase deploy

# Or deploy specific services
firebase deploy --only hosting
firebase deploy --only firestore:rules
firebase deploy --only storage
```

### 4. Environment-Specific Deployments

#### Development Environment

```bash
# Use development Firebase project
firebase use development

# Deploy with development configurations
firebase deploy --only hosting
```

#### Staging Environment

```bash
# Switch to staging project
firebase use staging

# Deploy to staging
firebase deploy
```

#### Production Environment

```bash
# Switch to production project
firebase use production

# Deploy to production
firebase deploy

# Or use specific version/tag
firebase deploy --message "Release v2.1.0"
```

### 5. Custom Domain Setup

```bash
# Add custom domain
firebase hosting:sites:create your-domain-com

# Configure custom domain in Firebase Console
# Add DNS records as instructed by Firebase
# SSL certificate will be automatically provisioned
```

## 🌐 Manual Web Server Deployment

For deployment on traditional web servers (Apache, Nginx, etc.):

### 1. Build the Application

```bash
# Install dependencies
npm install

# Build for production
npm run build
```

### 2. Configure Web Server

#### Apache Configuration

Create `.htaccess` in the `dist` folder:

```apache
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QR,L]

# Enable GZIP compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>

# Set cache headers
<IfModule mod_expires.c>
    ExpiresActive on
    ExpiresByType text/css "access plus 1 year"
    ExpiresByType application/javascript "access plus 1 year"
    ExpiresByType image/png "access plus 1 year"
    ExpiresByType image/jpg "access plus 1 year"
    ExpiresByType image/jpeg "access plus 1 year"
</IfModule>
```

#### Nginx Configuration

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com;
    
    # SSL Configuration
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    
    root /var/www/abs-oms/dist;
    index index.html;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript 
               application/javascript application/xml+rss application/json;
    
    # Handle client-side routing
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location /static/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public";
    }
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

### 3. Upload and Deploy

```bash
# Upload dist folder to web server
rsync -avz --delete dist/ user@server:/var/www/abs-oms/

# Or using SCP
scp -r dist/* user@server:/var/www/abs-oms/

# Set proper permissions
ssh user@server "chmod -R 755 /var/www/abs-oms/"
```

## 🐳 Docker Deployment

For containerized deployment:

### 1. Create Dockerfile

```dockerfile
# Build stage
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Copy SSL certificates (if using custom SSL)
# COPY ssl/ /etc/ssl/

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
```

### 2. Create nginx.conf for Docker

```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;
    
    sendfile on;
    keepalive_timeout 65;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    
    server {
        listen 80;
        server_name localhost;
        
        root /usr/share/nginx/html;
        index index.html;
        
        # Handle client-side routing
        location / {
            try_files $uri $uri/ /index.html;
        }
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public";
        }
        
        # Health check endpoint
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
    }
}
```

### 3. Build and Run Docker Container

```bash
# Build Docker image
docker build -t abs-oms:latest .

# Run container
docker run -d \
  --name abs-oms \
  -p 80:80 \
  -p 443:443 \
  abs-oms:latest

# Or using docker-compose
```

### 4. Docker Compose Configuration

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "80:80"
      - "443:443"
    environment:
      - NODE_ENV=production
    volumes:
      - ./ssl:/etc/ssl
    restart: unless-stopped
    
  # Optional: Redis for caching
  redis:
    image: redis:alpine
    restart: unless-stopped
    
  # Optional: Monitoring
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    restart: unless-stopped
```

## ☁️ Cloud Platform Deployments

### AWS Deployment

#### Using AWS S3 + CloudFront

```bash
# Build the application
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id YOUR_DISTRIBUTION_ID \
  --paths "/*"
```

#### Using AWS Amplify

```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Initialize Amplify project
amplify init

# Add hosting
amplify add hosting

# Deploy
amplify publish
```

### Google Cloud Platform

#### Using Google Cloud Storage + CDN

```bash
# Build the application
npm run build

# Upload to Cloud Storage
gsutil -m rsync -r -d dist/ gs://your-bucket-name

# Set proper cache control
gsutil -m setmeta -h "Cache-Control:public,max-age=31536000" \
  gs://your-bucket-name/static/**
```

#### Using Google App Engine

Create `app.yaml`:

```yaml
runtime: nodejs18

handlers:
  # Serve static files
  - url: /static
    static_dir: dist/static
    secure: always
    
  # Serve main app
  - url: /.*
    static_files: dist/index.html
    upload: dist/index.html
    secure: always
    
automatic_scaling:
  min_instances: 1
  max_instances: 10
```

Deploy:

```bash
gcloud app deploy
```

### Microsoft Azure

#### Using Azure Static Web Apps

```bash
# Install Azure CLI
npm install -g @azure/static-web-apps-cli

# Build the application
npm run build

# Deploy
swa deploy --app-location "dist" \
          --api-location "" \
          --output-location ""
```

### Vercel Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel

# Or configure vercel.json
```

`vercel.json`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/static-build"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### Netlify Deployment

Create `_redirects` file in `public/`:

```
/*    /index.html   200
```

Deploy via Git or drag & drop the `dist` folder.

## 📱 Mobile App Deployment

### iOS App Store

#### Prerequisites
- Apple Developer Account ($99/year)
- Xcode on macOS
- iOS device for testing

#### Build Process

```bash
cd ABSOMSMobile

# Install dependencies
npm install
cd ios && pod install && cd ..

# Build for iOS
npx react-native run-ios --configuration Release

# Or build archive in Xcode
open ios/ABSOMSMobile.xcworkspace
```

#### App Store Submission

1. Open project in Xcode
2. Select "Any iOS Device" as target
3. Product → Archive
4. Use Organizer to upload to App Store Connect
5. Fill app metadata in App Store Connect
6. Submit for review

### Google Play Store

#### Prerequisites
- Google Play Developer Account ($25 one-time fee)
- Android Studio
- Android device for testing

#### Build Process

```bash
cd ABSOMSMobile

# Generate release keystore
keytool -genkeypair -v -keystore my-upload-key.keystore \
  -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000

# Build release APK
cd android
./gradlew assembleRelease

# Build App Bundle (recommended)
./gradlew bundleRelease
```

#### Play Store Submission

1. Go to Google Play Console
2. Create new app
3. Upload APK/AAB file
4. Fill app details and screenshots
5. Submit for review

## 🔧 Environment Configuration

### Development Environment

`.env.development`:

```env
NODE_ENV=development
VITE_FIREBASE_API_KEY=dev_api_key
VITE_FIREBASE_AUTH_DOMAIN=dev-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=dev-project
VITE_FIREBASE_STORAGE_BUCKET=dev-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=dev_app_id
VITE_APP_DEBUG=true
```

### Staging Environment

`.env.staging`:

```env
NODE_ENV=production
VITE_FIREBASE_API_KEY=staging_api_key
VITE_FIREBASE_AUTH_DOMAIN=staging-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=staging-project
VITE_FIREBASE_STORAGE_BUCKET=staging-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=staging_app_id
VITE_APP_DEBUG=false
```

### Production Environment

`.env.production`:

```env
NODE_ENV=production
VITE_FIREBASE_API_KEY=prod_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-company.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=production-project
VITE_FIREBASE_STORAGE_BUCKET=production-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=987654321
VITE_FIREBASE_APP_ID=prod_app_id
VITE_APP_DEBUG=false
VITE_APP_VERSION=2.1.0
```

## 🔍 Monitoring and Analytics

### Firebase Analytics Setup

```typescript
// Initialize Analytics
import { getAnalytics, logEvent } from 'firebase/analytics';

const analytics = getAnalytics();

// Track user events
logEvent(analytics, 'quote_created', {
  customer_id: 'customer_123',
  amount: 5000
});

// Track page views
logEvent(analytics, 'page_view', {
  page_title: 'Quotes List',
  page_location: '/sales/quotes'
});
```

### Performance Monitoring

```typescript
// Initialize Performance
import { getPerformance, trace } from 'firebase/performance';

const perf = getPerformance();

// Custom traces
const customTrace = trace(perf, 'quote_creation_process');
customTrace.start();

// ... perform quote creation

customTrace.stop();
```

### Error Monitoring

```bash
# Install Sentry
npm install @sentry/react @sentry/tracing

# Configure in main.tsx
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

## 📊 CI/CD Pipeline

### GitHub Actions

`.github/workflows/deploy.yml`:

```yaml
name: Deploy to Firebase

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Setup Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm run test
    
    - name: Run linting
      run: npm run lint
    
    - name: Build application
      run: npm run build
      env:
        VITE_FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
        VITE_FIREBASE_AUTH_DOMAIN: ${{ secrets.FIREBASE_AUTH_DOMAIN }}
        VITE_FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
        VITE_FIREBASE_STORAGE_BUCKET: ${{ secrets.FIREBASE_STORAGE_BUCKET }}
        VITE_FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.FIREBASE_MESSAGING_SENDER_ID }}
        VITE_FIREBASE_APP_ID: ${{ secrets.FIREBASE_APP_ID }}
    
    - name: Deploy to Firebase
      uses: FirebaseExtended/action-hosting-deploy@v0
      with:
        repoToken: '${{ secrets.GITHUB_TOKEN }}'
        firebaseServiceAccount: '${{ secrets.FIREBASE_SERVICE_ACCOUNT }}'
        projectId: your-project-id
        channelId: live
```

### GitLab CI

`.gitlab-ci.yml`:

```yaml
stages:
  - test
  - build
  - deploy

variables:
  NODE_VERSION: "18"

test:
  stage: test
  image: node:$NODE_VERSION
  script:
    - npm ci
    - npm run test
    - npm run lint
  cache:
    paths:
      - node_modules/

build:
  stage: build
  image: node:$NODE_VERSION
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 hour
  cache:
    paths:
      - node_modules/

deploy_production:
  stage: deploy
  image: node:$NODE_VERSION
  script:
    - npm install -g firebase-tools
    - firebase deploy --token $FIREBASE_TOKEN
  only:
    - main
  dependencies:
    - build
```

## 🔒 Security Considerations

### HTTPS Configuration

Always use HTTPS in production. Firebase Hosting provides SSL certificates automatically. For custom domains:

1. Add domain in Firebase Console
2. Add DNS records as instructed
3. SSL certificate is automatically provisioned

### Content Security Policy

Add to `index.html`:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' https://apis.google.com;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  connect-src 'self' https://*.firebaseapp.com https://*.googleapis.com;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
">
```

### Environment Variables Security

- Never commit `.env` files to version control
- Use different Firebase projects for different environments
- Rotate API keys regularly
- Use Firebase security rules to restrict data access

## 📋 Post-Deployment Checklist

### Functional Testing

- [ ] User authentication works
- [ ] All modules load correctly
- [ ] PDF generation works
- [ ] Data synchronization functions
- [ ] Mobile responsiveness
- [ ] Offline functionality

### Performance Testing

- [ ] Page load times < 3 seconds
- [ ] Bundle size optimized
- [ ] Image optimization
- [ ] CDN configuration
- [ ] Caching headers set correctly

### Security Testing

- [ ] HTTPS enforced
- [ ] Firebase security rules active
- [ ] Authentication required for protected routes
- [ ] No sensitive data exposed
- [ ] Error handling doesn't leak information

### SEO and Analytics

- [ ] Meta tags configured
- [ ] Google Analytics tracking
- [ ] Firebase Analytics active
- [ ] Performance monitoring enabled
- [ ] Error tracking configured

### Backup and Recovery

- [ ] Database backup strategy in place
- [ ] User data export functionality
- [ ] Disaster recovery plan documented
- [ ] Regular backup testing

This deployment guide ensures your ABS OMS application is deployed securely, efficiently, and with proper monitoring across various platforms and environments.
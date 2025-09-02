# 🛠️ Manual Setup Guide for ABS OMS Mobile

## ❌ Current Issue
Your React Native app can't build because **Java is not installed**. You need Java 17 to build Android apps.

## 🔧 Quick Fix Steps

### Step 1: Install Java 17
Choose one of these methods:

#### Option A: Download Directly (Recommended)
1. Go to https://www.azul.com/downloads/?package=jdk#zulu
2. Select:
   - **Java Version:** 17 (LTS)
   - **Operating System:** macOS
   - **Architecture:** ARM 64-bit (if you have M1/M2 Mac) or x86 64-bit (Intel Mac)
   - **Package Type:** JDK
3. Download the `.dmg` file
4. Open the downloaded file and follow installation

#### Option B: Install Homebrew First (More Steps)
```bash
# Install Homebrew (will ask for admin password)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Then install Java
brew install --cask zulu@17
```

### Step 2: Verify Java Installation
```bash
java -version
```
Should show something like: `openjdk version "17.0.x"`

### Step 3: Set Java Environment Variables
Add this to your `~/.zshrc` file:
```bash
echo 'export JAVA_HOME=$(/usr/libexec/java_home -v 17)' >> ~/.zshrc
echo 'export PATH=$JAVA_HOME/bin:$PATH' >> ~/.zshrc
source ~/.zshrc
```

### Step 4: Build the App
```bash
cd ABSOMSMobile
npm run android
```

## 🚀 Complete Setup Script (After Java is Installed)

Once Java is installed, run this:

```bash
cd ABSOMSMobile
./setup-android.sh
```

## 📱 Current Status

✅ **Working:**
- Android device connected (RZCX203S8AP)
- Metro bundler running on port 8081
- Android SDK installed
- React Native project configured

❌ **Missing:**
- Java Runtime Environment

## 🔍 Troubleshooting

### If you get "command not found: brew"
Homebrew isn't installed. Use Option A above (direct download).

### If you get permission errors
You need admin/sudo access to install development tools.

### If Java is installed but not found
```bash
# Find Java installations
/usr/libexec/java_home -V

# Set JAVA_HOME manually
export JAVA_HOME=/path/to/your/java
```

## 🎯 Next Steps After Java Installation

1. **Verify everything works:**
   ```bash
   ./test-device.sh
   ```

2. **Build and run the app:**
   ```bash
   npm run android
   ```

3. **If successful, you should see:**
   - App installing on your phone
   - App launching automatically
   - Login screen appears

## 📋 What the App Will Do

Once running, you can:
- **Login** with your existing Firebase credentials
- **Navigate** through different modules (Dashboard, Sales, etc.)
- **Test offline mode** by turning off WiFi
- **Switch themes** in Settings (dark/light mode)
- **Pull down** on Dashboard to sync data

## 🆘 If You Need Help

1. **Check Java installation:**
   ```bash
   java -version
   echo $JAVA_HOME
   ```

2. **Check device connection:**
   ```bash
   adb devices
   ```

3. **Clean and rebuild:**
   ```bash
   npm run clean
   npm run android
   ```

4. **View detailed logs:**
   ```bash
   npx react-native run-android --verbose
   ```

---

**The main blocker right now is Java. Install Java 17 and you'll be able to build and run the app!**
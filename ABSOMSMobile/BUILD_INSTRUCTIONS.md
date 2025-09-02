# ABS OMS Mobile - Build and Test Instructions

## Prerequisites (First Time Setup)

### 1. Install Required Software

#### Node.js (Required)
```bash
# Download and install Node.js 18+ from https://nodejs.org/
# Verify installation:
node --version  # Should show v18+ 
npm --version   # Should show npm version
```

#### Homebrew (macOS only)
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

#### Watchman (Recommended)
```bash
brew install watchman
```

#### Java Development Kit
```bash
brew install --cask zulu@17
```

#### Android Studio (Required)
1. Download from https://developer.android.com/studio
2. Install Android Studio
3. Open Android Studio and complete the setup wizard
4. Install Android SDK (API 34 recommended)

### 2. Android Studio Configuration

#### Install SDK Components
1. Open Android Studio
2. Go to `Tools > SDK Manager`
3. Install the following:
   - Android SDK Platform 34
   - Android SDK Build-Tools 34.0.0
   - Android Emulator
   - Android SDK Platform-Tools

#### Create Virtual Device (AVD)
1. In Android Studio, go to `Tools > AVD Manager`
2. Click `Create Virtual Device`
3. Choose a phone (e.g., Pixel 6)
4. Select a system image (API Level 34 recommended)
5. Click `Finish`

### 3. Environment Variables

Add these to your `~/.zshrc` or `~/.bash_profile`:

```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin

# Reload your profile
source ~/.zshrc  # or source ~/.bash_profile
```

## Building the App

### 1. Install Dependencies
```bash
cd ABSOMSMobile
npm install
```

### 2. Start Metro Bundler
Open a new terminal and run:
```bash
npm start
```
Keep this terminal running during development.

### 3. Run on Android

#### Option A: Using Android Emulator
1. Start your Android emulator from Android Studio or command line:
   ```bash
   emulator -avd YOUR_AVD_NAME
   ```
2. In a new terminal, run:
   ```bash
   npm run android
   ```

#### Option B: Using Physical Device
1. Enable Developer Options on your Android device:
   - Go to Settings > About Phone
   - Tap "Build Number" 7 times
   - Go back to Settings > Developer Options
   - Enable "USB Debugging"

2. Connect your device via USB

3. Verify device is connected:
   ```bash
   adb devices
   ```

4. Run the app:
   ```bash
   npm run android
   ```

## Testing the App

### 1. Login Credentials
Use any valid credentials from your existing Firebase users. The app connects to the same Firebase project as your web application.

### 2. Test Features

#### Authentication
- Test login with valid credentials
- Test invalid credentials (should show error)
- Test logout functionality

#### Offline Mode
1. Log in with valid credentials
2. Turn off device internet/WiFi
3. Navigate through the app (should work offline)
4. Make changes (they get queued)
5. Turn internet back on
6. Changes should sync automatically

#### Responsive Design
- Test on different screen sizes
- Rotate device (portrait/landscape)
- Check tablet vs phone layouts

#### Data Sync
- Make changes on web app
- Refresh mobile app (pull down on Dashboard)
- Changes should appear
- Make changes on mobile
- Check web app for updates

### 3. Screen Size Testing

#### Phone Sizes (Portrait/Landscape)
- Small phone: 320px width
- Regular phone: 375px width  
- Large phone: 414px width

#### Tablet Sizes
- Small tablet: 768px width
- Large tablet: 1024px width

### 4. Debug Tools

#### React Native Debugger
1. Shake device or press `Cmd+D` (iOS) / `Cmd+M` (Android)
2. Select "Debug"
3. This opens Chrome DevTools for debugging

#### Logs
```bash
# View all logs
npx react-native log-android

# View app-specific logs
adb logcat | grep "ReactNativeJS"
```

## Production Build

### Create Release APK
```bash
npm run build:android
```

The APK will be created at:
`android/app/build/outputs/apk/release/app-release.apk`

## Troubleshooting

### Common Issues

#### Metro bundler issues
```bash
npm run clean
npm start
```

#### Android build fails
```bash
cd android
./gradlew clean
cd ..
npm run android
```

#### App crashes on startup
1. Check Metro bundler is running
2. Check device logs: `npx react-native log-android`
3. Try clean build: `npm run clean`

#### Firebase connection issues
1. Verify `google-services.json` is in `android/app/`
2. Check internet connection
3. Verify Firebase project settings

#### Native module issues
```bash
# Clean everything and reinstall
rm -rf node_modules
npm install
cd android && ./gradlew clean && cd ..
npm run android
```

### Getting Help

#### Check Device Connection
```bash
adb devices  # Should show your device
```

#### Verify Android SDK
```bash
$ANDROID_HOME/platform-tools/adb version
```

#### Check Java Installation
```bash
java -version  # Should show Java 17
```

## Development Workflow

### Making Changes
1. Edit source files in `src/`
2. Save files (Metro will auto-reload)
3. If adding new native dependencies:
   ```bash
   cd android && ./gradlew clean && cd ..
   npm run android
   ```

### Testing Changes
1. Test on emulator first
2. Test on physical device
3. Test offline functionality
4. Test different screen sizes

### Before Deployment
1. Run linting: `npm run lint`
2. Test on multiple devices
3. Test production build: `npm run build:android`
4. Test offline sync thoroughly

## App Structure

```
ABSOMSMobile/
├── src/
│   ├── components/     # Reusable UI components
│   ├── contexts/       # React contexts (Auth, Theme)
│   ├── database/       # SQLite schema and operations
│   ├── navigation/     # Navigation configuration
│   ├── screens/        # Screen components
│   ├── services/       # Firebase, sync, data services
│   ├── types/          # TypeScript type definitions
│   └── utils/          # Utility functions
├── android/            # Android-specific code
└── ios/               # iOS-specific code (future)
```

## Next Steps

After successful testing, you can:
1. Add more features to existing modules
2. Implement remaining modules (Sales, Inventory, Payroll)
3. Add push notifications
4. Deploy to Google Play Store
5. Add iOS support

## Support

If you encounter issues:
1. Check this document first
2. Check React Native documentation
3. Check Firebase documentation
4. Check individual package documentation
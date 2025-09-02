#!/bin/bash

echo "🚀 ABS OMS Mobile - Final Setup"
echo "==============================="

# Set up all environment variables
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export PATH="$JAVA_HOME/bin:$PATH"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator"

echo "✅ Environment configured:"
echo "   Java: $(java -version 2>&1 | head -n 1)"
echo "   JAVA_HOME: $JAVA_HOME"
echo "   ANDROID_HOME: $ANDROID_HOME"

# Make sure we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Not in React Native project directory"
    echo "Please run this script from the ABSOMSMobile directory"
    exit 1
fi

echo ""
echo "📱 Checking for Android devices..."
devices=$($ANDROID_HOME/platform-tools/adb devices | grep -v "List of devices" | grep -v "^$")

if [ -z "$devices" ]; then
    echo "⚠️  No Android devices found."
    echo ""
    echo "📋 Please connect your device:"
    echo "1. Enable Developer Options (Settings → About → Tap Build Number 7 times)"
    echo "2. Enable USB Debugging (Settings → Developer Options)"
    echo "3. Connect via USB cable"
    echo "4. Accept 'Allow USB Debugging' popup on your phone"
    echo ""
    read -p "Press ENTER after connecting your device..."
    
    # Check again
    devices=$($ANDROID_HOME/platform-tools/adb devices | grep -v "List of devices" | grep -v "^$")
    if [ -z "$devices" ]; then
        echo "❌ Still no devices found."
        echo "💡 You can also start an Android Emulator from Android Studio"
        exit 1
    fi
fi

echo "✅ Device(s) found:"
echo "$devices"

echo ""
echo "🚇 Starting Metro bundler..."
# Kill any existing Metro processes
pkill -f "react-native.*start" 2>/dev/null || true
sleep 2

# Start Metro in background
npm start &
metro_pid=$!
echo "Metro started with PID: $metro_pid"

# Wait for Metro to initialize
echo "⏱️  Waiting for Metro to initialize (30 seconds)..."
sleep 30

echo ""
echo "🔧 Building and installing app..."
echo "⏳ This may take 5-10 minutes on first build..."

# Build the app
npm run android

build_result=$?

if [ $build_result -eq 0 ]; then
    echo ""
    echo "🎉 SUCCESS! Your app should now be running!"
    echo ""
    echo "📱 What you should see:"
    echo "• App installed on your device"
    echo "• ABS OMS Mobile login screen"
    echo "• Can login with your existing Firebase credentials"
    echo ""
    echo "🧪 Test these features:"
    echo "• Login/logout"
    echo "• Navigate through modules"
    echo "• Toggle dark/light theme in Settings"
    echo "• Turn off WiFi to test offline mode"
    echo "• Pull down on Dashboard to sync data"
    echo ""
    echo "🔧 Development commands:"
    echo "• Shake device or press R to reload"
    echo "• Press Cmd+M (Android) to open dev menu"
    echo ""
    echo "Metro bundler is still running (PID: $metro_pid)"
    echo "Keep it running while developing"
else
    echo ""
    echo "❌ Build failed. Troubleshooting:"
    echo ""
    echo "1. 🔄 Retry with clean build:"
    echo "   npm run clean && npm run android"
    echo ""
    echo "2. 📱 Check device connection:"
    echo "   adb devices"
    echo ""
    echo "3. 🔍 View detailed logs:"
    echo "   npx react-native run-android --verbose"
    echo ""
    echo "4. 🧹 Full clean:"
    echo "   cd android && ./gradlew clean && cd .. && npm start -- --reset-cache"
    
    # Stop Metro
    kill $metro_pid 2>/dev/null
fi

exit $build_result
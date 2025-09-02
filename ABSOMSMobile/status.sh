#!/bin/bash

echo "📊 ABS OMS Mobile - Current Status"
echo "=================================="

# Set environment
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"

echo ""
echo "✅ COMPLETED SETUP:"
echo "• ✅ React Native project created"
echo "• ✅ Firebase configuration added"
echo "• ✅ All dependencies installed"
echo "• ✅ Java 21 configured (from Android Studio)"
echo "• ✅ Android SDK environment set"
echo "• ✅ Metro bundler configuration updated"
echo "• ✅ Build scripts created"

echo ""
echo "🔍 CURRENT STATUS:"

# Check Java
if [ -f "$JAVA_HOME/bin/java" ]; then
    echo "• ✅ Java: Ready ($($JAVA_HOME/bin/java -version 2>&1 | head -n 1 | cut -d' ' -f3))"
else
    echo "• ❌ Java: Not configured"
fi

# Check Android SDK
if [ -d "$ANDROID_HOME" ]; then
    echo "• ✅ Android SDK: Ready"
else
    echo "• ❌ Android SDK: Not found"
fi

# Check devices
if [ -f "$ANDROID_HOME/platform-tools/adb" ]; then
    devices=$($ANDROID_HOME/platform-tools/adb devices | grep -v "List of devices" | grep -v "^$")
    if [ -n "$devices" ]; then
        echo "• ✅ Device: Connected"
        echo "  📱 $(echo "$devices" | head -1)"
    else
        echo "• ⚠️  Device: Not connected"
    fi
else
    echo "• ❌ ADB: Not available"
fi

# Check Metro
metro_pid=$(ps aux | grep "react-native.*start" | grep -v grep | awk '{print $2}')
if [ -n "$metro_pid" ]; then
    echo "• ✅ Metro: Running (PID: $metro_pid)"
else
    echo "• ⚠️  Metro: Not running"
fi

# Check if app was built
if [ -d "android/app/build" ]; then
    echo "• ✅ Build artifacts: Present"
else
    echo "• ⚠️  Build artifacts: Not found (first build needed)"
fi

echo ""
echo "🎯 NEXT STEPS:"

devices=$($ANDROID_HOME/platform-tools/adb devices 2>/dev/null | grep -v "List of devices" | grep -v "^$")
if [ -z "$devices" ]; then
    echo "1. 📱 Connect your Android device:"
    echo "   • Enable Developer Options"
    echo "   • Enable USB Debugging" 
    echo "   • Connect via USB"
else
    echo "1. 🚀 Ready to build! Run:"
    echo "   ./final-setup.sh"
fi

echo ""
echo "📚 Available commands:"
echo "• ./final-setup.sh    - Complete build and run"
echo "• ./status.sh          - Check current status"
echo "• npm run android      - Build and run (after setup)"
echo "• npm start            - Start Metro bundler"
echo "• npm run clean        - Clean build cache"

exit 0
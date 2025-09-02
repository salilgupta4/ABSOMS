#!/bin/bash

echo "📱 Testing Android Device Connection"
echo "===================================="

# Set environment
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools

echo "🔍 Looking for connected devices..."
devices=$($ANDROID_HOME/platform-tools/adb devices)

echo "$devices"

if echo "$devices" | grep -q "device$"; then
    echo "✅ Android device found and ready!"
    echo ""
    echo "🚀 You can now run the app with:"
    echo "   npm run android"
    echo ""
    echo "📱 Device details:"
    $ANDROID_HOME/platform-tools/adb shell getprop ro.product.model
    $ANDROID_HOME/platform-tools/adb shell getprop ro.build.version.release
else
    echo "❌ No devices found or device not authorized"
    echo ""
    echo "🔧 Troubleshooting steps:"
    echo "1. Make sure USB Debugging is enabled on your phone"
    echo "2. Accept the 'Allow USB Debugging' popup on your phone"
    echo "3. Try a different USB cable"
    echo "4. Make sure your phone is unlocked"
    echo ""
    echo "📋 Quick setup reminder:"
    echo "• Settings → About Phone → Tap Build Number 7 times"
    echo "• Settings → Developer Options → Enable USB Debugging"
    echo "• Connect via USB and accept the popup"
fi
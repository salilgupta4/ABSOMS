#!/bin/bash

echo "📱 Launching ABS OMS Mobile App"
echo "==============================="

# Set environment
export ANDROID_HOME=$HOME/Library/Android/sdk

echo "🔍 Checking app installation..."
app_check=$($ANDROID_HOME/platform-tools/adb shell pm list packages | grep absomsmobile)
if [ -n "$app_check" ]; then
    echo "✅ App is installed: $app_check"
else
    echo "❌ App not installed"
    exit 1
fi

echo ""
echo "🚀 Launching app on device..."
$ANDROID_HOME/platform-tools/adb shell am start -n com.absomsmobile/.MainActivity

if [ $? -eq 0 ]; then
    echo "✅ App launch command sent successfully!"
    echo ""
    echo "📱 You should now see the ABS OMS Mobile app opening on your device"
    echo ""
    echo "🔍 If the app doesn't appear or crashes:"
    echo "1. Check your device screen"
    echo "2. Look for any error popups"
    echo "3. Check device logs: adb logcat | grep ReactNative"
    echo "4. Or run: ./check-app-logs.sh"
else
    echo "❌ Failed to launch app"
    echo ""
    echo "🔧 Troubleshooting:"
    echo "1. Make sure USB debugging is still enabled"
    echo "2. Try: adb kill-server && adb start-server"
    echo "3. Reinstall: npm run android"
fi

echo ""
echo "💡 App Features to Test:"
echo "• Login with your Firebase credentials"
echo "• Navigate through Dashboard, Sales, etc."
echo "• Toggle dark/light theme in Settings"
echo "• Test offline mode (turn off WiFi)"

exit 0
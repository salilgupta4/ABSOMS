#!/bin/bash

echo "📱 Testing App Status"
echo "===================="

export ANDROID_HOME=$HOME/Library/Android/sdk

echo "🔍 Metro Bundler Status:"
metro_status=$(curl -s http://localhost:8081/status 2>/dev/null || echo "not-running")
if [ "$metro_status" = "packager-status:running" ]; then
    echo "   ✅ Metro: Running correctly"
else
    echo "   ❌ Metro: $metro_status"
fi

echo ""
echo "📱 Device Connection:"
devices=$($ANDROID_HOME/platform-tools/adb devices | grep -v "List of devices" | grep -v "^$")
if [ -n "$devices" ]; then
    echo "   ✅ Device connected: $(echo "$devices" | head -1)"
else
    echo "   ❌ No device connected"
fi

echo ""
echo "🚀 App Status on Device:"
app_running=$($ANDROID_HOME/platform-tools/adb shell "dumpsys activity activities | grep -i absomsmobile" 2>/dev/null)
if [ -n "$app_running" ]; then
    echo "   ✅ App is running on device"
else
    echo "   ⚠️  App may not be active (but could still be installed)"
fi

echo ""
echo "💡 What to check on your device:"
echo "================================="
echo "1. 📱 Look at your phone screen now"
echo "2. ✅ You should see: ABS OMS Mobile login screen (stable, no 'reloading')"
echo "3. ❌ If you see: Red error screen, white screen, or 'reloading' message"
echo ""
echo "🎯 If the app is working correctly:"
echo "• Try logging in with your Firebase credentials"
echo "• Navigate to different sections"
echo "• The app should work offline too"
echo ""
echo "⚠️  If you still see issues:"
echo "• Take a screenshot of what you see"
echo "• Run: ./check-app-logs.sh"
echo "• Or tell me exactly what appears on screen"

# Try to launch the app one more time just in case
echo ""
echo "🔄 Launching app (in case it's not visible)..."
$ANDROID_HOME/platform-tools/adb shell am start -n com.absomsmobile/.MainActivity >/dev/null 2>&1
echo "   App launch command sent"

exit 0
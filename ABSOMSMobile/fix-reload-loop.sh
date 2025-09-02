#!/bin/bash

echo "🔄 Fixing Reload Loop Issue"
echo "==========================="

# Set environment
export ANDROID_HOME=$HOME/Library/Android/sdk

echo "🛑 Step 1: Stop all Metro processes"
pkill -f "react-native.*start" 2>/dev/null || true
pkill -f "node.*8081" 2>/dev/null || true
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
sleep 3
echo "✅ Processes stopped"

echo ""
echo "🧹 Step 2: Clear all caches completely"
rm -rf /tmp/metro-*
rm -rf /tmp/react-*  
rm -rf /tmp/haste-map-*
rm -rf node_modules/.cache/
npm cache clean --force 2>/dev/null || true
echo "✅ Caches cleared"

echo ""
echo "📱 Step 3: Reset device connection"
adb kill-server
sleep 2
adb start-server
sleep 2
adb reverse tcp:8081 tcp:8081
echo "✅ Device connection reset"

echo ""
echo "🚇 Step 4: Start Metro with clean slate"
echo "Starting Metro bundler (this may take 30 seconds)..."

npm start -- --reset-cache &
metro_pid=$!

# Wait for Metro to fully start
echo "⏱️  Waiting for Metro to initialize completely..."
for i in {1..30}; do
    if curl -s http://localhost:8081/status >/dev/null 2>&1; then
        echo "✅ Metro is ready!"
        break
    fi
    echo "   Initializing... ($i/30)"
    sleep 2
done

if ! curl -s http://localhost:8081/status >/dev/null 2>&1; then
    echo "❌ Metro failed to start"
    kill $metro_pid 2>/dev/null
    exit 1
fi

echo ""
echo "📱 Step 5: Restart the app"
echo "Force-stopping app on device..."
adb shell am force-stop com.absomsmobile

sleep 2

echo "Launching app..."
adb shell am start -n com.absomsmobile/.MainActivity

echo ""
echo "🎉 App should now load without reload loop!"
echo ""
echo "📱 On your device, you should see:"
echo "• ABS OMS login screen (no more 'reloading')"
echo "• Stable app interface"
echo ""
echo "💡 Metro bundler is running (PID: $metro_pid)"
echo "If you still see issues, check your phone screen for error messages"

exit 0
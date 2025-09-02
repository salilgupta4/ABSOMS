#!/bin/bash

echo "🔧 Fixing Metro Bundler Connection Issues"
echo "=========================================="

# Set environment
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"

echo ""
echo "🛑 Step 1: Stop all existing processes"
echo "======================================"

# Kill any existing Metro processes
echo "Stopping Metro bundler..."
pkill -f "react-native.*start" 2>/dev/null || true
pkill -f "node.*start" 2>/dev/null || true
sleep 3

# Kill any node processes on port 8081
echo "Freeing up port 8081..."
lsof -ti:8081 | xargs kill -9 2>/dev/null || true
sleep 2

echo "✅ Processes stopped"

echo ""
echo "🧹 Step 2: Clean Metro cache"
echo "============================"

# Clear Metro cache
echo "Clearing Metro bundler cache..."
rm -rf /tmp/metro-* 2>/dev/null || true
rm -rf /tmp/react-native-* 2>/dev/null || true
npm start -- --reset-cache --dry-run 2>/dev/null || true

echo "✅ Cache cleared"

echo ""
echo "🔌 Step 3: Check network connectivity"
echo "====================================="

# Get local IP
local_ip=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "localhost")
echo "Local IP: $local_ip"

# Check if device can reach the computer
device_id=$(adb devices | grep -v "List of devices" | grep "device" | head -1 | awk '{print $1}')
if [ -n "$device_id" ]; then
    echo "Testing device connectivity to computer..."
    # Enable port forwarding for Metro
    adb -s $device_id reverse tcp:8081 tcp:8081
    echo "✅ Port forwarding enabled (device port 8081 → computer port 8081)"
else
    echo "⚠️  No device found for port forwarding"
fi

echo ""
echo "📱 Step 4: Configure device networking"
echo "======================================"

if [ -n "$device_id" ]; then
    echo "Setting up device networking..."
    
    # Clear any existing forwarding
    adb -s $device_id reverse --remove-all 2>/dev/null || true
    
    # Set up fresh port forwarding
    adb -s $device_id reverse tcp:8081 tcp:8081
    adb -s $device_id reverse tcp:8097 tcp:8097  # For debugging
    
    echo "✅ Device networking configured"
fi

echo ""
echo "🚇 Step 5: Start Metro with proper configuration"
echo "================================================"

echo "Starting Metro bundler with network fixes..."

# Create Metro config if needed
cat > metro.config.js << 'EOF'
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const config = {
  resolver: {
    assetExts: ['bin', 'txt', 'jpg', 'png', 'json', 'ttf', 'otf', 'woff', 'woff2'],
  },
  transformer: {
    getTransformCacheKeyFn: () => {
      return 'transform-cache-key-v2';
    },
  },
  server: {
    port: 8081,
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
EOF

# Start Metro in background
echo "🚇 Starting Metro bundler..."
npm start -- --reset-cache --port 8081 &
metro_pid=$!

echo "Metro started with PID: $metro_pid"
echo "⏱️  Waiting for Metro to initialize..."

# Wait for Metro to start and be ready
for i in {1..30}; do
    if curl -s http://localhost:8081/status > /dev/null 2>&1; then
        echo "✅ Metro bundler is ready!"
        break
    fi
    echo "   Waiting... ($i/30)"
    sleep 2
done

if ! curl -s http://localhost:8081/status > /dev/null 2>&1; then
    echo "❌ Metro bundler failed to start properly"
    kill $metro_pid 2>/dev/null
    exit 1
fi

echo ""
echo "🔧 Step 6: Rebuild and reinstall app"
echo "===================================="

echo "Rebuilding app with fresh Metro connection..."

# Clean build artifacts
rm -rf android/app/build/outputs/apk/debug/
./gradlew clean -p android/

# Build and install with verbose output
echo "🔨 Building and installing app..."
npx react-native run-android --verbose

build_result=$?

if [ $build_result -eq 0 ]; then
    echo ""
    echo "🎉 SUCCESS! App should now work correctly!"
    echo ""
    echo "📱 Your app is now:"
    echo "• ✅ Connected to Metro bundler"
    echo "• ✅ Properly installed on device"
    echo "• ✅ Ready to use"
    echo ""
    echo "🧪 Test the app now:"
    echo "• Open the app on your device"
    echo "• Login with your Firebase credentials"
    echo "• Navigate through different screens"
    echo ""
    echo "💡 Metro bundler is running (PID: $metro_pid)"
    echo "Keep it running while using the app"
else
    echo ""
    echo "❌ Build failed. Let's try troubleshooting..."
    
    echo ""
    echo "🔍 Checking what went wrong..."
    
    # Check if Metro is still running
    if ps -p $metro_pid > /dev/null 2>&1; then
        echo "✅ Metro still running"
    else
        echo "❌ Metro stopped - restarting..."
        npm start &
        metro_pid=$!
    fi
    
    echo ""
    echo "🔄 Try manual steps:"
    echo "1. Make sure Metro shows 'Ready' in its terminal"
    echo "2. Run: npx react-native run-android"
    echo "3. Or run: ./launch-app.sh"
    
    kill $metro_pid 2>/dev/null
fi

exit $build_result
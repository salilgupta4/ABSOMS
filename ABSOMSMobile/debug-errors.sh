#!/bin/bash

echo "🔍 ABS OMS Mobile - Error Diagnosis"
echo "===================================="

# Set environment
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"

echo ""
echo "📊 System Status Check:"
echo "======================="

# Check Java
echo "☕ Java:"
if [ -f "$JAVA_HOME/bin/java" ]; then
    java -version 2>&1 | head -3
    echo "   ✅ Java available"
else
    echo "   ❌ Java not found"
fi

echo ""

# Check Android SDK
echo "🤖 Android SDK:"
if [ -d "$ANDROID_HOME" ]; then
    echo "   ✅ SDK found at: $ANDROID_HOME"
    if [ -f "$ANDROID_HOME/platform-tools/adb" ]; then
        echo "   ✅ ADB available"
    else
        echo "   ❌ ADB not found"
    fi
else
    echo "   ❌ SDK not found"
fi

echo ""

# Check device connection
echo "📱 Device Connection:"
devices=$(adb devices 2>/dev/null | grep -v "List of devices" | grep -v "^$")
if [ -n "$devices" ]; then
    echo "   ✅ Device(s) connected:"
    echo "$devices" | while read line; do
        device=$(echo $line | awk '{print $1}')
        status=$(echo $line | awk '{print $2}')
        echo "      📱 $device ($status)"
        
        if [ "$status" = "device" ]; then
            echo "      📋 Device info:"
            adb -s $device shell getprop ro.product.model 2>/dev/null | sed 's/^/         Model: /'
            adb -s $device shell getprop ro.build.version.release 2>/dev/null | sed 's/^/         Android: /'
            adb -s $device shell getprop ro.product.cpu.abi 2>/dev/null | sed 's/^/         CPU: /'
        fi
    done
else
    echo "   ❌ No devices connected"
    echo ""
    echo "   💡 Troubleshooting device connection:"
    echo "      1. Enable Developer Options (Settings → About → Tap Build Number 7x)"
    echo "      2. Enable USB Debugging (Settings → Developer Options)"
    echo "      3. Connect USB cable"
    echo "      4. Accept 'Allow USB Debugging' popup"
    echo "      5. Try different USB cable/port"
fi

echo ""

# Check Metro bundler
echo "🚇 Metro Bundler:"
metro_processes=$(ps aux | grep "react-native.*start" | grep -v grep)
if [ -n "$metro_processes" ]; then
    echo "   ✅ Metro running:"
    echo "$metro_processes" | while read line; do
        pid=$(echo $line | awk '{print $2}')
        echo "      PID: $pid"
    done
    
    # Check if Metro is accessible
    if curl -s http://localhost:8081/status > /dev/null 2>&1; then
        echo "   ✅ Metro server responding on port 8081"
    else
        echo "   ⚠️  Metro server not responding (may still be starting)"
    fi
else
    echo "   ❌ Metro not running"
    echo "      💡 Start with: npm start"
fi

echo ""

# Check project files
echo "📁 Project Files:"
required_files=(
    "package.json"
    "android/build.gradle" 
    "android/app/build.gradle"
    "android/app/google-services.json"
    "src/types/index.ts"
    "src/services/firebase.ts"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "   ✅ $file"
    else
        echo "   ❌ $file (missing)"
    fi
done

echo ""

# Check node modules
echo "📦 Dependencies:"
if [ -d "node_modules" ]; then
    echo "   ✅ node_modules present"
    
    # Check key dependencies
    key_deps=(
        "@react-native-firebase/app"
        "@react-native-firebase/auth" 
        "@react-native-firebase/firestore"
        "react-native-paper"
        "@react-navigation/native"
    )
    
    for dep in "${key_deps[@]}"; do
        if [ -d "node_modules/$dep" ]; then
            echo "   ✅ $dep"
        else
            echo "   ❌ $dep (missing - run npm install)"
        fi
    done
else
    echo "   ❌ node_modules missing - run npm install"
fi

echo ""

# Check build artifacts
echo "🔧 Build Status:"
if [ -d "android/app/build" ]; then
    echo "   ✅ Build artifacts present"
    if [ -f "android/app/build/outputs/apk/debug/app-debug.apk" ]; then
        echo "   ✅ Debug APK built"
        apk_size=$(du -h android/app/build/outputs/apk/debug/app-debug.apk | awk '{print $1}')
        echo "      Size: $apk_size"
    else
        echo "   ⚠️  Debug APK not found"
    fi
else
    echo "   ❌ No build artifacts (first build needed)"
fi

echo ""

# Check ports
echo "🔌 Port Status:"
ports_to_check=(8081 8080 3000)
for port in "${ports_to_check[@]}"; do
    if lsof -i :$port > /dev/null 2>&1; then
        process=$(lsof -i :$port | tail -1 | awk '{print $1, $2}')
        echo "   Port $port: ✅ Used by $process"
    else
        echo "   Port $port: Available"
    fi
done

echo ""
echo "🔍 Common Error Solutions:"
echo "========================="
echo ""
echo "1. 📱 Device Authorization Error:"
echo "   • Disconnect and reconnect USB"
echo "   • Accept 'Allow USB Debugging' popup"
echo "   • Try: adb kill-server && adb start-server"
echo ""
echo "2. 🔧 Build Failed:"
echo "   • Run: npm run clean"
echo "   • Delete android/app/build folder"
echo "   • Run: ./gradlew clean (in android folder)"
echo ""
echo "3. 🚇 Metro Connection Error:"
echo "   • Kill Metro: pkill -f 'react-native.*start'"
echo "   • Start fresh: npm start -- --reset-cache"
echo ""
echo "4. 📦 Dependency Issues:"
echo "   • Delete node_modules and package-lock.json"
echo "   • Run: npm install"
echo ""
echo "5. 🔥 Firebase Error:"
echo "   • Check google-services.json is in android/app/"
echo "   • Verify Firebase project settings"
echo ""
echo "6. ☕ Java Version Error:"
echo "   • Current Java: $(java -version 2>&1 | head -1)"
echo "   • Required: Java 11, 17, or 21"

echo ""
echo "🆘 Get More Details:"
echo "==================="
echo "• View detailed build logs: npx react-native run-android --verbose"
echo "• Check device logs: adb logcat | grep ReactNative"
echo "• Metro bundler logs: Check terminal where 'npm start' is running"

exit 0
#!/bin/bash

echo "🔧 ABS OMS Mobile - Troubleshooting Script"
echo "=========================================="

# Check Node.js
echo "📦 Checking Node.js..."
if command -v node &> /dev/null; then
    echo "✅ Node.js version: $(node --version)"
else
    echo "❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi

# Check npm
echo "📦 Checking npm..."
if command -v npm &> /dev/null; then
    echo "✅ npm version: $(npm --version)"
else
    echo "❌ npm not found"
    exit 1
fi

# Check Android SDK
echo "🤖 Checking Android SDK..."
if [ -n "$ANDROID_HOME" ]; then
    echo "✅ ANDROID_HOME: $ANDROID_HOME"
    if [ -f "$ANDROID_HOME/platform-tools/adb" ]; then
        echo "✅ ADB found"
    else
        echo "❌ ADB not found in ANDROID_HOME"
    fi
else
    echo "❌ ANDROID_HOME not set"
    echo "Please add to your ~/.zshrc or ~/.bash_profile:"
    echo "export ANDROID_HOME=\$HOME/Library/Android/sdk"
    echo "export PATH=\$PATH:\$ANDROID_HOME/platform-tools"
fi

# Check Java
echo "☕ Checking Java..."
if command -v java &> /dev/null; then
    echo "✅ Java version: $(java -version 2>&1 | head -n 1)"
else
    echo "❌ Java not found. Please install Java 17"
fi

# Check Watchman
echo "👀 Checking Watchman..."
if command -v watchman &> /dev/null; then
    echo "✅ Watchman version: $(watchman --version)"
else
    echo "⚠️  Watchman not found (recommended but not required)"
    echo "Install with: brew install watchman"
fi

# Check if we're in the right directory
echo "📁 Checking project directory..."
if [ -f "package.json" ] && [ -d "android" ]; then
    echo "✅ In React Native project directory"
else
    echo "❌ Not in React Native project directory"
    echo "Please run this script from the ABSOMSMobile directory"
    exit 1
fi

# Check dependencies
echo "📚 Checking dependencies..."
if [ -d "node_modules" ]; then
    echo "✅ node_modules found"
else
    echo "⚠️  node_modules not found"
    echo "Run: npm install"
fi

# Check Android devices
echo "📱 Checking Android devices..."
if command -v adb &> /dev/null; then
    devices=$(adb devices | grep -v "List of devices" | grep -v "^$")
    if [ -n "$devices" ]; then
        echo "✅ Android devices found:"
        echo "$devices"
    else
        echo "⚠️  No Android devices connected"
        echo "Please connect a device or start an emulator"
    fi
else
    echo "❌ ADB not found"
fi

# Check Metro bundler
echo "🚇 Checking Metro bundler..."
metro_pid=$(ps aux | grep "react-native start" | grep -v grep | awk '{print $2}')
if [ -n "$metro_pid" ]; then
    echo "✅ Metro bundler is running (PID: $metro_pid)"
else
    echo "⚠️  Metro bundler not running"
    echo "Start with: npm start"
fi

echo ""
echo "🎯 Quick Fix Commands:"
echo "====================="
echo "Clean everything:     npm run clean"
echo "Start fresh:          npm install && npm start"
echo "Reset Metro cache:    npm run start:reset"
echo "Build Android:        npm run android"
echo "View logs:            npx react-native log-android"

echo ""
echo "📋 Summary:"
echo "==========="

# Count issues
issues=0
if ! command -v node &> /dev/null; then ((issues++)); fi
if [ -z "$ANDROID_HOME" ]; then ((issues++)); fi
if ! command -v java &> /dev/null; then ((issues++)); fi
if [ ! -d "node_modules" ]; then ((issues++)); fi

if [ $issues -eq 0 ]; then
    echo "✅ All major requirements satisfied!"
    echo "You should be able to run: npm run android"
else
    echo "❌ Found $issues issue(s) that need to be fixed"
    echo "Please review the output above and fix the issues"
fi

exit 0
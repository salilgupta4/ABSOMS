#!/bin/bash

echo "🚀 ABS OMS Mobile - Quick Start"
echo "==============================="

# Function to check if command exists
command_exists() {
    command -v "$1" &> /dev/null
}

# Check prerequisites
echo "🔍 Checking prerequisites..."

if ! command_exists node; then
    echo "❌ Node.js not found. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

if [ -z "$ANDROID_HOME" ]; then
    echo "❌ ANDROID_HOME not set."
    echo "Please set up Android SDK and add to your ~/.zshrc:"
    echo "export ANDROID_HOME=\$HOME/Library/Android/sdk"
    echo "export PATH=\$PATH:\$ANDROID_HOME/platform-tools"
    exit 1
fi

echo "✅ Prerequisites look good!"

# Install dependencies
echo ""
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed!"

# Check for devices
echo ""
echo "📱 Checking for Android devices..."
devices=$(adb devices | grep -v "List of devices" | grep -v "^$")

if [ -z "$devices" ]; then
    echo "⚠️  No Android devices found."
    echo ""
    echo "To continue, you need either:"
    echo "1. 📱 Physical device with USB debugging enabled"
    echo "2. 🖥️  Android emulator running"
    echo ""
    echo "For emulator:"
    echo "1. Open Android Studio"
    echo "2. Go to Tools > AVD Manager"
    echo "3. Start an existing AVD or create a new one"
    echo ""
    echo "For physical device:"
    echo "1. Enable Developer Options (tap Build Number 7 times)"
    echo "2. Enable USB Debugging in Developer Options"
    echo "3. Connect via USB"
    echo ""
    read -p "Press ENTER after connecting a device or starting emulator..."
    
    # Check again
    devices=$(adb devices | grep -v "List of devices" | grep -v "^$")
    if [ -z "$devices" ]; then
        echo "❌ Still no devices found. Please check your setup."
        exit 1
    fi
fi

echo "✅ Android device found:"
echo "$devices"

# Start Metro bundler in background
echo ""
echo "🚇 Starting Metro bundler..."
npm start &
metro_pid=$!

echo "Metro bundler started (PID: $metro_pid)"
echo "Waiting for Metro to initialize..."
sleep 5

# Build and run the app
echo ""
echo "🔧 Building and launching app..."
echo "This may take a few minutes on first run..."

npm run android

if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Success! The app should now be running on your device."
    echo ""
    echo "📚 What you can do now:"
    echo "• Login with your existing Firebase credentials"
    echo "• Test offline mode by turning off internet"
    echo "• Navigate through different modules"
    echo "• Try the dark/light theme toggle in Settings"
    echo ""
    echo "📱 Development tips:"
    echo "• Shake device to open developer menu"
    echo "• Pull down on Dashboard to refresh/sync data"
    echo "• Check BUILD_INSTRUCTIONS.md for detailed guide"
    echo ""
    echo "🔧 Useful commands:"
    echo "• npm start                  - Start Metro bundler"
    echo "• npm run android           - Rebuild and run app"
    echo "• npm run clean             - Clean cache and rebuild"
    echo "• ./troubleshoot.sh         - Run diagnostics"
    echo ""
    echo "Metro bundler is still running in background (PID: $metro_pid)"
    echo "Use 'kill $metro_pid' to stop it when done"
else
    echo ""
    echo "❌ Build failed. Here are some things to try:"
    echo ""
    echo "1. 🧹 Clean and retry:"
    echo "   npm run clean"
    echo "   npm run android"
    echo ""
    echo "2. 🔍 Run diagnostics:"
    echo "   ./troubleshoot.sh"
    echo ""
    echo "3. 📱 Check device connection:"
    echo "   adb devices"
    echo ""
    echo "4. 📋 View logs:"
    echo "   npx react-native log-android"
    echo ""
    echo "Stopping Metro bundler..."
    kill $metro_pid 2>/dev/null
fi
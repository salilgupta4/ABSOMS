#!/bin/bash

echo "🤖 Setting up Android Environment"
echo "================================="

# Set Android environment variables for this session
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
export PATH=$PATH:$ANDROID_HOME/tools
export PATH=$PATH:$ANDROID_HOME/tools/bin

echo "✅ Android environment variables set for this session"
echo "ANDROID_HOME: $ANDROID_HOME"

# Verify ADB is working
if [ -f "$ANDROID_HOME/platform-tools/adb" ]; then
    echo "✅ ADB found: $($ANDROID_HOME/platform-tools/adb version | head -n 1)"
else
    echo "❌ ADB not found"
    exit 1
fi

# Check .zshrc setup
if grep -q "ANDROID_HOME" ~/.zshrc; then
    echo "✅ Android variables already added to ~/.zshrc"
else
    echo "📝 Adding Android variables to ~/.zshrc..."
    echo '' >> ~/.zshrc
    echo '# Android SDK Setup for React Native' >> ~/.zshrc
    echo 'export ANDROID_HOME=$HOME/Library/Android/sdk' >> ~/.zshrc
    echo 'export PATH=$PATH:$ANDROID_HOME/emulator' >> ~/.zshrc
    echo 'export PATH=$PATH:$ANDROID_HOME/platform-tools' >> ~/.zshrc
    echo 'export PATH=$PATH:$ANDROID_HOME/tools' >> ~/.zshrc
    echo 'export PATH=$PATH:$ANDROID_HOME/tools/bin' >> ~/.zshrc
    echo "✅ Android variables added to ~/.zshrc"
fi

echo ""
echo "🎯 What to do next:"
echo "1. Close this terminal and open a NEW terminal"
echo "2. Or run: source ~/.zshrc"
echo "3. Then run: ./quick-start.sh"
echo ""
echo "📱 For now, let's continue with the app setup in this session..."

# Now run the app setup with proper environment
echo ""
echo "🚇 Starting React Native setup..."

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Not in React Native project directory"
    echo "Please run this from the ABSOMSMobile directory"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed!"

# Check for Android devices
echo ""
echo "📱 Checking for Android devices..."
devices=$($ANDROID_HOME/platform-tools/adb devices | grep -v "List of devices" | grep -v "^$")

if [ -z "$devices" ]; then
    echo "⚠️  No Android devices found."
    echo ""
    echo "📋 To connect a device:"
    echo ""
    echo "🖥️  For Android Emulator:"
    echo "1. Open Android Studio"
    echo "2. Go to Tools > AVD Manager"
    echo "3. Click ▶️ to start an emulator"
    echo ""
    echo "📱 For Physical Device:"
    echo "1. Enable Developer Options:"
    echo "   Settings > About Phone > Tap 'Build Number' 7 times"
    echo "2. Enable USB Debugging:"
    echo "   Settings > Developer Options > USB Debugging"
    echo "3. Connect device via USB"
    echo "4. Accept the debugging prompt on your phone"
    echo ""
    read -p "Press ENTER after connecting a device or starting emulator..."
    
    # Check again
    devices=$($ANDROID_HOME/platform-tools/adb devices | grep -v "List of devices" | grep -v "^$")
    if [ -z "$devices" ]; then
        echo "❌ Still no devices found."
        echo "💡 You can continue setup and connect a device later"
    else
        echo "✅ Device connected!"
        echo "Device: $devices"
    fi
else
    echo "✅ Android device found:"
    echo "$devices"
fi

echo ""
echo "🚀 Ready to build the app!"
echo ""
echo "Run these commands:"
echo "1. npm start     (in one terminal - keep running)"
echo "2. npm run android     (in another terminal)"
echo ""
echo "Or just run: npm run android (it will start Metro automatically)"

exit 0
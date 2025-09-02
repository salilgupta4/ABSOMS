#!/bin/bash

echo "☕ Installing Java JDK for React Native"
echo "========================================"

echo ""
echo "🔍 Current situation:"
echo "• You have a Java stub, but need a full JDK"
echo "• This is needed to build Android apps"
echo ""

echo "🎯 EASIEST METHOD - Android Studio Built-in JDK:"
echo "================================================="
echo ""
echo "1. Open Android Studio"
echo "2. Create a new project or open any project"
echo "3. Go to File → Project Structure"
echo "4. Click 'SDK Location' on the left side"
echo "5. Look for 'JDK Location' field"
echo "6. If empty, click the folder icon and select 'Download JDK'"
echo "7. Choose JDK 17 and download"
echo "8. Copy the path shown and use it below"
echo ""

read -p "📋 Did you install JDK through Android Studio? (y/n): " android_studio_jdk

if [[ $android_studio_jdk =~ ^[Yy]$ ]]; then
    echo ""
    echo "🔍 Let's find your Android Studio JDK..."
    
    # Common Android Studio JDK locations
    possible_jdks=(
        "/Applications/Android Studio.app/Contents/jbr"
        "/Applications/Android Studio.app/Contents/jre"
        "$HOME/Library/Java/JavaVirtualMachines/*/Contents/Home"
        "/Library/Java/JavaVirtualMachines/*/Contents/Home"
    )
    
    found_jdk=""
    for jdk_path in "${possible_jdks[@]}"; do
        if [ -d "$jdk_path" ] || ls $jdk_path >/dev/null 2>&1; then
            for path in $jdk_path; do
                if [ -d "$path" ] && [ -f "$path/bin/java" ]; then
                    found_jdk="$path"
                    break 2
                fi
            done
        fi
    done
    
    if [ -n "$found_jdk" ]; then
        echo "✅ Found JDK at: $found_jdk"
        echo ""
        echo "🔧 Setting up environment..."
        
        # Test the JDK
        "$found_jdk/bin/java" -version
        
        echo ""
        echo "📝 Adding to your ~/.zshrc..."
        
        # Add to zshrc
        {
            echo ""
            echo "# Java JDK for React Native (added by install-jdk.sh)"
            echo "export JAVA_HOME=\"$found_jdk\""
            echo "export PATH=\"\$JAVA_HOME/bin:\$PATH\""
        } >> ~/.zshrc
        
        # Set for current session
        export JAVA_HOME="$found_jdk"
        export PATH="$JAVA_HOME/bin:$PATH"
        
        echo "✅ Java environment configured!"
        echo ""
        echo "🚀 Now let's build your app..."
        
        # Source Android environment
        export ANDROID_HOME=$HOME/Library/Android/sdk
        export PATH=$PATH:$ANDROID_HOME/platform-tools
        
        echo "📱 Connected devices:"
        $ANDROID_HOME/platform-tools/adb devices
        
        echo ""
        echo "🔧 Building React Native app..."
        npm run android
        
    else
        echo "❌ Couldn't find the JDK automatically"
        echo ""
        echo "📋 Please:"
        echo "1. Go to Android Studio → File → Project Structure → SDK Location"
        echo "2. Copy the 'JDK Location' path"
        echo "3. Run: export JAVA_HOME='/path/you/copied'"
        echo "4. Run: npm run android"
    fi
else
    echo ""
    echo "🌐 ALTERNATIVE - Download JDK Directly:"
    echo "======================================="
    echo ""
    echo "1. Go to: https://www.azul.com/downloads/?package=jdk#zulu"
    echo "2. Select:"
    echo "   • Java Version: 17 (LTS)"
    echo "   • Operating System: macOS" 
    echo "   • Architecture: ARM 64-bit (M1/M2 Mac) or x86 64-bit (Intel Mac)"
    echo "   • Package Type: JDK"
    echo "3. Download the .dmg file"
    echo "4. Install it"
    echo "5. Run this script again"
    echo ""
    echo "🔧 Or try Homebrew (requires admin password):"
    echo "brew install --cask zulu@17"
fi

echo ""
echo "💡 After Java is set up, your app should build and install automatically!"

exit 0
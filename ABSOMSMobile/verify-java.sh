#!/bin/bash

echo "🔍 Verifying Java Installation"
echo "=============================="

# Check if Java is available
if command -v java >/dev/null 2>&1; then
    echo "✅ Java found in PATH"
    echo "📋 Java version:"
    java -version
    echo ""
else
    echo "❌ Java not found in PATH"
    echo ""
fi

# Check Java Home
if [ -n "$JAVA_HOME" ]; then
    echo "✅ JAVA_HOME is set: $JAVA_HOME"
else
    echo "⚠️  JAVA_HOME not set"
    
    # Try to find Java installations
    if command -v /usr/libexec/java_home >/dev/null 2>&1; then
        echo "🔍 Available Java installations:"
        /usr/libexec/java_home -V 2>&1 || echo "No Java installations found"
        
        # Try to set JAVA_HOME automatically
        if /usr/libexec/java_home >/dev/null 2>&1; then
            suggested_java_home=$(/usr/libexec/java_home 2>/dev/null)
            echo ""
            echo "💡 Suggested fix - run these commands:"
            echo "export JAVA_HOME='$suggested_java_home'"
            echo "export PATH=\$JAVA_HOME/bin:\$PATH"
            echo ""
            echo "Or add to ~/.zshrc permanently:"
            echo "echo 'export JAVA_HOME=\"$suggested_java_home\"' >> ~/.zshrc"
            echo "echo 'export PATH=\$JAVA_HOME/bin:\$PATH' >> ~/.zshrc"
            echo "source ~/.zshrc"
        fi
    fi
fi

echo ""
echo "🤖 Checking Android environment..."

# Check Android Home
if [ -n "$ANDROID_HOME" ]; then
    echo "✅ ANDROID_HOME: $ANDROID_HOME"
else
    echo "⚠️  ANDROID_HOME not set"
fi

# Check device connection
if [ -n "$ANDROID_HOME" ] && [ -f "$ANDROID_HOME/platform-tools/adb" ]; then
    echo "📱 Connected devices:"
    $ANDROID_HOME/platform-tools/adb devices
else
    echo "❌ ADB not found"
fi

echo ""
echo "📊 Summary:"
echo "==========="

java_ok=false
android_ok=false

if command -v java >/dev/null 2>&1; then
    echo "✅ Java: Ready"
    java_ok=true
else
    echo "❌ Java: Not installed or not in PATH"
fi

if [ -n "$ANDROID_HOME" ]; then
    echo "✅ Android SDK: Ready"
    android_ok=true
else
    echo "❌ Android SDK: Environment not set"
fi

if $java_ok && $android_ok; then
    echo ""
    echo "🚀 Ready to build! Run:"
    echo "   cd ABSOMSMobile"
    echo "   npm run android"
elif $java_ok && ! $android_ok; then
    echo ""
    echo "⚠️  Java is ready, but run ./setup-android.sh first"
elif ! $java_ok && $android_ok; then
    echo ""
    echo "⚠️  Android is ready, but install Java first"
    echo "   Follow ./install-java-guide.sh"
else
    echo ""
    echo "❌ Both Java and Android setup needed"
    echo "   1. Follow ./install-java-guide.sh"
    echo "   2. Run ./setup-android.sh"
fi

exit 0
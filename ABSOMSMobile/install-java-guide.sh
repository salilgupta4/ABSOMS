#!/bin/bash

echo "☕ Java Installation Guide for ABS OMS Mobile"
echo "============================================="

echo ""
echo "🎯 Method 1: Via Android Studio (EASIEST - Try this first!)"
echo "1. Open Android Studio"
echo "2. Go to: Android Studio → Preferences (or File → Settings on Windows)"
echo "3. Navigate to: Build, Execution, Deployment → Build Tools → Gradle"
echo "4. Set 'Gradle JVM' to 'Embedded JDK version' or download if needed"
echo "5. Click Apply and OK"
echo ""
echo "Alternative in Android Studio:"
echo "1. Go to: File → Project Structure"
echo "2. Click 'SDK Location' on the left"
echo "3. Set 'JDK Location' (download if empty)"
echo ""

echo "🎯 Method 2: Direct Download (If Method 1 doesn't work)"
echo "1. Go to: https://www.azul.com/downloads/?package=jdk#zulu"
echo "2. Select: Java 17 (LTS), macOS, your architecture"
echo "3. Download and install the .dmg file"
echo ""

echo "🎯 Method 3: Via Homebrew (If you have admin access)"
echo "1. Install Homebrew (requires admin password):"
echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
echo "2. Install Java:"
echo "   brew install --cask zulu@17"
echo ""

echo "🔍 After installation, run this script again to verify:"
echo "./verify-java.sh"

exit 0
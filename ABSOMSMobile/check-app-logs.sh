#!/bin/bash

echo "📋 Checking App Logs"
echo "===================="

export ANDROID_HOME=$HOME/Library/Android/sdk

echo "🔍 Recent app logs (last 50 lines):"
echo "======================================"
$ANDROID_HOME/platform-tools/adb logcat -d | grep -E "(ReactNative|absomsmobile|FATAL|ERROR)" | tail -50

echo ""
echo "🔍 Live log monitoring (press Ctrl+C to stop):"
echo "=============================================="
echo "Watching for React Native and app-specific logs..."
$ANDROID_HOME/platform-tools/adb logcat | grep -E "(ReactNative|absomsmobile|FATAL|ERROR)"
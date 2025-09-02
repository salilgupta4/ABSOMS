import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { useTheme } from '../contexts/ThemeContext';
import { createThemedStyles } from '../utils/theme';

const LoadingScreen: React.FC = () => {
  const { theme } = useTheme();
  const styles = createThemedStyles(theme);

  return (
    <View style={[styles.container, localStyles.container]}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={[styles.bodyText, localStyles.text]}>
        Loading ABS OMS...
      </Text>
    </View>
  );
};

const localStyles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: 16,
    textAlign: 'center',
  },
});

export default LoadingScreen;
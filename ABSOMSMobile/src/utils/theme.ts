import { DefaultTheme, MD3DarkTheme, MD3LightTheme, configureFonts } from 'react-native-paper';
import { Platform } from 'react-native';
import { typography, spacing } from './responsive';

// Light theme colors
const lightColors = {
  primary: '#1976d2',
  primaryContainer: '#e3f2fd',
  secondary: '#03dac6',
  secondaryContainer: '#e0f2f1',
  tertiary: '#ff9800',
  tertiaryContainer: '#fff3e0',
  surface: '#ffffff',
  surfaceVariant: '#f5f5f5',
  surfaceDisabled: '#fafafa',
  background: '#fafafa',
  error: '#f44336',
  errorContainer: '#ffebee',
  onPrimary: '#ffffff',
  onPrimaryContainer: '#1976d2',
  onSecondary: '#000000',
  onSecondaryContainer: '#00695c',
  onTertiary: '#000000',
  onTertiaryContainer: '#e65100',
  onSurface: '#212121',
  onSurfaceVariant: '#757575',
  onSurfaceDisabled: '#bdbdbd',
  onBackground: '#212121',
  onError: '#ffffff',
  onErrorContainer: '#c62828',
  outline: '#e0e0e0',
  outlineVariant: '#f5f5f5',
  inverseSurface: '#303030',
  inverseOnSurface: '#fafafa',
  inversePrimary: '#64b5f6',
  shadow: '#000000',
  scrim: '#000000',
  backdrop: 'rgba(0, 0, 0, 0.5)',
  // Custom colors
  success: '#4caf50',
  successContainer: '#e8f5e8',
  onSuccess: '#ffffff',
  onSuccessContainer: '#2e7d32',
  warning: '#ff9800',
  warningContainer: '#fff3e0',
  onWarning: '#000000',
  onWarningContainer: '#e65100',
  info: '#2196f3',
  infoContainer: '#e3f2fd',
  onInfo: '#ffffff',
  onInfoContainer: '#1565c0',
};

// Dark theme colors
const darkColors = {
  primary: '#64b5f6',
  primaryContainer: '#1565c0',
  secondary: '#80cbc4',
  secondaryContainer: '#00695c',
  tertiary: '#ffb74d',
  tertiaryContainer: '#e65100',
  surface: '#121212',
  surfaceVariant: '#1e1e1e',
  surfaceDisabled: '#2c2c2c',
  background: '#000000',
  error: '#f44336',
  errorContainer: '#5d1a1d',
  onPrimary: '#000000',
  onPrimaryContainer: '#ffffff',
  onSecondary: '#000000',
  onSecondaryContainer: '#ffffff',
  onTertiary: '#000000',
  onTertiaryContainer: '#ffffff',
  onSurface: '#ffffff',
  onSurfaceVariant: '#e0e0e0',
  onSurfaceDisabled: '#616161',
  onBackground: '#ffffff',
  onError: '#ffffff',
  onErrorContainer: '#ffffff',
  outline: '#616161',
  outlineVariant: '#424242',
  inverseSurface: '#ffffff',
  inverseOnSurface: '#000000',
  inversePrimary: '#1976d2',
  shadow: '#000000',
  scrim: '#000000',
  backdrop: 'rgba(0, 0, 0, 0.7)',
  // Custom colors
  success: '#66bb6a',
  successContainer: '#2e7d32',
  onSuccess: '#000000',
  onSuccessContainer: '#ffffff',
  warning: '#ffb74d',
  warningContainer: '#e65100',
  onWarning: '#000000',
  onWarningContainer: '#ffffff',
  info: '#64b5f6',
  infoContainer: '#1565c0',
  onInfo: '#000000',
  onInfoContainer: '#ffffff',
};

// Extended theme interface
interface CustomTheme {
  colors: typeof lightColors;
  typography: typeof typography;
  spacing: typeof spacing;
  borderRadius: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };
  elevation: {
    level0: number;
    level1: number;
    level2: number;
    level3: number;
    level4: number;
    level5: number;
  };
  animation: {
    scale: number;
    duration: {
      short: number;
      medium: number;
      long: number;
    };
  };
}

// Border radius values
const borderRadius = {
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
};

// Elevation values
const elevation = {
  level0: 0,
  level1: 2,
  level2: 4,
  level3: 6,
  level4: 8,
  level5: 12,
};

// Animation values
const animation = {
  scale: 1.02,
  duration: {
    short: 150,
    medium: 300,
    long: 500,
  },
};

// Light theme
export const lightTheme: CustomTheme = {
  colors: lightColors,
  typography,
  spacing,
  borderRadius,
  elevation,
  animation,
};

// Dark theme
export const darkTheme: CustomTheme = {
  colors: darkColors,
  typography,
  spacing,
  borderRadius,
  elevation,
  animation,
};

// Font configuration for React Native Paper v5.x
const fontConfig = {
  fontFamily: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),
};

const fonts = configureFonts({ config: fontConfig });

// React Native Paper themes with proper font configuration for v5.x
export const paperLightTheme = {
  ...MD3LightTheme,
  fonts,
  colors: {
    ...MD3LightTheme.colors,
    ...lightColors,
  },
};

export const paperDarkTheme = {
  ...MD3DarkTheme,
  fonts,
  colors: {
    ...MD3DarkTheme.colors,
    ...darkColors,
  },
};

// Theme utility functions
export const getTheme = (isDark: boolean): CustomTheme => {
  return isDark ? darkTheme : lightTheme;
};

export const getPaperTheme = (isDark: boolean) => {
  return isDark ? paperDarkTheme : paperLightTheme;
};

// Common style utilities
export const createThemedStyles = (theme: CustomTheme) => ({
  // Container styles
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  
  // Card styles
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    elevation: theme.elevation.level1,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  
  // List item styles
  listItem: {
    backgroundColor: theme.colors.surface,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  
  // Button styles
  primaryButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    elevation: theme.elevation.level2,
  },
  
  secondaryButton: {
    backgroundColor: theme.colors.secondary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    elevation: theme.elevation.level1,
  },
  
  outlinedButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  
  // Text styles
  heading1: {
    fontSize: theme.typography.h1,
    fontWeight: 'bold',
    color: theme.colors.onBackground,
    marginBottom: theme.spacing.md,
  },
  
  heading2: {
    fontSize: theme.typography.h2,
    fontWeight: 'bold',
    color: theme.colors.onBackground,
    marginBottom: theme.spacing.sm,
  },
  
  heading3: {
    fontSize: theme.typography.h3,
    fontWeight: '600',
    color: theme.colors.onBackground,
    marginBottom: theme.spacing.sm,
  },
  
  bodyText: {
    fontSize: theme.typography.body1,
    color: theme.colors.onBackground,
    lineHeight: theme.typography.body1 * 1.4,
  },
  
  captionText: {
    fontSize: theme.typography.caption,
    color: theme.colors.onSurfaceVariant,
  },
  
  // Input styles
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.outline,
    borderRadius: theme.borderRadius.sm,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: theme.typography.body1,
    color: theme.colors.onSurface,
  },
  
  // Modal styles
  modal: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    margin: theme.spacing.lg,
    elevation: theme.elevation.level5,
  },
  
  // Status styles
  successStatus: {
    backgroundColor: theme.colors.successContainer,
    color: theme.colors.onSuccessContainer,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    fontSize: theme.typography.caption,
    fontWeight: '600',
  },
  
  errorStatus: {
    backgroundColor: theme.colors.errorContainer,
    color: theme.colors.onErrorContainer,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    fontSize: theme.typography.caption,
    fontWeight: '600',
  },
  
  warningStatus: {
    backgroundColor: theme.colors.warningContainer,
    color: theme.colors.onWarningContainer,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    fontSize: theme.typography.caption,
    fontWeight: '600',
  },
  
  infoStatus: {
    backgroundColor: theme.colors.infoContainer,
    color: theme.colors.onInfoContainer,
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.borderRadius.sm,
    fontSize: theme.typography.caption,
    fontWeight: '600',
  },
  
  // Divider
  divider: {
    height: 1,
    backgroundColor: theme.colors.outline,
    marginVertical: theme.spacing.md,
  },
  
  // Shadow
  shadow: {
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: theme.elevation.level2,
  },
});

export type ThemedStyles = ReturnType<typeof createThemedStyles>;
export type Theme = CustomTheme;
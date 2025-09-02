import { Dimensions, PixelRatio } from 'react-native';
import DeviceInfo from 'react-native-device-info';

// Screen dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Breakpoints based on common device sizes
export const BREAKPOINTS = {
  xs: 320,    // Small phones
  sm: 480,    // Phones
  md: 768,    // Small tablets
  lg: 1024,   // Large tablets
  xl: 1200,   // Desktop (if running on larger screens)
};

// Device type detection
export const getDeviceType = () => {
  if (SCREEN_WIDTH < BREAKPOINTS.sm) {
    return 'phone';
  } else if (SCREEN_WIDTH < BREAKPOINTS.lg) {
    return 'tablet';
  } else {
    return 'desktop';
  }
};

// Check if device is tablet
export const isTablet = () => {
  return getDeviceType() === 'tablet' || getDeviceType() === 'desktop';
};

// Check if device is phone
export const isPhone = () => {
  return getDeviceType() === 'phone';
};

// Responsive width calculation
export const wp = (percentage: number): number => {
  const value = (percentage * SCREEN_WIDTH) / 100;
  return Math.round(PixelRatio.roundToNearestPixel(value));
};

// Responsive height calculation
export const hp = (percentage: number): number => {
  const value = (percentage * SCREEN_HEIGHT) / 100;
  return Math.round(PixelRatio.roundToNearestPixel(value));
};

// Responsive font size
export const rf = (size: number): number => {
  const scale = Math.min(SCREEN_WIDTH / BREAKPOINTS.sm, SCREEN_HEIGHT / 812);
  const newSize = size * scale;
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

// Spacing utilities
export const spacing = {
  xs: wp(1),
  sm: wp(2),
  md: wp(4),
  lg: wp(6),
  xl: wp(8),
  xxl: wp(12),
};

// Get responsive value based on screen size
export const getResponsiveValue = <T>(values: {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  default: T;
}): T => {
  if (SCREEN_WIDTH >= BREAKPOINTS.xl && values.xl !== undefined) {
    return values.xl;
  } else if (SCREEN_WIDTH >= BREAKPOINTS.lg && values.lg !== undefined) {
    return values.lg;
  } else if (SCREEN_WIDTH >= BREAKPOINTS.md && values.md !== undefined) {
    return values.md;
  } else if (SCREEN_WIDTH >= BREAKPOINTS.sm && values.sm !== undefined) {
    return values.sm;
  } else if (values.xs !== undefined) {
    return values.xs;
  }
  return values.default;
};

// Layout configurations for different screen sizes
export const getLayoutConfig = () => {
  const deviceType = getDeviceType();
  
  switch (deviceType) {
    case 'phone':
      return {
        columns: 1,
        cardPadding: spacing.md,
        listItemHeight: hp(8),
        headerHeight: hp(8),
        bottomTabHeight: hp(10),
        modalMaxWidth: wp(95),
        modalPadding: spacing.lg,
      };
    
    case 'tablet':
      return {
        columns: 2,
        cardPadding: spacing.lg,
        listItemHeight: hp(6),
        headerHeight: hp(6),
        bottomTabHeight: hp(8),
        modalMaxWidth: wp(80),
        modalPadding: spacing.xl,
      };
    
    default: // desktop
      return {
        columns: 3,
        cardPadding: spacing.xl,
        listItemHeight: hp(5),
        headerHeight: hp(5),
        bottomTabHeight: hp(6),
        modalMaxWidth: wp(60),
        modalPadding: spacing.xxl,
      };
  }
};

// Typography scale
export const typography = {
  h1: rf(28),
  h2: rf(24),
  h3: rf(20),
  h4: rf(18),
  h5: rf(16),
  h6: rf(14),
  body1: rf(16),
  body2: rf(14),
  caption: rf(12),
  overline: rf(10),
};

// Icon sizes
export const iconSizes = {
  xs: rf(12),
  sm: rf(16),
  md: rf(20),
  lg: rf(24),
  xl: rf(32),
  xxl: rf(40),
};

// Button heights
export const buttonHeights = {
  sm: hp(4),
  md: hp(5),
  lg: hp(6),
};

// Grid utilities
export const getGridItemWidth = (columns: number, spacing: number = 16) => {
  return (SCREEN_WIDTH - spacing * (columns + 1)) / columns;
};

// Safe area utilities
export const getSafeAreaInsets = async () => {
  try {
    const hasNotch = await DeviceInfo.hasNotch();
    const statusBarHeight = await DeviceInfo.getStatusBarHeight();
    
    return {
      top: hasNotch ? 44 : statusBarHeight,
      bottom: hasNotch ? 34 : 0,
      left: 0,
      right: 0,
    };
  } catch (error) {
    // Fallback values
    return {
      top: 20,
      bottom: 0,
      left: 0,
      right: 0,
    };
  }
};

// Orientation utilities
export const isLandscape = () => {
  return SCREEN_WIDTH > SCREEN_HEIGHT;
};

export const isPortrait = () => {
  return SCREEN_HEIGHT > SCREEN_WIDTH;
};

// Device info utilities
export const getDeviceInfo = async () => {
  const deviceType = await DeviceInfo.getDeviceType();
  const isTabletDevice = await DeviceInfo.isTablet();
  const screenDensity = PixelRatio.get();
  
  return {
    type: deviceType,
    isTablet: isTabletDevice,
    screenWidth: SCREEN_WIDTH,
    screenHeight: SCREEN_HEIGHT,
    density: screenDensity,
    breakpoint: getDeviceType(),
  };
};

// Responsive styles helper
export const createResponsiveStyles = <T extends Record<string, any>>(
  styles: T
): T => {
  const processedStyles: any = {};
  
  Object.keys(styles).forEach(key => {
    const style = styles[key];
    
    if (typeof style === 'object' && style !== null) {
      processedStyles[key] = {
        ...style,
        // Add responsive adjustments if needed
      };
    } else {
      processedStyles[key] = style;
    }
  });
  
  return processedStyles;
};
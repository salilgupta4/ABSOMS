
import React, { createContext, useState, useMemo, useEffect, useContext, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { 
  saveUserThemePreferences, 
  loadUserThemePreferences, 
  convertThemeConfigToUserPreferences,
  convertUserPreferencesToThemeConfig,
  getDefaultThemePreferences 
} from '@/services/themeService';

type Theme = 'light' | 'dark';
type BorderRadius = 'none' | 'sm' | 'md' | 'lg' | 'xl';
type FontSize = 'xs' | 'sm' | 'base' | 'lg' | 'xl';
type Spacing = 'tight' | 'normal' | 'relaxed';
type Animation = 'none' | 'reduced' | 'normal' | 'enhanced';

interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
}

interface ThemeTypography {
  fontSize: FontSize;
  fontFamily: string;
  lineHeight: number;
  letterSpacing: number;
}

interface ThemeLayout {
  borderRadius: BorderRadius;
  spacing: Spacing;
  sidebarWidth: string;
  headerHeight: string;
  animation: Animation;
}

interface ThemeEffects {
  crtMode: boolean;
  scanlines: boolean;
  glow: boolean;
  flicker: boolean;
  curvature: boolean;
  themeClass: string;
}

interface ThemeConfig {
  colors: ThemeColors;
  typography: ThemeTypography;
  layout: ThemeLayout;
  effects: ThemeEffects;
  theme: Theme;
}

interface ThemeContextType {
  config: ThemeConfig;
  theme: Theme;
  primaryColor: string;
  secondaryColor: string;
  updateColors: (colors: Partial<ThemeColors>) => void;
  updateTypography: (typography: Partial<ThemeTypography>) => void;
  updateLayout: (layout: Partial<ThemeLayout>) => void;
  updateEffects: (effects: Partial<ThemeEffects>) => void;
  setPrimaryColor: (color: string) => void;
  setSecondaryColor: (color: string) => void;
  toggleTheme: () => void;
  resetToDefault: () => void;
  applyPreset: (presetName: string) => void;
  saveUserTheme: () => Promise<boolean>;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const defaultThemeConfig: ThemeConfig = {
  colors: {
    primary: '#1e40af',
    secondary: '#64748b',
    accent: '#8b5cf6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    info: '#3b82f6',
    background: '#ffffff',
    surface: '#f8fafc',
    text: '#1e293b',
    textSecondary: '#64748b',
    border: '#e2e8f0'
  },
  typography: {
    fontSize: 'base',
    fontFamily: 'Inter, system-ui, sans-serif',
    lineHeight: 1.5,
    letterSpacing: 0
  },
  layout: {
    borderRadius: 'md',
    spacing: 'normal',
    sidebarWidth: '12rem',
    headerHeight: '4rem',
    animation: 'normal'
  },
  effects: {
    crtMode: false,
    scanlines: false,
    glow: false,
    flicker: false,
    curvature: false,
    themeClass: ''
  },
  theme: 'light'
};

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [config, setConfig] = useState<ThemeConfig>(defaultThemeConfig);
  const [isLoading, setIsLoading] = useState(true);
  
  // Legacy support
  const [primaryColor, setPrimaryColorState] = useState(() => config.colors.primary);
  const [secondaryColor, setSecondaryColorState] = useState(() => config.colors.secondary);
  const [theme, setTheme] = useState<Theme>(() => config.theme);

  // Load user-specific theme preferences when user changes
  useEffect(() => {
    const loadUserTheme = async () => {
      if (user?.id) {
        setIsLoading(true);
        try {
          const userPreferences = await loadUserThemePreferences(user.id);
          if (userPreferences) {
            const themeConfig = convertUserPreferencesToThemeConfig(userPreferences);
            setConfig(themeConfig);
            console.log(`Loaded theme preferences for user: ${user.email}`);
          } else {
            // No saved preferences, use defaults but still save to establish user theme
            setConfig(defaultThemeConfig);
            console.log(`Using default theme for user: ${user.email}`);
          }
        } catch (error) {
          console.error('Failed to load user theme preferences:', error);
          // Fallback to localStorage if Firestore fails
          const saved = localStorage.getItem('erp_themeConfig');
          if (saved) {
            setConfig({ ...defaultThemeConfig, ...JSON.parse(saved) });
          }
        }
        setIsLoading(false);
      } else {
        // No user logged in, use localStorage as fallback
        const saved = localStorage.getItem('erp_themeConfig');
        if (saved) {
          setConfig({ ...defaultThemeConfig, ...JSON.parse(saved) });
        } else {
          setConfig(defaultThemeConfig);
        }
        setIsLoading(false);
      }
    };

    loadUserTheme();
  }, [user?.id]);

  // Apply theme to DOM
  useEffect(() => {
    const root = document.documentElement;
    
    // Theme class
    if (config.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Colors
    Object.entries(config.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
      root.style.setProperty(`--color-${key}-hover`, `${value}E6`);
    });
    
    // Typography
    root.style.setProperty('--font-family', config.typography.fontFamily);
    root.style.setProperty('--line-height', config.typography.lineHeight.toString());
    root.style.setProperty('--letter-spacing', `${config.typography.letterSpacing}px`);
    
    // Font size mapping
    const fontSizeMap = { 
      xs: '0.75rem', 
      sm: '0.875rem', 
      base: '1rem',
      lg: '1.125rem', 
      xl: '1.25rem' 
    };
    root.style.setProperty('--font-size-base', fontSizeMap[config.typography.fontSize]);
    
    // Layout
    const radiusMap = { none: '0', sm: '0.125rem', md: '0.375rem', lg: '0.5rem', xl: '0.75rem' };
    root.style.setProperty('--border-radius', radiusMap[config.layout.borderRadius]);
    
    // Spacing mapping
    const spacingMap = { 
      tight: { base: '0.25rem', md: '0.5rem', lg: '0.75rem' },
      normal: { base: '0.5rem', md: '1rem', lg: '1.5rem' },
      relaxed: { base: '0.75rem', md: '1.5rem', lg: '2rem' }
    };
    const currentSpacing = spacingMap[config.layout.spacing];
    root.style.setProperty('--spacing-base', currentSpacing.base);
    root.style.setProperty('--spacing-md', currentSpacing.md);
    root.style.setProperty('--spacing-lg', currentSpacing.lg);
    
    root.style.setProperty('--sidebar-width', config.layout.sidebarWidth);
    root.style.setProperty('--header-height', config.layout.headerHeight);
    
    // Animation
    const animationMap = { none: '0s', reduced: '0.1s', normal: '0.2s', enhanced: '0.3s' };
    root.style.setProperty('--transition-duration', animationMap[config.layout.animation]);
    
    // CRT Effects
    const body = document.body;
    
    // Remove all theme classes first
    const themeClasses = ['crt-theme', 'crt-scanlines', 'crt-flicker', 'crt-curvature', 
                         'classic-mac-theme', 'green-terminal-theme', 'amber-terminal-theme', 
                         'orange-terminal-theme', 'purple-terminal-theme', 'grey-terminal-theme'];
    body.classList.remove(...themeClasses);
    
    // Apply current theme class
    if (config.effects.themeClass) {
      body.classList.add(config.effects.themeClass);
    }
    
    // Apply CRT effects
    if (config.effects.crtMode) {
      body.classList.add('crt-theme');
    }
    if (config.effects.scanlines) {
      body.classList.add('crt-scanlines');
    }
    if (config.effects.flicker) {
      body.classList.add('crt-flicker');
    }
    if (config.effects.curvature) {
      body.classList.add('crt-curvature');
    }
    
    // Update CRT glow color
    if (config.effects.glow) {
      root.style.setProperty('--crt-glow-color', config.colors.primary);
    }
    
    // Save to localStorage as fallback
    localStorage.setItem('erp_themeConfig', JSON.stringify(config));
    
    // Auto-save to user profile if user is logged in
    if (user?.id && !isLoading) {
      const userPreferences = convertThemeConfigToUserPreferences(config);
      saveUserThemePreferences(user.id, userPreferences).catch(error => {
        console.error('Failed to auto-save theme preferences:', error);
      });
    }
    
    // Update legacy state
    setPrimaryColorState(config.colors.primary);
    setSecondaryColorState(config.colors.secondary);
    setTheme(config.theme);
  }, [config]);
  
  // Update functions
  const updateColors = (colors: Partial<ThemeColors>) => {
    setConfig(prev => ({ ...prev, colors: { ...prev.colors, ...colors } }));
  };
  
  const updateTypography = (typography: Partial<ThemeTypography>) => {
    setConfig(prev => ({ ...prev, typography: { ...prev.typography, ...typography } }));
  };
  
  const updateLayout = (layout: Partial<ThemeLayout>) => {
    setConfig(prev => ({ ...prev, layout: { ...prev.layout, ...layout } }));
  };
  
  const updateEffects = (effects: Partial<ThemeEffects>) => {
    setConfig(prev => ({ ...prev, effects: { ...prev.effects, ...effects } }));
  };
  
  // Legacy functions
  const setPrimaryColor = (color: string) => {
    updateColors({ primary: color });
  };
  
  const setSecondaryColor = (color: string) => {
    updateColors({ secondary: color });
  };
  
  const toggleTheme = () => {
    const newTheme = config.theme === 'light' ? 'dark' : 'light';
    setConfig(prev => ({ ...prev, theme: newTheme }));
  };
  
  const resetToDefault = () => {
    setConfig(defaultThemeConfig);
  };
  
  const applyPreset = (presetName: string) => {
    const presets: Record<string, Partial<ThemeConfig>> = {
      // Modern themes
      'corporate': {
        colors: { 
          primary: '#1e40af', secondary: '#64748b', accent: '#3b82f6',
          success: '#10b981', warning: '#f59e0b', danger: '#ef4444', info: '#3b82f6',
          background: '#ffffff', surface: '#f8fafc', text: '#1e293b', textSecondary: '#64748b', border: '#e2e8f0'
        },
        typography: { fontSize: 'base', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: 1.5, letterSpacing: 0 },
        layout: { borderRadius: 'sm', spacing: 'tight', sidebarWidth: '12rem', headerHeight: '4rem', animation: 'normal' },
        effects: { crtMode: false, scanlines: false, glow: false, flicker: false, curvature: false, themeClass: '' }
      },
      'modern': {
        colors: { 
          primary: '#8b5cf6', secondary: '#6366f1', accent: '#a855f7',
          success: '#10b981', warning: '#f59e0b', danger: '#ef4444', info: '#3b82f6',
          background: '#ffffff', surface: '#f8fafc', text: '#1e293b', textSecondary: '#64748b', border: '#e2e8f0'
        },
        typography: { fontSize: 'base', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: 1.5, letterSpacing: 0 },
        layout: { borderRadius: 'lg', spacing: 'relaxed', sidebarWidth: '12rem', headerHeight: '4rem', animation: 'enhanced' },
        effects: { crtMode: false, scanlines: false, glow: false, flicker: false, curvature: false, themeClass: '' }
      },
      'nature': {
        colors: { 
          primary: '#10b981', secondary: '#059669', accent: '#34d399',
          success: '#10b981', warning: '#f59e0b', danger: '#ef4444', info: '#3b82f6',
          background: '#ffffff', surface: '#f8fafc', text: '#1e293b', textSecondary: '#64748b', border: '#e2e8f0'
        },
        typography: { fontSize: 'base', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: 1.5, letterSpacing: 0 },
        layout: { borderRadius: 'xl', spacing: 'normal', sidebarWidth: '12rem', headerHeight: '4rem', animation: 'normal' },
        effects: { crtMode: false, scanlines: false, glow: false, flicker: false, curvature: false, themeClass: '' }
      },
      'sunset': {
        colors: { 
          primary: '#f59e0b', secondary: '#d97706', accent: '#fbbf24',
          success: '#10b981', warning: '#f59e0b', danger: '#ef4444', info: '#3b82f6',
          background: '#ffffff', surface: '#f8fafc', text: '#1e293b', textSecondary: '#64748b', border: '#e2e8f0'
        },
        typography: { fontSize: 'base', fontFamily: 'Inter, system-ui, sans-serif', lineHeight: 1.5, letterSpacing: 0 },
        layout: { borderRadius: 'md', spacing: 'relaxed', sidebarWidth: '12rem', headerHeight: '4rem', animation: 'normal' },
        effects: { crtMode: false, scanlines: false, glow: false, flicker: false, curvature: false, themeClass: '' }
      },
      
      // Retro CRT themes
      'classic-mac': {
        colors: { 
          primary: '#000000', secondary: '#666666', accent: '#333333',
          success: '#000000', warning: '#000000', danger: '#000000', info: '#000000',
          background: '#ffffff', surface: '#f0f0f0', text: '#000000', textSecondary: '#666666', border: '#cccccc'
        },
        typography: { fontFamily: 'Monaco, Courier New, monospace', fontSize: 'sm', lineHeight: 1.4, letterSpacing: 0 },
        layout: { borderRadius: 'sm', spacing: 'tight', sidebarWidth: '12rem', headerHeight: '4rem', animation: 'reduced' },
        effects: { crtMode: false, scanlines: false, glow: false, flicker: false, curvature: false, themeClass: 'classic-mac-theme' }
      },
      'green-terminal': {
        colors: { 
          primary: '#00ff41', secondary: '#00cc33', accent: '#00ff66',
          success: '#00ff41', warning: '#ffff00', danger: '#ff4444', info: '#00ccff',
          background: '#001100', surface: '#003300', text: '#00ff41', textSecondary: '#00cc33', border: '#00ff41'
        },
        typography: { fontFamily: 'Monaco, Courier New, monospace', fontSize: 'sm', letterSpacing: 0.5, lineHeight: 1.3 },
        layout: { borderRadius: 'none', spacing: 'tight', sidebarWidth: '12rem', headerHeight: '4rem', animation: 'none' },
        effects: { crtMode: true, scanlines: true, glow: true, flicker: true, curvature: false, themeClass: 'green-terminal-theme' }
      },
      'amber-terminal': {
        colors: { 
          primary: '#ffb000', secondary: '#cc8800', accent: '#ffcc33',
          success: '#ffb000', warning: '#ffcc00', danger: '#ff6600', info: '#66ccff',
          background: '#1a0f00', surface: '#2d1a00', text: '#ffb000', textSecondary: '#cc8800', border: '#ffb000'
        },
        typography: { fontFamily: 'Monaco, Courier New, monospace', fontSize: 'sm', letterSpacing: 0.5, lineHeight: 1.3 },
        layout: { borderRadius: 'none', spacing: 'tight', sidebarWidth: '12rem', headerHeight: '4rem', animation: 'none' },
        effects: { crtMode: true, scanlines: true, glow: true, flicker: true, curvature: false, themeClass: 'amber-terminal-theme' }
      },
      'orange-terminal': {
        colors: { 
          primary: '#ff8c00', secondary: '#cc7000', accent: '#ffaa33',
          success: '#ff8c00', warning: '#ffaa00', danger: '#ff4400', info: '#66aaff',
          background: '#180c00', surface: '#2a1600', text: '#ff8c00', textSecondary: '#cc7000', border: '#ff8c00'
        },
        typography: { fontFamily: 'Monaco, Courier New, monospace', fontSize: 'sm', letterSpacing: 0.5, lineHeight: 1.3 },
        layout: { borderRadius: 'none', spacing: 'tight', sidebarWidth: '12rem', headerHeight: '4rem', animation: 'none' },
        effects: { crtMode: true, scanlines: true, glow: true, flicker: true, curvature: false, themeClass: 'orange-terminal-theme' }
      },
      'purple-terminal': {
        colors: { 
          primary: '#cc66ff', secondary: '#9933cc', accent: '#dd77ff',
          success: '#cc66ff', warning: '#ffaa66', danger: '#ff6666', info: '#6699ff',
          background: '#0f001a', surface: '#1a002d', text: '#cc66ff', textSecondary: '#9933cc', border: '#cc66ff'
        },
        typography: { fontFamily: 'Monaco, Courier New, monospace', fontSize: 'sm', letterSpacing: 0.5, lineHeight: 1.3 },
        layout: { borderRadius: 'none', spacing: 'tight', sidebarWidth: '12rem', headerHeight: '4rem', animation: 'none' },
        effects: { crtMode: true, scanlines: true, glow: true, flicker: true, curvature: false, themeClass: 'purple-terminal-theme' }
      },
      'grey-terminal': {
        colors: { 
          primary: '#e0e0e0', secondary: '#b0b0b0', accent: '#f0f0f0',
          success: '#e0e0e0', warning: '#cccccc', danger: '#aaaaaa', info: '#d0d0d0',
          background: '#1a1a1a', surface: '#2d2d2d', text: '#e0e0e0', textSecondary: '#b0b0b0', border: '#e0e0e0'
        },
        typography: { fontFamily: 'Monaco, Courier New, monospace', fontSize: 'sm', letterSpacing: 0.5, lineHeight: 1.3 },
        layout: { borderRadius: 'none', spacing: 'tight', sidebarWidth: '12rem', headerHeight: '4rem', animation: 'none' },
        effects: { crtMode: true, scanlines: true, glow: true, flicker: true, curvature: false, themeClass: 'grey-terminal-theme' }
      }
    };
    
    if (presets[presetName]) {
      setConfig(prev => ({ 
        ...prev, 
        ...presets[presetName],
        colors: { ...prev.colors, ...presets[presetName].colors },
        typography: { ...prev.typography, ...presets[presetName].typography },
        layout: { ...prev.layout, ...presets[presetName].layout },
        effects: { ...prev.effects, ...presets[presetName].effects }
      }));
    }
  };

  const saveUserTheme = async (): Promise<boolean> => {
    if (!user?.id) {
      console.warn('Cannot save theme: No user logged in');
      return false;
    }

    try {
      const userPreferences = convertThemeConfigToUserPreferences(config);
      const success = await saveUserThemePreferences(user.id, userPreferences);
      
      if (success) {
        console.log(`Theme preferences manually saved for user: ${user.email}`);
      }
      
      return success;
    } catch (error) {
      console.error('Failed to save theme preferences:', error);
      return false;
    }
  };

  const value = useMemo(() => ({
    config,
    theme: config.theme,
    primaryColor: config.colors.primary,
    secondaryColor: config.colors.secondary,
    updateColors,
    updateTypography,
    updateLayout,
    updateEffects,
    setPrimaryColor,
    setSecondaryColor,
    toggleTheme,
    resetToDefault,
    applyPreset,
    saveUserTheme,
    isLoading
  }), [config, user?.id, isLoading]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
import { UserThemePreferences } from '@/types';
import { db } from '@/services/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

/**
 * Theme Service for user-specific theme persistence
 * Handles saving and loading theme preferences to/from Firestore
 */

export const saveUserThemePreferences = async (
  userId: string, 
  themePreferences: UserThemePreferences
): Promise<boolean> => {
  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      themePreferences: themePreferences,
      updatedAt: new Date().toISOString()
    });
    
    console.log(`Theme preferences saved for user: ${userId}`);
    return true;
  } catch (error) {
    console.error('Failed to save theme preferences:', error);
    return false;
  }
};

export const loadUserThemePreferences = async (
  userId: string
): Promise<UserThemePreferences | null> => {
  try {
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const themePreferences = userData?.themePreferences;
      
      if (themePreferences) {
        console.log(`Theme preferences loaded for user: ${userId}`);
        return themePreferences as UserThemePreferences;
      } else {
        console.log(`No theme preferences found for user: ${userId}`);
        return null;
      }
    } else {
      console.error(`User document not found: ${userId}`);
      return null;
    }
  } catch (error) {
    console.error('Failed to load theme preferences:', error);
    return null;
  }
};

export const resetUserThemePreferences = async (userId: string): Promise<boolean> => {
  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      themePreferences: null,
      updatedAt: new Date().toISOString()
    });
    
    console.log(`Theme preferences reset for user: ${userId}`);
    return true;
  } catch (error) {
    console.error('Failed to reset theme preferences:', error);
    return false;
  }
};

/**
 * Convert ThemeConfig to UserThemePreferences format
 */
export const convertThemeConfigToUserPreferences = (config: any): UserThemePreferences => {
  return {
    colors: config.colors,
    typography: config.typography,
    layout: config.layout,
    effects: config.effects,
    theme: config.theme
  };
};

/**
 * Convert UserThemePreferences to ThemeConfig format  
 */
export const convertUserPreferencesToThemeConfig = (preferences: UserThemePreferences): any => {
  return {
    colors: preferences.colors,
    typography: preferences.typography,
    layout: preferences.layout,
    effects: preferences.effects,
    theme: preferences.theme
  };
};

/**
 * Get default theme preferences
 */
export const getDefaultThemePreferences = (): UserThemePreferences => {
  return {
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
};
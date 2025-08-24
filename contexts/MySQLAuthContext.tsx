// MySQL-based Authentication Context - Replaces Firebase Auth
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { User, UserRole } from '@/types';
import { authService } from '@/services/mysqlService';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

const MySQLAuthContext = createContext<AuthContextType | undefined>(undefined);

export const MySQLAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing token on app load
  useEffect(() => {
    const checkExistingAuth = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('auth_token');
        if (token) {
          const result = await authService.verifyToken(token);
          if (result.success && result.user) {
            setUser(result.user);
          } else {
            // Token is invalid, remove it
            localStorage.removeItem('auth_token');
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('auth_token');
      } finally {
        setLoading(false);
      }
    };

    checkExistingAuth();
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setError(null);
      setLoading(true);

      // Get client info for session tracking
      const ipAddress = await getClientIP();
      const userAgent = navigator.userAgent;

      const result = await authService.login(email, password, ipAddress, userAgent);
      
      if (result.success && result.user && result.token) {
        setUser(result.user);
        localStorage.setItem('auth_token', result.token);
        return true;
      } else {
        setError(result.message || 'Login failed');
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('Login failed. Please try again.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        await authService.logout(token);
        localStorage.removeItem('auth_token');
      }
      setUser(null);
      setError(null);
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if server logout fails
      localStorage.removeItem('auth_token');
      setUser(null);
    }
  };

  const value = { user, login, logout, loading, error };

  return (
    <MySQLAuthContext.Provider value={value}>
      {children}
    </MySQLAuthContext.Provider>
  );
};

export const useMySQLAuth = (): AuthContextType => {
  const context = useContext(MySQLAuthContext);
  if (context === undefined) {
    throw new Error('useMySQLAuth must be used within a MySQLAuthProvider');
  }
  return context;
};

// Utility function to get client IP (fallback for session tracking)
const getClientIP = async (): Promise<string | undefined> => {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.warn('Could not get client IP:', error);
    return undefined;
  }
};

export default MySQLAuthContext;
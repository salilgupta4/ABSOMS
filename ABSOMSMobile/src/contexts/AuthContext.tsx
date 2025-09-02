import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

interface User {
  id: string;
  email: string | null;
  name: string;
  role: string;
  hasErpAccess: boolean;
  hasPayrollAccess: boolean;
  hasProjectsAccess: boolean;
}

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  pendingOperations: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  syncState: SyncState | null;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (module: 'erp' | 'payroll' | 'projects') => boolean;
  canCreate: () => boolean;
  canApprove: () => boolean;
  canAdmin: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [syncState, setSyncState] = useState<SyncState>({
    isOnline: true,
    isSyncing: false,
    pendingOperations: 0,
  });

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // Get user profile from Firestore
          const userDoc = await firestore().collection('users').doc(firebaseUser.uid).get();
          const userData = userDoc.exists ? userDoc.data() : {};
          
          const appUser: User = {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            name: userData?.displayName || userData?.name || firebaseUser.email?.split('@')[0] || 'User',
            role: userData?.role || 'user',
            hasErpAccess: userData?.hasErpAccess !== false, // Default to true
            hasPayrollAccess: userData?.hasPayrollAccess !== false, // Default to true  
            hasProjectsAccess: userData?.hasProjectsAccess !== false, // Default to true
          };
          
          setUser(appUser);
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Auth state change error:', error);
        // Even if Firestore fails, create a basic user from Firebase Auth
        if (firebaseUser) {
          const appUser: User = {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.email?.split('@')[0] || 'User',
            role: 'user',
            hasErpAccess: true,
            hasPayrollAccess: true,
            hasProjectsAccess: true,
          };
          setUser(appUser);
        }
      } finally {
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setSyncState(prev => ({ ...prev, isSyncing: true }));
      
      await auth().signInWithEmailAndPassword(email, password);
      
      setSyncState(prev => ({ ...prev, isSyncing: false }));
      return { success: true };
    } catch (error: any) {
      setSyncState(prev => ({ ...prev, isSyncing: false }));
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      await auth().signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    if (user) {
      try {
        const userDoc = await firestore().collection('users').doc(user.id).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        
        const refreshedUser: User = {
          ...user,
          name: userData?.displayName || userData?.name || user.name,
          role: userData?.role || user.role,
          hasErpAccess: userData?.hasErpAccess !== false,
          hasPayrollAccess: userData?.hasPayrollAccess !== false,
          hasProjectsAccess: userData?.hasProjectsAccess !== false,
        };
        
        setUser(refreshedUser);
      } catch (error) {
        console.error('Refresh user error:', error);
      }
    }
  };

  const hasPermission = (module: 'erp' | 'payroll' | 'projects'): boolean => {
    if (!user) return false;

    switch (module) {
      case 'erp':
        return user.hasErpAccess;
      case 'payroll':
        return user.hasPayrollAccess;
      case 'projects':
        return user.hasProjectsAccess;
      default:
        return false;
    }
  };

  const canCreate = (): boolean => {
    if (!user) return false;
    return ['Admin', 'Maker', 'Approver'].includes(user.role) || user.hasErpAccess;
  };

  const canApprove = (): boolean => {
    if (!user) return false;
    return ['Admin', 'Approver'].includes(user.role);
  };

  const canAdmin = (): boolean => {
    if (!user) return false;
    return user.role === 'Admin';
  };

  const isAuthenticated = !!user;

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    syncState,
    signIn,
    signOut,
    refreshUser,
    hasPermission,
    canCreate,
    canApprove,
    canAdmin,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
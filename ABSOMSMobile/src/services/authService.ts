import { authService, collections } from './firebase';
import { User, UserRole } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

class AuthenticationService {
  private currentUser: User | null = null;

  async signIn(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      const { email, password } = credentials;
      
      // Sign in with Firebase Auth
      const userCredential = await authService.signInWithEmailAndPassword(email, password);
      const firebaseUser = userCredential.user;

      if (!firebaseUser) {
        return { success: false, error: 'Authentication failed' };
      }

      // Fetch user profile from Firestore
      const userDoc = await collections.users().doc(firebaseUser.uid).get();
      
      if (!userDoc.exists) {
        return { success: false, error: 'User profile not found' };
      }

      const userData = userDoc.data() as User;
      this.currentUser = {
        ...userData,
        id: firebaseUser.uid,
      };

      // Store user data locally for offline access
      await AsyncStorage.setItem('currentUser', JSON.stringify(this.currentUser));
      await AsyncStorage.setItem('authToken', firebaseUser.uid);

      return { success: true, user: this.currentUser };
    } catch (error: any) {
      console.error('Sign in error:', error);
      return { 
        success: false, 
        error: error.message || 'Sign in failed' 
      };
    }
  }

  async signOut(): Promise<void> {
    try {
      await authService.signOut();
      this.currentUser = null;
      
      // Clear local storage
      await AsyncStorage.multiRemove(['currentUser', 'authToken']);
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }

  async getCurrentUser(): Promise<User | null> {
    if (this.currentUser) {
      return this.currentUser;
    }

    try {
      // Try to get from local storage first (offline support)
      const storedUser = await AsyncStorage.getItem('currentUser');
      if (storedUser) {
        this.currentUser = JSON.parse(storedUser);
        return this.currentUser;
      }

      // If online, get from Firebase
      const firebaseUser = authService.currentUser;
      if (firebaseUser) {
        const userDoc = await collections.users().doc(firebaseUser.uid).get();
        if (userDoc.exists) {
          const userData = userDoc.data() as User;
          this.currentUser = {
            ...userData,
            id: firebaseUser.uid,
          };
          
          // Update local storage
          await AsyncStorage.setItem('currentUser', JSON.stringify(this.currentUser));
          return this.currentUser;
        }
      }
    } catch (error) {
      console.error('Get current user error:', error);
    }

    return null;
  }

  async isAuthenticated(): Promise<boolean> {
    try {
      // Check if Firebase user is authenticated
      const firebaseUser = authService.currentUser;
      if (firebaseUser) {
        return true;
      }

      // Check local storage for offline mode
      const authToken = await AsyncStorage.getItem('authToken');
      return !!authToken;
    } catch (error) {
      console.error('Authentication check error:', error);
      return false;
    }
  }

  async hasPermission(module: 'erp' | 'payroll' | 'projects'): Promise<boolean> {
    const user = await this.getCurrentUser();
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
  }

  async hasRole(requiredRole: UserRole): Promise<boolean> {
    const user = await this.getCurrentUser();
    if (!user) return false;

    // Role hierarchy: Admin > Approver > Maker > Viewer
    const roleHierarchy = {
      [UserRole.Admin]: 4,
      [UserRole.Approver]: 3,
      [UserRole.Maker]: 2,
      [UserRole.Viewer]: 1,
    };

    const userRoleLevel = roleHierarchy[user.role];
    const requiredRoleLevel = roleHierarchy[requiredRole];

    return userRoleLevel >= requiredRoleLevel;
  }

  async canCreate(): Promise<boolean> {
    return this.hasRole(UserRole.Maker);
  }

  async canApprove(): Promise<boolean> {
    return this.hasRole(UserRole.Approver);
  }

  async canAdmin(): Promise<boolean> {
    return this.hasRole(UserRole.Admin);
  }

  onAuthStateChanged(callback: (user: User | null) => void) {
    return authService.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in
        const user = await this.getCurrentUser();
        callback(user);
      } else {
        // User is signed out
        this.currentUser = null;
        await AsyncStorage.multiRemove(['currentUser', 'authToken']);
        callback(null);
      }
    });
  }

  async refreshUserProfile(): Promise<User | null> {
    try {
      const firebaseUser = authService.currentUser;
      if (!firebaseUser) return null;

      const userDoc = await collections.users().doc(firebaseUser.uid).get();
      if (!userDoc.exists) return null;

      const userData = userDoc.data() as User;
      this.currentUser = {
        ...userData,
        id: firebaseUser.uid,
      };

      // Update local storage
      await AsyncStorage.setItem('currentUser', JSON.stringify(this.currentUser));
      
      return this.currentUser;
    } catch (error) {
      console.error('Refresh user profile error:', error);
      return null;
    }
  }

  async resetPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      await authService.sendPasswordResetEmail(email);
      return { success: true };
    } catch (error: any) {
      console.error('Password reset error:', error);
      return {
        success: false,
        error: error.message || 'Password reset failed'
      };
    }
  }
}

export const authenticationService = new AuthenticationService();
export default authenticationService;
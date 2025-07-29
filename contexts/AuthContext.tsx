
import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';
import { User, UserRole } from '@/types';
import { auth, db } from '@/services/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';


interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        try {
          // User is signed in, get their profile from Firestore
          console.log(`Attempting to load profile for user: ${firebaseUser.email}`);
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('User profile loaded successfully:', userData);
            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              name: userData?.name || '',
              role: userData?.role || UserRole.Viewer,
              hasErpAccess: userData?.hasErpAccess === true, // Default to false
              hasPayrollAccess: userData?.hasPayrollAccess === true, // Default to false
            });
          } else {
            console.error(`User profile not found in Firestore for ${firebaseUser.email} (${firebaseUser.uid})`);
            console.log('Available user data from Firebase Auth:', {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              emailVerified: firebaseUser.emailVerified
            });
            
            // Give the user a chance to see the error before signing out
            alert(`User profile not found in database for ${firebaseUser.email}. Please contact your administrator to ensure your account was set up correctly.`);
            
            await signOut(auth);
            setUser(null);
          }
        } catch (error) {
          console.error('Error loading user profile:', error);
          alert('Error loading user profile. Please try again or contact your administrator.');
          await signOut(auth);
          setUser(null);
        }
      } else {
        // User is signed out
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        // The onAuthStateChanged listener will handle setting the user state.
        // The LoginPage component will handle navigation once the user state is updated.
        return true;
    } catch(error) {
        console.error("Firebase login error:", error);
        return false;
    }
  };

  const logout = async () => {
    await signOut(auth);
    // onAuthStateChanged will clear user and ProtectedRoute will navigate to login
  };

  const value = { user, login, logout, loading };

  return (
    <AuthContext.Provider value={value}>
      { !loading && children }
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
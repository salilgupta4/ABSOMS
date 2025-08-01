
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
          
          // Retry logic for newly created users (handles race conditions)
          const loadUserProfile = async (retryCount = 0): Promise<void> => {
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
                hasProjectsAccess: userData?.hasProjectsAccess === true, // Default to false
              });
              return;
            }
            
            // If profile not found and this is a retry (likely new user), wait and try again
            if (retryCount < 3) {
              console.log(`User profile not found, retrying in ${(retryCount + 1) * 1000}ms... (attempt ${retryCount + 1}/3)`);
              await new Promise(resolve => setTimeout(resolve, (retryCount + 1) * 1000));
              return loadUserProfile(retryCount + 1);
            }
            
            // After 3 retries, show error
            console.error(`User profile not found in Firestore for ${firebaseUser.email} (${firebaseUser.uid}) after 3 retries`);
            console.log('Available user data from Firebase Auth:', {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              emailVerified: firebaseUser.emailVerified,
              creationTime: firebaseUser.metadata.creationTime
            });
            
            // Check if this is a newly created user (within last 10 seconds)
            const isNewUser = firebaseUser.metadata.creationTime && 
              (Date.now() - new Date(firebaseUser.metadata.creationTime).getTime()) < 10000;
            
            if (isNewUser) {
              alert(`Your account was just created but there seems to be a setup delay. Please wait a moment and try logging in again.`);
            } else {
              alert(`User profile not found in database for ${firebaseUser.email}. Please contact your administrator to ensure your account was set up correctly.`);
            }
            
            await signOut(auth);
            setUser(null);
          };
          
          await loadUserProfile();
          
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
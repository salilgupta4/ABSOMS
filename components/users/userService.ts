import { User, UserRole, UserFormData } from '@/types';
import { auth, db } from '@/services/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut } from 'firebase/auth';
import { collection, getDocs, doc, updateDoc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';


export const login = async (email: string, password: string): Promise<User | null> => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    // The AuthContext now handles fetching user details on auth state change.
    // This function's role is just to authenticate. Returning a placeholder.
    const currentUser = userCredential.user;
    if (!currentUser) return null;
    
    return {
        id: currentUser.uid,
        name: currentUser.displayName || email,
        email: email,
        role: UserRole.Viewer, // Placeholder
        hasErpAccess: false,
        hasPayrollAccess: false,
    };
};

export const getUsers = async (): Promise<User[]> => {
    const usersCollectionRef = collection(db, 'users');
    const userSnapshot = await getDocs(usersCollectionRef);
    const userList = userSnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
            id: docSnap.id,
            name: data.name || '',
            email: data.email || '',
            role: data.role || UserRole.Viewer,
            hasErpAccess: data.hasErpAccess === true, // Safely default to false
            hasPayrollAccess: data.hasPayrollAccess === true, // Safely default to false
        } as User;
    });
    return userList;
};

export const saveUser = async (userData: UserFormData): Promise<User> => {
    if (userData.id) { // Update existing user
        const userDocRef = doc(db, 'users', userData.id);
        await updateDoc(userDocRef, {
            name: userData.name,
            role: userData.role,
            email: userData.email, // Note: updating email in Firestore only. Auth email is separate.
            hasErpAccess: userData.hasErpAccess,
            hasPayrollAccess: userData.hasPayrollAccess,
        });
        // You'd need an admin SDK on a backend to update auth properties like password/email
        if (userData.password) {
            console.warn("Password updates from the client are not supported for other users.");
        }
        return { id: userData.id, ...userData } as User;
    } else { // Create new user
        if (!userData.password) throw new Error("Password is required for new user");
        
        // Store current admin user details before creating new user
        const currentUser = auth.currentUser;
        const currentUserEmail = currentUser?.email;
        
        try {
            // IMPORTANT: createUserWithEmailAndPassword signs in the new user, which will sign out the admin.
            // This is a limitation of the client-side Firebase SDK. The ideal solution is a Cloud Function.
            
            const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
            const firebaseUser = userCredential.user;
            
            if (!firebaseUser) {
                throw new Error("Failed to create user in Firebase Auth.");
            }
            
            await updateProfile(firebaseUser, { displayName: userData.name });

            // Create user profile document in Firestore
            const userDocRef = doc(db, 'users', firebaseUser.uid);
            const newUserProfile = {
                name: userData.name,
                email: userData.email,
                role: userData.role,
                hasErpAccess: userData.hasErpAccess ?? true,
                hasPayrollAccess: userData.hasPayrollAccess ?? false,
            };
            
            console.log('Creating user profile in Firestore:', newUserProfile);
            console.log('User UID:', firebaseUser.uid);
            
            await setDoc(userDocRef, newUserProfile);
            
            // Verify the document was created
            const verifyDoc = await getDoc(userDocRef);
            if (verifyDoc.exists()) {
                console.log('User profile created successfully in Firestore');
            } else {
                console.error('Failed to create user profile in Firestore');
                throw new Error('User profile was not created properly');
            }
            
            // Sign out the newly created user to restore admin session
            // Note: This will require admin to re-login, but at least the user is created
            await signOut(auth);
            
            // Show alert to inform admin they need to re-login
            alert(`User "${userData.name}" created successfully!\n\nDue to Firebase limitations, you have been signed out. Please log back in as an administrator.`);
            
            // Redirect to login page
            window.location.href = '/#/login';
            
            return { id: firebaseUser.uid, ...newUserProfile } as User;
            
        } catch (error) {
            // If user creation fails, try to restore admin session if possible
            if (currentUser && currentUserEmail) {
                console.error("User creation failed, admin session may have been disrupted");
            }
            throw error;
        }
    }
};

export const deleteUser = async (id: string): Promise<void> => {
    // IMPORTANT: Deleting a user from Firebase Auth cannot be done from the client-side SDK.
    // This function will only delete the user's profile from Firestore.
    console.warn(`Deleting user ${id} from Firestore, but not from Firebase Auth. Please manage Auth users in the Firebase Console.`);
    const userDocRef = doc(db, 'users', id);
    await deleteDoc(userDocRef);
};

// Utility function to create missing user profile for existing Firebase Auth users
export const createMissingUserProfile = async (firebaseUser: any, userData: Partial<UserFormData>): Promise<User> => {
    const userDocRef = doc(db, 'users', firebaseUser.uid);
    const newUserProfile = {
        name: userData.name || firebaseUser.displayName || firebaseUser.email || 'Unknown User',
        email: firebaseUser.email,
        role: userData.role || UserRole.Viewer,
        hasErpAccess: userData.hasErpAccess ?? false,
        hasPayrollAccess: userData.hasPayrollAccess ?? false,
    };
    
    console.log('Creating missing user profile:', newUserProfile);
    await setDoc(userDocRef, newUserProfile);
    
    return { id: firebaseUser.uid, ...newUserProfile } as User;
};
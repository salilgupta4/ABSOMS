
import { User, UserRole, UserFormData } from '@/types';
import { auth, db } from '@/services/firebase';
import { 
    collection, 
    getDocs, 
    doc, 
    updateDoc, 
    setDoc, 
    deleteDoc 
} from 'firebase/firestore';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

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
        hasProjectsAccess: false,
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
            hasProjectsAccess: data.hasProjectsAccess === true, // Safely default to false
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
            hasProjectsAccess: userData.hasProjectsAccess,
        });
        // You'd need an admin SDK on a backend to update auth properties like password/email
        if (userData.password) {
            console.warn("Password updates from the client are not supported for other users.");
        }
        return { id: userData.id, ...userData } as User;
    } else { // Create new user
        if (!userData.password) throw new Error("Password is required for new user");
        
        console.log(`Creating new user: ${userData.email}`);
        
        // IMPORTANT: createUserWithEmailAndPassword signs in the new user, which will sign out the admin.
        // This is a limitation of the client-side Firebase SDK. The ideal solution is a Cloud Function.
        
        const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
        const firebaseUser = userCredential.user;
        
        if (!firebaseUser) {
            throw new Error("Failed to create user in Firebase Auth.");
        }
        
        console.log(`Firebase Auth user created: ${firebaseUser.uid}`);
        
        // Update the user's display name
        await updateProfile(firebaseUser, { displayName: userData.name });

        // Create user profile document in Firestore IMMEDIATELY
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const newUserProfile = {
            name: userData.name,
            email: userData.email,
            role: userData.role,
            hasErpAccess: userData.hasErpAccess ?? true,
            hasPayrollAccess: userData.hasPayrollAccess ?? false,
            hasProjectsAccess: userData.hasProjectsAccess ?? false,
            createdAt: new Date().toISOString(),
            createdBy: 'admin'
        };
        
        console.log(`Creating Firestore profile for user: ${firebaseUser.uid}`, newUserProfile);
        
        // Use setDoc with merge option to ensure the document is created properly
        await setDoc(userDocRef, newUserProfile, { merge: false });
        
        console.log(`Firestore profile created successfully for: ${userData.email}`);
        
        // Add a small delay to ensure Firestore replication is complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        return { id: firebaseUser.uid, ...newUserProfile } as User;
    }
};

export const deleteUser = async (id: string): Promise<void> => {
    // IMPORTANT: Deleting a user from Firebase Auth cannot be done from the client-side SDK.
    // This function will only delete the user's profile from Firestore.
    console.warn(`Deleting user ${id} from Firestore, but not from Firebase Auth. Please manage Auth users in the Firebase Console.`);
    const userDocRef = doc(db, 'users', id);
    await deleteDoc(userDocRef);
};
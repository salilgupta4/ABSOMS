import { db, Timestamp } from './firebase';
import { 
    collection, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc, 
    query, orderBy, writeBatch 
} from 'firebase/firestore';
import { PointOfContact } from '@/types';

const COLLECTION_NAME = 'point_of_contacts';

// Convert Firestore timestamp to ISO string
const convertTimestamp = (timestamp: any): string => {
    if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
        return new Date(timestamp.seconds * 1000).toISOString();
    }
    return timestamp || new Date().toISOString();
};

// Process document from Firestore
const processDoc = (docSnap: any): PointOfContact => {
    const data = docSnap.data();
    return {
        id: docSnap.id,
        ...data,
        created_at: convertTimestamp(data.created_at),
        updated_at: convertTimestamp(data.updated_at)
    } as PointOfContact;
};

// Get all points of contact
export const getPointsOfContact = async (): Promise<PointOfContact[]> => {
    try {
        const q = query(collection(db, COLLECTION_NAME), orderBy('created_at', 'desc'));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(processDoc);
    } catch (error) {
        console.error('Error fetching points of contact:', error);
        throw error;
    }
};

// Get single point of contact
export const getPointOfContact = async (id: string): Promise<PointOfContact | null> => {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return processDoc(docSnap);
        }
        return null;
    } catch (error) {
        console.error('Error fetching point of contact:', error);
        throw error;
    }
};

// Get default point of contact
export const getDefaultPointOfContact = async (): Promise<PointOfContact | null> => {
    try {
        const contacts = await getPointsOfContact();
        return contacts.find(contact => contact.isDefault) || contacts[0] || null;
    } catch (error) {
        console.error('Error fetching default point of contact:', error);
        return null;
    }
};

// Save point of contact (create or update)
export const savePointOfContact = async (contactData: Omit<PointOfContact, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<PointOfContact> => {
    try {
        const { id, ...dataToSave } = contactData;
        const timestamp = Timestamp.now();

        // If this is being set as default, unset other defaults first
        if (dataToSave.isDefault) {
            await unsetAllDefaults();
        }

        if (id) {
            // Update existing
            const docRef = doc(db, COLLECTION_NAME, id);
            await updateDoc(docRef, {
                ...dataToSave,
                updated_at: timestamp
            });
            
            const updated = await getPointOfContact(id);
            if (!updated) throw new Error('Failed to retrieve updated point of contact');
            return updated;
        } else {
            // Create new
            const newContactData = {
                ...dataToSave,
                created_at: timestamp,
                updated_at: timestamp
            };
            
            const docRef = await addDoc(collection(db, COLLECTION_NAME), newContactData);
            const saved = await getPointOfContact(docRef.id);
            if (!saved) throw new Error('Failed to retrieve saved point of contact');
            return saved;
        }
    } catch (error) {
        console.error('Error saving point of contact:', error);
        throw error;
    }
};

// Delete point of contact
export const deletePointOfContact = async (id: string): Promise<void> => {
    try {
        const contact = await getPointOfContact(id);
        if (contact?.isDefault) {
            throw new Error('Cannot delete default point of contact. Please set another contact as default first.');
        }
        
        await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error) {
        console.error('Error deleting point of contact:', error);
        throw error;
    }
};

// Set point of contact as default
export const setAsDefault = async (id: string): Promise<void> => {
    try {
        const batch = writeBatch(db);
        
        // First, unset all defaults
        const contacts = await getPointsOfContact();
        contacts.forEach(contact => {
            if (contact.isDefault) {
                const docRef = doc(db, COLLECTION_NAME, contact.id);
                batch.update(docRef, { 
                    isDefault: false, 
                    updated_at: Timestamp.now() 
                });
            }
        });
        
        // Then set the new default
        const docRef = doc(db, COLLECTION_NAME, id);
        batch.update(docRef, { 
            isDefault: true, 
            updated_at: Timestamp.now() 
        });
        
        await batch.commit();
    } catch (error) {
        console.error('Error setting default point of contact:', error);
        throw error;
    }
};

// Helper function to unset all defaults
const unsetAllDefaults = async (): Promise<void> => {
    const contacts = await getPointsOfContact();
    const batch = writeBatch(db);
    
    contacts.forEach(contact => {
        if (contact.isDefault) {
            const docRef = doc(db, COLLECTION_NAME, contact.id);
            batch.update(docRef, { 
                isDefault: false, 
                updated_at: Timestamp.now() 
            });
        }
    });
    
    if (contacts.some(c => c.isDefault)) {
        await batch.commit();
    }
};
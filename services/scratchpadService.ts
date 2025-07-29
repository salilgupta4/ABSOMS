import { db, serverTimestamp, Timestamp, DocumentSnapshot } from './firebase';
import { Scratchpad, ScratchpadType } from '@/types';
import { collection, query, orderBy, getDocs, doc, getDoc, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const scratchpadsCollectionRef = collection(db, 'scratchpads');

const processDoc = (docSnap: DocumentSnapshot): Scratchpad => {
    const data = docSnap.data() as any;
    // Convert Firestore Timestamps to ISO strings
    const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString();
    const updatedAt = data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : new Date().toISOString();
    return { id: docSnap.id, ...data, createdAt, updatedAt } as Scratchpad;
};

export const getScratchpads = async (): Promise<Scratchpad[]> => {
    const q = query(scratchpadsCollectionRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(processDoc);
};

export const getScratchpad = async (id: string): Promise<Scratchpad | null> => {
    const docRef = doc(db, 'scratchpads', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? processDoc(docSnap) : null;
};

export const createScratchpad = async (name: string, type: ScratchpadType): Promise<Scratchpad> => {
    let newScratchpadData: any = {
        name,
        type,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    if (type === 'grid') {
        newScratchpadData = {
            ...newScratchpadData,
            gridData: {},
            rows: 100,
            cols: 26, // A-Z
        };
    } else {
        newScratchpadData = {
            ...newScratchpadData,
            content: '<h1>New Notepad</h1><p>Start typing here...</p>',
        };
    }

    const docRef = await addDoc(scratchpadsCollectionRef, newScratchpadData);
    const savedDoc = await getDoc(docRef);
    return processDoc(savedDoc);
};

export const updateScratchpad = async (id: string, data: Partial<Scratchpad>): Promise<void> => {
    const docRef = doc(db, 'scratchpads', id);
    // Remove the type field from the update payload to prevent it from being changed
    const { type, ...dataToUpdate } = data;
    await updateDoc(docRef, {
        ...dataToUpdate,
        updatedAt: serverTimestamp(),
    });
};

export const deleteScratchpad = async (id: string): Promise<void> => {
    const docRef = doc(db, 'scratchpads', id);
    await deleteDoc(docRef);
};



import { db } from '@/services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const SETTINGS_KEY = 'termsAndConditions';
const settingsDocRef = doc(db, "settings", SETTINGS_KEY);

const defaultTerms: string[] = [
    "Payment: 100% advance along with the order.",
    "Delivery: Within 2-3 weeks from the date of receipt of your firm order.",
    "Taxes: GST @ 18% will be charged extra.",
    "Validity: This offer is valid for 15 days.",
    "Warranty: One year against any manufacturing defects."
];

export const getTerms = async (): Promise<string[]> => {
    const docSnap = await getDoc(settingsDocRef);
    if (docSnap.exists() && docSnap.data().terms) {
        return docSnap.data().terms;
    } else {
        await saveTerms(defaultTerms);
        return defaultTerms;
    }
};

export const saveTerms = async (terms: string[]): Promise<string[]> => {
    await setDoc(settingsDocRef, { terms });
    return terms;
};
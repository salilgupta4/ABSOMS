

import { PdfSettings } from '../../types';
import { db } from '@/services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const SETTINGS_KEY = 'pdfSettings';
const settingsDocRef = doc(db, "settings", SETTINGS_KEY);

const defaultSettings: PdfSettings = {
    template: 'adaptec',
    accentColor: '#002f5f', // Adaptec Blue from PDF
    showGstin: true,
    showHsnCode: true,
    companyLogo: undefined,
    signatureImage: undefined,
    footerImage: undefined,
    logoSize: 50,
    signatureSize: 50,
    footerImageSize: 30,
};

export const getPdfSettings = async (): Promise<PdfSettings> => {
    const docSnap = await getDoc(settingsDocRef);
    if (docSnap.exists()) {
        return { ...defaultSettings, ...docSnap.data() };
    } else {
        // If not stored, just return default settings. Do not write.
        return defaultSettings;
    }
}

export const savePdfSettings = async (settings: PdfSettings): Promise<PdfSettings> => {
    await setDoc(settingsDocRef, settings);
    return settings;
}
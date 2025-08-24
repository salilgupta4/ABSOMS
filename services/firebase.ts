import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
    getFirestore,
    enableIndexedDbPersistence,
    Timestamp,
    serverTimestamp,
    type DocumentSnapshot
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";


// Your web app's Firebase configuration
export const firebaseConfig = {
  apiKey: "AIzaSyDis_mgCh6Ao7T-sAhor8xVizpZ06epjV0",
  authDomain: "tracker-38917.firebaseapp.com",
  projectId: "tracker-38917",
  storageBucket: "tracker-38917.firebasestorage.app",
  messagingSenderId: "568933240750",
  appId: "1:568933240750:web:2179405cdf8b2f64de423f",
  measurementId: "G-PFJ5D2G851"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Enable persistence to handle offline scenarios gracefully
enableIndexedDbPersistence(db)
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      // This can happen if multiple tabs are open.
      console.warn("Firestore persistence failed, likely due to multiple tabs open.");
    } else if (err.code == 'unimplemented') {
      // The current browser does not support all of the features required.
      console.warn("Firestore persistence is not supported in this browser.");
    }
  });


// Export things needed by other modules
export { Timestamp, serverTimestamp };
export type { DocumentSnapshot };

// PDF Storage utilities
export interface PdfUploadResult {
  success: boolean;
  downloadURL?: string;
  error?: string;
}

export const uploadPdfToStorage = async (
  pdfBlob: Blob,
  documentType: string,
  documentNumber: string,
  companyName?: string
): Promise<PdfUploadResult> => {
  try {
    // Create a unique filename with timestamp
    const timestamp = new Date().getTime();
    const sanitizedCompany = companyName ? companyName.replace(/[^a-zA-Z0-9]/g, '_') : 'company';
    const filename = `${documentType}_${documentNumber}_${sanitizedCompany}_${timestamp}.pdf`;
    
    // Create a reference to the file location
    const storageRef = ref(storage, `pdfs/${filename}`);
    
    // Upload the file
    const snapshot = await uploadBytes(storageRef, pdfBlob);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    return {
      success: true,
      downloadURL
    };
  } catch (error) {
    console.error('Error uploading PDF:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

export const generateWhatsAppURL = (
  phoneNumber: string,
  documentType: string,
  documentNumber: string,
  customerName: string,
  pdfURL: string
): string => {
  // Clean phone number (remove non-digits)
  const cleanPhone = phoneNumber.replace(/\D/g, '');
  
  // Create message template
  const message = encodeURIComponent(
    `Hi ${customerName},\n\nHere is your ${documentType} #${documentNumber}:\n${pdfURL}\n\nThank you for your business!`
  );
  
  // Return WhatsApp Web URL
  return `https://wa.me/${cleanPhone}?text=${message}`;
};
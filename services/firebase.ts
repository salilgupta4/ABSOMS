import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
    getFirestore,
    enableIndexedDbPersistence,
    Timestamp,
    serverTimestamp,
    type DocumentSnapshot
} from "firebase/firestore";


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
import { firebase } from '@react-native-firebase/app';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';

// Firebase configuration (matching your existing web app config)
const firebaseConfig = {
  apiKey: "AIzaSyDis_mgCh6Ao7T-sAhor8xVizpZ06epjV0",
  authDomain: "tracker-38917.firebaseapp.com",
  projectId: "tracker-38917",
  storageBucket: "tracker-38917.firebasestorage.app",
  messagingSenderId: "568933240750",
  appId: "1:568933240750:web:2179405cdf8b2f64de423f",
  measurementId: "G-PFJ5D2G851"
};

// Initialize Firebase if not already initialized
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// Enable Firestore offline persistence
firestore().settings({
  persistence: true,
  cacheSizeBytes: firestore.CACHE_SIZE_UNLIMITED,
});

// Export Firebase services
export const db = firestore();
export const authService = auth();

// Export utility functions
export const timestamp = firestore.Timestamp;
export const serverTimestamp = firestore.FieldValue.serverTimestamp;

// Collection references for easy access
export const collections = {
  users: () => db.collection('users'),
  customers: () => db.collection('customers'),
  products: () => db.collection('products'),
  vendors: () => db.collection('vendors'),
  quotes: () => db.collection('quotes'),
  salesOrders: () => db.collection('sales_orders'),
  deliveryOrders: () => db.collection('delivery_orders'),
  purchaseOrders: () => db.collection('purchase_orders'),
  stockMovements: () => db.collection('stock_movements'),
  payrollEmployees: () => db.collection('payroll_employees'),
  payrollRecords: () => db.collection('payroll_records'),
  leaveRequests: () => db.collection('leave_requests'),
  advancePayments: () => db.collection('payroll_advances'),
  payrollSettings: () => db.collection('payroll_settings'),
  chatMessages: () => db.collection('chat_messages'),
  scratchpads: () => db.collection('scratchpads'),
  settings: () => db.collection('settings'),
  companySettings: () => db.collection('company_settings'),
};

export default firebase;
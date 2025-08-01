import { initializeApp, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { getAuth, Auth, signInWithEmailAndPassword } from 'firebase/auth';

// ============================================================================
// FIREBASE MIGRATION UTILITY
// ============================================================================

// Old Firebase Configuration
const oldFirebaseConfig = {
  apiKey: "AIzaSyDMrFvjQ-AxBSAEYGJqoiO-C9J1M_-JnY4",
  authDomain: "oms1-438fd.firebaseapp.com",
  projectId: "oms1-438fd",
  storageBucket: "oms1-438fd.firebasestorage.app",
  messagingSenderId: "677213951973",
  appId: "1:677213951973:web:a33bd040c8e95f9464810c",
  measurementId: "G-772DWHDEZ1"
};

// Current Firebase Configuration (will be imported from your existing config)
import { db as newDb } from './firebase';

// Initialize old Firebase app
let oldApp: FirebaseApp;
let oldDb: Firestore;
let oldAuth: Auth;

const initializeOldFirebase = () => {
  try {
    oldApp = initializeApp(oldFirebaseConfig, 'old-firebase');
    oldDb = getFirestore(oldApp);
    oldAuth = getAuth(oldApp);
    console.log('Old Firebase initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize old Firebase:', error);
    return false;
  }
};

// Authenticate with old Firebase using current user's credentials
const authenticateOldFirebase = async (email: string, password: string): Promise<boolean> => {
  try {
    await signInWithEmailAndPassword(oldAuth, email, password);
    console.log('Successfully authenticated with old Firebase');
    return true;
  } catch (error: any) {
    console.error('Failed to authenticate with old Firebase:', error);
    // If authentication fails, try without authentication (in case the old project allows it)
    console.log('Attempting to proceed without authentication...');
    return false;
  }
};

// Collections to migrate
const COLLECTIONS_TO_MIGRATE = [
  'users',
  'customers', 
  'products',
  'vendors',
  'quotes',
  'sales_orders',
  'delivery_orders', 
  'purchase_orders',
  'stock_movements',
  'payroll_employees',
  'payroll_advances',
  'payroll_records',
  'payroll_settings',
  'chat_messages',
  'scratchpads',
  'settings',
  'company_settings'
];

export interface MigrationResult {
  success: boolean;
  collectionResults: Array<{
    collection: string;
    success: boolean;
    documentsCount: number;
    error?: string;
  }>;
  totalDocuments: number;
  successfulDocuments: number;
  failedDocuments: number;
  errors: string[];
}

export interface MigrationProgress {
  currentCollection: string;
  completedCollections: number;
  totalCollections: number;
  currentDocuments: number;
  totalDocuments: number;
  status: 'initializing' | 'reading' | 'writing' | 'completed' | 'error';
  message: string;
}

// Helper function to convert Firestore data
const convertFirestoreData = (data: any): any => {
  const converted = { ...data };
  
  // Handle Firestore Timestamps and other special types
  Object.keys(converted).forEach(key => {
    const value = converted[key];
    
    if (value && typeof value === 'object') {
      // Handle Firestore Timestamp
      if (value.seconds && value.nanoseconds !== undefined) {
        converted[key] = new Date(value.seconds * 1000 + value.nanoseconds / 1000000);
      }
      // Handle nested objects
      else if (!Array.isArray(value)) {
        converted[key] = convertFirestoreData(value);
      }
      // Handle arrays
      else if (Array.isArray(value)) {
        converted[key] = value.map(item => 
          typeof item === 'object' && item !== null ? convertFirestoreData(item) : item
        );
      }
    }
  });
  
  return converted;
};

// Migrate a single collection
export const migrateCollection = async (
  collectionName: string,
  onProgress?: (progress: { current: number; total: number; document: string }) => void
): Promise<{ success: boolean; documentsCount: number; error?: string }> => {
  try {
    console.log(`Starting migration of collection: ${collectionName}`);
    
    // Read from old database
    const oldCollectionRef = collection(oldDb, collectionName);
    const querySnapshot = await getDocs(oldCollectionRef);
    
    if (querySnapshot.empty) {
      console.log(`Collection ${collectionName} is empty, skipping`);
      return { success: true, documentsCount: 0 };
    }
    
    const documents = querySnapshot.docs.map(doc => ({
      id: doc.id,
      data: convertFirestoreData(doc.data())
    }));
    
    console.log(`Found ${documents.length} documents in ${collectionName}`);
    
    // Write to new database in batches
    const batchSize = 500; // Firestore batch limit
    let processedCount = 0;
    
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = writeBatch(newDb);
      const batchDocs = documents.slice(i, i + batchSize);
      
      batchDocs.forEach(({ id, data }) => {
        const newDocRef = doc(newDb, collectionName, id);
        batch.set(newDocRef, data);
        processedCount++;
        
        if (onProgress) {
          onProgress({
            current: processedCount,
            total: documents.length,
            document: `${collectionName}/${id}`
          });
        }
      });
      
      await batch.commit();
      console.log(`Migrated batch ${Math.ceil((i + batchSize) / batchSize)} for ${collectionName}`);
    }
    
    console.log(`Successfully migrated ${documents.length} documents from ${collectionName}`);
    return { success: true, documentsCount: documents.length };
    
  } catch (error) {
    console.error(`Failed to migrate collection ${collectionName}:`, error);
    return { 
      success: false, 
      documentsCount: 0, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
};

// Migrate all collections
export const migrateAllData = async (
  onProgress?: (progress: MigrationProgress) => void,
  selectedCollections?: string[],
  credentials?: { email: string; password: string }
): Promise<MigrationResult> => {
  const result: MigrationResult = {
    success: false,
    collectionResults: [],
    totalDocuments: 0,
    successfulDocuments: 0,
    failedDocuments: 0,
    errors: []
  };
  
  try {
    // Initialize old Firebase
    if (onProgress) {
      onProgress({
        currentCollection: '',
        completedCollections: 0,
        totalCollections: 0,
        currentDocuments: 0,
        totalDocuments: 0,
        status: 'initializing',
        message: 'Initializing connection to old Firebase project...'
      });
    }
    
    const initialized = initializeOldFirebase();
    if (!initialized) {
      result.errors.push('Failed to initialize connection to old Firebase project');
      return result;
    }

    // Try to authenticate with old Firebase if credentials are provided
    if (credentials) {
      if (onProgress) {
        onProgress({
          currentCollection: '',
          completedCollections: 0,
          totalCollections: 0,
          currentDocuments: 0,
          totalDocuments: 0,
          status: 'initializing',
          message: 'Authenticating with old Firebase project...'
        });
      }
      
      const authenticated = await authenticateOldFirebase(credentials.email, credentials.password);
      if (!authenticated) {
        console.log('Proceeding without authentication - some collections may be inaccessible');
      }
    } else {
      console.log('No credentials provided - attempting migration without authentication');
    }
    
    const collectionsToMigrate = selectedCollections || COLLECTIONS_TO_MIGRATE;
    
    if (onProgress) {
      onProgress({
        currentCollection: '',
        completedCollections: 0,
        totalCollections: collectionsToMigrate.length,
        currentDocuments: 0,
        totalDocuments: 0,
        status: 'reading',
        message: 'Starting data migration...'
      });
    }
    
    // Migrate each collection
    for (let i = 0; i < collectionsToMigrate.length; i++) {
      const collectionName = collectionsToMigrate[i];
      
      if (onProgress) {
        onProgress({
          currentCollection: collectionName,
          completedCollections: i,
          totalCollections: collectionsToMigrate.length,
          currentDocuments: 0,
          totalDocuments: 0,
          status: 'reading',
          message: `Reading data from ${collectionName}...`
        });
      }
      
      const collectionResult = await migrateCollection(
        collectionName,
        (docProgress) => {
          if (onProgress) {
            onProgress({
              currentCollection: collectionName,
              completedCollections: i,
              totalCollections: collectionsToMigrate.length,
              currentDocuments: docProgress.current,
              totalDocuments: docProgress.total,
              status: 'writing',
              message: `Migrating ${docProgress.current}/${docProgress.total} documents from ${collectionName}...`
            });
          }
        }
      );
      
      result.collectionResults.push({
        collection: collectionName,
        ...collectionResult
      });
      
      if (collectionResult.success) {
        result.successfulDocuments += collectionResult.documentsCount;
      } else {
        result.failedDocuments += collectionResult.documentsCount;
        if (collectionResult.error) {
          result.errors.push(`${collectionName}: ${collectionResult.error}`);
        }
      }
      
      result.totalDocuments += collectionResult.documentsCount;
    }
    
    result.success = result.errors.length === 0;
    
    if (onProgress) {
      onProgress({
        currentCollection: '',
        completedCollections: collectionsToMigrate.length,
        totalCollections: collectionsToMigrate.length,
        currentDocuments: result.successfulDocuments,
        totalDocuments: result.totalDocuments,
        status: 'completed',
        message: `Migration completed! ${result.successfulDocuments}/${result.totalDocuments} documents migrated successfully.`
      });
    }
    
    console.log('Migration completed:', result);
    return result;
    
  } catch (error) {
    console.error('Migration failed:', error);
    result.errors.push(error instanceof Error ? error.message : 'Unknown migration error');
    
    if (onProgress) {
      onProgress({
        currentCollection: '',
        completedCollections: 0,
        totalCollections: 0,
        currentDocuments: 0,
        totalDocuments: 0,
        status: 'error',
        message: `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
    
    return result;
  }
};

// Get collection statistics from old Firebase
export const getOldFirebaseStats = async (): Promise<{ [collection: string]: number }> => {
  const stats: { [collection: string]: number } = {};
  
  try {
    const initialized = initializeOldFirebase();
    if (!initialized) {
      throw new Error('Failed to initialize old Firebase');
    }
    
    for (const collectionName of COLLECTIONS_TO_MIGRATE) {
      try {
        const collectionRef = collection(oldDb, collectionName);
        const querySnapshot = await getDocs(collectionRef);
        stats[collectionName] = querySnapshot.size;
      } catch (error) {
        console.warn(`Failed to get stats for ${collectionName}:`, error);
        stats[collectionName] = 0;
      }
    }
    
    return stats;
    
  } catch (error) {
    console.error('Failed to get old Firebase stats:', error);
    throw error;
  }
};

// Validate migration by comparing document counts
export const validateMigration = async (): Promise<{
  success: boolean;
  collections: Array<{
    name: string;
    oldCount: number;
    newCount: number;
    matches: boolean;
  }>;
  summary: {
    totalCollections: number;
    matchingCollections: number;
    mismatchedCollections: number;
  };
}> => {
  try {
    const oldStats = await getOldFirebaseStats();
    const collections = [];
    let matchingCollections = 0;
    let mismatchedCollections = 0;
    
    for (const collectionName of COLLECTIONS_TO_MIGRATE) {
      try {
        const newCollectionRef = collection(newDb, collectionName);
        const newQuerySnapshot = await getDocs(newCollectionRef);
        const newCount = newQuerySnapshot.size;
        const oldCount = oldStats[collectionName] || 0;
        const matches = oldCount === newCount;
        
        if (matches) {
          matchingCollections++;
        } else {
          mismatchedCollections++;
        }
        
        collections.push({
          name: collectionName,
          oldCount,
          newCount,
          matches
        });
        
      } catch (error) {
        console.error(`Failed to validate ${collectionName}:`, error);
        collections.push({
          name: collectionName,
          oldCount: oldStats[collectionName] || 0,
          newCount: 0,
          matches: false
        });
        mismatchedCollections++;
      }
    }
    
    return {
      success: mismatchedCollections === 0,
      collections,
      summary: {
        totalCollections: COLLECTIONS_TO_MIGRATE.length,
        matchingCollections,
        mismatchedCollections
      }
    };
    
  } catch (error) {
    console.error('Migration validation failed:', error);
    throw error;
  }
};
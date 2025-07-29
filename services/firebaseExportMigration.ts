import { db as newDb } from './firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { validateData } from './dataValidation';

// ============================================================================
// FIREBASE EXPORT-BASED MIGRATION UTILITY
// ============================================================================

export interface ExportMigrationResult {
  success: boolean;
  processedCollections: string[];
  totalDocuments: number;
  successfulDocuments: number;
  failedDocuments: number;
  errors: string[];
  warnings: string[];
}

export interface ExportMigrationProgress {
  currentCollection: string;
  completedCollections: number;
  totalCollections: number;
  currentDocuments: number;
  totalDocuments: number;
  status: 'reading' | 'validating' | 'writing' | 'completed' | 'error';
  message: string;
}

// Helper function to convert exported data
const processExportedData = (data: any): any => {
  if (!data || typeof data !== 'object') return data;
  
  const processed = { ...data };
  
  Object.keys(processed).forEach(key => {
    const value = processed[key];
    
    if (value && typeof value === 'object') {
      // Handle Firestore Timestamp format from export
      if (value._seconds !== undefined && value._nanoseconds !== undefined) {
        processed[key] = new Date(value._seconds * 1000 + value._nanoseconds / 1000000);
      }
      // Handle __type__ annotations from Firebase export
      else if (value.__type__ === 'timestamp' && value.value) {
        processed[key] = new Date(value.value);
      }
      // Handle nested objects
      else if (!Array.isArray(value)) {
        processed[key] = processExportedData(value);
      }
      // Handle arrays
      else if (Array.isArray(value)) {
        processed[key] = value.map(item => 
          typeof item === 'object' && item !== null ? processExportedData(item) : item
        );
      }
    }
  });
  
  return processed;
};

// Import from Firebase export JSON
export const migrateFromExport = async (
  exportData: any,
  onProgress?: (progress: ExportMigrationProgress) => void,
  selectedCollections?: string[]
): Promise<ExportMigrationResult> => {
  const result: ExportMigrationResult = {
    success: false,
    processedCollections: [],
    totalDocuments: 0,
    successfulDocuments: 0,
    failedDocuments: 0,
    errors: [],
    warnings: []
  };

  try {
    // Validate export data structure
    if (!exportData || typeof exportData !== 'object') {
      result.errors.push('Invalid export data format');
      return result;
    }

    // Find collections in export data
    const availableCollections = Object.keys(exportData).filter(key => 
      exportData[key] && typeof exportData[key] === 'object' && !key.startsWith('__')
    );

    if (availableCollections.length === 0) {
      result.errors.push('No collections found in export data');
      return result;
    }

    const collectionsToProcess = selectedCollections || availableCollections;
    const validCollections = collectionsToProcess.filter(name => availableCollections.includes(name));

    if (validCollections.length === 0) {
      result.errors.push('None of the selected collections were found in export data');
      return result;
    }

    // Count total documents
    let totalDocuments = 0;
    validCollections.forEach(collectionName => {
      const collectionData = exportData[collectionName];
      if (collectionData && typeof collectionData === 'object') {
        totalDocuments += Object.keys(collectionData).length;
      }
    });

    result.totalDocuments = totalDocuments;

    // Process each collection
    for (let i = 0; i < validCollections.length; i++) {
      const collectionName = validCollections[i];
      const collectionData = exportData[collectionName];

      if (onProgress) {
        onProgress({
          currentCollection: collectionName,
          completedCollections: i,
          totalCollections: validCollections.length,
          currentDocuments: 0,
          totalDocuments: totalDocuments,
          status: 'reading',
          message: `Processing collection: ${collectionName}`
        });
      }

      if (!collectionData || typeof collectionData !== 'object') {
        result.warnings.push(`Skipping ${collectionName}: No data found`);
        continue;
      }

      const documentIds = Object.keys(collectionData);
      if (documentIds.length === 0) {
        result.warnings.push(`Skipping ${collectionName}: Empty collection`);
        continue;
      }

      // Process documents in batches
      const batchSize = 500;
      let processedInCollection = 0;

      for (let start = 0; start < documentIds.length; start += batchSize) {
        const batch = writeBatch(newDb);
        const batchIds = documentIds.slice(start, start + batchSize);

        for (const docId of batchIds) {
          try {
            if (onProgress) {
              onProgress({
                currentCollection: collectionName,
                completedCollections: i,
                totalCollections: validCollections.length,
                currentDocuments: result.successfulDocuments + processedInCollection,
                totalDocuments: totalDocuments,
                status: 'validating',
                message: `Validating document: ${collectionName}/${docId}`
              });
            }

            const rawDocData = collectionData[docId];
            if (!rawDocData || typeof rawDocData !== 'object') {
              result.warnings.push(`Skipping ${collectionName}/${docId}: Invalid document data`);
              continue;
            }

            // Process exported data format
            let processedData = processExportedData(rawDocData);

            // Validate data if validation is available for this collection
            const csvSupportedCollections = ['customers', 'products', 'vendors', 'payroll_employees', 'users'];
            if (csvSupportedCollections.includes(collectionName)) {
              try {
                const validation = validateData(collectionName, processedData);
                if (!validation.isValid) {
                  result.warnings.push(`Data validation warnings for ${collectionName}/${docId}: ${validation.errors.join(', ')}`);
                }
                if (validation.fixedData) {
                  processedData = validation.fixedData;
                  if (validation.warnings.length > 0) {
                    result.warnings.push(`Auto-fixed ${collectionName}/${docId}: ${validation.warnings.join(', ')}`);
                  }
                }
              } catch (validatorError) {
                result.warnings.push(`Validation failed for ${collectionName}/${docId}: ${validatorError}`);
              }
            }

            if (onProgress) {
              onProgress({
                currentCollection: collectionName,
                completedCollections: i,
                totalCollections: validCollections.length,
                currentDocuments: result.successfulDocuments + processedInCollection,
                totalDocuments: totalDocuments,
                status: 'writing',
                message: `Writing document: ${collectionName}/${docId}`
              });
            }

            // Add to batch
            const docRef = doc(newDb, collectionName, docId);
            batch.set(docRef, processedData);
            processedInCollection++;

          } catch (docError) {
            result.errors.push(`Failed to process ${collectionName}/${docId}: ${docError instanceof Error ? docError.message : 'Unknown error'}`);
            result.failedDocuments++;
          }
        }

        // Commit batch
        try {
          await batch.commit();
          result.successfulDocuments += processedInCollection - (result.successfulDocuments + processedInCollection - result.successfulDocuments);
        } catch (batchError) {
          result.errors.push(`Failed to commit batch for ${collectionName}: ${batchError instanceof Error ? batchError.message : 'Unknown error'}`);
          result.failedDocuments += batchIds.length;
        }
      }

      result.processedCollections.push(collectionName);
    }

    result.success = result.errors.length === 0 || result.successfulDocuments > 0;

    if (onProgress) {
      onProgress({
        currentCollection: '',
        completedCollections: validCollections.length,
        totalCollections: validCollections.length,
        currentDocuments: result.successfulDocuments,
        totalDocuments: totalDocuments,
        status: 'completed',
        message: `Migration completed! ${result.successfulDocuments}/${totalDocuments} documents processed.`
      });
    }

    return result;

  } catch (error) {
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

// Parse Firebase export JSON
export const parseFirebaseExport = (jsonString: string): { 
  success: boolean; 
  data?: any; 
  collections: string[]; 
  totalDocuments: number;
  error?: string; 
} => {
  try {
    const exportData = JSON.parse(jsonString);
    
    // Check if this looks like a Firebase export
    if (!exportData || typeof exportData !== 'object') {
      return {
        success: false,
        collections: [],
        totalDocuments: 0,
        error: 'Invalid JSON format'
      };
    }

    // Find collections in the export
    const collections = Object.keys(exportData).filter(key => 
      exportData[key] && 
      typeof exportData[key] === 'object' && 
      !key.startsWith('__') && // Skip metadata
      !key.startsWith('_') // Skip private fields
    );

    // Count total documents
    let totalDocuments = 0;
    collections.forEach(collectionName => {
      const collectionData = exportData[collectionName];
      if (collectionData && typeof collectionData === 'object') {
        totalDocuments += Object.keys(collectionData).length;
      }
    });

    if (collections.length === 0) {
      return {
        success: false,
        collections: [],
        totalDocuments: 0,
        error: 'No collections found in export data'
      };
    }

    return {
      success: true,
      data: exportData,
      collections,
      totalDocuments
    };

  } catch (error) {
    return {
      success: false,
      collections: [],
      totalDocuments: 0,
      error: error instanceof Error ? error.message : 'Failed to parse JSON'
    };
  }
};

// Validate current project data after migration
export const validateMigration = async (originalCollections: string[]): Promise<{
  success: boolean;
  collections: Array<{
    name: string;
    documentCount: number;
    hasData: boolean;
  }>;
  totalDocuments: number;
}> => {
  try {
    const collections = [];
    let totalDocuments = 0;

    for (const collectionName of originalCollections) {
      try {
        const collectionRef = collection(newDb, collectionName);
        const querySnapshot = await getDocs(collectionRef);
        const documentCount = querySnapshot.size;
        
        collections.push({
          name: collectionName,
          documentCount,
          hasData: documentCount > 0
        });

        totalDocuments += documentCount;

      } catch (error) {
        console.warn(`Failed to validate collection ${collectionName}:`, error);
        collections.push({
          name: collectionName,
          documentCount: 0,
          hasData: false
        });
      }
    }

    return {
      success: true,
      collections,
      totalDocuments
    };

  } catch (error) {
    console.error('Migration validation failed:', error);
    throw error;
  }
};
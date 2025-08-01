import { db, Timestamp } from './firebase';
import { 
    collection, getDocs, writeBatch, doc, query, where, orderBy, 
    getDoc, deleteDoc, setDoc, updateDoc, collectionGroup
} from 'firebase/firestore';
import { validateData, ValidationResult, DATA_DEFAULTS } from './dataValidation';
import { getInventory } from '@/components/inventory/inventoryService';

// ============================================================================
// COMPREHENSIVE DATA MANAGEMENT SYSTEM
// ============================================================================

export interface ImportResult {
    success: boolean;
    processed: number;
    skipped: number;
    errors: string[];
    warnings: string[];
    skippedItems: Array<{ item: any; reason: string; line?: number }>;
}

export interface ExportResult {
    success: boolean;
    recordCount: number;
    fileName: string;
    error?: string;
}

export interface BackupResult {
    success: boolean;
    collections: string[];
    totalRecords: number;
    fileName: string;
    timestamp: string;
    error?: string;
}

export interface RestoreResult {
    success: boolean;
    collections: string[];
    totalRecords: number;
    errors: string[];
    warnings: string[];
}

export interface IntegrityCheckResult {
    collection: string;
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
    fixedRecords: number;
    issues: Array<{
        recordId: string;
        errors: string[];
        warnings: string[];
        fixed: boolean;
    }>;
}

// All collections that should be included in backup/restore
const ALL_COLLECTIONS = [
    'users', 'customers', 'products', 'vendors', 'quotes', 'sales_orders',
    'delivery_orders', 'purchase_orders', 'stock_movements', 'payroll_employees',
    'payroll_advances', 'payroll_records', 'payroll_settings', 'chat_messages', 
    'scratchpads', 'settings', 'company_settings'
];

// Collections that support CSV import/export
const CSV_EXPORTABLE_COLLECTIONS = [
    'customers', 'products', 'vendors', 'quotes', 'sales_orders', 
    'purchase_orders', 'payroll_employees', 'users'
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const generateId = () => Math.random().toString(36).substr(2, 9);

const downloadFile = (content: string, fileName: string, mimeType: string) => {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8;` });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const formatTimestamp = (timestamp: any): string => {
    if (!timestamp) return new Date().toISOString();
    
    // Handle Firestore Timestamp
    if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
        return new Date(timestamp.seconds * 1000).toISOString();
    }
    
    // Handle Date object or string
    try {
        return new Date(timestamp).toISOString();
    } catch (e) {
        return new Date().toISOString();
    }
};

const convertFirestoreData = (data: any): any => {
    const converted = { ...data };
    
    // Convert Firestore Timestamps to ISO strings
    Object.keys(converted).forEach(key => {
        if (converted[key] && typeof converted[key] === 'object' && converted[key].seconds) {
            converted[key] = formatTimestamp(converted[key]);
        } else if (Array.isArray(converted[key])) {
            converted[key] = converted[key].map((item: any) => 
                item && typeof item === 'object' ? convertFirestoreData(item) : item
            );
        } else if (converted[key] && typeof converted[key] === 'object') {
            converted[key] = convertFirestoreData(converted[key]);
        }
    });
    
    return converted;
};

// ============================================================================
// CSV FUNCTIONS
// ============================================================================

const convertToCSV = (data: any[], headers: string[]): string => {
    const escapeCSVField = (field: any): string => {
        if (field === null || field === undefined) return '';
        
        let value = String(field);
        
        // Handle objects and arrays
        if (typeof field === 'object') {
            try {
                value = JSON.stringify(field);
            } catch (e) {
                value = '[Complex Object]';
            }
        }
        
        // Escape quotes and wrap in quotes if necessary
        if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
            value = `"${value.replace(/"/g, '""')}"`;
        }
        
        return value;
    };

    const headerRow = headers.map(h => escapeCSVField(h)).join(',');
    const rows = data.map(obj => 
        headers.map(header => escapeCSVField(obj[header])).join(',')
    );
    
    return [headerRow, ...rows].join('\n');
};

const parseCSV = (csvText: string): any[] => {
    const lines = csvText.trim().split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // Escaped quote
                    current += '"';
                    i++; // Skip next quote
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);
        return result;
    };

    const headers = parseCSVLine(lines[0]);
    const data: any[] = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        
        if (values.length !== headers.length) {
            console.warn(`Line ${i + 1}: Column count mismatch. Expected ${headers.length}, got ${values.length}`);
            continue;
        }
        
        const obj: any = {};
        headers.forEach((header, index) => {
            let value = values[index] || '';
            
            // Try to parse as number
            if (value !== '' && !isNaN(Number(value)) && value.trim() !== '') {
                const num = Number(value);
                if (!isNaN(num)) {
                    obj[header] = num;
                    return;
                }
            }
            
            // Try to parse as boolean
            const lowerValue = value.toLowerCase().trim();
            if (lowerValue === 'true' || lowerValue === 'false') {
                obj[header] = lowerValue === 'true';
                return;
            }
            
            // Try to parse as JSON (for objects/arrays)
            if ((value.startsWith('{') && value.endsWith('}')) || 
                (value.startsWith('[') && value.endsWith(']'))) {
                try {
                    obj[header] = JSON.parse(value);
                    return;
                } catch (e) {
                    // Keep as string if JSON parsing fails
                }
            }
            
            obj[header] = value;
        });
        
        data.push(obj);
    }
    
    return data;
};

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

export const exportCollectionToCSV = async (collectionName: string): Promise<ExportResult> => {
    try {
        if (!CSV_EXPORTABLE_COLLECTIONS.includes(collectionName)) {
            return {
                success: false,
                recordCount: 0,
                fileName: '',
                error: `Collection ${collectionName} is not exportable to CSV`
            };
        }

        const querySnapshot = await getDocs(collection(db, collectionName));
        const rawData = querySnapshot.docs.map(doc => ({ id: doc.id, ...convertFirestoreData(doc.data()) }));

        if (rawData.length === 0) {
            return {
                success: false,
                recordCount: 0,
                fileName: '',
                error: `No data found in ${collectionName} collection`
            };
        }

        // Generate comprehensive headers from all records
        const allHeaders = new Set<string>();
        rawData.forEach(record => {
            Object.keys(record).forEach(key => allHeaders.add(key));
        });

        const headers = Array.from(allHeaders).sort();
        const csvContent = convertToCSV(rawData, headers);
        const fileName = `${collectionName}-export-${new Date().toISOString().split('T')[0]}.csv`;
        
        downloadFile(csvContent, fileName, 'text/csv');

        return {
            success: true,
            recordCount: rawData.length,
            fileName
        };
    } catch (error) {
        console.error('Export error:', error);
        return {
            success: false,
            recordCount: 0,
            fileName: '',
            error: error instanceof Error ? error.message : 'Unknown export error'
        };
    }
};

export const exportInventoryToCSV = async (): Promise<ExportResult> => {
    try {
        const inventoryData = await getInventory();
        
        if (inventoryData.length === 0) {
            return {
                success: false,
                recordCount: 0,
                fileName: '',
                error: 'No inventory data found'
            };
        }

        const headers = ['productId', 'productName', 'currentStock', 'unit', 'lastUpdated'];
        const csvContent = convertToCSV(inventoryData, headers);
        const fileName = `inventory-status-${new Date().toISOString().split('T')[0]}.csv`;
        
        downloadFile(csvContent, fileName, 'text/csv');

        return {
            success: true,
            recordCount: inventoryData.length,
            fileName
        };
    } catch (error) {
        console.error('Inventory export error:', error);
        return {
            success: false,
            recordCount: 0,
            fileName: '',
            error: error instanceof Error ? error.message : 'Unknown export error'
        };
    }
};

// ============================================================================
// IMPORT FUNCTIONS
// ============================================================================

export const importCollectionFromCSV = async (
    collectionName: string, 
    csvText: string,
    options: {
        validateData?: boolean;
        autoFix?: boolean;
        skipInvalid?: boolean;
    } = {}
): Promise<ImportResult> => {
    const { validateData: shouldValidate = true, autoFix = true, skipInvalid = true } = options;
    
    try {
        if (!CSV_EXPORTABLE_COLLECTIONS.includes(collectionName)) {
            return {
                success: false,
                processed: 0,
                skipped: 0,
                errors: [`Collection ${collectionName} does not support CSV import`],
                warnings: [],
                skippedItems: []
            };
        }

        const dataToImport = parseCSV(csvText);
        
        if (dataToImport.length === 0) {
            return {
                success: false,
                processed: 0,
                skipped: 0,
                errors: ['CSV file is empty or invalid'],
                warnings: [],
                skippedItems: []
            };
        }

        const collectionRef = collection(db, collectionName);
        const batch = writeBatch(db);
        
        // Get existing records for duplicate checking
        const existingSnapshot = await getDocs(collectionRef);
        const existingRecords = new Map<string, any>();
        const existingNameMap = new Map<string, string>();
        
        existingSnapshot.docs.forEach(doc => {
            const data = doc.data();
            existingRecords.set(doc.id, data);
            
            // Create name-to-ID mapping for duplicate detection
            if (data.name) {
                existingNameMap.set(data.name.toLowerCase().trim(), doc.id);
            }
            if (data.email) {
                existingNameMap.set(data.email.toLowerCase().trim(), doc.id);
            }
            if (data.employee_id) {
                existingNameMap.set(data.employee_id.toLowerCase().trim(), doc.id);
            }
        });

        let processed = 0;
        let skipped = 0;
        const errors: string[] = [];
        const warnings: string[] = [];
        const skippedItems: Array<{ item: any; reason: string; line?: number }> = [];
        const nameInBatch = new Set<string>();

        for (let i = 0; i < dataToImport.length; i++) {
            const lineNumber = i + 2; // +2 because CSV line numbers start from 1 and we skip header
            const item = dataToImport[i];
            const { id, ...itemData } = item;

            try {
                // Determine if this is a new record or update
                const isNewRecord = !id || String(id).trim() === '' || String(id).trim() === '0';
                let docId = isNewRecord ? '' : String(id).trim();
                
                // Validate and fix data if requested
                let processedData = itemData;
                if (shouldValidate) {
                    const validation = validateData(collectionName, itemData);
                    
                    if (!validation.isValid) {
                        if (skipInvalid) {
                            skippedItems.push({
                                item,
                                reason: `Validation failed: ${validation.errors.join(', ')}`,
                                line: lineNumber
                            });
                            skipped++;
                            continue;
                        } else {
                            errors.push(`Line ${lineNumber}: ${validation.errors.join(', ')}`);
                            continue;
                        }
                    }
                    
                    if (autoFix && validation.fixedData) {
                        processedData = validation.fixedData;
                        if (validation.warnings.length > 0) {
                            warnings.push(`Line ${lineNumber}: ${validation.warnings.join(', ')}`);
                        }
                    }
                }

                // Check for duplicates
                const name = processedData.name?.toLowerCase().trim();
                const email = processedData.email?.toLowerCase().trim();
                const employeeId = processedData.employee_id?.toLowerCase().trim();
                
                if (isNewRecord) {
                    // Check for duplicates in existing data
                    let duplicateKey = null;
                    if (name && existingNameMap.has(name)) duplicateKey = name;
                    if (email && existingNameMap.has(email)) duplicateKey = email;
                    if (employeeId && existingNameMap.has(employeeId)) duplicateKey = employeeId;
                    
                    // Check for duplicates in current batch
                    if (name && nameInBatch.has(name)) duplicateKey = name;
                    if (email && nameInBatch.has(email)) duplicateKey = email;
                    if (employeeId && nameInBatch.has(employeeId)) duplicateKey = employeeId;
                    
                    if (duplicateKey) {
                        skippedItems.push({
                            item,
                            reason: `Duplicate found: ${duplicateKey}`,
                            line: lineNumber
                        });
                        skipped++;
                        continue;
                    }
                    
                    // Create new record
                    const newDocRef = doc(collectionRef);
                    batch.set(newDocRef, {
                        ...processedData,
                        created_at: Timestamp.now(),
                        updated_at: Timestamp.now()
                    });
                    
                    // Track names in batch to prevent duplicates
                    if (name) nameInBatch.add(name);
                    if (email) nameInBatch.add(email);
                    if (employeeId) nameInBatch.add(employeeId);
                    
                } else {
                    // Update existing record
                    if (!existingRecords.has(docId)) {
                        skippedItems.push({
                            item,
                            reason: `Record with ID ${docId} not found`,
                            line: lineNumber
                        });
                        skipped++;
                        continue;
                    }
                    
                    const docRef = doc(db, collectionName, docId);
                    batch.update(docRef, {
                        ...processedData,
                        updated_at: Timestamp.now()
                    });
                }
                
                processed++;
                
            } catch (itemError) {
                const errorMsg = itemError instanceof Error ? itemError.message : 'Unknown error';
                skippedItems.push({
                    item,
                    reason: `Processing error: ${errorMsg}`,
                    line: lineNumber
                });
                skipped++;
            }
        }

        // Commit the batch if there are records to process
        if (processed > 0) {
            await batch.commit();
        }

        return {
            success: processed > 0,
            processed,
            skipped,
            errors,
            warnings,
            skippedItems
        };

    } catch (error) {
        console.error('Import error:', error);
        return {
            success: false,
            processed: 0,
            skipped: 0,
            errors: [error instanceof Error ? error.message : 'Unknown import error'],
            warnings: [],
            skippedItems: []
        };
    }
};

// ============================================================================
// BACKUP & RESTORE FUNCTIONS
// ============================================================================

export const createSystemBackup = async (): Promise<BackupResult> => {
    try {
        const backup: { [key: string]: any } = {
            metadata: {
                version: '1.0',
                timestamp: new Date().toISOString(),
                collections: ALL_COLLECTIONS,
                created_by: 'ABS OMS Data Management System'
            }
        };

        let totalRecords = 0;
        const processedCollections: string[] = [];

        for (const collectionName of ALL_COLLECTIONS) {
            try {
                const querySnapshot = await getDocs(collection(db, collectionName));
                const documents = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...convertFirestoreData(doc.data())
                }));

                if (documents.length > 0) {
                    backup[collectionName] = documents;
                    totalRecords += documents.length;
                    processedCollections.push(collectionName);
                }
            } catch (collectionError) {
                console.warn(`Failed to backup collection ${collectionName}:`, collectionError);
                // Continue with other collections
            }
        }

        // Include subcollections if any
        try {
            // Backup any subcollections found
            const subcollectionGroups = ['user_profiles', 'employee_documents', 'advance_transactions'];
            for (const groupName of subcollectionGroups) {
                try {
                    const groupQuery = query(collectionGroup(db, groupName));
                    const groupSnapshot = await getDocs(groupQuery);
                    if (!groupSnapshot.empty) {
                        backup[`_subcollections_${groupName}`] = groupSnapshot.docs.map(doc => ({
                            id: doc.id,
                            parentPath: doc.ref.parent.parent?.path || '',
                            ...convertFirestoreData(doc.data())
                        }));
                        totalRecords += groupSnapshot.docs.length;
                    }
                } catch (e) {
                    // Subcollection doesn't exist or access denied
                }
            }
        } catch (e) {
            console.warn('Failed to backup subcollections:', e);
        }

        const backupJson = JSON.stringify(backup, null, 2);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `abs-oms-backup-${timestamp}.json`;
        
        downloadFile(backupJson, fileName, 'application/json');

        return {
            success: true,
            collections: processedCollections,
            totalRecords,
            fileName,
            timestamp: backup.metadata.timestamp
        };

    } catch (error) {
        console.error('Backup error:', error);
        return {
            success: false,
            collections: [],
            totalRecords: 0,
            fileName: '',
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown backup error'
        };
    }
};

export const restoreSystemBackup = async (
    backupJson: string,
    options: {
        overwriteExisting?: boolean;
        validateData?: boolean;
        selectedCollections?: string[];
    } = {}
): Promise<RestoreResult> => {
    const { overwriteExisting = false, validateData: shouldValidateData = true, selectedCollections } = options;
    
    try {
        const backupData = JSON.parse(backupJson);
        
        // Handle both new and legacy backup formats
        let isLegacyBackup = false;
        if (!backupData.metadata) {
            // Check if this looks like a legacy backup (has collection data directly)
            const hasCollectionData = ALL_COLLECTIONS.some(collection => 
                backupData[collection] && Array.isArray(backupData[collection])
            );
            
            if (hasCollectionData) {
                // This is a legacy backup, create minimal metadata
                isLegacyBackup = true;
                backupData.metadata = {
                    version: 'legacy',
                    timestamp: new Date().toISOString(),
                    collections: Object.keys(backupData).filter(key => Array.isArray(backupData[key])),
                    created_by: 'Legacy Import'
                };
            } else {
                return {
                    success: false,
                    collections: [],
                    totalRecords: 0,
                    errors: ['Invalid backup file: missing metadata and no recognizable data structure'],
                    warnings: []
                };
            }
        }

        const collectionsToRestore = selectedCollections || 
            Object.keys(backupData).filter(key => key !== 'metadata' && !key.startsWith('_subcollections_'));
        
        const batch = writeBatch(db);
        let batchCount = 0;
        const batchLimit = 500; // Firestore batch limit
        let totalRecords = 0;
        const errors: string[] = [];
        const warnings: string[] = [];
        const processedCollections: string[] = [];

        for (const collectionName of collectionsToRestore) {
            if (!backupData[collectionName]) {
                warnings.push(`Collection ${collectionName} not found in backup`);
                continue;
            }

            try {
                const documents = backupData[collectionName];
                
                for (const docData of documents) {
                    const { id, ...data } = docData;
                    
                    if (!id) {
                        warnings.push(`Skipping document without ID in ${collectionName}`);
                        continue;
                    }

                    // Validate data if requested
                    let processedData = data;
                    if (shouldValidateData && CSV_EXPORTABLE_COLLECTIONS.includes(collectionName)) {
                        const validation = validateData(collectionName, data);
                        if (!validation.isValid) {
                            errors.push(`${collectionName}/${id}: ${validation.errors.join(', ')}`);
                            continue;
                        }
                        if (validation.fixedData) {
                            processedData = validation.fixedData;
                            if (validation.warnings.length > 0) {
                                warnings.push(`${collectionName}/${id}: ${validation.warnings.join(', ')}`);
                            }
                        }
                    }

                    // Convert date strings back to Firestore Timestamps
                    Object.keys(processedData).forEach(key => {
                        const value = processedData[key];
                        if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
                            try {
                                processedData[key] = Timestamp.fromDate(new Date(value));
                            } catch (e) {
                                // Keep as string if conversion fails
                            }
                        }
                        
                        // Handle nested objects
                        if (value && typeof value === 'object' && !Array.isArray(value)) {
                            Object.keys(value).forEach(subKey => {
                                const subValue = value[subKey];
                                if (typeof subValue === 'string' && subValue.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
                                    try {
                                        value[subKey] = Timestamp.fromDate(new Date(subValue));
                                    } catch (e) {
                                        // Keep as string if conversion fails
                                    }
                                }
                            });
                        }
                    });

                    const docRef = doc(db, collectionName, id);
                    
                    if (overwriteExisting) {
                        batch.set(docRef, processedData);
                    } else {
                        // Check if document exists
                        const existingDoc = await getDoc(docRef);
                        if (!existingDoc.exists()) {
                            batch.set(docRef, processedData);
                        } else {
                            warnings.push(`Document ${collectionName}/${id} already exists, skipping`);
                            continue;
                        }
                    }

                    batchCount++;
                    totalRecords++;

                    // Commit batch if it reaches the limit
                    if (batchCount >= batchLimit) {
                        await batch.commit();
                        const newBatch = writeBatch(db);
                        Object.assign(batch, newBatch);
                        batchCount = 0;
                    }
                }

                processedCollections.push(collectionName);

            } catch (collectionError) {
                errors.push(`Failed to restore collection ${collectionName}: ${
                    collectionError instanceof Error ? collectionError.message : 'Unknown error'
                }`);
            }
        }

        // Commit any remaining documents
        if (batchCount > 0) {
            await batch.commit();
        }

        return {
            success: totalRecords > 0,
            collections: processedCollections,
            totalRecords,
            errors,
            warnings
        };

    } catch (error) {
        console.error('Restore error:', error);
        return {
            success: false,
            collections: [],
            totalRecords: 0,
            errors: [error instanceof Error ? error.message : 'Unknown restore error'],
            warnings: []
        };
    }
};

// ============================================================================
// DATA INTEGRITY FUNCTIONS
// ============================================================================

export const runIntegrityCheck = async (collectionName: string): Promise<IntegrityCheckResult> => {
    try {
        const querySnapshot = await getDocs(collection(db, collectionName));
        const documents = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        let validRecords = 0;
        let invalidRecords = 0;
        let fixedRecords = 0;
        const issues: Array<{
            recordId: string;
            errors: string[];
            warnings: string[];
            fixed: boolean;
        }> = [];

        const batch = writeBatch(db);
        let batchCount = 0;

        for (const document of documents) {
            const { id, ...data } = document;
            const validation = validateData(collectionName, data);
            
            if (validation.isValid) {
                validRecords++;
            } else {
                invalidRecords++;
                
                const issue = {
                    recordId: id,
                    errors: validation.errors,
                    warnings: validation.warnings,
                    fixed: false
                };

                // Try to fix the data
                if (validation.fixedData) {
                    const docRef = doc(db, collectionName, id);
                    batch.update(docRef, {
                        ...validation.fixedData,
                        updated_at: Timestamp.now(),
                        _integrity_fixed: true
                    });
                    batchCount++;
                    fixedRecords++;
                    issue.fixed = true;
                }

                issues.push(issue);
            }
        }

        // Commit fixes
        if (batchCount > 0) {
            await batch.commit();
        }

        return {
            collection: collectionName,
            totalRecords: documents.length,
            validRecords,
            invalidRecords,
            fixedRecords,
            issues
        };

    } catch (error) {
        console.error('Integrity check error:', error);
        return {
            collection: collectionName,
            totalRecords: 0,
            validRecords: 0,
            invalidRecords: 0,
            fixedRecords: 0,
            issues: [{
                recordId: 'SYSTEM_ERROR',
                errors: [error instanceof Error ? error.message : 'Unknown error'],
                warnings: [],
                fixed: false
            }]
        };
    }
};

export const runFullIntegrityCheck = async (
    collectionsToCheck?: string[]
): Promise<IntegrityCheckResult[]> => {
    const collections = collectionsToCheck || CSV_EXPORTABLE_COLLECTIONS;
    const results: IntegrityCheckResult[] = [];
    
    for (const collectionName of collections) {
        const result = await runIntegrityCheck(collectionName);
        results.push(result);
    }
    
    return results;
};

// ============================================================================
// UTILITY FUNCTIONS FOR UI
// ============================================================================

export const getCollectionStats = async (collectionName: string) => {
    try {
        const querySnapshot = await getDocs(collection(db, collectionName));
        return {
            totalRecords: querySnapshot.size,
            lastUpdated: new Date().toISOString()
        };
    } catch (error) {
        return {
            totalRecords: 0,
            lastUpdated: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
};

export const getAllCollectionStats = async () => {
    const stats: { [key: string]: any } = {};
    
    for (const collectionName of ALL_COLLECTIONS) {
        stats[collectionName] = await getCollectionStats(collectionName);
    }
    
    return stats;
};

// ============================================================================
// DELETE ALL DATA FUNCTION
// ============================================================================

export interface DeleteAllDataResult {
    success: boolean;
    deletedCollections: string[];
    totalDeletedRecords: number;
    skippedCollections: string[];
    errors: string[];
    timestamp: string;
}

export const deleteAllDataExceptUsers = async (): Promise<DeleteAllDataResult> => {
    try {
        // Collections to delete (all except users)
        const collectionsToDelete = ALL_COLLECTIONS.filter(collection => collection !== 'users');
        
        const deletedCollections: string[] = [];
        const skippedCollections: string[] = [];
        const errors: string[] = [];
        let totalDeletedRecords = 0;

        for (const collectionName of collectionsToDelete) {
            try {
                const querySnapshot = await getDocs(collection(db, collectionName));
                
                if (querySnapshot.empty) {
                    skippedCollections.push(`${collectionName} (empty)`);
                    continue;
                }

                // Delete documents in batches
                const batch = writeBatch(db);
                let batchCount = 0;
                const batchLimit = 500;
                let collectionDeletedCount = 0;

                for (const docSnap of querySnapshot.docs) {
                    batch.delete(docSnap.ref);
                    batchCount++;
                    collectionDeletedCount++;

                    if (batchCount >= batchLimit) {
                        await batch.commit();
                        const newBatch = writeBatch(db);
                        Object.assign(batch, newBatch);
                        batchCount = 0;
                    }
                }

                // Commit remaining documents
                if (batchCount > 0) {
                    await batch.commit();
                }

                deletedCollections.push(collectionName);
                totalDeletedRecords += collectionDeletedCount;

            } catch (collectionError) {
                const errorMsg = `Failed to delete ${collectionName}: ${
                    collectionError instanceof Error ? collectionError.message : 'Unknown error'
                }`;
                errors.push(errorMsg);
                console.error(errorMsg, collectionError);
            }
        }

        // Also clean up subcollections if any exist
        try {
            const subcollectionGroups = ['user_profiles', 'employee_documents', 'advance_transactions'];
            for (const groupName of subcollectionGroups) {
                try {
                    const groupQuery = query(collectionGroup(db, groupName));
                    const groupSnapshot = await getDocs(groupQuery);
                    
                    if (!groupSnapshot.empty) {
                        const batch = writeBatch(db);
                        let batchCount = 0;
                        
                        for (const docSnap of groupSnapshot.docs) {
                            batch.delete(docSnap.ref);
                            batchCount++;
                            totalDeletedRecords++;
                            
                            if (batchCount >= 500) {
                                await batch.commit();
                                const newBatch = writeBatch(db);
                                Object.assign(batch, newBatch);
                                batchCount = 0;
                            }
                        }
                        
                        if (batchCount > 0) {
                            await batch.commit();
                        }
                        
                        deletedCollections.push(`_subcollections_${groupName}`);
                    }
                } catch (e) {
                    // Subcollection doesn't exist or access denied - this is fine
                }
            }
        } catch (e) {
            console.warn('Failed to clean up subcollections:', e);
        }

        return {
            success: deletedCollections.length > 0 || totalDeletedRecords > 0,
            deletedCollections,
            totalDeletedRecords,
            skippedCollections,
            errors,
            timestamp: new Date().toISOString()
        };

    } catch (error) {
        console.error('Delete all data error:', error);
        return {
            success: false,
            deletedCollections: [],
            totalDeletedRecords: 0,
            skippedCollections: [],
            errors: [error instanceof Error ? error.message : 'Unknown delete error'],
            timestamp: new Date().toISOString()
        };
    }
};
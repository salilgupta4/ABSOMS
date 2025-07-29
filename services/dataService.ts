import { db, Timestamp } from './firebase';
import { collection, getDocs, writeBatch, doc, where, query, orderBy } from 'firebase/firestore';
import { PayrollEmployee, EmployeeCategory } from '@/types';

// Import new robust data management functions
import { 
    exportCollectionToCSV as newExportCollectionToCSV,
    importCollectionFromCSV,
    createSystemBackup as newCreateSystemBackup,
    restoreSystemBackup,
    exportInventoryToCSV as newExportInventoryToCSV
} from './dataManagement';

const ALL_COLLECTIONS = [
    'users', 'customers', 'products', 'vendors', 'quotes', 'sales_orders',
    'delivery_orders', 'purchase_orders', 'stock_movements', 'payroll_employees',
    'payroll_advances', 'payroll_records', 'payroll_settings', 'chat_messages', 
    'scratchpads', 'settings', 'company_settings'
];

// Legacy function - use newCreateSystemBackup for new implementations
export const exportAllDataAsJson = async () => {
    console.warn('exportAllDataAsJson is deprecated. Use createSystemBackup from dataManagement service instead.');
    const result = await newCreateSystemBackup();
    if (result.success) {
        // Return the backup data instead of downloading
        return 'Backup created successfully';
    } else {
        throw new Error(result.error || 'Backup creation failed');
    }
};

// Legacy function - use restoreSystemBackup for new implementations
export const importAllDataFromJson = async (jsonString: string) => {
    console.warn('importAllDataFromJson is deprecated. Use restoreSystemBackup from dataManagement service instead.');
    const result = await restoreSystemBackup(jsonString, {
        overwriteExisting: true,
        validateData: true
    });
    
    if (!result.success) {
        throw new Error(result.errors.join(', ') || 'Restore failed');
    }
    
    return result;
};


// --- CSV Functionality ---

function convertToCSV(data: any[], headers: string[]): string {
    const getCircularReplacer = () => {
        const seen = new WeakSet();
        return (key: string, value: any) => {
            if (typeof value === "object" && value !== null) {
                if (seen.has(value)) {
                    return "[Circular Reference]";
                }
                seen.add(value);
            }
            return value;
        };
    };

    const headerRow = headers.join(',');
    const rows = data.map(obj => 
        headers.map(header => {
            let value = obj[header];
            if (value === null || value === undefined) {
                value = '';
            } else if (value instanceof Timestamp) { // Handle Firestore Timestamp
                value = value.toDate().toISOString();
            } else if (typeof value === 'object') {
                try {
                    value = JSON.stringify(value, getCircularReplacer());
                } catch (e) {
                    value = '[Unstringifiable Object]';
                }
            }
            
            const stringValue = String(value).replace(/"/g, '""');
            return `"${stringValue}"`;
        }).join(',')
    );
    return [headerRow, ...rows].join('\n');
}

/**
 * A robust CSV parser that handles empty fields, quoted fields, and escaped quotes.
 * @param csvText The raw CSV string.
 * @returns An array of objects representing the CSV rows.
 */
function parseCSV(csvText: string): any[] {
    const lines = csvText.trim().split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    const headerLine = lines.shift()!;
    // More robust header split to handle potential quotes in headers
    const headers = (headerLine.match(/(".*?"|[^,]+)/g) || []).map(h => h.trim().replace(/^"|"$/g, ''));
    
    const data: any[] = [];
    
    for (const line of lines) {
        const values = [];
        let inQuotes = false;
        let field = '';
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                if (inQuotes && line[i+1] === '"') { // Escaped quote ""
                    field += '"';
                    i++; // Skip next quote
                    continue;
                }
                inQuotes = !inQuotes;
                // Don't add the quote char itself to the field unless it's an escaped quote
            } else if (char === ',' && !inQuotes) {
                values.push(field);
                field = '';
            } else {
                field += char;
            }
        }
        values.push(field); // Add the last field

        if (values.length > headers.length) {
            console.warn(`Skipping malformed CSV row. Found more columns than headers. Row: ${line}`);
            continue;
        }

        const obj: { [key: string]: any } = {};
        for (let j = 0; j < headers.length; j++) {
            // Trim and handle unquoted values that might have spaces
            let value = (values[j] || '').trim();

            // Try to parse numbers and booleans
            if (value !== '' && !isNaN(Number(value))) {
                obj[headers[j]] = Number(value);
            } else if (value.toLowerCase() === 'true') {
                obj[headers[j]] = true;
            } else if (value.toLowerCase() === 'false') {
                obj[headers[j]] = false;
            } else {
                // Remove surrounding quotes if they exist
                 obj[headers[j]] = value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1) : value;
            }
        }
        data.push(obj);
    }
    return data;
}

export type CsvExportableModule = 'customers' | 'products' | 'vendors' | 'quotes' | 'sales_orders' | 'purchase_orders';

// Legacy function - use exportCollectionToCSV for new implementations
export const exportModuleToCSV = async (module: CsvExportableModule) => {
    console.warn('exportModuleToCSV is deprecated. Use exportCollectionToCSV from dataManagement service instead.');
    const result = await newExportCollectionToCSV(module);
    
    if (!result.success) {
        alert(result.error || 'Export failed');
    } else {
        // File is automatically downloaded by the new function
        console.log(`Successfully exported ${result.recordCount} records to ${result.fileName}`);
    }
}

// Legacy function - use importCollectionFromCSV for new implementations
export const importModuleFromCSV = async (module: CsvExportableModule, csvText: string) => {
    console.warn('importModuleFromCSV is deprecated. Use importCollectionFromCSV from dataManagement service instead.');
    
    const result = await importCollectionFromCSV(module, csvText, {
        validateData: true,
        autoFix: true,
        skipInvalid: true
    });
    
    if (!result.success) {
        throw new Error(result.errors.join(', ') || 'Import failed');
    }
    
    if (result.skipped > 0) {
        alert(`Import complete. Processed ${result.processed} records.\nSkipped ${result.skipped} records.\nSee browser console for details on skipped records.`);
        console.warn("Skipped Records:", result.skippedItems);
    }
    
    return result.processed;
};

// Legacy function - use exportInventoryToCSV for new implementations
export const exportInventoryToCSV = async () => {
    console.warn('exportInventoryToCSV is deprecated. Use exportInventoryToCSV from dataManagement service instead.');
    const result = await newExportInventoryToCSV();
    
    if (!result.success) {
        alert(result.error || 'Export failed');
    } else {
        console.log(`Successfully exported ${result.recordCount} inventory records to ${result.fileName}`);
    }
};

export const importStockAdjustmentsFromCSV = async (csvText: string) => {
    const dataToImport = parseCSV(csvText);
    if (dataToImport.length === 0) {
        throw new Error("CSV file is empty or invalid.");
    }

    const productSnapshot = await getDocs(collection(db, 'products'));
    const productsMap = new Map(productSnapshot.docs.map(doc => [doc.id, doc.data().name]));

    const batch = writeBatch(db);
    const movementsCollectionRef = collection(db, 'stock_movements');
    let processedCount = 0;

    for (const item of dataToImport) {
        const { productId, type, quantity, notes } = item;

        if (!productId || !type || !quantity || !productsMap.has(productId)) {
            console.warn("Skipping row due to invalid data (check productId):", item);
            continue;
        }
        if (type !== 'in' && type !== 'out') continue;
        if (isNaN(Number(quantity)) || Number(quantity) <= 0) continue;

        const movementDocRef = doc(movementsCollectionRef);
        batch.set(movementDocRef, {
            productId,
            productName: productsMap.get(productId),
            type,
            quantity: Number(quantity),
            notes: notes || 'CSV Import',
            date: Timestamp.now()
        });
        processedCount++;
    }

    if (processedCount === 0) {
        throw new Error("No valid rows found to import. Please check your CSV data and format.");
    }

    await batch.commit();
    return processedCount;
};

export const fixCustomerDataIntegrity = async (): Promise<number> => {
    const customersRef = collection(db, 'customers');
    const customerSnapshot = await getDocs(customersRef);
    const batch = writeBatch(db);
    let updatedCount = 0;
    
    const getNewId = () => doc(collection(db, 'customers')).id; 

    for (const customerDoc of customerSnapshot.docs) {
        const customerData = customerDoc.data();
        let needsUpdate = false;
        
        // --- Process contacts ---
        const contacts = customerData.contacts || [];
        const processedContacts = contacts.map((c: any) => c.id ? c : (needsUpdate = true, { ...c, id: getNewId() }));
        if (contacts.length === 0) {
            needsUpdate = true;
            processedContacts.push({ id: getNewId(), name: 'Default Contact', email: '', phone: '', isPrimary: true });
        } else if (!processedContacts.some((c: any) => c.isPrimary)) {
            needsUpdate = true;
            processedContacts[0].isPrimary = true;
        }

        // --- Process shipping addresses ---
        const shippingAddresses = customerData.shippingAddresses || [];
        const processedShipping = shippingAddresses.map((a: any) => a.id ? a : (needsUpdate = true, { ...a, id: getNewId(), type: 'shipping' }));
        if (shippingAddresses.length === 0) {
            needsUpdate = true;
            processedShipping.push({ id: getNewId(), line1: 'Default Address', city: '', state: '', pincode: '', isDefault: true, type: 'shipping' });
        } else if (!processedShipping.some((a: any) => a.isDefault)) {
            needsUpdate = true;
            processedShipping[0].isDefault = true;
        }

        // --- Process billing address ---
        let billingAddress = customerData.billingAddress || {};
        if (!billingAddress.id || Object.keys(billingAddress).length === 0) {
            needsUpdate = true;
            billingAddress = {
                id: getNewId(),
                line1: billingAddress.line1 || 'Default Billing Address',
                city: billingAddress.city || '',
                state: billingAddress.state || '',
                pincode: billingAddress.pincode || '',
                isDefault: true,
                type: 'billing'
            };
        }

        if (needsUpdate) {
            updatedCount++;
            const customerDocRef = doc(db, 'customers', customerDoc.id);
            batch.update(customerDocRef, { 
                contacts: processedContacts, 
                shippingAddresses: processedShipping,
                billingAddress: billingAddress
            });
        }
    }

    if (updatedCount > 0) {
        await batch.commit();
    }
    
    return updatedCount;
};


export const seedDemoPayrollData = async (): Promise<{ employees: number; advances: number }> => {
    const employeesData: Omit<PayrollEmployee, 'id'>[] = [
        { employee_id: 'ABS-010', name: 'Vikram Singh', department: 'Rebar Couplers', category: EmployeeCategory.InOffice, monthly_ctc: 50000, annual_ctc: 600000, status: 'Active' },
        { employee_id: 'ABS-011', name: 'Priya Sharma', department: 'Aluminium Formwork', category: EmployeeCategory.Factory, monthly_ctc: 40000, annual_ctc: 480000, status: 'Active' },
        { employee_id: 'ABS-012', name: 'Anil Kumar', department: 'Other', category: EmployeeCategory.OnSite, monthly_ctc: 45000, annual_ctc: 540000, status: 'Active' },
        { employee_id: 'ABS-014', name: 'Sunita Devi', department: 'Rebar Couplers', category: EmployeeCategory.InOffice, monthly_ctc: 60000, annual_ctc: 720000, status: 'Active' },
    ];

    const batch = writeBatch(db);
    const employeesRef = collection(db, 'payroll_employees');
    
    const existingEmployeesSnapshot = await getDocs(query(employeesRef, where('employee_id', 'in', ['ABS-010', 'ABS-011', 'ABS-012', 'ABS-014'])));
    const existingIds = new Set(existingEmployeesSnapshot.docs.map(d => d.data().employee_id));

    let employeeCount = 0;
    
    for (const empData of employeesData) {
        if (!existingIds.has(empData.employee_id)) {
            const newEmpRef = doc(employeesRef);
            batch.set(newEmpRef, empData);
            employeeCount++;
        }
    }
    
    if (employeeCount > 0) {
        await batch.commit();
    }
    
    const advancesRef = collection(db, 'payroll_advances');
    const allEmployeesSnapshot = await getDocs(query(employeesRef, orderBy('name', 'asc')));
    const allEmployees = allEmployeesSnapshot.docs.map(d => ({id: d.id, ...d.data()} as PayrollEmployee));
    
    const vikram = allEmployees.find(e => e.employee_id === 'ABS-010');
    const priya = allEmployees.find(e => e.employee_id === 'ABS-011');
    
    const advancesData = [
        vikram ? { employee_id: vikram.id, amount: 10000, date_given: new Date().toISOString() } : null,
        priya ? { employee_id: priya.id, amount: 5000, date_given: new Date().toISOString() } : null,
    ].filter((adv): adv is { employee_id: string; amount: number; date_given: string } => adv !== null);

    const newAdvanceBatch = writeBatch(db);
    let advanceCount = 0;
    
    for (const advData of advancesData) {
        const existingAdvanceQuery = query(advancesRef, where('employee_id', '==', advData.employee_id), where('status', '==', 'Active'));
        const existingAdvanceSnapshot = await getDocs(existingAdvanceQuery);

        if (existingAdvanceSnapshot.empty) {
            const newAdvRef = doc(advancesRef);
            const fullAdvanceData = {
                ...advData,
                date_given: Timestamp.fromDate(new Date(advData.date_given)),
                balance_amount: advData.amount,
                status: 'Active',
            };
            newAdvanceBatch.set(newAdvRef, fullAdvanceData);
            advanceCount++;
        }
    }

    if (advanceCount > 0) {
        await newAdvanceBatch.commit();
    }

    return { employees: employeeCount, advances: advanceCount };
};

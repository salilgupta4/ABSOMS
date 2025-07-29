import { db, Timestamp } from './firebase';
import { 
    collection, getDocs, writeBatch, doc, getDoc
} from 'firebase/firestore';
import { validateData } from './dataValidation';

// ============================================================================
// DATA INTEGRITY CHECK ENGINE
// ============================================================================

export interface ReferentialIntegrityIssue {
    type: 'missing_reference' | 'orphaned_record' | 'circular_reference' | 'invalid_foreign_key';
    collection: string;
    documentId: string;
    field: string;
    referencedCollection?: string;
    referencedId?: string;
    description: string;
    canAutoFix: boolean;
    severity: 'critical' | 'warning' | 'info';
}

export interface DataConsistencyIssue {
    type: 'duplicate_data' | 'inconsistent_state' | 'missing_required_field' | 'invalid_data_type' | 'out_of_range_value';
    collection: string;
    documentId: string;
    field?: string;
    description: string;
    expectedValue?: any;
    actualValue?: any;
    canAutoFix: boolean;
    severity: 'critical' | 'warning' | 'info';
}

export interface IntegrityReport {
    timestamp: string;
    collections_checked: string[];
    total_documents: number;
    total_issues: number;
    referential_issues: ReferentialIntegrityIssue[];
    consistency_issues: DataConsistencyIssue[];
    auto_fixed_issues: number;
    manual_fixes_required: number;
    summary: {
        critical_issues: number;
        warning_issues: number;
        info_issues: number;
    };
}

// Define referential relationships between collections
const REFERENTIAL_RELATIONSHIPS = {
    quotes: {
        customerId: { collection: 'customers', required: true },
        linkedSalesOrderId: { collection: 'sales_orders', required: false }
    },
    sales_orders: {
        customerId: { collection: 'customers', required: true },
        linkedQuoteId: { collection: 'quotes', required: true }
    },
    delivery_orders: {
        customerId: { collection: 'customers', required: true },
        salesOrderId: { collection: 'sales_orders', required: true }
    },
    purchase_orders: {
        vendorId: { collection: 'vendors', required: true }
    },
    stock_movements: {
        productId: { collection: 'products', required: true }
    },
    payroll_records: {
        employee_id: { collection: 'payroll_employees', required: true },
        advance_payment_id: { collection: 'payroll_advances', required: false }
    },
    payroll_advances: {
        employee_id: { collection: 'payroll_employees', required: true }
    }
};

// ============================================================================
// REFERENTIAL INTEGRITY CHECKS
// ============================================================================

const checkReferentialIntegrity = async (): Promise<ReferentialIntegrityIssue[]> => {
    const issues: ReferentialIntegrityIssue[] = [];
    
    for (const [collectionName, relationships] of Object.entries(REFERENTIAL_RELATIONSHIPS)) {
        try {
            const querySnapshot = await getDocs(collection(db, collectionName));
            
            for (const document of querySnapshot.docs) {
                const data = document.data();
                
                for (const [fieldName, relationship] of Object.entries(relationships)) {
                    const referencedId = data[fieldName];
                    
                    if (!referencedId) {
                        if (relationship.required) {
                            issues.push({
                                type: 'missing_reference',
                                collection: collectionName,
                                documentId: document.id,
                                field: fieldName,
                                referencedCollection: relationship.collection,
                                description: `Required reference ${fieldName} is missing`,
                                canAutoFix: false,
                                severity: 'critical'
                            });
                        }
                        continue;
                    }
                    
                    // Check if referenced document exists
                    try {
                        const referencedDoc = await getDoc(doc(db, relationship.collection, referencedId));
                        if (!referencedDoc.exists()) {
                            issues.push({
                                type: 'missing_reference',
                                collection: collectionName,
                                documentId: document.id,
                                field: fieldName,
                                referencedCollection: relationship.collection,
                                referencedId,
                                description: `Referenced document ${referencedId} does not exist in ${relationship.collection}`,
                                canAutoFix: false,
                                severity: relationship.required ? 'critical' : 'warning'
                            });
                        }
                    } catch (error) {
                        issues.push({
                            type: 'invalid_foreign_key',
                            collection: collectionName,
                            documentId: document.id,
                            field: fieldName,
                            referencedCollection: relationship.collection,
                            referencedId,
                            description: `Cannot verify reference ${referencedId}: ${error}`,
                            canAutoFix: false,
                            severity: 'warning'
                        });
                    }
                }
            }
        } catch (error) {
            console.error(`Error checking referential integrity for ${collectionName}:`, error);
        }
    }
    
    return issues;
};

// ============================================================================
// DATA CONSISTENCY CHECKS
// ============================================================================

const checkDataConsistency = async (): Promise<DataConsistencyIssue[]> => {
    const issues: DataConsistencyIssue[] = [];
    
    // Check for duplicate customers by name and GSTIN
    await checkDuplicateCustomers(issues);
    
    // Check for duplicate products by name
    await checkDuplicateProducts(issues);
    
    // Check for duplicate employees by employee_id
    await checkDuplicateEmployees(issues);
    
    // Check payroll calculations
    await checkPayrollCalculations(issues);
    
    // Check inventory consistency
    await checkInventoryConsistency(issues);
    
    // Check document numbering consistency
    await checkDocumentNumbering(issues);
    
    // Check advance payment balances
    await checkAdvancePaymentBalances(issues);
    
    return issues;
};

const checkDuplicateCustomers = async (issues: DataConsistencyIssue[]) => {
    try {
        const querySnapshot = await getDocs(collection(db, 'customers'));
        const customers = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        
        // Check duplicates by name
        const nameMap = new Map<string, string[]>();
        customers.forEach(customer => {
            const name = customer.name?.toLowerCase().trim();
            if (name) {
                if (!nameMap.has(name)) {
                    nameMap.set(name, []);
                }
                nameMap.get(name)!.push(customer.id);
            }
        });
        
        nameMap.forEach((ids, name) => {
            if (ids.length > 1) {
                ids.forEach(id => {
                    issues.push({
                        type: 'duplicate_data',
                        collection: 'customers',
                        documentId: id,
                        field: 'name',
                        description: `Duplicate customer name: "${name}" found in ${ids.length} records`,
                        actualValue: name,
                        canAutoFix: false,
                        severity: 'warning'
                    });
                });
            }
        });
        
        // Check duplicates by GSTIN
        const gstinMap = new Map<string, string[]>();
        customers.forEach(customer => {
            const gstin = customer.gstin?.trim();
            if (gstin) {
                if (!gstinMap.has(gstin)) {
                    gstinMap.set(gstin, []);
                }
                gstinMap.get(gstin)!.push(customer.id);
            }
        });
        
        gstinMap.forEach((ids, gstin) => {
            if (ids.length > 1) {
                ids.forEach(id => {
                    issues.push({
                        type: 'duplicate_data',
                        collection: 'customers',
                        documentId: id,
                        field: 'gstin',
                        description: `Duplicate GSTIN: "${gstin}" found in ${ids.length} customer records`,
                        actualValue: gstin,
                        canAutoFix: false,
                        severity: 'critical'
                    });
                });
            }
        });
        
    } catch (error) {
        console.error('Error checking duplicate customers:', error);
    }
};

const checkDuplicateProducts = async (issues: DataConsistencyIssue[]) => {
    try {
        const querySnapshot = await getDocs(collection(db, 'products'));
        const products = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        
        const nameMap = new Map<string, string[]>();
        products.forEach(product => {
            const name = product.name?.toLowerCase().trim();
            if (name) {
                if (!nameMap.has(name)) {
                    nameMap.set(name, []);
                }
                nameMap.get(name)!.push(product.id);
            }
        });
        
        nameMap.forEach((ids, name) => {
            if (ids.length > 1) {
                ids.forEach(id => {
                    issues.push({
                        type: 'duplicate_data',
                        collection: 'products',
                        documentId: id,
                        field: 'name',
                        description: `Duplicate product name: "${name}" found in ${ids.length} records`,
                        actualValue: name,
                        canAutoFix: false,
                        severity: 'warning'
                    });
                });
            }
        });
        
    } catch (error) {
        console.error('Error checking duplicate products:', error);
    }
};

const checkDuplicateEmployees = async (issues: DataConsistencyIssue[]) => {
    try {
        const querySnapshot = await getDocs(collection(db, 'payroll_employees'));
        const employees = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
        
        const employeeIdMap = new Map<string, string[]>();
        employees.forEach(employee => {
            const employeeId = employee.employee_id?.trim();
            if (employeeId) {
                if (!employeeIdMap.has(employeeId)) {
                    employeeIdMap.set(employeeId, []);
                }
                employeeIdMap.get(employeeId)!.push(employee.id);
            }
        });
        
        employeeIdMap.forEach((ids, employeeId) => {
            if (ids.length > 1) {
                ids.forEach(id => {
                    issues.push({
                        type: 'duplicate_data',
                        collection: 'payroll_employees',
                        documentId: id,
                        field: 'employee_id',
                        description: `Duplicate employee ID: "${employeeId}" found in ${ids.length} records`,
                        actualValue: employeeId,
                        canAutoFix: false,
                        severity: 'critical'
                    });
                });
            }
        });
        
    } catch (error) {
        console.error('Error checking duplicate employees:', error);
    }
};

const checkPayrollCalculations = async (issues: DataConsistencyIssue[]) => {
    try {
        const querySnapshot = await getDocs(collection(db, 'payroll_records'));
        
        for (const document of querySnapshot.docs) {
            const data = document.data();
            
            // Check gross pay calculation
            const calculatedGrossPay = (data.basic_pay || 0) + (data.hra || 0) + 
                                     (data.special_allowance || 0) + (data.overtime || 0);
            
            if (Math.abs(calculatedGrossPay - (data.gross_pay || 0)) > 0.01) {
                issues.push({
                    type: 'inconsistent_state',
                    collection: 'payroll_records',
                    documentId: document.id,
                    field: 'gross_pay',
                    description: 'Gross pay calculation mismatch',
                    expectedValue: calculatedGrossPay,
                    actualValue: data.gross_pay,
                    canAutoFix: true,
                    severity: 'warning'
                });
            }
            
            // Check total deductions calculation
            const calculatedDeductions = (data.pf || 0) + (data.esi || 0) + 
                                       (data.pt || 0) + (data.tds || 0) + (data.advance_deduction || 0);
            
            if (Math.abs(calculatedDeductions - (data.total_deductions || 0)) > 0.01) {
                issues.push({
                    type: 'inconsistent_state',
                    collection: 'payroll_records',
                    documentId: document.id,
                    field: 'total_deductions',
                    description: 'Total deductions calculation mismatch',
                    expectedValue: calculatedDeductions,
                    actualValue: data.total_deductions,
                    canAutoFix: true,
                    severity: 'warning'
                });
            }
            
            // Check net pay calculation
            const calculatedNetPay = calculatedGrossPay - calculatedDeductions;
            
            if (Math.abs(calculatedNetPay - (data.net_pay || 0)) > 0.01) {
                issues.push({
                    type: 'inconsistent_state',
                    collection: 'payroll_records',
                    documentId: document.id,
                    field: 'net_pay',
                    description: 'Net pay calculation mismatch',
                    expectedValue: calculatedNetPay,
                    actualValue: data.net_pay,
                    canAutoFix: true,
                    severity: 'warning'
                });
            }
        }
        
    } catch (error) {
        console.error('Error checking payroll calculations:', error);
    }
};

const checkInventoryConsistency = async (issues: DataConsistencyIssue[]) => {
    try {
        // Check for stock movements without corresponding products
        const movementsSnapshot = await getDocs(collection(db, 'stock_movements'));
        const productsSnapshot = await getDocs(collection(db, 'products'));
        
        const productIds = new Set(productsSnapshot.docs.map(doc => doc.id));
        
        for (const movement of movementsSnapshot.docs) {
            const data = movement.data();
            if (data.productId && !productIds.has(data.productId)) {
                issues.push({
                    type: 'invalid_data_type',
                    collection: 'stock_movements',
                    documentId: movement.id,
                    field: 'productId',
                    description: `Stock movement references non-existent product: ${data.productId}`,
                    actualValue: data.productId,
                    canAutoFix: false,
                    severity: 'critical'
                });
            }
        }
        
    } catch (error) {
        console.error('Error checking inventory consistency:', error);
    }
};

const checkDocumentNumbering = async (issues: DataConsistencyIssue[]) => {
    try {
        const collections = ['quotes', 'sales_orders', 'delivery_orders', 'purchase_orders'];
        
        for (const collectionName of collections) {
            const querySnapshot = await getDocs(collection(db, collectionName));
            const documents = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Check for duplicate document numbers
            const numberField = getDocumentNumberField(collectionName);
            if (!numberField) continue;
            
            const numberMap = new Map<string, string[]>();
            documents.forEach(doc => {
                const number = doc[numberField];
                if (number) {
                    if (!numberMap.has(number)) {
                        numberMap.set(number, []);
                    }
                    numberMap.get(number)!.push(doc.id);
                }
            });
            
            numberMap.forEach((ids, number) => {
                if (ids.length > 1) {
                    ids.forEach(id => {
                        issues.push({
                            type: 'duplicate_data',
                            collection: collectionName,
                            documentId: id,
                            field: numberField,
                            description: `Duplicate ${collectionName} number: "${number}" found in ${ids.length} records`,
                            actualValue: number,
                            canAutoFix: false,
                            severity: 'critical'
                        });
                    });
                }
            });
        }
        
    } catch (error) {
        console.error('Error checking document numbering:', error);
    }
};

const getDocumentNumberField = (collectionName: string): string | null => {
    switch (collectionName) {
        case 'quotes': return 'quoteNumber';
        case 'sales_orders': return 'orderNumber';
        case 'delivery_orders': return 'deliveryNumber';
        case 'purchase_orders': return 'poNumber';
        default: return null;
    }
};

const checkAdvancePaymentBalances = async (issues: DataConsistencyIssue[]) => {
    try {
        const advancesSnapshot = await getDocs(collection(db, 'payroll_advances'));
        
        for (const advance of advancesSnapshot.docs) {
            const data = advance.data();
            
            // Check if balance_amount is valid
            if ((data.balance_amount || 0) < 0) {
                issues.push({
                    type: 'out_of_range_value',
                    collection: 'payroll_advances',
                    documentId: advance.id,
                    field: 'balance_amount',
                    description: 'Advance payment balance cannot be negative',
                    actualValue: data.balance_amount,
                    canAutoFix: true,
                    severity: 'warning'
                });
            }
            
            if ((data.balance_amount || 0) > (data.amount || 0)) {
                issues.push({
                    type: 'inconsistent_state',
                    collection: 'payroll_advances',
                    documentId: advance.id,
                    field: 'balance_amount',
                    description: 'Balance amount cannot exceed original advance amount',
                    expectedValue: `<= ${data.amount}`,
                    actualValue: data.balance_amount,
                    canAutoFix: false,
                    severity: 'warning'
                });
            }
        }
        
    } catch (error) {
        console.error('Error checking advance payment balances:', error);
    }
};

// ============================================================================
// AUTO-FIX FUNCTIONS
// ============================================================================

const autoFixIssues = async (issues: (ReferentialIntegrityIssue | DataConsistencyIssue)[]): Promise<number> => {
    let fixedCount = 0;
    const batch = writeBatch(db);
    let batchCount = 0;
    const batchLimit = 500;
    
    for (const issue of issues) {
        if (!issue.canAutoFix) continue;
        
        try {
            const docRef = doc(db, issue.collection, issue.documentId);
            
            if (issue.type === 'inconsistent_state' && 'expectedValue' in issue) {
                const dataIssue = issue as DataConsistencyIssue;
                if (dataIssue.field) {
                    batch.update(docRef, {
                        [dataIssue.field]: dataIssue.expectedValue,
                        _auto_fixed: true,
                        _fixed_at: Timestamp.now()
                    });
                    batchCount++;
                    fixedCount++;
                }
            } else if (issue.type === 'out_of_range_value') {
                const dataIssue = issue as DataConsistencyIssue;
                if (dataIssue.field === 'balance_amount' && dataIssue.actualValue < 0) {
                    batch.update(docRef, {
                        balance_amount: 0,
                        _auto_fixed: true,
                        _fixed_at: Timestamp.now()
                    });
                    batchCount++;
                    fixedCount++;
                }
            }
            
            // Commit batch if it reaches the limit
            if (batchCount >= batchLimit) {
                await batch.commit();
                const newBatch = writeBatch(db);
                Object.assign(batch, newBatch);
                batchCount = 0;
            }
            
        } catch (error) {
            console.error(`Failed to auto-fix issue for ${issue.collection}/${issue.documentId}:`, error);
        }
    }
    
    // Commit any remaining fixes
    if (batchCount > 0) {
        await batch.commit();
    }
    
    return fixedCount;
};

// ============================================================================
// MAIN INTEGRITY CHECK FUNCTION
// ============================================================================

export const runFullIntegrityCheck = async (options: {
    autoFix?: boolean;
    includeReferential?: boolean;
    includeConsistency?: boolean;
} = {}): Promise<IntegrityReport> => {
    const { autoFix = false, includeReferential = true, includeConsistency = true } = options;
    
    const report: IntegrityReport = {
        timestamp: new Date().toISOString(),
        collections_checked: [],
        total_documents: 0,
        total_issues: 0,
        referential_issues: [],
        consistency_issues: [],
        auto_fixed_issues: 0,
        manual_fixes_required: 0,
        summary: {
            critical_issues: 0,
            warning_issues: 0,
            info_issues: 0
        }
    };
    
    try {
        // Get total document count
        const allCollections = ['customers', 'products', 'vendors', 'quotes', 'sales_orders', 
                               'delivery_orders', 'purchase_orders', 'stock_movements', 
                               'payroll_employees', 'payroll_advances', 'payroll_records'];
        
        for (const collectionName of allCollections) {
            try {
                const snapshot = await getDocs(collection(db, collectionName));
                report.total_documents += snapshot.size;
                report.collections_checked.push(collectionName);
            } catch (error) {
                console.warn(`Could not check collection ${collectionName}:`, error);
            }
        }
        
        // Run referential integrity checks
        if (includeReferential) {
            console.log('Running referential integrity checks...');
            report.referential_issues = await checkReferentialIntegrity();
        }
        
        // Run data consistency checks
        if (includeConsistency) {
            console.log('Running data consistency checks...');
            report.consistency_issues = await checkDataConsistency();
        }
        
        // Calculate totals
        const allIssues = [...report.referential_issues, ...report.consistency_issues];
        report.total_issues = allIssues.length;
        
        // Count by severity
        allIssues.forEach(issue => {
            switch (issue.severity) {
                case 'critical':
                    report.summary.critical_issues++;
                    break;
                case 'warning':
                    report.summary.warning_issues++;
                    break;
                case 'info':
                    report.summary.info_issues++;
                    break;
            }
        });
        
        // Auto-fix issues if requested
        if (autoFix && allIssues.length > 0) {
            console.log('Auto-fixing issues...');
            report.auto_fixed_issues = await autoFixIssues(allIssues);
            report.manual_fixes_required = allIssues.filter(issue => !issue.canAutoFix).length;
        } else {
            report.manual_fixes_required = allIssues.filter(issue => !issue.canAutoFix).length;
        }
        
        console.log('Integrity check completed:', {
            totalIssues: report.total_issues,
            autoFixed: report.auto_fixed_issues,
            manualRequired: report.manual_fixes_required
        });
        
    } catch (error) {
        console.error('Error during integrity check:', error);
    }
    
    return report;
};

// Export helper function to check specific collection
export const checkCollectionIntegrity = async (collectionName: string): Promise<{
    referential: ReferentialIntegrityIssue[];
    consistency: DataConsistencyIssue[];
}> => {
    const referential: ReferentialIntegrityIssue[] = [];
    const consistency: DataConsistencyIssue[] = [];
    
    // Check referential integrity for this collection
    const relationships = REFERENTIAL_RELATIONSHIPS[collectionName as keyof typeof REFERENTIAL_RELATIONSHIPS];
    if (relationships) {
        try {
            const querySnapshot = await getDocs(collection(db, collectionName));
            
            for (const document of querySnapshot.docs) {
                const data = document.data();
                
                for (const [fieldName, relationship] of Object.entries(relationships)) {
                    const referencedId = data[fieldName];
                    
                    if (!referencedId && relationship.required) {
                        referential.push({
                            type: 'missing_reference',
                            collection: collectionName,
                            documentId: document.id,
                            field: fieldName,
                            referencedCollection: relationship.collection,
                            description: `Required reference ${fieldName} is missing`,
                            canAutoFix: false,
                            severity: 'critical'
                        });
                    }
                }
            }
        } catch (error) {
            console.error(`Error checking referential integrity for ${collectionName}:`, error);
        }
    }
    
    // Run data validation for each document
    try {
        const querySnapshot = await getDocs(collection(db, collectionName));
        
        for (const document of querySnapshot.docs) {
            const data = document.data();
            const validation = validateData(collectionName, data as any);
            
            if (!validation.isValid) {
                validation.errors.forEach(error => {
                    consistency.push({
                        type: 'missing_required_field',
                        collection: collectionName,
                        documentId: document.id,
                        description: error,
                        canAutoFix: validation.fixedData !== undefined,
                        severity: 'warning'
                    });
                });
            }
        }
    } catch (error) {
        console.error(`Error checking data consistency for ${collectionName}:`, error);
    }
    
    return { referential, consistency };
};
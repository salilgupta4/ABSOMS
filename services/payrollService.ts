import { db, Timestamp, DocumentSnapshot } from '@/services/firebase';
import {
    PayrollEmployee, LeaveRequest, AdvancePayment, PayrollRecord, PayrollSettings, AdvanceTransaction
} from '@/types';
import { collection, query, orderBy, where, getDocs, doc, setDoc, updateDoc, addDoc, deleteDoc, writeBatch, getDoc } from 'firebase/firestore';

// --- Helper to process Firestore Timestamps ---
const processDoc = (docSnap: DocumentSnapshot): any => {
    const data = docSnap.data() as any;
    if (!data) return { id: docSnap.id };
    
    // Convert all timestamp fields
    Object.keys(data).forEach(key => {
        if (data[key] instanceof Timestamp) {
            data[key] = data[key].toDate().toISOString();
        }
    });

    return { id: docSnap.id, ...data };
};


// --- Employee Service ---
const employeesCollection = collection(db, 'payroll_employees');

export const getPayrollEmployees = async (): Promise<PayrollEmployee[]> => {
    try {
        console.log('Fetching payroll employees...');
        const q = query(employeesCollection, orderBy('name', 'asc'));
        const snapshot = await getDocs(q);
        const employees = snapshot.docs.map(doc => processDoc(doc) as PayrollEmployee);
        console.log(`Fetched ${employees.length} payroll employees`);
        return employees;
    } catch (error) {
        console.error('Error fetching payroll employees:', error);
        return [];
    }
};

export const savePayrollEmployee = async (employeeData: Omit<PayrollEmployee, 'id'> & {id?: string}): Promise<PayrollEmployee> => {
    const { id, ...dataToSave } = employeeData;
    if (id) {
        const docRef = doc(db, 'payroll_employees', id);
        await updateDoc(docRef, dataToSave);
        return { id, ...dataToSave } as PayrollEmployee;
    } else {
        const docRef = await addDoc(employeesCollection, dataToSave);
        return { id: docRef.id, ...dataToSave } as PayrollEmployee;
    }
};

export const deletePayrollEmployee = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'payroll_employees', id));
};


// --- Payroll Record Service ---
const payrollRecordsCollection = collection(db, 'payroll_records');

// Cache for payroll records to avoid repeated queries
const payrollRecordsCache = new Map<string, { data: PayrollRecord[], timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const getPayrollRecords = async (month: string): Promise<PayrollRecord[]> => {
    try {
        console.log(`Fetching payroll records for month: ${month}`);
        
        // Check cache first
        const cached = payrollRecordsCache.get(month);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
            console.log(`Using cached payroll records for ${month}: ${cached.data.length} records`);
            return cached.data;
        }

        console.log(`Cache miss, querying Firestore for ${month}...`);
        
        // For now, use simple query to avoid index issues
        console.log('Using simple query (no composite index required)');
        const q = query(payrollRecordsCollection, where('payroll_month', '==', month));
        const snapshot = await getDocs(q);
        const records = snapshot.docs.map(doc => processDoc(doc) as PayrollRecord);
        
        // Sort client-side
        records.sort((a, b) => (a.employee_name || '').localeCompare(b.employee_name || ''));
        
        console.log(`Query completed. Found ${records.length} records.`);
        if (records.length === 0) {
            console.log(`No payroll records found for month ${month}. This might be expected if no payroll has been run yet.`);
        }
        
        console.log(`Fetched ${records.length} payroll records for ${month}`);
        
        // Update cache
        payrollRecordsCache.set(month, { data: records, timestamp: Date.now() });
        
        return records;
    } catch (error) {
        console.error(`Error fetching payroll records for ${month}:`, error);
        // Return empty array on error to prevent UI blocking
        return [];
    }
};

export const getYearlyPayrollRecords = async (year: string): Promise<PayrollRecord[]> => {
    // Check cache first
    const cached = payrollRecordsCache.get(`year-${year}`);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
    }

    const startDate = `${year}-01`;
    const endDate = `${parseInt(year) + 1}-01`;
    const q = query(
        payrollRecordsCollection, 
        where('payroll_month', '>=', startDate), 
        where('payroll_month', '<', endDate),
        orderBy('payroll_month', 'desc'),
        orderBy('employee_name', 'asc')
    );
    const snapshot = await getDocs(q);
    const records = snapshot.docs.map(doc => processDoc(doc) as PayrollRecord);
    
    // Update cache
    payrollRecordsCache.set(`year-${year}`, { data: records, timestamp: Date.now() });
    
    return records;
};


export const savePayrollRecords = async (recordsToSave: Omit<PayrollRecord, 'id'>[]): Promise<void> => {
    const batch = writeBatch(db);
    
    const employeeIds = recordsToSave.map(r => r.employee_id);
    if (employeeIds.length === 0) return;
    
    const advancesQuery = query(collection(db, 'payroll_advances'), where('employee_id', 'in', employeeIds), where('status', '==', 'Active'));
    const advancesSnapshot = await getDocs(advancesQuery);
    const activeAdvances = new Map<string, AdvancePayment>(advancesSnapshot.docs.map(doc => {
        const data = doc.data() as Omit<AdvancePayment, 'id'>;
        return [data.employee_id, { id: doc.id, ...data }];
    }));

    for (const record of recordsToSave) {
        const docRef = doc(payrollRecordsCollection);
        
        // Handle advance deduction logic BEFORE saving the record
        if (record.advance_deduction > 0) {
            const advance = activeAdvances.get(record.employee_id);
            if (advance) {
                // Set the advance_payment_id in the record BEFORE saving
                (record as PayrollRecord).advance_payment_id = advance.id;
                
                const advanceRef = doc(db, 'payroll_advances', advance.id);
                const newBalance = (advance.balance_amount || 0) - record.advance_deduction;
                
                const newTransaction: AdvanceTransaction = {
                    date: new Date().toISOString(),
                    type: 'deducted',
                    amount: record.advance_deduction,
                    notes: `Deducted in payroll for ${record.payroll_month}`,
                    related_doc_id: docRef.id,
                };

                const updatedTransactions = [...(advance.transactions || []), newTransaction];

                batch.update(advanceRef, {
                    balance_amount: newBalance,
                    status: newBalance <= 0 ? 'Fully Deducted' : 'Active',
                    transactions: updatedTransactions
                });
            }
        }
        
        // Now save the record with the advance_payment_id included
        batch.set(docRef, record);
    }
    
    await batch.commit();
};

export const revertSinglePayrollRecord = async (recordId: string): Promise<void> => {
    const payrollDocRef = doc(db, 'payroll_records', recordId);
    const payrollDoc = await getDoc(payrollDocRef);
    if (!payrollDoc.exists()) throw new Error("Payroll record not found.");

    const record = processDoc(payrollDoc) as PayrollRecord;
    const batch = writeBatch(db);

    if (record.advance_deduction > 0) {
        let advanceToRevert: AdvancePayment | null = null;
        let advanceRef: any = null;

        // Try to find advance by advance_payment_id first
        if (record.advance_payment_id) {
            advanceRef = doc(db, 'payroll_advances', record.advance_payment_id);
            const advanceSnap = await getDoc(advanceRef);
            if (advanceSnap.exists()) {
                advanceToRevert = advanceSnap.data() as AdvancePayment;
            }
        }

        // Fallback: find advance by employee_id if advance_payment_id failed
        if (!advanceToRevert && record.employee_id) {
            const advanceQuery = query(
                collection(db, 'payroll_advances'), 
                where('employee_id', '==', record.employee_id),
                where('status', 'in', ['Active', 'Fully Deducted'])
            );
            const advanceSnapshot = await getDocs(advanceQuery);
            
            if (!advanceSnapshot.empty) {
                const advanceDoc = advanceSnapshot.docs[0]; // Get the first matching advance
                advanceToRevert = advanceDoc.data() as AdvancePayment;
                advanceRef = advanceDoc.ref;
            }
        }

        // If we found an advance to revert
        if (advanceToRevert && advanceRef) {
            const revertedBalance = (advanceToRevert.balance_amount || 0) + record.advance_deduction;
            
            const newTransaction: AdvanceTransaction = {
                date: new Date().toISOString(),
                type: 'reverted',
                amount: record.advance_deduction,
                notes: `Reverted from payroll for ${record.payroll_month}`,
                related_doc_id: recordId,
            };

            const updatedTransactions = [...(advanceToRevert.transactions || []), newTransaction];

            batch.update(advanceRef, {
                balance_amount: revertedBalance,
                status: 'Active',
                transactions: updatedTransactions
            });
        }
    }
    
    batch.delete(payrollDocRef);
    await batch.commit();
};

export const deletePayrollRun = async (month: string): Promise<void> => {
    const recordsQuery = query(payrollRecordsCollection, where('payroll_month', '==', month));
    const recordsSnapshot = await getDocs(recordsQuery);

    if (recordsSnapshot.empty) {
        console.log("No records to delete for this month.");
        return;
    }

    const batch = writeBatch(db);
    const recordsToDelete = recordsSnapshot.docs.map(doc => {
        const data = doc.data() as Omit<PayrollRecord, 'id'>;
        return { id: doc.id, ...data } as PayrollRecord;
    });


    for (const record of recordsToDelete) {
        // Revert advance if applicable
        if (record.advance_deduction > 0) {
            let advanceToRevert: AdvancePayment | null = null;
            let advanceRef: any = null;

            // Try to find advance by advance_payment_id first
            if (record.advance_payment_id) {
                advanceRef = doc(db, 'payroll_advances', record.advance_payment_id);
                const advanceSnap = await getDoc(advanceRef);
                if (advanceSnap.exists()) {
                    advanceToRevert = advanceSnap.data() as AdvancePayment;
                }
            }

            // Fallback: find advance by employee_id if advance_payment_id failed
            if (!advanceToRevert && record.employee_id) {
                const advanceQuery = query(
                    collection(db, 'payroll_advances'), 
                    where('employee_id', '==', record.employee_id),
                    where('status', 'in', ['Active', 'Fully Deducted'])
                );
                const advanceSnapshot = await getDocs(advanceQuery);
                
                if (!advanceSnapshot.empty) {
                    const advanceDoc = advanceSnapshot.docs[0]; // Get the first matching advance
                    advanceToRevert = advanceDoc.data() as AdvancePayment;
                    advanceRef = advanceDoc.ref;
                }
            }

            // If we found an advance to revert
            if (advanceToRevert && advanceRef) {
                const revertedBalance = (advanceToRevert.balance_amount || 0) + record.advance_deduction;

                const newTransaction: AdvanceTransaction = {
                    date: new Date().toISOString(),
                    type: 'reverted',
                    amount: record.advance_deduction,
                    notes: `Reverted from deleted payroll for ${record.payroll_month}`,
                    related_doc_id: record.id,
                };

                const updatedTransactions = [...(advanceToRevert.transactions || []), newTransaction];

                batch.update(advanceRef, {
                    balance_amount: revertedBalance,
                    status: 'Active',
                    transactions: updatedTransactions
                });
                
                console.log(`Reverted advance deduction of ₹${record.advance_deduction} for ${record.employee_name}`);
            } else {
                console.warn(`Could not find advance to revert for employee ${record.employee_name} (deduction: ₹${record.advance_deduction})`);
            }
        }
        
        // Delete the payroll record itself
        const recordRef = doc(db, 'payroll_records', record.id);
        batch.delete(recordRef);
    }

    await batch.commit();
};


// --- Leave Management Service ---
const leaveRequestsCollection = collection(db, 'payroll_leaves');

export const getLeaveRequests = async (): Promise<LeaveRequest[]> => {
    const q = query(leaveRequestsCollection, orderBy('start_date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => processDoc(doc) as LeaveRequest);
};

export const saveLeaveRequest = async (leaveData: Omit<LeaveRequest, 'id'> & {id?: string}): Promise<LeaveRequest> => {
    const { id, ...dataToSave } = leaveData;
    if (id) {
        const docRef = doc(db, 'payroll_leaves', id);
        await updateDoc(docRef, dataToSave);
        return { id, ...dataToSave } as LeaveRequest;
    } else {
        // Set default status to 'pending' for new leave requests
        const newLeaveData = { 
            ...dataToSave, 
            status: dataToSave.status || 'pending',
            created_at: Timestamp.now().toDate().toISOString() 
        };
        const docRef = await addDoc(leaveRequestsCollection, newLeaveData);
        return { id: docRef.id, ...newLeaveData } as LeaveRequest;
    }
};

export const updateLeaveRequestStatus = async (id: string, status: 'approved' | 'rejected', approverId: string, rejectionReason?: string) => {
    const docRef = doc(db, 'payroll_leaves', id);
    await updateDoc(docRef, {
        status,
        approved_by: approverId,
        approved_at: Timestamp.now(),
        rejection_reason: rejectionReason || null,
    });
};

export const deleteLeaveRequest = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'payroll_leaves', id));
};


// --- Advance Payments Service ---
const advancesCollection = collection(db, 'payroll_advances');

// Cache for advance payments
const advancePaymentsCache: { data: AdvancePayment[] | null, timestamp: number } = { data: null, timestamp: 0 };

export const getAdvancePayments = async (employeeIds?: string[]): Promise<AdvancePayment[]> => {
    // Check cache first for full data requests
    if (!employeeIds && advancePaymentsCache.data && Date.now() - advancePaymentsCache.timestamp < CACHE_DURATION) {
        return advancePaymentsCache.data;
    }

    let q;
    if (employeeIds && employeeIds.length > 0) {
        // Fetch only specific employee advances for better performance
        q = query(advancesCollection, where('employee_id', 'in', employeeIds), orderBy('date_given', 'desc'));
    } else {
        // Fetch all advances
        q = query(advancesCollection, orderBy('date_given', 'desc'));
    }
    
    const snapshot = await getDocs(q);
    const advances = snapshot.docs.map(doc => processDoc(doc) as AdvancePayment);
    
    // Update cache only for full data requests
    if (!employeeIds) {
        advancePaymentsCache.data = advances;
        advancePaymentsCache.timestamp = Date.now();
    }
    
    return advances;
};

export const saveAdvancePayment = async (advanceData: Omit<AdvancePayment, 'id' | 'balance_amount' | 'status'> & {id?: string}): Promise<AdvancePayment> => {
    const { id, ...dataToSave } = advanceData;

    // Check for an existing active advance for this employee
    const q = query(advancesCollection, where('employee_id', '==', dataToSave.employee_id), where('status', '==', 'Active'));
    const existingSnapshot = await getDocs(q);

    if (!existingSnapshot.empty) {
        // Top up existing advance
        const existingDoc = existingSnapshot.docs[0];
        const existingData = existingDoc.data() as AdvancePayment;
        
        const newTransaction: AdvanceTransaction = {
            date: new Date().toISOString(),
            type: 'topped-up',
            amount: dataToSave.amount,
            notes: dataToSave.notes || 'Additional advance given',
        };

        const updatedTransactions = [...(existingData.transactions || []), newTransaction];
        const newTotalAmount = (existingData.amount || 0) + dataToSave.amount;
        const newBalanceAmount = (existingData.balance_amount || 0) + dataToSave.amount;

        await updateDoc(existingDoc.ref, {
            amount: newTotalAmount,
            balance_amount: newBalanceAmount,
            notes: dataToSave.notes, // Overwrite notes with the latest one
            transactions: updatedTransactions,
        });
        return { id: existingDoc.id, ...existingDoc.data(), amount: newTotalAmount, balance_amount: newBalanceAmount, transactions: updatedTransactions } as AdvancePayment;

    } else {
        // Create new advance
         const newTransaction: AdvanceTransaction = {
            date: new Date().toISOString(),
            type: 'issued',
            amount: dataToSave.amount,
            notes: dataToSave.notes || 'Initial advance',
        };
        const finalData = { 
            ...dataToSave, 
            balance_amount: dataToSave.amount, 
            status: 'Active',
            transactions: [newTransaction]
        };

        const docRef = await addDoc(advancesCollection, { ...finalData, date_given: Timestamp.now() });
        return { id: docRef.id, ...finalData } as AdvancePayment;
    }
};

export const deleteAdvancePayment = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, 'payroll_advances', id));
};


// --- Settings Service ---
const SETTINGS_KEY = 'payrollSettings';
const settingsDocRef = doc(db, "settings", SETTINGS_KEY);

const defaultSettings: PayrollSettings = {
    pf_enabled: true,
    esi_enabled: true,
    pt_enabled: true,
    tds_enabled: false,
    pf_percentage: 12,
    esi_percentage: 1.75,
    pt_amount: 200,
    tds_percentage: 0,
    tds_annual_limit: 250000, // TDS applicable only for annual salary above ₹2.5L
    hra_percentage: 20,
    special_allowance_percentage: 30,
    basic_pay_percentage: 50,
};

export const getPayrollSettings = async (): Promise<PayrollSettings> => {
    try {
        console.log('Fetching payroll settings from Firestore...');
        const docSnap = await getDoc(settingsDocRef);
        
        if (docSnap.exists()) {
            const data = docSnap.data();
            console.log('Payroll settings found:', data);
            return { ...defaultSettings, ...data } as PayrollSettings;
        } else {
            console.log('No payroll settings found, creating defaults...');
            // "Self-healing": If settings don't exist in DB, create them with defaults.
            await savePayrollSettings(defaultSettings);
            console.log('Default settings created successfully');
            return defaultSettings;
        }
    } catch (error) {
        console.error('Error fetching payroll settings:', error);
        // If there's any error, return default settings to prevent blocking the UI
        console.log('Returning default settings due to error');
        return defaultSettings;
    }
};

export const savePayrollSettings = async (settings: PayrollSettings): Promise<void> => {
    await setDoc(settingsDocRef, settings, { merge: true });
};

// Cache management functions
export const clearPayrollCache = (key?: string) => {
    if (key) {
        payrollRecordsCache.delete(key);
    } else {
        payrollRecordsCache.clear();
        advancePaymentsCache.data = null;
        advancePaymentsCache.timestamp = 0;
    }
};

export const invalidatePayrollCache = () => {
    clearPayrollCache();
};

// Debug function to check if any payroll records exist
export const getAllPayrollRecords = async (): Promise<PayrollRecord[]> => {
    try {
        console.log('Fetching ALL payroll records for debugging...');
        const q = query(payrollRecordsCollection, orderBy('payroll_month', 'desc'));
        const snapshot = await getDocs(q);
        const records = snapshot.docs.map(doc => processDoc(doc) as PayrollRecord);
        console.log(`Total payroll records in database: ${records.length}`);
        if (records.length > 0) {
            const months = [...new Set(records.map(r => r.payroll_month))];
            console.log('Available months:', months);
        }
        return records;
    } catch (error) {
        console.error('Error fetching all payroll records:', error);
        return [];
    }
};
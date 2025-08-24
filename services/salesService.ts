
// services/salesService.ts
import { db, Timestamp, DocumentSnapshot } from '@/services/firebase';
import { collection, query, orderBy, getDocs, doc, getDoc, updateDoc, writeBatch, addDoc, deleteDoc, where } from 'firebase/firestore';
import { Quote, DocumentStatus, SalesOrder, DeliveryOrder, DocumentLineItem, Address } from '@/types';
import { getDocumentNumberingSettings } from '@/components/settings/DocumentNumbering';
import { getCompanyDetails } from '@/components/settings/CompanyDetails';
import { getEmailService } from '@/services/emailService';

const processDoc = (docSnap: DocumentSnapshot): Quote => {
    const data = docSnap.data() as any;
    if (data.issueDate && data.issueDate instanceof Timestamp) {
        data.issueDate = data.issueDate.toDate().toISOString();
    }
    if (data.expiryDate && data.expiryDate instanceof Timestamp) {
        data.expiryDate = data.expiryDate.toDate().toISOString();
    }
    return { id: docSnap.id, ...data } as Quote;
};

export const getQuotes = async (): Promise<Quote[]> => {
    const q = query(collection(db, "quotes"), orderBy("issueDate", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(processDoc);
}

export const getQuote = async (id: string): Promise<Quote | undefined> => {
    const docRef = doc(db, 'quotes', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? processDoc(docSnap) : undefined;
};

export const saveQuote = async (quote: Omit<Quote, 'status' | 'quoteNumber'> & { id?: string }): Promise<Quote> => {
    const { id, ...dataToSave } = quote;
    const batch = writeBatch(db);

    if (id) { // Update
        const quoteRef = doc(db, 'quotes', id);
        batch.update(quoteRef, { ...dataToSave, issueDate: Timestamp.fromDate(new Date(dataToSave.issueDate)), expiryDate: Timestamp.fromDate(new Date(dataToSave.expiryDate)) });
        await batch.commit();
        const updatedDoc = await getQuote(id);
        if (!updatedDoc) throw new Error("Could not retrieve updated quote.");
        return updatedDoc;

    } else { // Create
        const settings = await getDocumentNumberingSettings();
        const qSettings = settings.quote;
        const prefix = qSettings.prefix.replace('{CUST}', dataToSave.customerName.replace(/\s+/g, '').substring(0, 4).toUpperCase());
        const suffix = qSettings.suffix.replace('{CUST}', dataToSave.customerName.replace(/\s+/g, '').substring(0, 4).toUpperCase());
        const newNumber = `${prefix}${String(qSettings.nextNumber).padStart(4, '0')}${suffix}`;
        
        const newQuoteData = {
            ...dataToSave,
            quoteNumber: newNumber,
            revisionNumber: 0,
            status: DocumentStatus.Draft,
            issueDate: Timestamp.fromDate(new Date(dataToSave.issueDate)),
            expiryDate: Timestamp.fromDate(new Date(dataToSave.expiryDate))
        };
        
        const newQuoteRef = doc(collection(db, 'quotes'));
        batch.set(newQuoteRef, newQuoteData);
        
        const settingsRef = doc(db, 'settings', 'docNumbering');
        settings.quote.nextNumber++;
        batch.set(settingsRef, settings);
        
        await batch.commit();

        const savedDoc = await getQuote(newQuoteRef.id);
        if (!savedDoc) throw new Error("Could not retrieve saved quote.");
        return savedDoc;
    }
};

export const updateQuote = async (updatedQuote: Quote): Promise<Quote> => {
    const { id, ...restOfQuote } = updatedQuote;
    await updateDoc(doc(db, 'quotes', id), {
        ...restOfQuote,
        issueDate: Timestamp.fromDate(new Date(updatedQuote.issueDate)),
        expiryDate: Timestamp.fromDate(new Date(updatedQuote.expiryDate)),
    });
    return updatedQuote;
}

export const deleteQuote = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, "quotes", id));
};

export const updateQuoteStatus = async (id: string, status: DocumentStatus): Promise<void> => {
    const quoteRef = doc(db, 'quotes', id);
    await updateDoc(quoteRef, { status });
};

// --- Sales Order Functions ---

const processSalesOrderDoc = (docSnap: DocumentSnapshot): SalesOrder => {
    const data = docSnap.data() as any;
    if (data.orderDate && data.orderDate instanceof Timestamp) {
        data.orderDate = data.orderDate.toDate().toISOString();
    }
    return { id: docSnap.id, ...data } as SalesOrder;
};

export const getSalesOrders = async (): Promise<SalesOrder[]> => {
    const q = query(collection(db, "sales_orders"), orderBy("orderDate", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(processSalesOrderDoc);
};

export const getSalesOrder = async (id: string): Promise<SalesOrder | undefined> => {
    const docRef = doc(db, 'sales_orders', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? processSalesOrderDoc(docSnap) : undefined;
};

export const createSalesOrderFromQuote = async (quoteData: Quote, clientPoNumber: string): Promise<SalesOrder> => {
    const batch = writeBatch(db);

    // 1. Get SO Number
    const settings = await getDocumentNumberingSettings();
    const soSettings = settings.salesOrder;
    const prefix = soSettings.prefix.replace('{CUST}', quoteData.customerName.replace(/\s+/g, '').substring(0, 4).toUpperCase());
    const suffix = soSettings.suffix.replace('{CUST}', quoteData.customerName.replace(/\s+/g, '').substring(0, 4).toUpperCase());
    const orderNumber = `${prefix}${String(soSettings.nextNumber).padStart(4, '0')}${suffix}`;
    
    // 2. Prepare SO Data
    const newSOData: Omit<SalesOrder, 'id'> = {
        orderNumber,
        linkedQuoteId: quoteData.id,
        quoteNumber: `${quoteData.quoteNumber}${quoteData.revisionNumber ? `-Rev${quoteData.revisionNumber}`: ''}`,
        clientPoNumber: clientPoNumber,
        customerId: quoteData.customerId,
        customerName: quoteData.customerName,
        customerGstin: quoteData.customerGstin,
        contactId: quoteData.contactId,
        contactName: quoteData.contactName,
        contactPhone: quoteData.contactPhone,
        contactEmail: quoteData.contactEmail,
        billingAddress: quoteData.billingAddress,
        shippingAddress: quoteData.shippingAddress,
        orderDate: new Date().toISOString(),
        lineItems: quoteData.lineItems,
        subTotal: quoteData.subTotal,
        gstTotal: quoteData.gstTotal,
        total: quoteData.total,
        terms: quoteData.terms,
        status: DocumentStatus.Approved,
        deliveredQuantities: {},
        additionalDescription: quoteData.additionalDescription,
        pointOfContactId: quoteData.pointOfContactId,
    };

    // 3. Add SO to batch
    const newSORef = doc(collection(db, 'sales_orders'));
    batch.set(newSORef, { ...newSOData, orderDate: Timestamp.fromDate(new Date(newSOData.orderDate))});

    // 4. Update numbering settings and add to batch
    settings.salesOrder.nextNumber++;
    const settingsRef = doc(db, 'settings', 'docNumbering');
    batch.set(settingsRef, settings);

    // 5. Update quote status and add to batch
    const quoteRef = doc(db, 'quotes', quoteData.id);
    batch.update(quoteRef, { status: DocumentStatus.Closed, linkedSalesOrderId: newSORef.id });
    
    // 6. Commit batch
    await batch.commit();

    const savedDoc = await getSalesOrder(newSORef.id);
    if (!savedDoc) throw new Error("Could not retrieve saved Sales Order.");
    
    // 7. Send email notification
    try {
        const companyDetails = await getCompanyDetails();
        if (companyDetails?.emailSettings?.enableNotifications) {
            const emailService = getEmailService(companyDetails.emailSettings);
            await emailService.sendSalesOrderNotification(savedDoc, companyDetails);
            console.log('Sales Order creation email notification sent successfully');
        }
    } catch (emailError) {
        console.error('Failed to send Sales Order creation email:', emailError);
        // Don't throw error - don't block the user flow if email fails
    }
    
    return savedDoc;
};

export const reviseSalesOrder = async (orderId: string, updatedLineItems: any[], newPoNumber: string): Promise<void> => {
    // This logic is complex and better suited for a Cloud Function to ensure atomicity.
    // For client-side, we'll assume it works in a simplified manner.
    const soRef = doc(db, 'sales_orders', orderId);
    
    const { subTotal, gstTotal } = updatedLineItems.reduce((acc, item) => {
        const itemTotal = item.quantity * item.unitPrice;
        acc.subTotal += itemTotal;
        acc.gstTotal += itemTotal * (item.taxRate / 100);
        return acc;
    }, { subTotal: 0, gstTotal: 0 });
    const total = Math.round(subTotal + gstTotal);

    await updateDoc(soRef, {
        lineItems: updatedLineItems,
        clientPoNumber: newPoNumber,
        subTotal,
        gstTotal,
        total
    });
    alert("Sales Order revised. Note: Quote revision logic is simplified in this version.");
}

export const deleteSalesOrder = async (id: string): Promise<void> => {
    // Check for existing deliveries
    const deliveriesQuery = query(collection(db, 'delivery_orders'), where('salesOrderId', '==', id));
    const deliverySnapshot = await getDocs(deliveriesQuery);
    if (!deliverySnapshot.empty) {
        throw new Error("Cannot delete Sales Order. Please delete all linked Delivery Orders first.");
    }

    const soToDelete = await getSalesOrder(id);
    if (!soToDelete) throw new Error("Sales Order not found.");

    const batch = writeBatch(db);

    // 1. Delete the SO
    const soRef = doc(db, 'sales_orders', id);
    batch.delete(soRef);

    // 2. Re-open the parent quote
    if (soToDelete.linkedQuoteId) {
        const quoteRef = doc(db, 'quotes', soToDelete.linkedQuoteId);
        batch.update(quoteRef, { status: DocumentStatus.Approved, linkedSalesOrderId: null });
    }

    await batch.commit();
}

// --- Delivery Order Functions ---

const processDeliveryOrderDoc = (docSnap: DocumentSnapshot): DeliveryOrder => {
    const data = docSnap.data() as any;
    if (data.deliveryDate && data.deliveryDate instanceof Timestamp) {
        data.deliveryDate = data.deliveryDate.toDate().toISOString();
    }
     if (data.orderDate && data.orderDate instanceof Timestamp) {
        data.orderDate = data.orderDate.toDate().toISOString();
    }
    return { id: docSnap.id, ...data } as DeliveryOrder;
};

export const getDeliveryOrders = async (): Promise<DeliveryOrder[]> => {
    const q = query(collection(db, 'delivery_orders'), orderBy('deliveryDate', 'desc'));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(processDeliveryOrderDoc);
};

export const getDeliveryOrder = async (id: string): Promise<DeliveryOrder | undefined> => {
    const docRef = doc(db, 'delivery_orders', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? processDeliveryOrderDoc(docSnap) : undefined;
};

export const createDeliveryOrder = async (
    salesOrderId: string,
    deliveryItems: DocumentLineItem[],
    shippingAddress: Address,
    contactId: string,
    contactName: string,
    contactPhone: string,
    contactEmail: string,
    vehicleNumber?: string,
    additionalDescription?: string
): Promise<DeliveryOrder> => {
    
    const soRef = doc(db, "sales_orders", salesOrderId);
    const soSnap = await getDoc(soRef);
    if (!soSnap.exists()) throw new Error("Sales Order not found.");
    const parentSO = { id: soSnap.id, ...soSnap.data() } as SalesOrder;

    const settings = await getDocumentNumberingSettings();
    const doSettings = settings.deliveryOrder;
    const prefix = doSettings.prefix.replace('{CUST}', parentSO.customerName.replace(/\s+/g, '').substring(0, 4).toUpperCase());
    const suffix = doSettings.suffix.replace('{CUST}', parentSO.customerName.replace(/\s+/g, '').substring(0, 4).toUpperCase());
    const deliveryNumber = `${prefix}${String(doSettings.nextNumber).padStart(4, '0')}${suffix}`;
    
    const newDOData = {
        deliveryNumber,
        salesOrderId: parentSO.id,
        salesOrderNumber: parentSO.orderNumber,
        customerId: parentSO.customerId,
        customerName: parentSO.customerName,
        customerGstin: parentSO.customerGstin,
        contactId,
        contactName,
        contactPhone,
        contactEmail,
        deliveryDate: Timestamp.now(),
        billingAddress: parentSO.billingAddress,
        shippingAddress: shippingAddress,
        lineItems: deliveryItems,
        status: DocumentStatus.Dispatched,
        vehicleNumber,
        additionalDescription,
        // pointOfContactId is not inherited from sales order - can be added independently
    };

    const batch = writeBatch(db);

    // 1. Create the new Delivery Order
    const newDORef = doc(collection(db, 'delivery_orders'));
    batch.set(newDORef, newDOData);

    // 2. Update SO delivered quantities
    const updatedDeliveredQuantities = { ...(parentSO.deliveredQuantities || {}) };
    deliveryItems.forEach(item => {
        updatedDeliveredQuantities[item.id] = (updatedDeliveredQuantities[item.id] || 0) + item.quantity;
    });

    const isFullyDelivered = parentSO.lineItems.every((item: DocumentLineItem) =>
        (updatedDeliveredQuantities[item.id] || 0) >= item.quantity
    );

    batch.update(soRef, {
        deliveredQuantities: updatedDeliveredQuantities,
        status: isFullyDelivered ? DocumentStatus.Closed : DocumentStatus.Partial
    });

    // 3. Update numbering settings
    settings.deliveryOrder.nextNumber++;
    const settingsRef = doc(db, 'settings', 'docNumbering');
    batch.set(settingsRef, settings);

    await batch.commit();
    
    const savedDoc = await getDeliveryOrder(newDORef.id);
    if (!savedDoc) throw new Error("Could not retrieve saved delivery order");
    
    // Send email notification
    try {
        const companyDetails = await getCompanyDetails();
        if (companyDetails?.emailSettings?.enableNotifications) {
            const emailService = getEmailService(companyDetails.emailSettings);
            await emailService.sendDeliveryOrderNotification(savedDoc, companyDetails);
            console.log('Delivery Order creation email notification sent successfully');
        }
    } catch (emailError) {
        console.error('Failed to send Delivery Order creation email:', emailError);
        // Don't throw error - don't block the user flow if email fails
    }
    
    return savedDoc;
};

export const updateDeliveryOrder = async (updatedDO: DeliveryOrder): Promise<DeliveryOrder> => {
    const { id, ...dataToUpdate } = updatedDO;
    const doRef = doc(db, 'delivery_orders', id);
    // Convert date string back to Timestamp for storage if needed, or handle in component
    await updateDoc(doRef, {
        ...dataToUpdate,
        deliveryDate: Timestamp.fromDate(new Date(dataToUpdate.deliveryDate)),
    });
    return updatedDO;
}

export const deleteDeliveryOrder = async (id: string): Promise<void> => {
    const doToDelete = await getDeliveryOrder(id);
    if (!doToDelete) throw new Error("Delivery Order not found.");

    const soRef = doc(db, 'sales_orders', doToDelete.salesOrderId);
    const soSnap = await getDoc(soRef);
    if (!soSnap.exists()) throw new Error("Parent Sales Order not found.");
    const parentSO = { id: soSnap.id, ...soSnap.data() } as SalesOrder;

    const batch = writeBatch(db);

    // 1. Delete the DO
    const doRef = doc(db, 'delivery_orders', id);
    batch.delete(doRef);

    // 2. Revert quantities on the SO
    const updatedDeliveredQuantities = { ...(parentSO.deliveredQuantities || {}) };
    doToDelete.lineItems.forEach(item => {
        updatedDeliveredQuantities[item.id] = Math.max(0, (updatedDeliveredQuantities[item.id] || 0) - item.quantity);
    });
    
    const totalDelivered = (Object.values(updatedDeliveredQuantities) as number[]).reduce((a: number, b: number) => a + b, 0);
    const newStatus = totalDelivered > 0 ? DocumentStatus.Partial : DocumentStatus.Approved;

    batch.update(soRef, {
        deliveredQuantities: updatedDeliveredQuantities,
        status: newStatus
    });

    await batch.commit();
};

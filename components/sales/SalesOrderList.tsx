

import React, { useState, useEffect, useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
const { Link, useLocation } = ReactRouterDOM;
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Truck, Edit, Trash2, Eye, ArrowUpDown } from 'lucide-react';
import { SalesOrder, DocumentStatus, Quote, PointOfContact } from '@/types';
import { getDocumentNumberingSettings } from '@/components/settings/DocumentNumbering';
import { getPointsOfContact } from '@/services/pointOfContactService';
import { useAuth } from '@/contexts/AuthContext';
import { canPerformAction } from '@/utils/permissions';
import { db, Timestamp, DocumentSnapshot } from '@/services/firebase';
import { collection, query, orderBy, getDocs, doc, getDoc, updateDoc, writeBatch, addDoc, deleteDoc, where } from 'firebase/firestore';
import { getCompanyDetails } from '@/components/settings/CompanyDetails';
import { getEmailService } from '@/services/emailService';

// --- FIRESTORE DATA SERVICE ---
const processDoc = (docSnap: DocumentSnapshot): SalesOrder => {
    const data = docSnap.data() as any;
    if (data.orderDate && data.orderDate instanceof Timestamp) {
        data.orderDate = data.orderDate.toDate().toISOString();
    }
    return { id: docSnap.id, ...data } as SalesOrder;
};

export const getSalesOrders = async (): Promise<SalesOrder[]> => {
    const q = query(collection(db, "sales_orders"), orderBy("orderDate", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(processDoc);
};

export const getSalesOrder = async (id: string): Promise<SalesOrder | undefined> => {
    const docRef = doc(db, 'sales_orders', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? processDoc(docSnap) : undefined;
};

export const createSalesOrderFromQuote = async (quoteData: Quote, clientPoNumber: string): Promise<SalesOrder> => {
    const batch = writeBatch(db);

    // 1. Get SO Number
    const settings = await getDocumentNumberingSettings();
    const soSettings = settings.salesOrder;
    const prefix = soSettings.prefix.replace('{CUST}', quoteData.customerName.substring(0, 4).toUpperCase());
    const suffix = soSettings.suffix.replace('{CUST}', quoteData.customerName.substring(0, 4).toUpperCase());
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
// --- END FIRESTORE DATA SERVICE ---

const statusColors: { [key in DocumentStatus]?: string } = {
    [DocumentStatus.Approved]: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100',
    [DocumentStatus.Partial]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100',
    [DocumentStatus.Closed]: 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100',
};

type SortKey = 'orderNumber' | 'customerName' | 'pointOfContact' | 'orderDate' | 'total' | 'status';

const isClosedStatus = (status: DocumentStatus) => status === DocumentStatus.Closed;

const SalesOrderList: React.FC = () => {
    const { user } = useAuth();
    const [orders, setOrders] = useState<SalesOrder[]>([]);
    const [pointsOfContact, setPointsOfContact] = useState<PointOfContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>({ key: 'orderDate', direction: 'descending' });
    const location = useLocation();

    const canCreate = canPerformAction(user, 'create');
    const canEdit = canPerformAction(user, 'edit');
    const canDelete = canPerformAction(user, 'delete');

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const [ordersData, contactsData] = await Promise.all([
                getSalesOrders(),
                getPointsOfContact()
            ]);
            setOrders(ordersData);
            setPointsOfContact(contactsData);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching data:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const status = params.get('statusFilter');
        if (status) {
            setStatusFilter(status);
        }
    }, [location.search]);

    const handleDelete = (id: string) => {
        if(window.confirm("Are you sure you want to delete this Sales Order? This action cannot be undone.")) {
            deleteSalesOrder(id).then(() => {
                alert("Sales Order deleted and parent Quote has been reopened.");
                fetchOrders();
            }).catch(err => {
                alert(err.message);
            });
        }
    };
    
    const requestSort = (key: SortKey) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getPointOfContactName = (pointOfContactId?: string) => {
        if (!pointOfContactId) return 'Not Set';
        const contact = pointsOfContact.find(c => c.id === pointOfContactId);
        return contact ? contact.name : 'Unknown';
    };

    const sortedAndFilteredOrders = useMemo(() => {
        let sortableItems = [...orders];

        if (statusFilter !== 'all') {
            if (statusFilter === 'open') {
                sortableItems = sortableItems.filter(o => 
                    [DocumentStatus.Approved, DocumentStatus.Partial].includes(o.status)
                );
            } else {
                sortableItems = sortableItems.filter(o => o.status === statusFilter);
            }
        }

        if (searchTerm) {
            sortableItems = sortableItems.filter(o =>
                o.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (o.clientPoNumber && o.clientPoNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
                getPointOfContactName(o.pointOfContactId).toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        sortableItems.sort((a, b) => {
            const aClosed = isClosedStatus(a.status) ? 1 : 0;
            const bClosed = isClosedStatus(b.status) ? 1 : 0;
            if (aClosed !== bClosed) return aClosed - bClosed;

            if (sortConfig !== null) {
                if (sortConfig.key === 'pointOfContact') {
                    const aValue = getPointOfContactName(a.pointOfContactId);
                    const bValue = getPointOfContactName(b.pointOfContactId);
                    if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                    if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                } else {
                    const aValue = a[sortConfig.key];
                    const bValue = b[sortConfig.key];
                    if (sortConfig.key === 'orderDate') {
                        return sortConfig.direction === 'ascending' ? new Date(aValue).getTime() - new Date(bValue).getTime() : new Date(bValue).getTime() - new Date(aValue).getTime();
                    }
                    if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                    if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                }
            }
            return 0;
        });
        return sortableItems;
    }, [orders, pointsOfContact, searchTerm, sortConfig, statusFilter]);

    const SortableHeader: React.FC<{ sortKey: SortKey, children: React.ReactNode}> = ({ sortKey, children }) => (
        <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort(sortKey)}>
            <div className="flex items-center">
                {children}
                <ArrowUpDown size={14} className="ml-2 opacity-50"/>
            </div>
        </th>
    );

    return (
        <Card title="Sales Orders" bodyClassName="">
             <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-wrap gap-4 items-center">
                <input
                    type="text"
                    placeholder="Filter by SO#, PO#, or customer..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-1/3 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm"
                />
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm"
                >
                    <option value="all">All Statuses</option>
                    <option value="open">All Open</option>
                    <option value={DocumentStatus.Approved}>Approved</option>
                    <option value={DocumentStatus.Partial}>Partial</option>
                    <option value={DocumentStatus.Closed}>Closed</option>
                </select>
            </div>
             {loading ? (
                <p className="p-4 text-center">Loading sales orders...</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                        <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-700">
                            <tr>
                                <SortableHeader sortKey="orderNumber">Order #</SortableHeader>
                                <th className="px-6 py-3">PO #</th>
                                <SortableHeader sortKey="customerName">Customer</SortableHeader>
                                <SortableHeader sortKey="pointOfContact">Point of Contact</SortableHeader>
                                <SortableHeader sortKey="orderDate">Date</SortableHeader>
                                <SortableHeader sortKey="total">Total</SortableHeader>
                                <SortableHeader sortKey="status">Status</SortableHeader>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedAndFilteredOrders.map(o => (
                                <tr key={o.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                                    <td className="px-6 py-4 font-bold">
                                        <Link to={`/sales/orders/${o.id}/view`} className="text-primary hover:underline">{o.orderNumber}</Link>
                                    </td>
                                    <td className="px-6 py-4">{o.clientPoNumber}</td>
                                    <td className="px-6 py-4">{o.customerName}</td>
                                    <td className="px-6 py-4">
                                        <span className={`text-sm ${!o.pointOfContactId ? 'text-slate-400 italic' : ''}`}>
                                            {getPointOfContactName(o.pointOfContactId)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">{new Date(o.orderDate).toLocaleDateString('en-GB')}</td>
                                    <td className="px-6 py-4">₹{o.total.toFixed(2)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[o.status] || 'bg-gray-100'}`}>
                                            {o.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            <Link to={`/sales/orders/${o.id}/view`} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full"><Eye size={16} /></Link>
                                            {(o.status === DocumentStatus.Approved || o.status === DocumentStatus.Partial) && (
                                                <>
                                                    {canEdit && <Link to={`/sales/orders/${o.id}/edit`} className="p-2 text-primary hover:bg-primary-light rounded-full"><Edit size={16} /></Link>}
                                                    {canCreate && <Button to={`/sales/deliveries/new/${o.id}`} size="sm" icon={<Truck size={14} />}>Create Delivery</Button>}
                                                </>
                                            )}
                                            {o.status !== DocumentStatus.Closed && canDelete && (
                                                <button onClick={() => handleDelete(o.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-full"><Trash2 size={16} /></button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {sortedAndFilteredOrders.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                        No sales orders found. Approved quotes can be converted here.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </Card>
    );
};

export default SalesOrderList;


import React, { useState, useEffect, useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
const { Link } = ReactRouterDOM;
import Card from '@/components/ui/Card';
import { DeliveryOrder, DocumentStatus, DocumentLineItem, SalesOrder, Address, PointOfContact } from '@/types';
import { Eye, Trash2, Edit, ArrowUpDown } from 'lucide-react';
import { getDocumentNumberingSettings } from '@/components/settings/DocumentNumbering';
import { getPointsOfContact } from '@/services/pointOfContactService';
import { db, Timestamp, DocumentSnapshot } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { canPerformAction } from '@/utils/permissions';
import { collection, query, orderBy, getDocs, doc, getDoc, updateDoc, writeBatch, setDoc, deleteDoc, where } from 'firebase/firestore';
import { getCompanyDetails } from '@/components/settings/CompanyDetails';
import { getEmailService } from '@/services/emailService';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useSearchableList } from '@/hooks/useSearchableList';
import SearchableInput from '@/components/ui/SearchableInput';

// --- FIRESTORE DATA SERVICE ---
const processDoc = (docSnap: DocumentSnapshot): DeliveryOrder => {
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
    return querySnapshot.docs.map(processDoc);
};

export const getDeliveryOrder = async (id: string): Promise<DeliveryOrder | undefined> => {
    const docRef = doc(db, 'delivery_orders', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? processDoc(docSnap) : undefined;
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
    const prefix = doSettings.prefix.replace('{CUST}', parentSO.customerName.substring(0, 4).toUpperCase());
    const suffix = doSettings.suffix.replace('{CUST}', parentSO.customerName.substring(0, 4).toUpperCase());
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

// --- END FIRESTORE DATA SERVICE ---


const statusColors: { [key in DocumentStatus]?: string } = {
    [DocumentStatus.Dispatched]: 'bg-purple-100 text-purple-800 dark:bg-purple-800 dark:text-purple-100',
};

type SortKey = 'deliveryNumber' | 'salesOrderNumber' | 'customerName' | 'pointOfContact' | 'deliveryDate';

const DeliveryOrderList: React.FC = () => {
    const { user } = useAuth();
    const [orders, setOrders] = useState<DeliveryOrder[]>([]);
    const [pointsOfContact, setPointsOfContact] = useState<PointOfContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>({ key: 'deliveryDate', direction: 'descending' });
    
    const canEdit = canPerformAction(user, 'edit');
    const canDelete = canPerformAction(user, 'delete');
    
    const { searchInputRef } = useKeyboardShortcuts({
        newItemPath: '/sales/deliveries/new',
        canCreate: false, // Delivery orders are created from sales orders
        searchTerm,
        setSearchTerm
    });
    
    const {
        filteredItems: searchResults,
        selectedIndex,
        showResults,
        handleInputFocus,
        handleInputChange,
        selectItem
    } = useSearchableList({
        items: orders,
        searchTerm,
        setSearchTerm,
        getItemId: (order) => order.id,
        getItemUrl: (order) => `/sales/deliveries/${order.id}/view`,
        searchFields: ['deliveryNumber', 'salesOrderNumber', 'customerName']
    });


    const fetchOrders = async () => {
        setLoading(true);
        try {
            const [ordersData, contactsData] = await Promise.all([
                getDeliveryOrders(),
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

    const handleDelete = (id: string) => {
        if (window.confirm("Are you sure you want to delete this Delivery Order? This will revert the delivered quantities on the Sales Order.")) {
            deleteDeliveryOrder(id).then(() => {
                alert("Delivery Order deleted.");
                fetchOrders();
            }).catch(err => alert(err.message));
        }
    }

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
            sortableItems = sortableItems.filter(o => o.status === statusFilter);
        }

        if (searchTerm) {
            sortableItems = sortableItems.filter(o =>
                o.deliveryNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                o.salesOrderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                o.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                getPointOfContactName(o.pointOfContactId).toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                if (sortConfig.key === 'pointOfContact') {
                    const aValue = getPointOfContactName(a.pointOfContactId);
                    const bValue = getPointOfContactName(b.pointOfContactId);
                    if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                    if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                    return 0;
                }
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                if (sortConfig.key === 'deliveryDate') {
                    return sortConfig.direction === 'ascending' ? new Date(aValue).getTime() - new Date(bValue).getTime() : new Date(bValue).getTime() - new Date(aValue).getTime();
                }
                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [orders, pointsOfContact, searchTerm, sortConfig, statusFilter]);

    const SortableHeader: React.FC<{ sortKey: SortKey, children: React.ReactNode}> = ({ sortKey, children }) => (
        <th scope="col" className="px-4 py-2 cursor-pointer" onClick={() => requestSort(sortKey)}>
            <div className="flex items-center">
                {children}
                <ArrowUpDown size={14} className="ml-2 opacity-50"/>
            </div>
        </th>
    );

    return (
        <Card title="Delivery Orders" bodyClassName="">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex flex-wrap gap-3 items-center">
                <SearchableInput
                    searchInputRef={searchInputRef}
                    searchTerm={searchTerm}
                    placeholder="Search delivery orders... (Press '/' to focus, ↑↓ to navigate, ↵ to select)"
                    filteredItems={searchResults}
                    selectedIndex={selectedIndex}
                    showResults={showResults}
                    onInputChange={handleInputChange}
                    onInputFocus={handleInputFocus}
                    onItemSelect={selectItem}
                    className="w-full sm:w-1/3"
                    renderItem={(order, index, isSelected) => (
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="font-medium">{order.deliveryNumber}</div>
                                <div className="text-xs opacity-75">{order.customerName}</div>
                            </div>
                            <div className="text-xs opacity-60">
                                SO: {order.salesOrderNumber}
                            </div>
                        </div>
                    )}
                />
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full sm:w-auto px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm"
                >
                    <option value="all">All Statuses</option>
                    <option value={DocumentStatus.Dispatched}>Dispatched</option>
                </select>
            </div>
             {loading ? (
                <p className="p-4 text-center">Loading delivery orders...</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                        <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-700">
                            <tr>
                                <SortableHeader sortKey="deliveryNumber">Delivery #</SortableHeader>
                                <SortableHeader sortKey="salesOrderNumber">SO #</SortableHeader>
                                <SortableHeader sortKey="customerName">Customer</SortableHeader>
                                <SortableHeader sortKey="pointOfContact">Point of Contact</SortableHeader>
                                <SortableHeader sortKey="deliveryDate">Date</SortableHeader>
                                <th className="px-4 py-2">Status</th>
                                <th className="px-4 py-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedAndFilteredOrders.map(o => (
                                <tr key={o.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                                    <td className="px-4 py-2 font-bold">
                                        <Link to={`/sales/deliveries/${o.id}/view`} className="text-primary hover:underline">{o.deliveryNumber}</Link>
                                    </td>
                                    <td className="px-4 py-2">{o.salesOrderNumber}</td>
                                    <td className="px-4 py-2">{o.customerName}</td>
                                    <td className="px-4 py-2">
                                        <span className={`text-xs ${!o.pointOfContactId ? 'text-slate-400 italic' : ''}`}>
                                            {getPointOfContactName(o.pointOfContactId)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2">{new Date(o.deliveryDate).toLocaleDateString('en-GB')}</td>
                                    <td className="px-4 py-2">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[o.status] || 'bg-gray-100'}`}>
                                            {o.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            <Link to={`/sales/deliveries/${o.id}/view`} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full"><Eye size={16} /></Link>
                                            {canEdit && <Link to={`/sales/deliveries/${o.id}/edit`} className="p-2 text-primary hover:bg-primary-light rounded-full"><Edit size={16} /></Link>}
                                            {canDelete && <button onClick={() => handleDelete(o.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-full"><Trash2 size={16} /></button>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {sortedAndFilteredOrders.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                                    No delivery orders found. Create one from a Sales Order.
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

export default DeliveryOrderList;
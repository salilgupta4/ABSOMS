

import React, { useState, useEffect, useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
const { Link } = ReactRouterDOM;
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Plus, Eye, Edit, Trash2, ArrowUpDown } from 'lucide-react';
import { PurchaseOrder, DocumentStatus } from '@/types';
import { getDocumentNumberingSettings, saveDocumentNumberingSettings } from '@/components/settings/DocumentNumbering';
import { db, Timestamp, DocumentSnapshot } from '@/services/firebase';
import { collection, query, orderBy, getDocs, doc, getDoc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';


// --- FIRESTORE DATA SERVICE ---
const processDoc = (docSnap: DocumentSnapshot): PurchaseOrder => {
    const data = docSnap.data() as any;
    if (data.orderDate && data.orderDate instanceof Timestamp) {
        data.orderDate = data.orderDate.toDate().toISOString();
    }
    return { id: docSnap.id, ...data } as PurchaseOrder;
};

export const getPurchaseOrders = async (): Promise<PurchaseOrder[]> => {
    const q = query(collection(db, "purchase_orders"), orderBy("orderDate", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(processDoc);
};

export const getPurchaseOrder = async (id: string): Promise<PurchaseOrder | undefined> => {
    const docRef = doc(db, 'purchase_orders', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? processDoc(docSnap) : undefined;
};

export const savePurchaseOrder = async (order: Omit<PurchaseOrder, 'id' | 'poNumber' | 'status'> & { id?: string }): Promise<PurchaseOrder> => {
    const { id, ...dataToSave } = order;

    if (id) { // Update
        const poRef = doc(db, 'purchase_orders', id);
        await updateDoc(poRef, { ...dataToSave, orderDate: Timestamp.fromDate(new Date(order.orderDate))});
        const updatedDoc = await getPurchaseOrder(id);
        if (!updatedDoc) throw new Error("Failed to retrieve updated document");
        return updatedDoc;
    } else { // Create
        const settings = await getDocumentNumberingSettings();
        const poSettings = settings.purchaseOrder;
        const prefix = poSettings.prefix.replace('{VEND}', order.vendorName.substring(0, 4).toUpperCase());
        const suffix = poSettings.suffix.replace('{VEND}', order.vendorName.substring(0, 4).toUpperCase());
        const poNumber = `${prefix}${String(poSettings.nextNumber).padStart(4, '0')}${suffix}`;
        
        const newPOData = {
            ...dataToSave,
            poNumber,
            orderDate: Timestamp.fromDate(new Date(order.orderDate)),
            status: DocumentStatus.Draft,
        };

        const docRef = await addDoc(collection(db, 'purchase_orders'), newPOData);
        
        settings.purchaseOrder.nextNumber++;
        await saveDocumentNumberingSettings(settings);

        const savedDoc = await getPurchaseOrder(docRef.id);
        if (!savedDoc) throw new Error("Failed to retrieve saved document");
        return savedDoc;
    }
};

export const deletePurchaseOrder = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, "purchase_orders", id));
};
// --- END FIRESTORE DATA SERVICE ---


const statusColors: { [key in DocumentStatus]?: string } = {
    [DocumentStatus.Draft]: 'bg-slate-100 text-slate-800 dark:bg-slate-600 dark:text-slate-200',
    [DocumentStatus.Approved]: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100',
    [DocumentStatus.Closed]: 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100',
};

type SortKey = 'poNumber' | 'vendorName' | 'orderDate' | 'total' | 'status';

const isClosedStatus = (status: DocumentStatus) => status === DocumentStatus.Closed;

const PurchaseOrderList: React.FC = () => {
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>({ key: 'orderDate', direction: 'descending' });

    const fetchOrders = () => {
        setLoading(true);
        getPurchaseOrders().then(data => {
            setOrders(data);
            setLoading(false);
        });
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const handleDelete = (id: string) => {
        if(window.confirm("Are you sure you want to delete this Purchase Order?")) {
            deletePurchaseOrder(id).then(fetchOrders);
        }
    };

    const requestSort = (key: SortKey) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const sortedAndFilteredOrders = useMemo(() => {
        let sortableItems = [...orders];

        if (statusFilter !== 'all') {
            sortableItems = sortableItems.filter(o => o.status === statusFilter);
        }

        if (searchTerm) {
            sortableItems = sortableItems.filter(o =>
                o.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                o.vendorName.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        sortableItems.sort((a, b) => {
            const aClosed = isClosedStatus(a.status) ? 1 : 0;
            const bClosed = isClosedStatus(b.status) ? 1 : 0;
            if (aClosed !== bClosed) return aClosed - bClosed;
            
            if (sortConfig !== null) {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                 if (sortConfig.key === 'orderDate') {
                    return sortConfig.direction === 'ascending' ? new Date(aValue).getTime() - new Date(bValue).getTime() : new Date(bValue).getTime() - new Date(aValue).getTime();
                }
                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        });
        return sortableItems;
    }, [orders, searchTerm, sortConfig, statusFilter]);

    const SortableHeader: React.FC<{ sortKey: SortKey, children: React.ReactNode}> = ({ sortKey, children }) => (
        <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort(sortKey)}>
            <div className="flex items-center">
                {children}
                <ArrowUpDown size={14} className="ml-2 opacity-50"/>
            </div>
        </th>
    );

    return (
        <Card title="Purchase Orders" actions={<Button to="/purchase/orders/new" icon={<Plus size={16} />}>New Purchase Order</Button>} bodyClassName="">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-wrap gap-4 items-center">
                <input
                    type="text"
                    placeholder="Filter by PO # or vendor..."
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
                    <option value={DocumentStatus.Draft}>Draft</option>
                    <option value={DocumentStatus.Approved}>Approved</option>
                    <option value={DocumentStatus.Closed}>Closed</option>
                </select>
            </div>
            {loading ? (
                <p className="p-4 text-center">Loading purchase orders...</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                        <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-700">
                            <tr>
                                <SortableHeader sortKey="poNumber">PO #</SortableHeader>
                                <SortableHeader sortKey="vendorName">Vendor</SortableHeader>
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
                                        <Link to={`/purchase/orders/${o.id}/view`} className="text-primary hover:underline">{o.poNumber}</Link>
                                    </td>
                                    <td className="px-6 py-4">{o.vendorName}</td>
                                    <td className="px-6 py-4">{new Date(o.orderDate).toLocaleDateString('en-GB')}</td>
                                    <td className="px-6 py-4">₹{o.total.toFixed(2)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[o.status] || 'bg-gray-100'}`}>
                                            {o.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            <Link to={`/purchase/orders/${o.id}/view`} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full"><Eye size={16} /></Link>
                                            <Link to={`/purchase/orders/${o.id}/edit`} className="p-2 text-primary hover:bg-primary-light rounded-full"><Edit size={16} /></Link>
                                            <button onClick={() => handleDelete(o.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-full"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {sortedAndFilteredOrders.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                        No purchase orders found. <Link to="/purchase/orders/new" className="text-primary hover:underline">Create one!</Link>
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

export default PurchaseOrderList;
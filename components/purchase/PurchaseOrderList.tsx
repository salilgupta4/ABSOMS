

import React, { useState, useEffect, useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
const { Link } = ReactRouterDOM;
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Plus, Eye, Edit, Trash2, ArrowUpDown, Download, Loader } from 'lucide-react';
import { PurchaseOrder, DocumentStatus, PointOfContact } from '@/types';
import { getDocumentNumberingSettings, saveDocumentNumberingSettings } from '@/components/settings/DocumentNumbering';
import { getPointsOfContact } from '@/services/pointOfContactService';
import { db, Timestamp, DocumentSnapshot } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { canPerformAction } from '@/utils/permissions';
import { collection, query, orderBy, getDocs, doc, getDoc, updateDoc, addDoc, deleteDoc } from 'firebase/firestore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useSearchableList } from '@/hooks/useSearchableList';
import SearchableInput from '@/components/ui/SearchableInput';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ReactDOM from 'react-dom/client';
import { getPdfSettings } from '../settings/pdfSettingsService';
import { getCompanyDetails } from '../settings/CompanyDetails';
import PrintWrapper from '../Print/PrintWrapper';
import PurchaseOrderPrint from '../Print/PurchaseOrderPrint';


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

export const updatePurchaseOrderStatus = async (id: string, status: DocumentStatus): Promise<void> => {
    const docRef = doc(db, 'purchase_orders', id);
    await updateDoc(docRef, { status });
};
// --- END FIRESTORE DATA SERVICE ---


const statusColors: { [key in DocumentStatus]?: string } = {
    [DocumentStatus.Draft]: 'bg-slate-100 text-slate-800 dark:bg-slate-600 dark:text-slate-200',
    [DocumentStatus.Approved]: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100',
    [DocumentStatus.Closed]: 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100',
};

type SortKey = 'poNumber' | 'vendorName' | 'orderDate' | 'total' | 'status' | 'pointOfContact';

const isClosedStatus = (status: DocumentStatus) => status === DocumentStatus.Closed;

const PurchaseOrderList: React.FC = () => {
    const { user } = useAuth();
    const [orders, setOrders] = useState<PurchaseOrder[]>([]);
    const [pointsOfContact, setPointsOfContact] = useState<PointOfContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>({ key: 'orderDate', direction: 'descending' });
    const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
    
    const canCreate = canPerformAction(user, 'create');
    const canEdit = canPerformAction(user, 'edit');
    const canDelete = canPerformAction(user, 'delete');
    
    const { searchInputRef } = useKeyboardShortcuts({
        newItemPath: '/purchase/orders/new',
        canCreate,
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
        getItemUrl: (order) => `/purchase/orders/${order.id}/view`,
        searchFields: ['poNumber', 'vendorName']
    });

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const [ordersData, contactsData] = await Promise.all([
                getPurchaseOrders(),
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
        if(window.confirm("Are you sure you want to delete this Purchase Order?")) {
            deletePurchaseOrder(id).then(fetchOrders);
        }
    };

    const handleStatusChange = async (purchaseOrderId: string, newStatus: DocumentStatus) => {
        try {
            await updatePurchaseOrderStatus(purchaseOrderId, newStatus);
            fetchOrders();
        } catch (error) {
            console.error("Failed to update PO status:", error);
            alert("Failed to update purchase order status");
        }
    };

    const handleDownloadPdf = async (purchaseOrder: PurchaseOrder) => {
        setGeneratingPdfId(purchaseOrder.id);
        try {
            const [companyDetails, pdfSettings] = await Promise.all([
                getCompanyDetails(),
                getPdfSettings()
            ]);

            if (!companyDetails || !pdfSettings) {
                alert('Company details or PDF settings not found');
                return;
            }

            const ITEMS_PER_PAGE = 12;
            const pdf = new jsPDF('p', 'mm', 'a4');
            const totalPages = Math.max(1, Math.ceil(purchaseOrder.lineItems.length / ITEMS_PER_PAGE));
        
            for (let i = 0; i < totalPages; i++) {
                const itemStartIndex = i * ITEMS_PER_PAGE;
                const chunk = purchaseOrder.lineItems.slice(itemStartIndex, itemStartIndex + ITEMS_PER_PAGE);
                const pagePurchaseOrder = { ...purchaseOrder, lineItems: chunk };
                const isLastPage = i === totalPages - 1;

                const printContainer = document.createElement('div');
                printContainer.style.position = 'absolute';
                printContainer.style.left = '-9999px';
                document.body.appendChild(printContainer);

                const root = ReactDOM.createRoot(printContainer);
                root.render(
                    <PrintWrapper companyDetails={companyDetails} settings={pdfSettings} currentPage={i + 1} totalPages={totalPages}>
                        <PurchaseOrderPrint 
                            order={pagePurchaseOrder} 
                            settings={pdfSettings} 
                            companyDetails={companyDetails}
                            isLastPage={isLastPage}
                            itemStartIndex={itemStartIndex}
                            pointOfContact={pointsOfContact.find(p => p.id === purchaseOrder.pointOfContactId)}
                        />
                    </PrintWrapper>
                );

                await new Promise(resolve => setTimeout(resolve, 100));

                const canvas = await html2canvas(printContainer, {
                    scale: 2,
                    useCORS: true,
                    allowTaint: true,
                });

                const imgData = canvas.toDataURL('image/png');
                const imgWidth = pdf.internal.pageSize.getWidth();
                const imgHeight = (canvas.height * imgWidth) / canvas.width;

                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

                root.unmount();
                document.body.removeChild(printContainer);
            }

            pdf.save(`${purchaseOrder.poNumber}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF');
        } finally {
            setGeneratingPdfId(null);
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
            sortableItems = sortableItems.filter(o => o.status === statusFilter);
        }

        if (searchTerm) {
            sortableItems = sortableItems.filter(o =>
                o.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                o.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
        <th scope="col" className="px-4 py-2 cursor-pointer" onClick={() => requestSort(sortKey)}>
            <div className="flex items-center">
                {children}
                <ArrowUpDown size={14} className="ml-2 opacity-50"/>
            </div>
        </th>
    );

    return (
        <Card title="Purchase Orders" actions={canCreate && <Button to="/purchase/orders/new" icon={<Plus size={16} />}>New Purchase Order</Button>} bodyClassName="">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex flex-wrap gap-3 items-center">
                <SearchableInput
                    searchInputRef={searchInputRef}
                    searchTerm={searchTerm}
                    placeholder="Search purchase orders... (Press '/' to focus, ↑↓ to navigate, ↵ to select)"
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
                                <div className="font-medium">{order.poNumber}</div>
                                <div className="text-xs opacity-75">{order.vendorName}</div>
                            </div>
                            <div className="text-xs opacity-60">
                                ₹{order.total.toLocaleString()}
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
                                <SortableHeader sortKey="pointOfContact">Point of Contact</SortableHeader>
                                <SortableHeader sortKey="orderDate">Date</SortableHeader>
                                <SortableHeader sortKey="total">Total</SortableHeader>
                                <SortableHeader sortKey="status">Status</SortableHeader>
                                <th className="px-4 py-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedAndFilteredOrders.map(o => (
                                <tr key={o.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                                    <td className="px-4 py-2 font-bold">
                                        <Link to={`/purchase/orders/${o.id}/view`} className="text-primary hover:underline">{o.poNumber}</Link>
                                    </td>
                                    <td className="px-4 py-2">{o.vendorName}</td>
                                    <td className="px-4 py-2">
                                        <span className={`text-xs ${!o.pointOfContactId ? 'text-slate-400 italic' : ''}`}>
                                            {getPointOfContactName(o.pointOfContactId)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2">{new Date(o.orderDate).toLocaleDateString('en-GB')}</td>
                                    <td className="px-4 py-2">₹{o.total.toFixed(2)}</td>
                                    <td className="px-4 py-2">
                                        {canEdit && o.status !== DocumentStatus.Closed ? (
                                            <select
                                                value={o.status}
                                                onChange={(e) => handleStatusChange(o.id, e.target.value as DocumentStatus)}
                                                className={`px-2 py-1 text-xs font-medium rounded-full border-0 ${statusColors[o.status] || 'bg-gray-100'}`}
                                            >
                                                {[DocumentStatus.Draft, DocumentStatus.Approved, DocumentStatus.Closed].map(status => (
                                                    <option key={status} value={status}>{status}</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[o.status] || 'bg-gray-100'}`}>
                                                {o.status}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            <button 
                                                onClick={() => handleDownloadPdf(o)} 
                                                disabled={generatingPdfId === o.id}
                                                className="p-2 text-blue-600 hover:bg-blue-100 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                                                title="Download PDF"
                                            >
                                                {generatingPdfId === o.id ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
                                            </button>
                                            <Link to={`/purchase/orders/${o.id}/view`} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full"><Eye size={16} /></Link>
                                            {canEdit && <Link to={`/purchase/orders/${o.id}/edit`} className="p-2 text-primary hover:bg-primary-light rounded-full"><Edit size={16} /></Link>}
                                            {canDelete && <button onClick={() => handleDelete(o.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-full"><Trash2 size={16} /></button>}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {sortedAndFilteredOrders.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
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
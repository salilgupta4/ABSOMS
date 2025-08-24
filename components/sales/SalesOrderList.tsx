

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
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useSearchableList } from '@/hooks/useSearchableList';
import SearchableInput from '@/components/ui/SearchableInput';
import { useSalesStore } from '@/stores/salesStore';

const statusColors: { [key in DocumentStatus]?: string } = {
    [DocumentStatus.Approved]: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100',
    [DocumentStatus.Partial]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100',
    [DocumentStatus.Closed]: 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100',
};

type SortKey = 'orderNumber' | 'customerName' | 'pointOfContact' | 'orderDate' | 'total' | 'status';

const isClosedStatus = (status: DocumentStatus) => status === DocumentStatus.Closed;

const SalesOrderList: React.FC = () => {
    const { user } = useAuth();
    const { salesOrders, loading, fetchSalesOrders, deleteSalesOrder } = useSalesStore();
    const [pointsOfContact, setPointsOfContact] = useState<PointOfContact[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>({ key: 'orderDate', direction: 'descending' });
    const location = useLocation();

    const canCreate = canPerformAction(user, 'create');
    const canEdit = canPerformAction(user, 'edit');
    const canDelete = canPerformAction(user, 'delete');
    
    const { searchInputRef } = useKeyboardShortcuts({
        newItemPath: '/sales/orders/new',
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
        items: salesOrders,
        searchTerm,
        setSearchTerm,
        getItemId: (order) => order.id,
        getItemUrl: (order) => `/sales/orders/${order.id}/view`,
        searchFields: ['orderNumber', 'customerName', 'clientPoNumber']
    });

    useEffect(() => {
        fetchSalesOrders();
        getPointsOfContact().then(setPointsOfContact);
    }, [fetchSalesOrders]);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const status = params.get('statusFilter');
        if (status) {
            setStatusFilter(status);
        }
    }, [location.search]);

    const handleDelete = (id: string) => {
        if(window.confirm("Are you sure you want to delete this Sales Order? This action cannot be undone.")) {
            deleteSalesOrder(id).catch(err => {
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
        let sortableItems = [...salesOrders];

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
    }, [salesOrders, pointsOfContact, searchTerm, sortConfig, statusFilter]);

    const SortableHeader: React.FC<{ sortKey: SortKey, children: React.ReactNode}> = ({ sortKey, children }) => (
        <th scope="col" className="px-4 py-2 cursor-pointer" onClick={() => requestSort(sortKey)}>
            <div className="flex items-center">
                {children}
                <ArrowUpDown size={14} className="ml-2 opacity-50"/>
            </div>
        </th>
    );

    return (
        <Card title="Sales Orders" bodyClassName="">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex flex-wrap gap-3 items-center">
                <SearchableInput
                    searchInputRef={searchInputRef}
                    searchTerm={searchTerm}
                    placeholder="Search sales orders... (Press '/' to focus, ↑↓ to navigate, ↵ to select)"
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
                                <div className="font-medium">{order.orderNumber}</div>
                                <div className="text-xs opacity-75">{order.customerName}</div>
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
                                <th className="px-4 py-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedAndFilteredOrders.map(o => (
                                <tr key={o.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                                    <td className="px-4 py-2 font-bold">
                                        <Link to={`/sales/orders/${o.id}/view`} className="text-primary hover:underline">{o.orderNumber}</Link>
                                    </td>
                                    <td className="px-4 py-2">{o.clientPoNumber}</td>
                                    <td className="px-4 py-2">{o.customerName}</td>
                                    <td className="px-4 py-2">
                                        <span className={`text-xs ${!o.pointOfContactId ? 'text-slate-400 italic' : ''}`}>
                                            {getPointOfContactName(o.pointOfContactId)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2">{new Date(o.orderDate).toLocaleDateString('en-GB')}</td>
                                    <td className="px-4 py-2">₹{o.total.toFixed(2)}</td>
                                    <td className="px-4 py-2">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[o.status] || 'bg-gray-100'}`}>
                                            {o.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2 text-right">
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
                                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
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
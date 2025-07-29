

import React, { useState, useEffect, useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
const { Link } = ReactRouterDOM;
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Plus, Edit, Trash2, ArrowUpDown } from 'lucide-react';
import { Vendor, VendorFormData, UserRole } from '../../types';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/services/firebase';
import { collection, getDocs, doc, getDoc, setDoc, addDoc, deleteDoc } from 'firebase/firestore';

// --- FIRESTORE DATA SERVICE ---

export const getVendors = async (): Promise<Vendor[]> => {
    const vendorsCol = collection(db, 'vendors');
    const vendorSnapshot = await getDocs(vendorsCol);
    return vendorSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vendor));
};

export const getVendor = async (id: string): Promise<Vendor | undefined> => {
    const vendorDocSnap = await getDoc(doc(db, 'vendors', id));
    return vendorDocSnap.exists() ? { id: vendorDocSnap.id, ...vendorDocSnap.data() } as Vendor : undefined;
};

export const saveVendor = async (vendorData: VendorFormData): Promise<Vendor> => {
    const { id, ...dataToSave } = vendorData;
    if (id) {
        await setDoc(doc(db, 'vendors', id), dataToSave);
        return { id, ...dataToSave } as Vendor;
    } else {
        const docRef = await addDoc(collection(db, 'vendors'), dataToSave);
        return { id: docRef.id, ...dataToSave } as Vendor;
    }
};

export const deleteVendor = async (id: string): Promise<{ success: boolean }> => {
    await deleteDoc(doc(db, 'vendors', id));
    return { success: true };
};
// --- END FIRESTORE DATA SERVICE ---

// The rest of the component remains largely the same
type SortKey = 'name' | 'gstin';

const VendorList: React.FC = () => {
    const { user } = useAuth();
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>({ key: 'name', direction: 'ascending' });
    
    const isViewer = user?.role === UserRole.Viewer;

    const fetchVendors = () => {
        setLoading(true);
        getVendors().then(data => {
            setVendors(data);
            setLoading(false);
        });
    };

    useEffect(() => {
        fetchVendors();
    }, []);

    const handleDelete = (id: string, name: string) => {
        if (window.confirm(`Are you sure you want to delete vendor "${name}"?`)) {
            deleteVendor(id).then(() => {
                fetchVendors();
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

    const sortedAndFilteredVendors = useMemo(() => {
        let sortableItems = [...vendors];

        if (searchTerm) {
            sortableItems = sortableItems.filter(vendor =>
                vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                vendor.gstin.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [vendors, searchTerm, sortConfig]);

     const SortableHeader: React.FC<{ sortKey: SortKey, children: React.ReactNode}> = ({ sortKey, children }) => (
        <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort(sortKey)}>
            <div className="flex items-center">
                {children}
                <ArrowUpDown size={14} className="ml-2 opacity-50"/>
            </div>
        </th>
    );

    return (
        <Card
            title="Vendors"
            actions={!isViewer && <Button to="/vendors/new" icon={<Plus size={16} />}>New Vendor</Button>}
            bodyClassName=""
        >
             <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <input
                    type="text"
                    placeholder="Filter by name or GSTIN..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full md:w-1/3 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm"
                />
            </div>
            {loading ? (
                <div className="p-6 text-center text-slate-500 dark:text-slate-400">Loading vendors...</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                        <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-700">
                            <tr>
                                <SortableHeader sortKey="name">Vendor Name</SortableHeader>
                                <SortableHeader sortKey="gstin">GSTIN</SortableHeader>
                                {!isViewer && <th scope="col" className="px-6 py-3 text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedAndFilteredVendors.map((vendor) => (
                                <tr key={vendor.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{vendor.name}</td>
                                    <td className="px-6 py-4">{vendor.gstin}</td>
                                    {!isViewer && (
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-1">
                                                <Link to={`/vendors/${vendor.id}/edit`} className="p-2 text-primary hover:bg-primary-light dark:hover:bg-slate-700 rounded-full transition-colors">
                                                    <Edit size={16} />
                                                </Link>
                                                <button onClick={() => handleDelete(vendor.id, vendor.name)} className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {sortedAndFilteredVendors.length === 0 && (
                                <tr className="bg-white dark:bg-slate-800 border-b dark:border-slate-700">
                                    <td colSpan={isViewer ? 2 : 3} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                        No vendors found. 
                                        {!isViewer && <Link to="/vendors/new" className="text-primary hover:underline">Add the first one!</Link>}
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

export default VendorList;
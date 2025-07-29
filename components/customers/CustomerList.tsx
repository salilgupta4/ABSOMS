

import React, { useState, useEffect, useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
const { Link } = ReactRouterDOM;
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Plus, Edit, Trash2, ArrowUpDown } from 'lucide-react';
import { Customer, CustomerFormData, UserRole } from '../../types';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/services/firebase';
import { collection, getDocs, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';

// --- FIRESTORE DATA SERVICE ---

/**
 * [OPTIMIZED] Fetches all customers in a single, efficient query.
 * This avoids the N+1 problem by reading denormalized contact info directly.
 */
export const getCustomers = async (): Promise<Customer[]> => {
    const customersCol = collection(db, 'customers');
    const customerSnapshot = await getDocs(customersCol);
    return customerSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
};

/**
 * [OPTIMIZED & FIXED] Fetches a single customer and all its related data,
 * normalizing the output to prevent downstream errors from missing data.
 */
export const getCustomer = async (id: string): Promise<Customer | undefined> => {
    const customerDocRef = doc(db, 'customers', id);
    const customerDoc = await getDoc(customerDocRef);
    if (!customerDoc.exists()) return undefined;
    
    const data = customerDoc.data();
    
    // Normalize data to prevent runtime errors from missing fields.
    // This ensures that any consumer of this function gets a predictable shape.
    const normalizedCustomer: Customer = {
        id: customerDoc.id,
        name: data.name || '',
        gstin: data.gstin || '',
        contacts: data.contacts || [], // Ensure array exists
        billingAddress: data.billingAddress || { id: `billing_${customerDoc.id}`, line1: '', city: '', state: '', pincode: '', isDefault: true },
        shippingAddresses: data.shippingAddresses || [], // Ensure array exists
        primaryContactName: data.primaryContactName || (data.contacts && data.contacts[0] ? data.contacts[0].name : ''),
        primaryContactEmail: data.primaryContactEmail || (data.contacts && data.contacts[0] ? data.contacts[0].email : ''),
    };
    
    return normalizedCustomer;
};

/**
 * [OPTIMIZED & FIXED] Saves a customer with all contacts and addresses embedded,
 * ensuring each sub-document has a persistent and unique ID.
 */
export const saveCustomer = async (customerData: CustomerFormData): Promise<Customer> => {
    const { id, name, gstin, contacts, billingAddress, shippingAddresses } = customerData;
    
    // This helper function generates a new Firestore-compatible ID on the client.
    const getNewId = () => doc(collection(db, '_')).id;

    // Process contacts to ensure each has a persistent ID.
    const processedContacts = contacts.map(c => ({
        ...c,
        id: (c.id && !c.id.startsWith('new_')) ? c.id : getNewId(),
    }));

    // Process shipping addresses similarly.
    const processedShippingAddresses = shippingAddresses.map(a => ({
        ...a,
        id: (a.id && !a.id.startsWith('new_')) ? a.id : getNewId(),
        type: 'shipping',
    }));

    // Process billing address.
    const processedBillingAddress = {
        ...billingAddress,
        id: (billingAddress.id && !billingAddress.id.startsWith('new_')) ? billingAddress.id : getNewId(),
    };
    
    const primaryContact = processedContacts.find(c => c.isPrimary) || processedContacts[0];

    const fullCustomerData = {
        name,
        gstin,
        primaryContactName: primaryContact?.name || '',
        primaryContactEmail: primaryContact?.email || '',
        contacts: processedContacts,
        billingAddress: processedBillingAddress,
        shippingAddresses: processedShippingAddresses,
    };

    const customerDocRef = id 
        ? doc(db, 'customers', id)
        : doc(collection(db, 'customers'));
    
    await setDoc(customerDocRef, fullCustomerData, { merge: true });

    const savedCustomer = await getCustomer(customerDocRef.id);
    if (!savedCustomer) throw new Error("Failed to retrieve customer after saving.");
    return savedCustomer;
};

export const deleteCustomer = async (id: string): Promise<{ success: boolean }> => {
    await deleteDoc(doc(db, 'customers', id));
    return { success: true };
};

// --- END FIRESTORE DATA SERVICE ---

// The rest of the component remains largely the same
type SortKey = 'name' | 'gstin' | 'primaryContactName';

const CustomerList: React.FC = () => {
    const { user } = useAuth();
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>({ key: 'name', direction: 'ascending'});
    
    const isViewer = user?.role === UserRole.Viewer;

    const fetchCustomers = () => {
        setLoading(true);
        getCustomers().then(data => {
            setCustomers(data);
            setLoading(false);
        }).catch(err => {
            console.error(err);
            alert("Failed to fetch customers.");
            setLoading(false);
        });
    };

    useEffect(() => {
        fetchCustomers();
    }, []);

    const handleDelete = (id: string, name: string) => {
        if (window.confirm(`Are you sure you want to delete customer "${name}"?`)) {
            deleteCustomer(id).then(() => {
                fetchCustomers(); // Refresh list after deletion
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
    
    const sortedAndFilteredCustomers = useMemo(() => {
        let sortableItems = [...customers];

        // Filter
        if (searchTerm) {
            sortableItems = sortableItems.filter(customer =>
                customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (customer.gstin && customer.gstin.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        }

        // Sort
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aValue: any = a[sortConfig.key as keyof Customer] || '';
                let bValue: any = b[sortConfig.key as keyof Customer] || '';

                if (aValue < bValue) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (aValue > bValue) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [customers, searchTerm, sortConfig]);
    
    const SortableHeader: React.FC<{ sortKey: SortKey, children: React.ReactNode}> = ({ sortKey, children }) => (
        <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort(sortKey)}>
            <div className="flex items-center">
                {children}
                <ArrowUpDown size={14} className="ml-2 opacity-50"/>
            </div>
        </th>
    )

    return (
        <Card
            title="Customers"
            actions={!isViewer && <Button to="/customers/new" icon={<Plus size={16} />}>New Customer</Button>}
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
                <div className="p-6 text-center text-slate-500 dark:text-slate-400">Loading customers...</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                        <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-700">
                            <tr>
                                <SortableHeader sortKey="name">Customer Name</SortableHeader>
                                <SortableHeader sortKey="gstin">GSTIN</SortableHeader>
                                <SortableHeader sortKey="primaryContactName">Primary Contact</SortableHeader>
                                <th scope="col" className="px-6 py-3">Email</th>
                                {!isViewer && <th scope="col" className="px-6 py-3 text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedAndFilteredCustomers.map((customer) => {
                                const primaryContactName = customer.primaryContactName || 'N/A';
                                const primaryContactEmail = customer.primaryContactEmail || 'N/A';

                                return (
                                    <tr key={customer.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{customer.name}</td>
                                        <td className="px-6 py-4">{customer.gstin}</td>
                                        <td className="px-6 py-4">{primaryContactName}</td>
                                        <td className="px-6 py-4">{primaryContactEmail}</td>
                                        {!isViewer && (
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end space-x-1">
                                                    <Link to={`/customers/${customer.id}/edit`} className="p-2 text-primary hover:bg-primary-light dark:hover:bg-slate-700 rounded-full transition-colors">
                                                        <Edit size={16} />
                                                    </Link>
                                                    <button onClick={() => handleDelete(customer.id, customer.name)} className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                            {sortedAndFilteredCustomers.length === 0 && (
                                <tr className="bg-white dark:bg-slate-800 border-b dark:border-slate-700">
                                    <td colSpan={isViewer ? 4 : 5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                        No customers found. 
                                        {!isViewer && <Link to="/customers/new" className="text-primary hover:underline"> Add the first one!</Link>}
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

export default CustomerList;
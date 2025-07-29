

import React, { useState, useEffect, useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
const { Link } = ReactRouterDOM;
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Plus, Edit, Trash2, ArrowUpDown } from 'lucide-react';
import { Product, ProductFormData, UserRole } from '../../types';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/services/firebase';
import { collection, getDocs, doc, getDoc, setDoc, addDoc, deleteDoc } from 'firebase/firestore';

// --- FIRESTORE DATA SERVICE ---

export const getProducts = async (): Promise<Product[]> => {
    const productsCol = collection(db, 'products');
    const productSnapshot = await getDocs(productsCol);
    return productSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
};

export const getProduct = async (id: string): Promise<Product | undefined> => {
    const productDocSnap = await getDoc(doc(db, 'products', id));
    return productDocSnap.exists() ? { id: productDocSnap.id, ...productDocSnap.data() } as Product : undefined;
};

export const saveProduct = async (productData: ProductFormData): Promise<Product> => {
    const { id, ...dataToSave } = productData;
    if (id) {
        await setDoc(doc(db, 'products', id), dataToSave);
        return { id, ...dataToSave } as Product;
    } else {
        const docRef = await addDoc(collection(db, 'products'), dataToSave);
        return { id: docRef.id, ...dataToSave } as Product;
    }
};

export const deleteProduct = async (id: string): Promise<{ success: boolean }> => {
    await deleteDoc(doc(db, 'products', id));
    return { success: true };
};
// --- END FIRESTORE DATA SERVICE ---

// The rest of the component remains largely the same
type SortKey = 'name' | 'hsnCode' | 'unit' | 'rate';

const ProductList: React.FC = () => {
    const { user } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>({ key: 'name', direction: 'ascending' });

    const isViewer = user?.role === UserRole.Viewer;

    const fetchProducts = () => {
        setLoading(true);
        getProducts().then(data => {
            setProducts(data);
            setLoading(false);
        }).catch(err => {
            console.error(err);
            alert("Failed to fetch products.");
            setLoading(false);
        });
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    const handleDelete = (id: string, name: string) => {
        if (window.confirm(`Are you sure you want to delete product "${name}"?`)) {
            deleteProduct(id).then(() => {
                fetchProducts(); // Refresh list after deletion
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
    
    const sortedAndFilteredProducts = useMemo(() => {
        let sortableItems = [...products];

        if (searchTerm) {
            sortableItems = sortableItems.filter(product =>
                product.name.toLowerCase().includes(searchTerm.toLowerCase())
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
    }, [products, searchTerm, sortConfig]);
    
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
            title="Products"
            actions={!isViewer && <Button to="/products/new" icon={<Plus size={16} />}>New Product</Button>}
            bodyClassName=""
        >
             <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                <input
                    type="text"
                    placeholder="Filter by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full md:w-1/3 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm"
                />
            </div>
            {loading ? (
                <div className="p-6 text-center text-slate-500 dark:text-slate-400">Loading products...</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                        <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-700">
                            <tr>
                                <SortableHeader sortKey="name">Product Name</SortableHeader>
                                <SortableHeader sortKey="hsnCode">HSN Code</SortableHeader>
                                <SortableHeader sortKey="unit">Unit</SortableHeader>
                                <SortableHeader sortKey="rate">Rate</SortableHeader>
                                {!isViewer && <th scope="col" className="px-6 py-3 text-right">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {sortedAndFilteredProducts.map((product) => (
                                <tr key={product.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{product.name}</td>
                                    <td className="px-6 py-4">{product.hsnCode}</td>
                                    <td className="px-6 py-4">{product.unit}</td>
                                    <td className="px-6 py-4">₹{product.rate.toFixed(2)}</td>
                                    {!isViewer && (
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end space-x-1">
                                                <Link to={`/products/${product.id}/edit`} className="p-2 text-primary hover:bg-primary-light dark:hover:bg-slate-700 rounded-full transition-colors">
                                                    <Edit size={16} />
                                                </Link>
                                                <button onClick={() => handleDelete(product.id, product.name)} className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {sortedAndFilteredProducts.length === 0 && (
                                <tr className="bg-white dark:bg-slate-800 border-b dark:border-slate-700">
                                    <td colSpan={isViewer ? 4 : 5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                        No products found. 
                                        {!isViewer && <Link to="/products/new" className="text-primary hover:underline">Add the first one!</Link>}
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

export default ProductList;

import React, { useState, useEffect, useMemo } from 'react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Modal from '../ui/Modal';
import { Plus, History, Loader, ArrowUpDown } from 'lucide-react';
import { InventoryItem, UserRole } from '../../types';
import { getInventory } from './inventoryService';
import StockAdjustmentForm from './StockAdjustmentForm';
import { useAuth } from '@/contexts/AuthContext';

type SortKey = 'productName' | 'currentStock' | 'lastUpdated';

const InventoryList: React.FC = () => {
    const { user } = useAuth();
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>({ key: 'currentStock', direction: 'descending' });

    const isViewer = user?.role === UserRole.Viewer;

    const fetchInventory = () => {
        setLoading(true);
        getInventory().then(data => {
            setInventory(data);
            setLoading(false);
        }).catch((err) => {
            console.error("Failed to fetch inventory", err);
            alert("Could not fetch inventory data.");
            setLoading(false)
        });
    };

    useEffect(() => {
        fetchInventory();
    }, []);

    const handleOpenModal = () => {
        if (isViewer) return;
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
    }
    
    const handleSaveAdjustment = () => {
        handleCloseModal();
        fetchInventory(); // Refresh list after adjustment
    }
    
    const requestSort = (key: SortKey) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const sortedAndFilteredInventory = useMemo(() => {
        let sortableItems = [...inventory];

        if (searchTerm) {
            sortableItems = sortableItems.filter(item =>
                item.productName.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];
                
                // Ensure date sorting works correctly
                if (sortConfig.key === 'lastUpdated') {
                    aValue = new Date(aValue).getTime();
                    bValue = new Date(bValue).getTime();
                }

                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [inventory, searchTerm, sortConfig]);

    const SortableHeader: React.FC<{ sortKey: SortKey, children: React.ReactNode}> = ({ sortKey, children }) => (
        <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort(sortKey)}>
            <div className="flex items-center">
                {children}
                <ArrowUpDown size={14} className="ml-2 opacity-50"/>
            </div>
        </th>
    );

    return (
        <>
            <Card
                title="Inventory Status"
                actions={!isViewer && <Button onClick={handleOpenModal} icon={<Plus size={16} />}>Manual Stock Adjustment</Button>}
                bodyClassName=""
            >
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <input
                        type="text"
                        placeholder="Filter by product name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full md:w-1/3 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm"
                    />
                </div>
                {loading ? (
                    <div className="p-6 text-center text-slate-500 flex justify-center items-center">
                        <Loader className="animate-spin mr-2"/> Loading inventory...
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                            <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-700">
                                <tr>
                                    <SortableHeader sortKey="productName">Product Name</SortableHeader>
                                    <SortableHeader sortKey="currentStock">Current Stock</SortableHeader>
                                    <SortableHeader sortKey="lastUpdated">Last Updated</SortableHeader>
                                    <th scope="col" className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedAndFilteredInventory.map((item) => (
                                    <tr key={item.productId} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">{item.productName}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`font-bold text-lg ${item.currentStock > 10 ? 'text-green-600' : 'text-red-500'}`}>
                                                {item.currentStock}
                                            </span>
                                            <span className="text-xs text-slate-500 ml-1">{item.unit}</span>
                                        </td>
                                        <td className="px-6 py-4">{new Date(item.lastUpdated).toLocaleString('en-GB')}</td>
                                        <td className="px-6 py-4 text-right">
                                            <Button to={`/inventory/${item.productId}/history`} variant="secondary" size="sm" icon={<History size={14}/>}>
                                                View History
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {sortedAndFilteredInventory.length === 0 && (
                                    <tr className="bg-white dark:bg-slate-800 border-b dark:border-slate-700">
                                        <td colSpan={4} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                            No products found in inventory.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Modal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                title="Manual Stock Adjustment"
            >
                <StockAdjustmentForm
                    onSave={handleSaveAdjustment}
                    onCancel={handleCloseModal}
                    saving={saving}
                    setSaving={setSaving}
                />
            </Modal>
        </>
    );
};

export default InventoryList;
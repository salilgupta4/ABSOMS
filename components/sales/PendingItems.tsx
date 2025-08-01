import React, { useState, useEffect, useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
const { useNavigate } = ReactRouterDOM;
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Loader, Clock, Package, AlertCircle, ArrowUpDown, Download, FileText, Truck, ChevronUp, ChevronDown } from 'lucide-react';
import { SalesOrder, DocumentStatus } from '../../types';
import { getSalesOrders } from './SalesOrderList';
import { Search } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PendingItem {
    id: string;
    productName: string;
    description: string;
    hsnCode: string;
    unit: string;
    unitPrice: number;
    orderedQuantity: number;
    deliveredQuantity: number;
    pendingQuantity: number;
    customerName: string;
    orderNumber: string;
    orderDate: string;
    clientPoNumber?: string;
    salesOrderId: string;
}

const PendingItems: React.FC = () => {
    const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
    const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [sortField, setSortField] = useState<keyof PendingItem>('orderDate');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const navigate = useNavigate();

    const [searchTerm, setSearchTerm] = useState('');
    
    // Filtering and sorting logic
    const filteredAndSortedItems = useMemo(() => {
        // First, filter items based on search term
        let filtered = searchTerm.trim() === '' 
            ? pendingItems 
            : pendingItems.filter(item => 
                item.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.clientPoNumber && item.clientPoNumber.toLowerCase().includes(searchTerm.toLowerCase()))
            );

        // Then, sort the filtered items
        return filtered.sort((a, b) => {
            let aValue = a[sortField];
            let bValue = b[sortField];

            // Handle different data types
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }
            
            if (typeof aValue === 'string' && (sortField === 'orderDate')) {
                aValue = new Date(aValue).getTime();
                bValue = new Date(bValue as string).getTime();
            }

            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [pendingItems, searchTerm, sortField, sortDirection]);

    // Sorting handler
    const handleSort = (field: keyof PendingItem) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    // CSV Export
    const exportToCSV = () => {
        const headers = [
            'Product Name', 'Description', 'Ordered Qty', 'Delivered Qty', 'Pending Qty', 'Unit',
            'Unit Price', 'Pending Value', 'Customer', 'SO Number', 'PO Number', 'Order Date'
        ];
        
        const csvData = filteredAndSortedItems.map(item => [
            item.productName,
            item.description,
            item.orderedQuantity,
            item.deliveredQuantity,
            item.pendingQuantity,
            item.unit,
            item.unitPrice.toFixed(2),
            (item.pendingQuantity * item.unitPrice).toFixed(2),
            item.customerName,
            item.orderNumber,
            item.clientPoNumber || '',
            new Date(item.orderDate).toLocaleDateString('en-GB')
        ]);
        
        const csvContent = [headers, ...csvData]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `pending-items-${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    // PDF Export
    const exportToPDF = () => {
        const doc = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
        
        // Title - very small and minimal
        doc.setFontSize(12);
        doc.text('Pending Items Report', 5, 10);
        
        // Date - tiny
        doc.setFontSize(7);
        doc.text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, 5, 15);
        
        // Table data - no currency symbols
        const tableData = filteredAndSortedItems.map(item => [
            item.productName,
            `${item.orderedQuantity}/${item.deliveredQuantity}/${item.pendingQuantity} ${item.unit}`,
            item.unitPrice.toFixed(2),
            (item.pendingQuantity * item.unitPrice).toFixed(2),
            item.customerName,
            item.orderNumber,
            item.clientPoNumber || '-',
            new Date(item.orderDate).toLocaleDateString('en-GB')
        ]);
        
        autoTable(doc, {
            head: [['Product', 'Ord/Del/Pend', 'Unit Price', 'Pending Value', 'Customer', 'SO Number', 'PO Number', 'Order Date']],
            body: tableData,
            startY: 18,
            margin: { top: 5, right: 5, bottom: 5, left: 5 },
            styles: { 
                fontSize: 6,
                cellPadding: 1,
                lineWidth: 0.1
            },
            headStyles: { 
                fillColor: [255, 255, 255], // White background
                textColor: [0, 0, 0],       // Black text
                fontSize: 6,
                fontStyle: 'bold',
                lineWidth: 0.2
            },
            alternateRowStyles: { fillColor: [252, 252, 252] }, // Very light gray
            columnStyles: {
                0: { cellWidth: 50 }, // Product
                1: { cellWidth: 25 }, // Quantities
                2: { cellWidth: 18, halign: 'right' }, // Unit Price
                3: { cellWidth: 22, halign: 'right' }, // Pending Value
                4: { cellWidth: 40 }, // Customer
                5: { cellWidth: 25 }, // SO Number
                6: { cellWidth: 25 }, // PO Number
                7: { cellWidth: 22 }  // Order Date
            },
            tableWidth: 'wrap'
        });
        
        doc.save(`pending-items-${new Date().toISOString().split('T')[0]}.pdf`);
    };

    // Create Delivery Order handler
    const handleCreateDeliveryOrder = (item: PendingItem) => {
        navigate(`/sales/deliveries/new/${item.salesOrderId}`);
    };

    useEffect(() => {
        setLoading(true);
        getSalesOrders().then(orders => {
            setSalesOrders(orders);
            
            // Extract all pending items from sales orders
            const allPendingItems: PendingItem[] = [];
            
            orders.forEach(order => {
                // Only process orders that are not closed
                if (order.status === DocumentStatus.Closed) return;
                
                order.lineItems.forEach(item => {
                    const deliveredQty = order.deliveredQuantities[item.id] || 0;
                    const pendingQty = item.quantity - deliveredQty;
                    
                    // Only include items that have pending quantity
                    if (pendingQty > 0) {
                        allPendingItems.push({
                            id: `${order.id}-${item.id}`,
                            productName: item.productName,
                            description: item.description,
                            hsnCode: item.hsnCode,
                            unit: item.unit,
                            unitPrice: item.unitPrice,
                            orderedQuantity: item.quantity,
                            deliveredQuantity: deliveredQty,
                            pendingQuantity: pendingQty,
                            customerName: order.customerName,
                            orderNumber: order.orderNumber,
                            orderDate: order.orderDate,
                            clientPoNumber: order.clientPoNumber,
                            salesOrderId: order.id
                        });
                    }
                });
            });
            
            // Sort by order date (newest first)
            allPendingItems.sort((a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime());
            
            setPendingItems(allPendingItems);
            setLoading(false);
        }).catch(err => {
            console.error("Failed to load sales orders:", err);
            setLoading(false);
        });
    }, []);

    const totalPendingValue = filteredAndSortedItems.reduce((sum, item) => 
        sum + (item.pendingQuantity * item.unitPrice), 0
    );

    // Sorting icon component
    const SortIcon: React.FC<{ field: keyof PendingItem }> = ({ field }) => {
        if (sortField !== field) {
            return <ArrowUpDown size={14} className="text-slate-400" />;
        }
        return sortDirection === 'asc' 
            ? <ChevronUp size={14} className="text-primary" />
            : <ChevronDown size={14} className="text-primary" />;
    };

    if (loading) {
        return (
            <Card title="Loading Pending Items...">
                <div className="text-center p-8">
                    <Loader className="animate-spin inline-block" />
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-200 flex items-center">
                    <Clock className="mr-3" size={28} />
                    Pending Items
                </h3>
                <div className="flex items-center space-x-4">
                    <div className="flex space-x-2">
                        <Button variant="secondary" size="sm" onClick={exportToCSV} icon={<FileText size={16} />}>
                            Export CSV
                        </Button>
                        <Button variant="secondary" size="sm" onClick={exportToPDF} icon={<Download size={16} />}>
                            Export PDF
                        </Button>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-slate-500 dark:text-slate-400">Total Pending Items</p>
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{filteredAndSortedItems.length}</p>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="p-4">
                    <div className="flex items-center">
                        <Package className="text-blue-500 mr-3" size={24} />
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Total Items</p>
                            <p className="text-xl font-bold text-slate-800 dark:text-slate-200">{filteredAndSortedItems.length}</p>
                        </div>
                    </div>
                </Card>
                
                <Card className="p-4">
                    <div className="flex items-center">
                        <AlertCircle className="text-orange-500 mr-3" size={24} />
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Pending Value</p>
                            <p className="text-xl font-bold text-slate-800 dark:text-slate-200">₹{totalPendingValue.toFixed(2)}</p>
                        </div>
                    </div>
                </Card>
                
                <Card className="p-4">
                    <div className="flex items-center">
                        <Clock className="text-green-500 mr-3" size={24} />
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Active Orders</p>
                            <p className="text-xl font-bold text-slate-800 dark:text-slate-200">
                                {new Set(filteredAndSortedItems.map(item => item.salesOrderId)).size}
                            </p>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Search */}
            <Card>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="relative">
                        <Search 
                            size={16} 
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" 
                        />
                        <input
                            type="text"
                            placeholder="Search by product name, description, customer, or order number..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-3 py-2 text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:border-primary"
                        />
                    </div>
                </div>
            </Card>

            {/* Pending Items Table */}
            <Card title="Pending Items List" bodyClassName="overflow-x-auto">
                {filteredAndSortedItems.length === 0 ? (
                    <div className="text-center p-8">
                        <Package className="mx-auto mb-4 text-slate-400" size={48} />
                        <p className="text-slate-500 dark:text-slate-400">
                            {pendingItems.length === 0 ? "No pending items found. All orders are fully delivered!" : "No items match your search criteria."}
                        </p>
                    </div>
                ) : (
                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                        <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-700">
                            <tr>
                                <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600" onClick={() => handleSort('productName')}>
                                    <div className="flex items-center justify-between">
                                        Product
                                        <SortIcon field="productName" />
                                    </div>
                                </th>
                                <th className="px-3 py-3 text-center">
                                    <div className="text-center">
                                        <div>Quantities</div>
                                        <div className="text-xs font-normal text-slate-500 dark:text-slate-400 mt-1">
                                            Ord/Del/Pend
                                        </div>
                                    </div>
                                </th>
                                <th className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600" onClick={() => handleSort('unitPrice')}>
                                    <div className="flex items-center justify-end">
                                        Unit Price
                                        <SortIcon field="unitPrice" />
                                    </div>
                                </th>
                                <th className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600" onClick={() => handleSort('pendingQuantity')}>
                                    <div className="flex items-center justify-end">
                                        Pending Value
                                        <SortIcon field="pendingQuantity" />
                                    </div>
                                </th>
                                <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600" onClick={() => handleSort('customerName')}>
                                    <div className="flex items-center justify-between">
                                        Customer
                                        <SortIcon field="customerName" />
                                    </div>
                                </th>
                                <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600" onClick={() => handleSort('orderNumber')}>
                                    <div className="flex items-center justify-between">
                                        SO Number
                                        <SortIcon field="orderNumber" />
                                    </div>
                                </th>
                                <th className="px-4 py-3">PO Number</th>
                                <th className="px-4 py-3 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-600" onClick={() => handleSort('orderDate')}>
                                    <div className="flex items-center justify-between">
                                        Order Date
                                        <SortIcon field="orderDate" />
                                    </div>
                                </th>
                                <th className="px-4 py-3 text-center">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredAndSortedItems.map(item => (
                                <tr key={item.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700">
                                    <td className="px-4 py-4">
                                        <div className="font-medium text-slate-900 dark:text-slate-100">{item.productName}</div>
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.description}</div>
                                    </td>
                                    <td className="px-3 py-4 text-center">
                                        <div className="space-y-1">
                                            <div className="text-xs text-slate-600 dark:text-slate-400">
                                                <span className="font-medium">{item.orderedQuantity}</span> {item.unit}
                                            </div>
                                            <div className="text-xs text-green-600 dark:text-green-400">
                                                <span className="font-medium">{item.deliveredQuantity}</span> {item.unit}
                                            </div>
                                            <div className="text-xs">
                                                <span className="font-bold text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded">
                                                    {item.pendingQuantity} {item.unit}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-right">₹{item.unitPrice.toFixed(2)}</td>
                                    <td className="px-4 py-4 text-right font-semibold text-orange-600 dark:text-orange-400">₹{(item.pendingQuantity * item.unitPrice).toFixed(2)}</td>
                                    <td className="px-4 py-4">
                                        <div className="font-medium text-slate-900 dark:text-slate-100">{item.customerName}</div>
                                    </td>
                                    <td className="px-4 py-4">
                                        <span className="bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 px-2 py-1 rounded text-xs font-medium">
                                            {item.orderNumber}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4">
                                        {item.clientPoNumber ? (
                                            <span className="text-slate-600 dark:text-slate-400 text-xs">{item.clientPoNumber}</span>
                                        ) : (
                                            <span className="text-slate-400 dark:text-slate-500">-</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-4 text-xs">
                                        {new Date(item.orderDate).toLocaleDateString('en-GB')}
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <Button 
                                            size="sm" 
                                            variant="secondary"
                                            onClick={() => handleCreateDeliveryOrder(item)}
                                            icon={<Truck size={14} />}
                                            className="text-xs"
                                        >
                                            Create DO
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </Card>
        </div>
    );
};

export default PendingItems;
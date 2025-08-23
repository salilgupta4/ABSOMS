import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, Sun, Moon, ChevronLeft, ChevronRight } from 'lucide-react';
import { SalesOrder, DocumentStatus } from '../../types';
import { getSalesOrders } from '@/services/salesService';

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

const PendingItemsTVMode: React.FC = () => {
    const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [lightMode, setLightMode] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);
    const navigate = useNavigate();

    // Calculate items per page optimized for 16:9 aspect ratio
    const itemsPerPage = 9; // Optimized for 16:9 TV displays with compact header

    // Update time every second
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Auto refresh data every 30 seconds
    useEffect(() => {
        if (!autoRefresh) return;
        
        const refreshTimer = setInterval(() => {
            fetchData();
        }, 30000);
        
        return () => clearInterval(refreshTimer);
    }, [autoRefresh]);

    // Auto page navigation every 30 seconds
    useEffect(() => {
        const pageTimer = setInterval(() => {
            const totalPages = Math.ceil(pendingItems.length / itemsPerPage);
            if (totalPages > 1) {
                setCurrentPage(prev => (prev + 1) % totalPages);
            }
        }, 30000);
        
        return () => clearInterval(pageTimer);
    }, [pendingItems.length, itemsPerPage]);


    const fetchData = async () => {
        try {
            const orders = await getSalesOrders();
            
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
        } catch (err) {
            console.error("Failed to load sales orders:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Get current page items
    const startIndex = currentPage * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentPageItems = pendingItems.slice(startIndex, endIndex);

    const totalPages = Math.ceil(pendingItems.length / itemsPerPage);

    // Helper function to get customer identifier (first 5 letters without spaces)
    const getCustomerIdentifier = (customerName: string): string => {
        return customerName.replace(/\s+/g, '').substring(0, 5).toUpperCase();
    };

    // Navigation functions
    const goToNextPage = () => {
        if (currentPage < totalPages - 1) {
            setCurrentPage(currentPage + 1);
        }
    };

    const goToPreviousPage = () => {
        if (currentPage > 0) {
            setCurrentPage(currentPage - 1);
        }
    };

    if (loading) {
        return (
            <div className={`min-h-screen flex items-center justify-center ${
                lightMode ? 'bg-gray-100 text-gray-900' : 'bg-gray-900 text-white'
            }`}>
                <div className="text-center">
                    <RefreshCw className="animate-spin mx-auto mb-8" size={80} />
                    <h2 className="text-6xl font-bold">Loading Pending Items...</h2>
                </div>
            </div>
        );
    }


    return (
        <div className={`min-h-screen p-2 ${
            lightMode 
                ? 'bg-gradient-to-br from-gray-100 via-blue-50 to-gray-100 text-gray-900'
                : 'bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white'
        }`}>
            {/* Single Line Header */}
            <div className="flex items-center justify-between px-4 py-2 mb-1">
                {/* Left Section - Back Button and Title */}
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => navigate('/sales/pending-items')}
                        className={`flex items-center space-x-2 text-xl font-bold px-3 py-2 rounded-lg transition-all duration-300 border ${
                            lightMode 
                                ? 'bg-white hover:bg-gray-100 border-gray-400 text-gray-800'
                                : 'bg-gray-800 hover:bg-gray-700 border-gray-500 text-white'
                        }`}
                    >
                        <ArrowLeft size={20} />
                        <span>BACK</span>
                    </button>
                    
                    <div>
                        <h1 className={`text-4xl font-black ${
                            lightMode ? 'text-blue-900' : 'text-white'
                        }`}>
                            PENDING ITEMS
                        </h1>
                        <div className={`text-sm font-bold ${lightMode ? 'text-gray-700' : 'text-gray-300'}`}>
                            {currentTime.toLocaleString('en-GB', { 
                                weekday: 'short',
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                            }).toUpperCase()} | {totalPages > 1 && `PAGE ${currentPage + 1} OF ${totalPages}`}
                        </div>
                    </div>
                </div>

                {/* Right Section - Navigation and Settings */}
                <div className="flex items-center space-x-3">
                    {/* Navigation Controls */}
                    {totalPages > 1 && (
                        <>
                            <button
                                onClick={goToPreviousPage}
                                disabled={currentPage === 0}
                                className={`flex items-center space-x-1 text-lg font-black px-3 py-2 rounded-lg border-2 transition-all duration-300 ${
                                    currentPage === 0
                                        ? lightMode
                                            ? 'bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed'
                                            : 'bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed'
                                        : lightMode
                                            ? 'bg-blue-600 border-blue-700 text-white hover:bg-blue-700'
                                            : 'bg-blue-700 border-blue-600 text-white hover:bg-blue-600'
                                }`}
                            >
                                <ChevronLeft size={20} />
                                <span>PREV</span>
                            </button>
                            
                            <div className={`text-xl font-black px-3 py-2 rounded-lg ${
                                lightMode ? 'bg-gray-200 text-gray-800' : 'bg-gray-800 text-white'
                            }`}>
                                {currentPage + 1}/{totalPages}
                            </div>
                            
                            <button
                                onClick={goToNextPage}
                                disabled={currentPage >= totalPages - 1}
                                className={`flex items-center space-x-1 text-lg font-black px-3 py-2 rounded-lg border-2 transition-all duration-300 ${
                                    currentPage >= totalPages - 1
                                        ? lightMode
                                            ? 'bg-gray-200 border-gray-300 text-gray-400 cursor-not-allowed'
                                            : 'bg-gray-700 border-gray-600 text-gray-500 cursor-not-allowed'
                                        : lightMode
                                            ? 'bg-blue-600 border-blue-700 text-white hover:bg-blue-700'
                                            : 'bg-blue-700 border-blue-600 text-white hover:bg-blue-600'
                                }`}
                            >
                                <span>NEXT</span>
                                <ChevronRight size={20} />
                            </button>
                        </>
                    )}
                    
                    {/* Settings Buttons */}
                    <button
                        onClick={() => setLightMode(!lightMode)}
                        className={`flex items-center space-x-2 text-lg font-bold px-3 py-2 rounded-lg transition-all duration-300 border ${
                            lightMode
                                ? 'bg-gray-800 border-gray-700 text-white hover:bg-gray-700'
                                : 'bg-yellow-600 border-yellow-500 text-white hover:bg-yellow-500'
                        }`}
                    >
                        {lightMode ? <Moon size={18} /> : <Sun size={18} />}
                        <span>{lightMode ? 'DARK' : 'LIGHT'}</span>
                    </button>
                    
                    <button
                        onClick={() => setAutoRefresh(!autoRefresh)}
                        className={`flex items-center space-x-2 text-lg font-bold px-3 py-2 rounded-lg transition-all duration-300 border ${
                            autoRefresh 
                                ? lightMode 
                                    ? 'bg-green-200 border-green-400 text-green-900'
                                    : 'bg-green-800 border-green-600 text-green-200'
                                : lightMode
                                    ? 'bg-gray-200 border-gray-400 text-gray-700'
                                    : 'bg-gray-800 border-gray-600 text-gray-300'
                        }`}
                    >
                        <RefreshCw size={18} className={autoRefresh ? 'animate-spin' : ''} />
                        <span>{autoRefresh ? 'ON' : 'OFF'}</span>
                    </button>
                </div>
            </div>

            {/* Excel-like Grid Layout */}
            {pendingItems.length === 0 ? (
                <div className="text-center py-24">
                    <h2 className={`text-8xl font-black mb-8 ${lightMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        NO PENDING ITEMS
                    </h2>
                    <p className={`text-5xl font-bold ${lightMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        ALL ORDERS ARE FULLY DELIVERED!
                    </p>
                </div>
            ) : (
                <div className={`mx-4 border-8 ${
                    lightMode ? 'border-gray-800 bg-white' : 'border-gray-300 bg-gray-900'
                }`}>
                    {/* Table Header */}
                    <div className={`grid grid-cols-5 border-b-6 ${
                        lightMode 
                            ? 'bg-gray-800 border-gray-800 text-white'
                            : 'bg-gray-300 border-gray-300 text-gray-900'
                    }`}>
                        <div className="col-span-1 px-4 py-4 text-3xl font-black text-center border-r-4 border-current">
                            PRODUCT
                        </div>
                        <div className="col-span-2 px-4 py-4 text-3xl font-black text-center border-r-4 border-current">
                            DESCRIPTION
                        </div>
                        <div className="col-span-1 px-4 py-4 text-3xl font-black text-center border-r-4 border-current">
                            ORDERED / PENDING
                        </div>
                        <div className="col-span-1 px-4 py-4 text-3xl font-black text-center">
                            CUSTOMER
                        </div>
                    </div>

                    {/* Table Body - Optimized for 16:9 */}
                    {currentPageItems.map((item, index) => (
                        <div 
                            key={item.id}
                            className={`grid grid-cols-5 border-b-3 h-24 ${
                                lightMode 
                                    ? `${index % 2 === 0 ? 'bg-gray-100' : 'bg-white'} border-gray-400`
                                    : `${index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-700'} border-gray-500`
                            }`}
                        >
                            {/* Product Name - Larger */}
                            <div className={`col-span-1 px-4 py-2 border-r-4 flex flex-col justify-center overflow-hidden ${
                                lightMode ? 'border-gray-400' : 'border-gray-500'
                            }`}>
                                <div className={`text-4xl font-black leading-tight truncate ${
                                    lightMode ? 'text-gray-900' : 'text-white'
                                }`}>
                                    {item.productName.toUpperCase()}
                                </div>
                                <div className={`text-lg font-bold mt-1 truncate ${
                                    lightMode ? 'text-blue-700' : 'text-blue-300'
                                }`}>
                                    {item.orderNumber}
                                </div>
                            </div>
                            
                            {/* Description - Much Larger */}
                            <div className={`col-span-2 px-4 py-2 border-r-4 flex items-center overflow-hidden ${
                                lightMode ? 'border-gray-400' : 'border-gray-500'
                            }`}>
                                <div className={`text-4xl font-black leading-tight line-clamp-2 ${
                                    lightMode ? 'text-gray-800' : 'text-gray-200'
                                }`}>
                                    {item.description.toUpperCase()}
                                </div>
                            </div>
                            
                            {/* Combined Ordered/Pending Quantity */}
                            <div className={`col-span-1 px-4 py-2 border-r-4 text-center flex flex-col justify-center ${
                                lightMode ? 'border-gray-400' : 'border-gray-500'
                            }`}>
                                <div className="flex items-center justify-center space-x-2">
                                    <span className={`text-5xl font-black ${
                                        lightMode ? 'text-blue-700' : 'text-blue-400'
                                    }`}>
                                        {item.orderedQuantity}
                                    </span>
                                    <span className={`text-3xl font-black ${
                                        lightMode ? 'text-gray-600' : 'text-gray-400'
                                    }`}>
                                        /
                                    </span>
                                    <span className={`text-6xl font-black ${
                                        lightMode ? 'text-red-700' : 'text-red-400'
                                    }`}>
                                        {item.pendingQuantity}
                                    </span>
                                </div>
                                <div className={`text-xl font-bold mt-1 ${
                                    lightMode ? 'text-gray-700' : 'text-gray-300'
                                }`}>
                                    {item.unit.toUpperCase()}
                                </div>
                            </div>
                            
                            {/* Customer */}
                            <div className="col-span-1 px-4 py-2 text-center flex flex-col justify-center overflow-hidden">
                                <div className={`text-6xl font-black mb-1 ${
                                    lightMode ? 'text-green-700' : 'text-green-400'
                                }`}>
                                    {getCustomerIdentifier(item.customerName)}
                                </div>
                                <div className={`text-lg font-bold truncate ${
                                    lightMode ? 'text-gray-700' : 'text-gray-300'
                                }`}>
                                    {item.customerName.toUpperCase()}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PendingItemsTVMode;
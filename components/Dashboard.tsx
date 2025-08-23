

import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
const { Link, useSearchParams } = ReactRouterDOM;
import { FileText, ShoppingCart, Truck, AlertTriangle, Loader, Package, X } from 'lucide-react';
import { Quote, SalesOrder, DeliveryOrder, PurchaseOrder, InventoryItem, DocumentStatus } from '@/types';
import Card from './ui/Card';
import Button from './ui/Button';
import { SkeletonTable } from './ui/Skeleton';
import { getQuotes, getSalesOrders, getDeliveryOrders } from '@/services/salesService';
import { getPurchaseOrders } from './purchase/PurchaseOrderList';
import { getInventory } from './inventory/inventoryService';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string; loading: boolean; to: string; }> = ({ title, value, icon, color, loading, to }) => (
  <Link to={to} className="block">
    <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-lg shadow-md flex items-center transition-all duration-300 hover:shadow-lg hover:-translate-y-1 h-full">
        <div className={`p-3 rounded-full ${color}`}>
        {icon}
        </div>
        <div className="ml-3 min-w-0 flex-1">
        <p className="text-sm sm:text-base font-medium text-slate-500 dark:text-slate-400">{title}</p>
        {loading ? <Loader size={24} className="animate-spin mt-1" /> : <p className="text-2xl sm:text-3xl font-bold text-slate-800 dark:text-slate-100">{value}</p>}
        </div>
    </div>
  </Link>
);

interface DocumentListCardProps<T extends { id: string; [key: string]: any }> {
    title: string;
    documents: T[];
    linkTo: string;
    dateKey: keyof T;
    numberKey: keyof T;
    nameKey: keyof T;
}

const DocumentListCard = <T extends { id: string; [key: string]: any }>({
    title,
    documents,
    linkTo,
    dateKey,
    numberKey,
    nameKey,
}: DocumentListCardProps<T>): React.ReactElement => (
    <Card title={title} className="h-full">
        <ul className="divide-y divide-slate-100 dark:divide-slate-700">
            {documents.length > 0 ? (
                documents.map(doc => (
                    <li key={doc.id} className="py-3 px-2">
                        <div className="flex justify-between items-center text-sm">
                            <p className="font-medium text-slate-800 dark:text-slate-200 truncate mr-2">{doc[nameKey]}</p>
                            <p className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm whitespace-nowrap">{new Date(doc[dateKey]).toLocaleDateString('en-GB')}</p>
                        </div>
                        <Link to={`${linkTo}/${doc.id}/view`} className="text-sm text-primary dark:text-blue-400 hover:underline font-medium">
                          {(doc[numberKey] as string) + (doc.revisionNumber ? `-Rev${doc.revisionNumber}` : '')}
                        </Link>
                    </li>
                ))
            ) : (
                <p className="text-sm text-slate-500 text-center py-4">No recent documents.</p>
            )}
        </ul>
        <div className="text-right mt-4">
            <Button to={linkTo} variant="secondary" size="sm">View All</Button>
        </div>
    </Card>
);


const Dashboard: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [showAccessDenied, setShowAccessDenied] = useState(false);
    const [accessDeniedType, setAccessDeniedType] = useState<'access_denied' | 'admin_required' | null>(null);
    const [stats, setStats] = useState({
        openQuotes: 0,
        pendingSalesOrders: 0,
        actionRequired: 0,
    });
    const [lists, setLists] = useState({
        topInventory: [] as InventoryItem[],
        recentOpenQuotes: [] as Quote[],
        recentSalesOrders: [] as SalesOrder[],
        recentDeliveries: [] as DeliveryOrder[],
        recentPurchaseOrders: [] as PurchaseOrder[]
    });

    useEffect(() => {
        // Check for access denied errors
        const errorType = searchParams.get('error');
        if (errorType === 'access_denied' || errorType === 'admin_required') {
            setShowAccessDenied(true);
            setAccessDeniedType(errorType as 'access_denied' | 'admin_required');
            // Remove the error parameter from URL
            setSearchParams({});
        }
    }, [searchParams, setSearchParams]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [quotes, salesOrders, deliveryOrders, purchaseOrders, inventory] = await Promise.all([
                    getQuotes(),
                    getSalesOrders(),
                    getDeliveryOrders(),
                    getPurchaseOrders(),
                    getInventory()
                ]);

                setStats({
                    openQuotes: quotes.filter(q => [DocumentStatus.Draft, DocumentStatus.Sent, DocumentStatus.Discussion].includes(q.status)).length,
                    pendingSalesOrders: salesOrders.filter(so => [DocumentStatus.Approved, DocumentStatus.Partial].includes(so.status)).length,
                    actionRequired: quotes.filter(q => q.status === DocumentStatus.Approved).length,
                });

                setLists({
                    topInventory: inventory.sort((a,b) => b.currentStock - a.currentStock).slice(0, 10),
                    recentOpenQuotes: quotes.filter(q => [DocumentStatus.Draft, DocumentStatus.Sent, DocumentStatus.Discussion].includes(q.status)).slice(0, 5),
                    recentSalesOrders: salesOrders.slice(0, 5),
                    recentDeliveries: deliveryOrders.slice(0, 5),
                    recentPurchaseOrders: purchaseOrders.slice(0, 5)
                });

            } catch (error) {
                console.error("Failed to load dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);


  return (
    <div className="space-y-6">
      {/* Access Denied Alert */}
      {showAccessDenied && (
        <div className="bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center">
            <AlertTriangle className="text-red-500 mr-3" size={20} />
            <div>
              <h4 className="text-red-800 dark:text-red-200 font-semibold">Access Denied</h4>
              <p className="text-red-600 dark:text-red-300 text-sm">
                {accessDeniedType === 'admin_required' 
                  ? 'You need administrator privileges to access this feature. Please contact your administrator.'
                  : 'You don\'t have permission to access this module. Please contact your administrator.'
                }
              </p>
            </div>
          </div>
          <button 
            onClick={() => {
              setShowAccessDenied(false);
              setAccessDeniedType(null);
            }}
            className="text-red-400 hover:text-red-600 dark:hover:text-red-200"
          >
            <X size={20} />
          </button>
        </div>
      )}
      
      <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Adaptec Order Management System</h3>
      
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6">
        <StatCard to="/sales/quotes?statusFilter=open" title="Open Quotes" value={stats.openQuotes} icon={<FileText className="text-white" />} color="bg-blue-500" loading={loading} />
        <StatCard to="/sales/orders?statusFilter=open" title="Pending Sales Orders" value={stats.pendingSalesOrders} icon={<ShoppingCart className="text-white" />} color="bg-green-500" loading={loading} />
        <StatCard to="/sales/orders?statusFilter=open" title="Ready for Delivery" value={stats.pendingSalesOrders} icon={<Truck className="text-white" />} color="bg-yellow-500" loading={loading} />
        <StatCard to="/sales/quotes?statusFilter=approved" title="Approved Quotes" value={stats.actionRequired} icon={<AlertTriangle className="text-white" />} color="bg-red-500" loading={loading} />
      </div>

      {/* Main Content Grids */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Top Inventory */}
        <div className="xl:col-span-2">
            <Card title="Top 10 Inventory Items" icon={<Package size={20} />} className="h-full">
                {loading ? <SkeletonTable rows={10} cols={2} /> : 
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-left text-sm text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-700">
                            <tr>
                                <th className="px-3 py-2">Product</th>
                                <th className="px-3 py-2 text-right">Current Stock</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lists.topInventory.map(item => (
                                <tr key={item.productId} className="border-t border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <td className="px-3 py-2 font-medium text-slate-700 dark:text-slate-200">{item.productName}</td>
                                    <td className="px-3 py-2 text-right font-bold">
                                        <span className={item.currentStock > 10 ? 'text-green-600' : 'text-red-500'}>
                                          {item.currentStock}
                                        </span>
                                        <span className="text-sm ml-1 text-slate-500">{item.unit}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
                }
            </Card>
        </div>

        {/* Recent Open Quotes */}
        <div className="xl:col-span-1">
             <DocumentListCard
                title="Last 5 Open Quotes"
                documents={lists.recentOpenQuotes}
                linkTo="/sales/quotes"
                dateKey="issueDate"
                numberKey="quoteNumber"
                nameKey="customerName"
            />
        </div>
      </div>
      
      {/* Recent Document Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <DocumentListCard
            title="Last 5 Sales Orders"
            documents={lists.recentSalesOrders}
            linkTo="/sales/orders"
            dateKey="orderDate"
            numberKey="orderNumber"
            nameKey="customerName"
        />
         <DocumentListCard
            title="Last 5 Deliveries"
            documents={lists.recentDeliveries}
            linkTo="/sales/deliveries"
            dateKey="deliveryDate"
            numberKey="deliveryNumber"
            nameKey="customerName"
        />
        <DocumentListCard
            title="Last 5 Purchase Orders"
            documents={lists.recentPurchaseOrders}
            linkTo="/purchase/orders"
            dateKey="orderDate"
            numberKey="poNumber"
            nameKey="vendorName"
        />
      </div>

    </div>
  );
};

export default Dashboard;
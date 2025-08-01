
import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
const { useParams, Link, useNavigate } = ReactRouterDOM;
import ReactDOM from 'react-dom/client';
import Card from '../ui/Card';
import { SalesOrder, CompanyDetails, PdfSettings, PointOfContact } from '../../types';
import { getSalesOrder } from './SalesOrderList';
import { Loader, Truck, Edit, ArrowLeft, Download, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';
import { getCompanyDetails } from '../settings/CompanyDetails';
import { getPdfSettings } from '../settings/pdfSettingsService';
import { getPointsOfContact } from '@/services/pointOfContactService';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import PrintWrapper from '../Print/PrintWrapper';
import SalesOrderPrint from '../Print/SalesOrderPrint';
import { getEmailService } from '../../services/emailService';

// --- CSV Export Helper ---
const convertToCSV = (data: any[], headers: string[]): string => {
    const headerRow = headers.join(',');
    const rows = data.map(obj => 
        headers.map(header => {
            let value = obj[header];
            if (value === null || value === undefined) {
                value = '';
            } else if (typeof value === 'object') {
                value = JSON.stringify(value).replace(/"/g, '""');
            }
            const stringValue = String(value).replace(/"/g, '""');
            return `"${stringValue}"`;
        }).join(',')
    );
    return [headerRow, ...rows].join('\n');
};

const downloadCSV = (csvString: string, filename: string) => {
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};


const DataField: React.FC<{ label: string; value?: React.ReactNode, className?: string }> = ({ label, value, className }) => (
    <div className={className}>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="font-semibold text-slate-800">{value || '-'}</p>
    </div>
);

const SalesOrderView: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState<SalesOrder | null>(null);
    const [companyDetails, setCompanyDetails] = useState<CompanyDetails | null>(null);
    const [pdfSettings, setPdfSettings] = useState<PdfSettings | null>(null);
    const [pointOfContact, setPointOfContact] = useState<PointOfContact | null>(null);
    const [loading, setLoading] = useState(true);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [emailStatus, setEmailStatus] = useState<'success' | 'error' | null>(null);

    useEffect(() => {
        if (id) {
            setLoading(true);
            Promise.all([
                getSalesOrder(id),
                getCompanyDetails(),
                getPdfSettings(),
                getPointsOfContact()
            ]).then(([orderData, companyData, pdfSettingsData, contactsData]) => {
                setOrder(orderData || null);
                setCompanyDetails(companyData);
                setPdfSettings(pdfSettingsData);
                // Find the point of contact for this sales order
                if (orderData?.pointOfContactId && contactsData) {
                    const contact = contactsData.find(c => c.id === orderData.pointOfContactId);
                    setPointOfContact(contact || null);
                }
                setLoading(false);
            });
        }
    }, [id]);

    const handleExportCsv = () => {
        if (!order) return;
        const headers = [
            'OrderNumber', 'ClientPoNumber', 'CustomerName', 'OrderDate', 'OrderTotal', 'Status',
            'Item_ProductName', 'Item_Description', 'Item_HSN', 'Item_QuantityOrdered', 'Item_QuantityDelivered', 'Item_Unit', 'Item_UnitPrice', 'Item_Total'
        ];
        const data = order.lineItems.map(item => ({
            OrderNumber: order.orderNumber,
            ClientPoNumber: order.clientPoNumber,
            CustomerName: order.customerName,
            OrderDate: new Date(order.orderDate).toLocaleDateString('en-CA'),
            OrderTotal: order.total,
            Status: order.status,
            Item_ProductName: item.productName,
            Item_Description: item.description,
            Item_HSN: item.hsnCode,
            Item_QuantityOrdered: item.quantity,
            Item_QuantityDelivered: order.deliveredQuantities ? order.deliveredQuantities[item.id] || 0 : 0,
            Item_Unit: item.unit,
            Item_UnitPrice: item.unitPrice,
            Item_Total: item.total
        }));
        
        const csvString = convertToCSV(data, headers);
        downloadCSV(csvString, `SalesOrder-${order.orderNumber}.csv`);
    };

    const handleDownloadPdf = async () => {
        if (!order || !companyDetails || !pdfSettings) return;
        setIsGeneratingPdf(true);
        
        const ITEMS_PER_PAGE = 12;
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const totalPages = Math.max(1, Math.ceil(order.lineItems.length / ITEMS_PER_PAGE));
    
        for (let i = 0; i < totalPages; i++) {
            const itemStartIndex = i * ITEMS_PER_PAGE;
            const chunk = order.lineItems.slice(itemStartIndex, itemStartIndex + ITEMS_PER_PAGE);
            const pageOrder = { ...order, lineItems: chunk };
            const isLastPage = i === totalPages - 1;

            const printContainer = document.createElement('div');
            printContainer.style.position = 'absolute';
            printContainer.style.left = '-9999px';
            document.body.appendChild(printContainer);

            const root = ReactDOM.createRoot(printContainer);
            root.render(
                <PrintWrapper companyDetails={companyDetails} settings={pdfSettings} currentPage={i + 1} totalPages={totalPages}>
                    <SalesOrderPrint 
                        order={pageOrder} 
                        settings={pdfSettings} 
                        companyDetails={companyDetails}
                        isLastPage={isLastPage}
                        itemStartIndex={itemStartIndex}
                        pointOfContact={pointOfContact || undefined}
                    />
                </PrintWrapper>
            );

            await new Promise(resolve => setTimeout(resolve, 500)); 
            
            const canvas = await html2canvas(printContainer.children[0] as HTMLElement, { scale: 3 });
            const imgData = canvas.toDataURL('image/png');

            if (i > 0) {
                pdf.addPage();
            }
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
            
            root.unmount();
            document.body.removeChild(printContainer);
        }

        const filename = `SalesOrder-${order?.orderNumber}.pdf`;
        pdf.save(filename);
        setIsGeneratingPdf(false);

        // Send email notification if enabled
        if (companyDetails.emailSettings?.enableNotifications) {
            setIsSendingEmail(true);
            setEmailStatus(null);
            try {
                const emailService = getEmailService(companyDetails.emailSettings);
                
                await emailService.sendSalesOrderNotification(
                    order,
                    companyDetails
                );
                
                setEmailStatus('success');
                console.log('Sales Order email notification sent successfully');
                
                // Clear status after 3 seconds
                setTimeout(() => setEmailStatus(null), 3000);
            } catch (error) {
                console.error('Failed to send sales order email notification:', error);
                setEmailStatus('error');
                
                // Clear status after 5 seconds
                setTimeout(() => setEmailStatus(null), 5000);
            } finally {
                setIsSendingEmail(false);
            }
        }
    };

    if (loading) {
        return <Card title="Loading Sales Order..." bodyClassName="text-center p-8"><Loader className="animate-spin inline-block" /></Card>;
    }

    if (!order || !companyDetails || !pdfSettings) {
        return <Card title="Error"><p className="p-4">Sales Order not found. <Link to="/sales/orders" className="text-primary">Go back to list</Link>.</p></Card>;
    }

    return (
        <div className="space-y-6">
            {emailStatus && (
                <div className={`p-4 rounded-md flex items-center space-x-3 ${
                    emailStatus === 'success' 
                        ? 'bg-green-50 border border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-300' 
                        : 'bg-red-50 border border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'
                }`}>
                    {emailStatus === 'success' ? (
                        <CheckCircle size={20} className="text-green-600 dark:text-green-400" />
                    ) : (
                        <AlertCircle size={20} className="text-red-600 dark:text-red-400" />
                    )}
                    <span>
                        {emailStatus === 'success' 
                            ? 'Email notification sent successfully!' 
                            : 'Failed to send email notification. Please check your email settings.'}
                    </span>
                </div>
            )}
             <div className="flex justify-between items-center">
                <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Sales Order #{order.orderNumber}</h3>
                <div className="flex space-x-2">
                    <Button variant="secondary" onClick={() => navigate(-1)} icon={<ArrowLeft size={16}/>}>Back</Button>
                    <Button to={`/sales/orders/${order.id}/edit`} variant="secondary" icon={<Edit size={16}/>}>Edit</Button>
                    <Button to={`/sales/deliveries/new/${order.id}`} icon={<Truck size={16}/>} disabled={order.status === 'Closed'}>Create Delivery</Button>
                    <Button onClick={handleExportCsv} variant="secondary" icon={<FileText size={16}/>}>Export CSV</Button>
                    <Button onClick={handleDownloadPdf} variant="secondary" icon={(isGeneratingPdf || isSendingEmail) ? <Loader size={16} className="animate-spin" /> : <Download size={16}/>} disabled={isGeneratingPdf || isSendingEmail}>
                        {isGeneratingPdf ? 'Generating...' : isSendingEmail ? 'Sending Email...' : 'Download PDF'}
                    </Button>
                </div>
            </div>

            <Card>
                <div className="p-6">
                     <div className="grid grid-cols-2 gap-6 p-4 border rounded-md bg-slate-50 dark:bg-slate-700">
                       <div>
                           <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Customer:</p>
                           <p className="font-bold text-slate-800 dark:text-slate-100">{order.customerName}</p>
                           <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line">{order.shippingAddress.line1}, {order.shippingAddress.city}</p>
                       </div>
                       <div className="text-right">
                            <DataField label="Order Date" value={new Date(order.orderDate).toLocaleDateString('en-GB')} />
                            <DataField label="Client PO #" value={order.clientPoNumber} />
                            <DataField label="Contact" value={<>{order.contactName} {order.contactPhone && `(${order.contactPhone})`}</>} />
                            <DataField label="Original Quote #" value={<Link to={`/sales/quotes/${order.linkedQuoteId}/view`} className="text-primary hover:underline">{order.quoteNumber}</Link>} />
                       </div>
                    </div>
                </div>
            </Card>

            <Card title="Line Items" bodyClassName="overflow-x-auto">
                 <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                    <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-700">
                        <tr>
                            <th className="px-6 py-3">Product</th>
                            <th className="px-6 py-3 text-center">Ordered</th>
                            <th className="px-6 py-3 text-center">Delivered</th>
                            <th className="px-6 py-3 text-right">Rate</th>
                            <th className="px-6 py-3 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.lineItems.map(item => {
                            const deliveredQty = order.deliveredQuantities ? order.deliveredQuantities[item.id] || 0 : 0;
                            return (
                                <tr key={item.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700">
                                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{item.productName}<p className="text-xs text-slate-500 dark:text-slate-400">{item.description}</p></td>
                                    <td className="px-6 py-4 text-center">{item.quantity} {item.unit}</td>
                                    <td className="px-6 py-4 text-center font-bold text-green-600">{deliveredQty} {item.unit}</td>
                                    <td className="px-6 py-4 text-right">₹{item.unitPrice.toFixed(2)}</td>
                                    <td className="px-6 py-4 text-right font-semibold">₹{item.total.toFixed(2)}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot className="font-semibold text-slate-800 dark:text-slate-100">
                        <tr className="text-lg bg-slate-50 dark:bg-slate-700">
                            <td colSpan={4} className="px-6 py-3 text-right">Grand Total</td>
                            <td className="px-6 py-3 text-right text-primary">₹{order.total.toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
            </Card>
        </div>
    );
};

export default SalesOrderView;
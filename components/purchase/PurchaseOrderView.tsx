
import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
const { useParams, Link, useNavigate } = ReactRouterDOM;
import ReactDOM from 'react-dom/client';
import Card from '../ui/Card';
import { PurchaseOrder, CompanyDetails, PdfSettings } from '../../types';
import { getPurchaseOrder } from './PurchaseOrderList';
import { Loader, Edit, ArrowLeft, Download, FileText } from 'lucide-react';
import Button from '../ui/Button';
import WhatsAppButton from '../ui/WhatsAppButton';
import { getCompanyDetails } from '../settings/CompanyDetails';
import { getPdfSettings } from '../settings/pdfSettingsService';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import PrintWrapper from '../Print/PrintWrapper';
import PurchaseOrderPrint from '../Print/PurchaseOrderPrint';

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

export const PurchaseOrderView: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState<PurchaseOrder | null>(null);
    const [companyDetails, setCompanyDetails] = useState<CompanyDetails | null>(null);
    const [pdfSettings, setPdfSettings] = useState<PdfSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

    useEffect(() => {
        if (id) {
            setLoading(true);
            Promise.all([
                getPurchaseOrder(id),
                getCompanyDetails(),
                getPdfSettings()
            ]).then(([orderData, companyData, pdfSettingsData]) => {
                setOrder(orderData || null);
                setCompanyDetails(companyData || null);
                setPdfSettings(pdfSettingsData);
                setLoading(false);
            });
        }
    }, [id]);
    
    const handleExportCsv = () => {
        if (!order) return;
        const headers = [
            'PoNumber', 'VendorName', 'OrderDate', 'PoTotal', 'Status',
            'Item_ProductName', 'Item_Description', 'Item_HSN', 'Item_Quantity', 'Item_Unit', 'Item_UnitPrice', 'Item_Total'
        ];
        const data = order.lineItems.map(item => ({
            PoNumber: order.poNumber,
            VendorName: order.vendorName,
            OrderDate: new Date(order.orderDate).toLocaleDateString('en-CA'),
            PoTotal: order.total,
            Status: order.status,
            Item_ProductName: item.productName,
            Item_Description: item.description,
            Item_HSN: item.hsnCode,
            Item_Quantity: item.quantity,
            Item_Unit: item.unit,
            Item_UnitPrice: item.unitPrice,
            Item_Total: item.total
        }));
        
        const csvString = convertToCSV(data, headers);
        downloadCSV(csvString, `PurchaseOrder-${order.poNumber}.csv`);
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
                    <PurchaseOrderPrint 
                        order={pageOrder} 
                        settings={pdfSettings} 
                        companyDetails={companyDetails}
                        isLastPage={isLastPage}
                        itemStartIndex={itemStartIndex}
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

        // Create blob for WhatsApp sharing
        const pdfBlob = pdf.output('blob');
        setPdfBlob(pdfBlob);
        
        pdf.save(`PurchaseOrder-${order?.poNumber}.pdf`);
        setIsGeneratingPdf(false);
    };

    if (loading) {
        return <Card title="Loading Purchase Order..." bodyClassName="text-center p-8"><Loader className="animate-spin inline-block" /></Card>;
    }

    if (!order || !companyDetails || !pdfSettings) {
        return <Card title="Error"><p className="p-4">Purchase Order not found. <Link to="/purchase/orders" className="text-primary">Go back to list</Link>.</p></Card>;
    }

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Purchase Order #{order.poNumber}</h3>
                <div className="flex items-center space-x-2">
                    <Button variant="secondary" onClick={() => navigate(-1)} icon={<ArrowLeft size={16}/>}>Back</Button>
                    <Button to={`/purchase/orders/${order.id}/edit`} variant="secondary" icon={<Edit size={16}/>}>Edit</Button>
                    <Button onClick={handleExportCsv} variant="secondary" icon={<FileText size={16}/>}>Export CSV</Button>
                    <Button onClick={handleDownloadPdf} icon={isGeneratingPdf ? <Loader size={16} className="animate-spin" /> : <Download size={16}/>} disabled={isGeneratingPdf}>
                         {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
                    </Button>
                    {pdfBlob && (
                        <WhatsAppButton
                            pdfBlob={pdfBlob}
                            documentType="Purchase Order"
                            documentNumber={order.poNumber}
                            customerName={order.vendorName}
                            customerPhone={''}  // PurchaseOrder doesn't track vendor phone
                            companyName={companyDetails?.name}
                            size="md"
                        />
                    )}
                </div>
            </div>

            <Card>
                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 border rounded-md bg-slate-50 dark:bg-slate-700">
                       <div className="col-span-1">
                           <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Vendor:</p>
                           <p className="font-bold text-slate-800 dark:text-slate-100">{order.vendorName}</p>
                       </div>
                        <div className="col-span-1 md:text-right">
                            <DataField label="Order Date" value={new Date(order.orderDate).toLocaleDateString('en-GB')} />
                       </div>
                       <div className="col-span-2 md:col-span-1">
                           <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Deliver To:</p>
                           <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line">{order.deliveryAddress}</p>
                       </div>
                    </div>
                </div>
            </Card>

            <Card title="Line Items" bodyClassName="overflow-x-auto">
                 <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                    <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-700">
                        <tr>
                            <th className="px-6 py-3">Product</th>
                            <th className="px-6 py-3">HSN</th>
                            <th className="px-6 py-3 text-center">Quantity</th>
                            <th className="px-6 py-3 text-right">Rate</th>
                            <th className="px-6 py-3 text-right">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.lineItems.map(item => (
                            <tr key={item.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700">
                                <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{item.productName}<p className="text-xs text-slate-500 dark:text-slate-400">{item.description}</p></td>
                                <td className="px-6 py-4">{item.hsnCode}</td>
                                <td className="px-6 py-4 text-center">{item.quantity} {item.unit}</td>
                                <td className="px-6 py-4 text-right">₹{item.unitPrice.toFixed(2)}</td>
                                <td className="px-6 py-4 text-right font-semibold">₹{item.total.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot className="font-semibold text-slate-800 dark:text-slate-100">
                         <tr>
                            <td colSpan={4} className="px-6 py-2 text-right">Subtotal</td>
                            <td className="px-6 py-2 text-right">₹{order.subTotal.toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td colSpan={4} className="px-6 py-2 text-right">GST ({order.lineItems[0]?.taxRate || 18}%)</td>
                            <td className="px-6 py-2 text-right">₹{order.gstTotal.toFixed(2)}</td>
                        </tr>
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

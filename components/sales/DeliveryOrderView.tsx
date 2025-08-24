
import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
const { useParams, Link, useNavigate } = ReactRouterDOM;
import ReactDOM from 'react-dom/client';
import Card from '../ui/Card';
import { DeliveryOrder, CompanyDetails, PdfSettings, PointOfContact } from '../../types';
import { getDeliveryOrder } from '@/services/salesService';
import { Loader, Edit, ArrowLeft, Download, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import Button from '../ui/Button';
import WhatsAppButton from '../ui/WhatsAppButton';
import { getCompanyDetails } from '../settings/CompanyDetails';
import { getPdfSettings } from '../settings/pdfSettingsService';
import { getPointsOfContact } from '@/services/pointOfContactService';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import PrintWrapper from '../Print/PrintWrapper';
import DeliveryOrderPrint from '../Print/DeliveryOrderPrint';
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

const DataField: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
    <div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{label}</p>
        <p className="font-semibold text-slate-800 dark:text-slate-200">{value}</p>
    </div>
);

const DeliveryOrderView: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState<DeliveryOrder | null>(null);
    const [companyDetails, setCompanyDetails] = useState<CompanyDetails | null>(null);
    const [pdfSettings, setPdfSettings] = useState<PdfSettings | null>(null);
    const [pointOfContact, setPointOfContact] = useState<PointOfContact | null>(null);
    const [loading, setLoading] = useState(true);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [emailStatus, setEmailStatus] = useState<'success' | 'error' | null>(null);
    const [pdfBlob, setPdfBlob] = useState<Blob | null>(null);

    useEffect(() => {
        if (id) {
            setLoading(true);
            Promise.all([
                getDeliveryOrder(id),
                getCompanyDetails(),
                getPdfSettings(),
                getPointsOfContact()
            ]).then(([orderData, companyData, pdfSettingsData, contactsData]) => {
                setOrder(orderData || null);
                setCompanyDetails(companyData);
                setPdfSettings(pdfSettingsData);
                // Find the point of contact for this delivery order
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
            'DeliveryNumber', 'SalesOrderNumber', 'CustomerName', 'DeliveryDate', 'VehicleNumber',
            'Item_ProductName', 'Item_Description', 'Item_HSN', 'Item_QuantityDelivered', 'Item_Unit'
        ];
        const data = order.lineItems.map(item => ({
            DeliveryNumber: order.deliveryNumber,
            SalesOrderNumber: order.salesOrderNumber,
            CustomerName: order.customerName,
            DeliveryDate: new Date(order.deliveryDate).toLocaleDateString('en-CA'),
            VehicleNumber: order.vehicleNumber || '',
            Item_ProductName: item.productName,
            Item_Description: item.description,
            Item_HSN: item.hsnCode,
            Item_QuantityDelivered: item.quantity,
            Item_Unit: item.unit
        }));
        
        const csvString = convertToCSV(data, headers);
        downloadCSV(csvString, `DeliveryOrder-${order.deliveryNumber}.csv`);
    };

    const handleDownloadPdf = async () => {
        if (!order || !companyDetails || !pdfSettings) return;
        setIsGeneratingPdf(true);
        
        const ITEMS_PER_PAGE = 14;
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
                    <DeliveryOrderPrint 
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

        const filename = `DeliveryOrder-${order?.deliveryNumber}.pdf`;
        
        // Create blob for WhatsApp sharing
        const pdfBlob = pdf.output('blob');
        setPdfBlob(pdfBlob);
        
        pdf.save(filename);
        setIsGeneratingPdf(false);

        // Send email notification if enabled
        if (companyDetails.emailSettings?.enableNotifications) {
            setIsSendingEmail(true);
            setEmailStatus(null);
            try {
                const emailService = getEmailService(companyDetails.emailSettings);
                
                await emailService.sendDeliveryOrderNotification(
                    order,
                    companyDetails
                );
                
                setEmailStatus('success');
                console.log('Delivery Order email notification sent successfully');
                
                // Clear status after 3 seconds
                setTimeout(() => setEmailStatus(null), 3000);
            } catch (error) {
                console.error('Failed to send delivery order email notification:', error);
                setEmailStatus('error');
                
                // Clear status after 5 seconds
                setTimeout(() => setEmailStatus(null), 5000);
            } finally {
                setIsSendingEmail(false);
            }
        }
    };

    if (loading) {
        return <Card title="Loading Delivery Order..." bodyClassName="text-center p-8"><Loader className="animate-spin inline-block" /></Card>;
    }

    if (!order || !companyDetails || !pdfSettings) {
        return <Card title="Error"><p className="p-4">Delivery Order not found. <Link to="/sales/deliveries" className="text-primary">Go back to list</Link>.</p></Card>;
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
                <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Delivery Order #{order.deliveryNumber}</h3>
                <div className="flex items-center space-x-2">
                     <Button variant="secondary" onClick={() => navigate(-1)} icon={<ArrowLeft size={16}/>}>Back</Button>
                     <Button to={`/sales/deliveries/${order.id}/edit`} variant="secondary" icon={<Edit size={16}/>}>Edit</Button>
                     <Button onClick={handleExportCsv} variant="secondary" icon={<FileText size={16}/>}>Export CSV</Button>
                     <Button onClick={handleDownloadPdf} icon={(isGeneratingPdf || isSendingEmail) ? <Loader size={16} className="animate-spin" /> : <Download size={16}/>} disabled={isGeneratingPdf || isSendingEmail}>
                        {isGeneratingPdf ? 'Generating...' : isSendingEmail ? 'Sending Email...' : 'Download PDF'}
                    </Button>
                    {pdfBlob && (
                        <WhatsAppButton
                            pdfBlob={pdfBlob}
                            documentType="Delivery Order"
                            documentNumber={order.deliveryNumber}
                            customerName={order.customerName}
                            customerPhone={order.contactPhone || ''}
                            companyName={companyDetails?.name}
                            size="md"
                        />
                    )}
                </div>
            </div>

            <Card>
                <div className="p-6">
                    <div className="grid grid-cols-2 gap-6 p-4 border rounded-md bg-slate-50 dark:bg-slate-700 dark:border-slate-600">
                       <div>
                           <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Recipient:</p>
                           <p className="font-bold text-slate-800 dark:text-slate-100">{order.customerName}</p>
                           <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line">{order.shippingAddress.line1}, {order.shippingAddress.line2 || ''}</p>
                           <p className="text-sm text-slate-600 dark:text-slate-300">{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}</p>
                           <p className="text-sm text-slate-600 dark:text-slate-300 mt-2"><strong>Contact:</strong> {order.contactName} {order.contactPhone && `(${order.contactPhone})`}</p>
                       </div>
                       <div className="text-right">
                            <DataField label="Delivery Date" value={new Date(order.deliveryDate).toLocaleDateString('en-GB')} />
                            <DataField label="Original SO #" value={<Link to={`/sales/orders/${order.salesOrderId}/view`} className="text-primary hover:underline">{order.salesOrderNumber}</Link>} />
                            <DataField label="Vehicle #" value={order.vehicleNumber || 'N/A'} />
                       </div>
                    </div>
                </div>
            </Card>

            <Card title="Delivered Items" bodyClassName="overflow-x-auto">
                 <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                    <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-700">
                        <tr>
                            <th className="px-6 py-3">Product</th>
                            <th className="px-6 py-3">HSN</th>
                            <th className="px-6 py-3 text-center">Quantity Delivered</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.lineItems.map(item => (
                            <tr key={item.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700">
                                <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{item.productName}<p className="text-xs text-slate-500 dark:text-slate-400">{item.description}</p></td>
                                <td className="px-6 py-4 text-slate-900 dark:text-slate-100">{item.hsnCode}</td>
                                <td className="px-6 py-4 text-center font-semibold text-slate-900 dark:text-slate-100">{item.quantity} {item.unit}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>
        </div>
    );
};

export default DeliveryOrderView;
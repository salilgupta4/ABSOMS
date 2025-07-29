
import React, { useState, useEffect, useRef } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
const { useParams, Link, useNavigate } = ReactRouterDOM;
import Card from '../ui/Card';
import { DeliveryOrder, CompanyDetails, PdfSettings } from '../../types';
import { getDeliveryOrder } from './DeliveryOrderList';
import { Loader, Edit, ArrowLeft, Download, FileText } from 'lucide-react';
import Button from '../ui/Button';
import { getCompanyDetails } from '../settings/CompanyDetails';
import { getPdfSettings } from '../settings/pdfSettingsService';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import PrintWrapper from '../Print/PrintWrapper';
import DeliveryOrderPrint from '../Print/DeliveryOrderPrint';

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
        <p className="text-sm text-slate-500">{label}</p>
        <p className="font-semibold text-slate-800">{value}</p>
    </div>
);

const DeliveryOrderView: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState<DeliveryOrder | null>(null);
    const [companyDetails, setCompanyDetails] = useState<CompanyDetails | null>(null);
    const [pdfSettings, setPdfSettings] = useState<PdfSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (id) {
            setLoading(true);
            Promise.all([
                getDeliveryOrder(id),
                getCompanyDetails(),
                getPdfSettings()
            ]).then(([orderData, companyData, pdfSettingsData]) => {
                setOrder(orderData || null);
                setCompanyDetails(companyData);
                setPdfSettings(pdfSettingsData);
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
        if (!printRef.current) return;
        setIsGeneratingPdf(true);
        const canvas = await html2canvas(printRef.current, { scale: 3 });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`DeliveryOrder-${order?.deliveryNumber}.pdf`);
        setIsGeneratingPdf(false);
    };

    if (loading) {
        return <Card title="Loading Delivery Order..." bodyClassName="text-center p-8"><Loader className="animate-spin inline-block" /></Card>;
    }

    if (!order || !companyDetails || !pdfSettings) {
        return <Card title="Error"><p className="p-4">Delivery Order not found. <Link to="/sales/deliveries" className="text-primary">Go back to list</Link>.</p></Card>;
    }

    return (
        <div className="space-y-6">
             <div className="flex justify-between items-center">
                <h3 className="text-3xl font-bold text-slate-800">Delivery Order #{order.deliveryNumber}</h3>
                <div className="flex items-center space-x-2">
                     <Button variant="secondary" onClick={() => navigate(-1)} icon={<ArrowLeft size={16}/>}>Back</Button>
                     <Button to={`/sales/deliveries/${order.id}/edit`} variant="secondary" icon={<Edit size={16}/>}>Edit</Button>
                     <Button onClick={handleExportCsv} variant="secondary" icon={<FileText size={16}/>}>Export CSV</Button>
                     <Button onClick={handleDownloadPdf} icon={isGeneratingPdf ? <Loader size={16} className="animate-spin" /> : <Download size={16}/>} disabled={isGeneratingPdf}>
                        {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
                    </Button>
                </div>
            </div>

            <Card>
                <div className="p-6">
                    <div className="grid grid-cols-2 gap-6 p-4 border rounded-md bg-slate-50">
                       <div>
                           <p className="text-sm font-semibold text-slate-600 mb-2">Recipient:</p>
                           <p className="font-bold text-slate-800">{order.customerName}</p>
                           <p className="text-sm text-slate-600 whitespace-pre-line">{order.shippingAddress.line1}, {order.shippingAddress.line2 || ''}</p>
                           <p className="text-sm text-slate-600">{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.pincode}</p>
                           <p className="text-sm text-slate-600 mt-2"><strong>Contact:</strong> {order.contactName} {order.contactPhone && `(${order.contactPhone})`}</p>
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
                 <table className="w-full text-sm text-left text-slate-500">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                        <tr>
                            <th className="px-6 py-3">Product</th>
                            <th className="px-6 py-3">HSN</th>
                            <th className="px-6 py-3 text-center">Quantity Delivered</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.lineItems.map(item => (
                            <tr key={item.id} className="bg-white border-b">
                                <td className="px-6 py-4 font-medium text-slate-900">{item.productName}<p className="text-xs text-slate-500">{item.description}</p></td>
                                <td className="px-6 py-4">{item.hsnCode}</td>
                                <td className="px-6 py-4 text-center font-semibold">{item.quantity} {item.unit}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>

             {/* Hidden printable component */}
            <div style={{ position: 'absolute', left: '-9999px' }}>
                <div ref={printRef}>
                    <PrintWrapper companyDetails={companyDetails} settings={pdfSettings}>
                        <DeliveryOrderPrint order={order} settings={pdfSettings} companyDetails={companyDetails} />
                    </PrintWrapper>
                </div>
            </div>
        </div>
    );
};

export default DeliveryOrderView;
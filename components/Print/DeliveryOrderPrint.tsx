
import React from 'react';
import { DeliveryOrder, PdfSettings, CompanyDetails } from '../../types';

interface DeliveryOrderPrintProps {
    order: DeliveryOrder;
    settings: PdfSettings;
    companyDetails: CompanyDetails;
}

const AddressBlock: React.FC<{title: string, children: React.ReactNode}> = ({ title, children }) => (
    <div>
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide border-b-2 border-gray-300 pb-1 mb-1">{title}</h3>
        <div className="text-xs space-y-0.5 text-gray-800">
            {children}
        </div>
    </div>
);

const DeliveryOrderPrint: React.FC<DeliveryOrderPrintProps> = ({ order, settings, companyDetails }) => {
    const accentColor = settings.accentColor;
    const { billingAddress, shippingAddress } = order;
    const MIN_ROWS = 8;
    const emptyRowsCount = Math.max(0, MIN_ROWS - order.lineItems.length);

    const formatAddress = (addr: typeof billingAddress) => (
        <>
            <p className="font-bold">{order.customerName}</p>
            <p>{addr.line1}</p>
            {addr.line2 && <p>{addr.line2}</p>}
            <p>{addr.city}, {addr.state} - {addr.pincode}</p>
        </>
    );

    return (
        <div className="text-sm flex flex-col justify-between h-full">
            <div>
                 {/* Header */}
                 <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold uppercase tracking-wider" style={{color: accentColor}}>Delivery Order</h1>
                    <div className="flex flex-wrap justify-end items-center gap-x-4 gap-y-1 text-sm text-right">
                        <p><span className="font-bold text-gray-600">DELIVERY #:</span> {order.deliveryNumber}</p>
                        <p><span className="font-bold text-gray-600">DATE:</span> {new Date(order.deliveryDate).toLocaleDateString('en-GB')}</p>
                        <p><span className="font-bold text-gray-600">VEHICLE #:</span> {order.vehicleNumber || 'N/A'}</p>
                        <p><span className="font-bold text-gray-600">REF SO #:</span> {order.salesOrderNumber}</p>
                    </div>
                </div>

                {/* Addresses */}
                <div className="grid grid-cols-3 gap-4 mb-4 text-xs">
                   <AddressBlock title="Bill To">
                        {formatAddress(billingAddress)}
                        <p className="mt-1"><strong>GSTIN:</strong> {order.customerGstin}</p>
                   </AddressBlock>
                   <AddressBlock title="Ship To">
                        {formatAddress(shippingAddress)}
                   </AddressBlock>
                   <AddressBlock title="Contact Person">
                        <p className="font-bold">{order.contactName}</p>
                        <p>Phone: {order.contactPhone}</p>
                        <p>Email: {order.contactEmail}</p>
                   </AddressBlock>
                </div>

                {/* Line Items */}
                <table className="w-full mt-4 text-xs">
                    <thead>
                        <tr style={{backgroundColor: accentColor}} className="text-white">
                            <th className="p-2 text-left font-semibold w-6 align-middle">#</th>
                            <th className="p-2 text-left font-semibold align-middle">Item Description</th>
                            <th className="p-2 text-center font-semibold w-32 align-middle">Quantity Delivered</th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.lineItems.map((item, index) => (
                            <tr key={item.id} className="border-b bg-gray-50/30">
                                <td className="p-2 align-top text-center">{index+1}</td>
                                <td className="p-2 align-top"><p className="font-semibold text-gray-800">{item.productName}</p><p className="text-gray-600 whitespace-pre-wrap mt-1">{item.description}</p></td>
                                <td className="p-2 text-center align-top font-semibold">{item.quantity} {item.unit}</td>
                            </tr>
                        ))}
                         {Array.from({ length: emptyRowsCount }).map((_, index) => (
                            <tr key={`empty-${index}`} className="border-b">
                                <td colSpan={3} className="py-4">&nbsp;</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                
                 {order.additionalDescription && (
                     <div className="mt-4">
                         <h4 className="font-semibold text-gray-700 mb-1 text-xs">Notes:</h4>
                         <p className="text-gray-600 whitespace-pre-wrap p-3 border rounded-md bg-gray-50 text-xs">{order.additionalDescription}</p>
                    </div>
                )}
            </div>

            <div className="pt-4 text-xs">
                 <div className="grid grid-cols-2 gap-8 mt-8">
                    <div className="text-left">
                        <p className="w-48 border-t-2 border-gray-400 pt-1 mt-16 inline-block text-center text-sm">
                            Receiver's Signature & Stamp
                        </p>
                    </div>
                    <div className="text-right">
                        {settings.signatureImage ? 
                            <img src={settings.signatureImage} alt="Signature" className="w-auto inline-block mb-1" style={{ height: `${settings.signatureSize}px` }} />
                            : <div style={{ height: `${settings.signatureSize}px` }}></div>
                        }
                        <p className="w-48 border-t border-gray-400 pt-1 mt-1 inline-block text-center text-sm">
                            Authorized Signature
                        </p>
                         <p className="text-xs">For {companyDetails.name}</p>
                    </div>
                 </div>
            </div>
        </div>
    );
};

export default DeliveryOrderPrint;
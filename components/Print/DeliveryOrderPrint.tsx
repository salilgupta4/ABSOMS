
import React from 'react';
import { DeliveryOrder, PdfSettings, CompanyDetails, PointOfContact } from '../../types';

interface DeliveryOrderPrintProps {
    order: DeliveryOrder;
    settings: PdfSettings;
    companyDetails: CompanyDetails;
    isLastPage: boolean;
    itemStartIndex: number;
    pointOfContact?: PointOfContact;
}

const AddressBlock: React.FC<{title: string, children: React.ReactNode, isBandW?: boolean}> = ({ title, children, isBandW }) => (
    <div>
        <h3 className={`text-[10px] font-bold uppercase tracking-wide border-b pb-0.5 mb-0.5 ${
            isBandW ? 'text-black border-black' : 'text-gray-700 border-gray-400'
        }`}>{title}</h3>
        <div className={`text-[9px] space-y-0 leading-tight ${
            isBandW ? 'text-black' : 'text-gray-800'
        }`}>
            {children}
        </div>
    </div>
);

const MetaBlock: React.FC<{label: string, value: React.ReactNode, isBandW?: boolean}> = ({label, value, isBandW}) => (
    <div className="text-[10px] text-center">
        <p className={`font-bold ${isBandW ? 'text-black' : 'text-gray-600'}`}>{label}</p>
        <p className={isBandW ? 'text-black' : 'text-gray-800'}>{value}</p>
    </div>
)

const DeliveryOrderPrint: React.FC<DeliveryOrderPrintProps> = ({ order, settings, companyDetails, isLastPage, itemStartIndex, pointOfContact }) => {
    if (!order) return null;
    const { billingAddress, shippingAddress } = order;
    const isBandW = settings.template === 'BandW';
    const isBandWPOI = settings.template === 'BandW POI';

    const formatAddress = (addr: typeof billingAddress) => (
        <>
            <p className="font-bold">{order.customerName}</p>
            <p>{addr.line1}</p>
            {addr.line2 && <p>{addr.line2}</p>}
            <p>{addr.city}, {addr.state} - {addr.pincode}</p>
        </>
    );

    return (
        <div className="text-sm">
            {/* Header outside metadata box - more compact */}
            <h1 className={`text-xl font-bold text-center uppercase tracking-wider mb-2 ${
                (isBandW || isBandWPOI) ? 'text-black' : 'text-gray-800'
            }`}>Delivery Order</h1>
            
            {/* Compact metadata box */}
            <div className={`flex justify-between items-center text-center mb-2 p-1.5 border w-full text-[9px] ${
                (isBandW || isBandWPOI) ? 'border-black' : 'border-gray-400'
            }`}>
                <MetaBlock label="DO No." value={order.deliveryNumber} isBandW={isBandW || isBandWPOI} />
                <MetaBlock label="Date" value={new Date(order.deliveryDate).toLocaleDateString('en-GB')} isBandW={isBandW || isBandWPOI} />
                <MetaBlock label="Vehicle #" value={order.vehicleNumber || 'N/A'} isBandW={isBandW || isBandWPOI} />
                <MetaBlock label="Ref SO #" value={order.salesOrderNumber} isBandW={isBandW || isBandWPOI} />
            </div>

            {/* Compact Addresses - reduced gap and smaller text */}
            <div className={`grid ${isBandWPOI ? 'grid-cols-4' : 'grid-cols-3'} gap-2 mb-2 text-xs`}>
                <AddressBlock title="Bill To" isBandW={isBandW || isBandWPOI}>
                    {formatAddress(billingAddress)}
                    <p className="mt-1"><strong>GSTIN:</strong> {order.customerGstin}</p>
                </AddressBlock>
                <AddressBlock title="Ship To" isBandW={isBandW || isBandWPOI}>
                    {formatAddress(shippingAddress)}
                </AddressBlock>
                <AddressBlock title="Contact Person" isBandW={isBandW || isBandWPOI}>
                    <p className="font-bold">{order.contactName}</p>
                    <p>Phone: {order.contactPhone}</p>
                    <p>Email: {order.contactEmail}</p>
                </AddressBlock>
                {isBandWPOI && pointOfContact && (
                    <AddressBlock title="Our Point of Contact" isBandW={isBandW || isBandWPOI}>
                        <p className="font-bold">{pointOfContact.name}</p>
                        {pointOfContact.designation && <p>{pointOfContact.designation}</p>}
                        <p>Phone: {pointOfContact.phone}</p>
                        <p>Email: {pointOfContact.email}</p>
                    </AddressBlock>
                )}
            </div>

            {/* Compact Line Items Table */}
            <table className="w-full text-[9px] mt-1">
                <thead className={(isBandW || isBandWPOI) ? 'bg-gray-200 text-black' : 'bg-black text-white'}>
                    <tr>
                        <th className="py-1 px-1 text-center font-semibold w-8 align-middle">Sl.</th>
                        <th className="py-1 px-1 text-left font-semibold align-middle w-auto">Item & Description</th>
                        <th className="py-1 px-1 text-center font-semibold w-24 align-middle">Qty Delivered</th>
                    </tr>
                </thead>
                <tbody>
                    {order.lineItems.map((item, index) => (
                        <tr key={item.id} className={`border-b ${(isBandW || isBandWPOI) ? 'border-black' : 'border-gray-300'}`}>
                            <td className={`py-1 px-1 align-top text-center ${(isBandW || isBandWPOI) ? 'text-black' : 'text-gray-800'}`}>{itemStartIndex + index + 1}</td>
                            <td className="py-1 px-1 align-top">
                                <span className={`font-semibold leading-tight ${(isBandW || isBandWPOI) ? 'text-black' : 'text-gray-800'}`}>{item.productName}</span>
                                {item.description && <span className={`whitespace-pre-wrap leading-tight ml-2 ${(isBandW || isBandWPOI) ? 'text-black' : 'text-gray-600'}`}>- {item.description}</span>}
                            </td>
                            <td className={`py-1 px-1 text-center align-top font-semibold ${(isBandW || isBandWPOI) ? 'text-black' : 'text-gray-800'}`}>{item.quantity} {item.unit}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            
            {!isLastPage && (
                <div className={`text-center italic pt-2 ${(isBandW || isBandWPOI) ? 'text-black' : 'text-gray-500'}`}>Continued on next page...</div>
            )}

            {isLastPage && (
                <div className="mt-2 relative">
                    {/* Notes - positioned independently on the left */}
                    <div className="absolute left-0 top-0 w-1/2 pr-4 text-xs">
                        {order.additionalDescription && (
                            <div>
                                <h4 className={`font-semibold mb-1 ${(isBandW || isBandWPOI) ? 'text-black' : 'text-gray-700'}`}>Notes:</h4>
                                <p className={`whitespace-pre-wrap text-[9px] ${(isBandW || isBandWPOI) ? 'text-black' : 'text-gray-600'}`}>{order.additionalDescription}</p>
                            </div>
                        )}
                    </div>
                    
                    {/* Signatures - compact layout */}
                    <div className="flex justify-between pt-4 text-xs">
                        <div className="w-40 text-center">
                            <div className="h-12 flex justify-center items-center">
                                {/* Space for receiver signature */}
                            </div>
                            <div className={`pt-1 text-sm border-t ${(isBandW || isBandWPOI) ? 'text-black border-black' : 'text-gray-700 border-gray-400'}`}>
                                Receiver's Signature
                            </div>
                        </div>
                        <div className="w-40 text-center">
                            <div className="h-12 flex justify-center items-center">
                                {settings.signatureImage && (
                                    <img
                                        src={settings.signatureImage}
                                        alt="Signature"
                                        className="max-h-full"
                                        style={{ height: `${Math.min(settings.signatureSize, 40)}px` }}
                                    />
                                )}
                            </div>
                            <div className={`pt-1 text-sm border-t ${(isBandW || isBandWPOI) ? 'text-black border-black' : 'text-gray-700 border-gray-400'}`}>
                                Authorized By
                            </div>
                            <p className={`text-[10px] ${(isBandW || isBandWPOI) ? 'text-black' : 'text-gray-600'}`}>For {companyDetails.name}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeliveryOrderPrint;
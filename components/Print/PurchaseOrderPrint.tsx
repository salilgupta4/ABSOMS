
import React from 'react';
import { PurchaseOrder, PdfSettings, CompanyDetails, PointOfContact } from '../../types';

interface PurchaseOrderPrintProps {
    order: PurchaseOrder;
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

const PurchaseOrderPrint: React.FC<PurchaseOrderPrintProps> = ({ order, settings, companyDetails, isLastPage, itemStartIndex, pointOfContact }) => {
    if (!order) return null;
    const isBandW = settings.template === 'BandW' || settings.template === 'BandW POI';
    const showPOC = settings.template === 'BandW POI';

    return (
        <div className="text-sm">
            {/* Header outside metadata box */}
            <h1 className={`text-2xl font-bold text-center uppercase tracking-wider mb-3 ${
                isBandW ? 'text-black' : 'text-gray-800'
            }`}>Purchase Order</h1>
            
            {/* Metadata box */}
            <div className={`flex justify-between items-center text-center mb-2 p-2 border w-full ${
                isBandW ? 'border-black' : 'border-gray-400'
            }`}>
                <MetaBlock label="PO No." value={order.poNumber} isBandW={isBandW} />
                <MetaBlock label="Date" value={new Date(order.orderDate).toLocaleDateString('en-GB')} isBandW={isBandW} />
                <MetaBlock label="Status" value={order.status} isBandW={isBandW} />
                <MetaBlock label="Expected Delivery" value="TBD" isBandW={isBandW} />
            </div>

            {/* Addresses */}
            <div className={`grid ${showPOC ? 'grid-cols-3' : 'grid-cols-2'} gap-3 mb-3 text-xs`}>
                <AddressBlock title="Vendor" isBandW={isBandW}>
                    <p className="font-bold">{order.vendorName}</p>
                    <p className="whitespace-pre-line">{order.vendorAddress}</p>
                    <p className="mt-1"><strong>GSTIN:</strong> {order.vendorGstin}</p>
                </AddressBlock>
                <AddressBlock title="Ship To / Deliver To" isBandW={isBandW}>
                    <p className="font-bold">{companyDetails.name}</p>
                    <p className="whitespace-pre-line">{order.deliveryAddress}</p>
                </AddressBlock>
                {showPOC && pointOfContact && (
                    <AddressBlock title="Our Point of Contact" isBandW={isBandW}>
                        <p className="font-bold">{pointOfContact.name}</p>
                        {pointOfContact.designation && <p>{pointOfContact.designation}</p>}
                        <p>Phone: {pointOfContact.phone}</p>
                        <p>Email: {pointOfContact.email}</p>
                    </AddressBlock>
                )}
            </div>

            {/* Line Items */}
            <table className="w-full text-[9px]">
                <thead className={isBandW ? 'bg-gray-200 text-black' : 'bg-black text-white'}>
                    <tr>
                        <th className="py-1 px-1 text-center font-semibold w-8 align-middle">Sl.</th>
                        <th className="py-1 px-1 text-left font-semibold align-middle w-auto">Description</th>
                        {settings.showHsnCode && <th className="py-1 px-1 text-center font-semibold w-16 align-middle">HSN</th>}
                        <th className="py-1 px-1 text-center font-semibold w-12 align-middle">Qty</th>
                        <th className="py-1 px-1 text-center font-semibold w-12 align-middle">Unit</th>
                        <th className="py-1 px-1 text-right font-semibold w-20 align-middle">Rate</th>
                        <th className="py-1 px-1 text-right font-semibold w-24 align-middle">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {order.lineItems.map((item, index) => (
                        <tr key={item.id} className={`border-b ${isBandW ? 'border-gray-400' : 'border-gray-300'}`}>
                            <td className="py-1 px-1 align-top text-center text-[8px]">{itemStartIndex + index + 1}</td>
                            <td className="py-1 px-1 align-top">
                                <p className={`font-semibold text-[8px] ${isBandW ? 'text-black' : 'text-gray-800'}`}>{item.productName}</p>
                                <p className={`whitespace-pre-wrap mt-0.5 text-[7px] leading-tight ${isBandW ? 'text-black' : 'text-gray-600'}`}>{item.description}</p>
                            </td>
                            {settings.showHsnCode && <td className="py-1 px-1 text-center align-top text-[8px]">{item.hsnCode}</td>}
                            <td className="py-1 px-1 text-center align-top text-[8px]">{item.quantity}</td>
                            <td className="py-1 px-1 text-center align-top text-[8px]">{item.unit}</td>
                            <td className="py-1 px-1 text-right align-top text-[8px]">₹{item.unitPrice.toFixed(2)}</td>
                            <td className="py-1 px-1 text-right align-top font-semibold text-[8px]">₹{item.total.toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            
            {!isLastPage && (
                <div className="text-center italic text-gray-500 pt-2">Continued on next page...</div>
            )}
            
            {isLastPage && (
                <>
                    {/* Bottom section with Terms on left, Totals on right */}
                    <div className="flex justify-between mt-2 text-[8px]">
                        {/* Left side - Notes and Terms */}
                        <div className="w-1/2 pr-4">
                            {order.additionalDescription && (
                                <div className="mb-3">
                                    <h4 className={`font-semibold mb-1 ${isBandW ? 'text-black' : 'text-gray-700'}`}>Notes:</h4>
                                    <p className={`whitespace-pre-wrap ${isBandW ? 'text-black' : 'text-gray-600'}`}>{order.additionalDescription}</p>
                                </div>
                            )}
                            
                            {/* Terms and Conditions - now dynamic from order.terms */}
                            {order.terms && (
                                <div>
                                    <h4 className={`font-semibold mb-1 ${isBandW ? 'text-black' : 'text-gray-700'}`}>Terms & Conditions:</h4>
                                    <div className={`leading-tight whitespace-pre-wrap ${isBandW ? 'text-black' : 'text-gray-600'}`}>
                                        {order.terms}
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {/* Right side - Totals */}
                        <div className="w-2/5">
                            <table className="w-full text-[8px]">
                                <tbody>
                                    <tr className={`border-t ${isBandW ? 'border-black' : 'border-gray-400'}`}>
                                        <td className="py-1 text-right font-semibold pr-2">Subtotal</td>
                                        <td className="py-1 text-right">₹{order.subTotal.toFixed(2)}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-1 text-right font-semibold pr-2">GST ({order.lineItems[0]?.taxRate || 18}%)</td>
                                        <td className="py-1 text-right">₹{order.gstTotal.toFixed(2)}</td>
                                    </tr>
                                    <tr className={`border-t-2 ${isBandW ? 'border-black' : 'border-gray-600'} bg-gray-100`}>
                                        <td className={`py-1 text-right font-bold pr-2 text-[9px] ${isBandW ? 'text-black' : 'text-gray-800'}`}>Grand Total</td>
                                        <td className={`py-1 text-right font-bold text-[9px] ${isBandW ? 'text-black' : 'text-gray-800'}`}>₹{order.total.toFixed(2)}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Signature section */}
                    <div className="flex justify-end mt-4 text-[8px]">
                        <div className="w-1/3 text-center">
                            <div className="h-12 flex justify-center items-center mb-2">
                                {settings.signatureImage && (
                                    <img
                                        src={settings.signatureImage}
                                        alt="Signature"
                                        className="max-h-full"
                                        style={{ height: `${Math.min(settings.signatureSize * 0.6, 48)}px` }}
                                    />
                                )}
                            </div>
                            <div className={`border-t border-gray-400 pt-1 ${isBandW ? 'text-black' : 'text-gray-600'}`}>
                                <p className="font-semibold">Authorized Signature</p>
                                <p className="text-[7px]">For {companyDetails.name}</p>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default PurchaseOrderPrint;
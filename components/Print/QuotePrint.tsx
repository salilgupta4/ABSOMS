
import React from 'react';
import { Quote, PdfSettings, CompanyDetails, PointOfContact } from '../../types';

interface QuotePrintProps {
    quote: Quote;
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

const QuotePrint: React.FC<QuotePrintProps> = ({ quote, settings, companyDetails, isLastPage, itemStartIndex, pointOfContact }) => {
    if (!quote) return null;
    const { billingAddress, shippingAddress } = quote;
    const isBandW = settings.template === 'BandW';
    const isBandWPOI = settings.template === 'BandW POI';

    const formatAddress = (addr: typeof billingAddress) => (
        <>
            <p className="font-bold">{quote.customerName}</p>
            <p>{addr.line1}</p>
            {addr.line2 && <p>{addr.line2}</p>}
            <p>{addr.city}, {addr.state} - {addr.pincode}</p>
        </>
    );
    
    return (
        <div className="text-sm">
            {/* Header outside metadata box */}
            <h1 className={`text-2xl font-bold text-center uppercase tracking-wider mb-3 ${
                (isBandW || isBandWPOI) ? 'text-black' : 'text-gray-800'
            }`}>Quotation</h1>
            
            {/* Metadata box */}
            <div className={`flex justify-between items-center text-center mb-2 p-2 border w-full ${
                (isBandW || isBandWPOI) ? 'border-black' : 'border-gray-400'
            }`}>
                <MetaBlock label="Quotation No." value={`${quote.quoteNumber}${quote.revisionNumber ? `-Rev${quote.revisionNumber}` : ''}`} isBandW={isBandW || isBandWPOI} />
                <MetaBlock label="Date" value={new Date(quote.issueDate).toLocaleDateString('en-GB')} isBandW={isBandW || isBandWPOI} />
                <MetaBlock label="Status" value={quote.status} isBandW={isBandW || isBandWPOI} />
                <MetaBlock label="Valid Until" value={new Date(quote.expiryDate).toLocaleDateString('en-GB')} isBandW={isBandW || isBandWPOI} />
            </div>

            {/* Addresses */}
            <div className={`grid ${isBandWPOI ? 'grid-cols-4' : 'grid-cols-3'} gap-3 mb-3 text-xs`}>
                <AddressBlock title="Bill To" isBandW={isBandW || isBandWPOI}>
                    {formatAddress(billingAddress)}
                    <p className="mt-1"><strong>GSTIN:</strong> {quote.customerGstin}</p>
                </AddressBlock>
                <AddressBlock title="Ship To" isBandW={isBandW || isBandWPOI}>
                    {formatAddress(shippingAddress)}
                </AddressBlock>
                <AddressBlock title="Contact Person" isBandW={isBandW || isBandWPOI}>
                    <p className="font-bold">{quote.contactName}</p>
                    <p>Phone: {quote.contactPhone}</p>
                    <p>Email: {quote.contactEmail}</p>
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


            {/* Line Items */}
            <table className="w-full text-[9px]">
                <thead className={(isBandW || isBandWPOI) ? 'bg-gray-200 text-black' : 'bg-black text-white'}>
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
                    {quote.lineItems.map((item, index) => (
                        <tr key={item.id} className={`border-b ${(isBandW || isBandWPOI) ? 'border-black' : 'border-gray-300'}`}>
                            <td className={`py-2 px-1 align-top text-center ${(isBandW || isBandWPOI) ? 'text-black' : 'text-gray-800'}`}>{itemStartIndex + index + 1}</td>
                            <td className="py-2 px-1 align-top">
                                <p className={`font-semibold leading-tight ${(isBandW || isBandWPOI) ? 'text-black' : 'text-gray-800'}`}>{item.productName}</p>
                                <p className={`whitespace-pre-wrap leading-tight -mt-0.5 ${(isBandW || isBandWPOI) ? 'text-black' : 'text-gray-600'}`}>{item.description}</p>
                            </td>
                            {settings.showHsnCode && <td className={`py-2 px-1 text-center align-top ${(isBandW || isBandWPOI) ? 'text-black' : 'text-gray-800'}`}>{item.hsnCode}</td>}
                            <td className={`py-2 px-1 text-center align-top ${(isBandW || isBandWPOI) ? 'text-black' : 'text-gray-800'}`}>{item.quantity}</td>
                            <td className={`py-2 px-1 text-center align-top ${(isBandW || isBandWPOI) ? 'text-black' : 'text-gray-800'}`}>{item.unit}</td>
                            <td className={`py-2 px-1 text-right align-top ${(isBandW || isBandWPOI) ? 'text-black' : 'text-gray-800'}`}>{item.unitPrice.toFixed(2)}</td>
                            <td className={`py-2 px-1 text-right align-top font-semibold ${(isBandW || isBandWPOI) ? 'text-black' : 'text-gray-800'}`}>{item.total.toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            
            {!isLastPage && (
                <div className={`text-center italic pt-2 ${(isBandW || isBandWPOI) ? 'text-black' : 'text-gray-500'}`}>Continued on next page...</div>
            )}

            {isLastPage && (
                 <div className="mt-2 relative">
                    {/* Terms - positioned independently on the left */}
                    <div className="absolute left-0 top-0 w-1/2 pr-4 text-xs">
                        {quote.terms && quote.terms.length > 0 &&
                            <div>
                                <h4 className={`font-semibold mb-1 ${(isBandW || isBandWPOI) ? 'text-black' : 'text-gray-700'}`}>Terms & Conditions:</h4>
                                <ul className={`list-disc list-inside space-y-1 text-[9px] ${(isBandW || isBandWPOI) ? 'text-black' : 'text-gray-600'}`}>
                                    {quote.terms.map((term, index) => (
                                        <li key={index}>{term}</li>
                                    ))}
                                </ul>
                            </div>
                        }
                    </div>
                    
                    {/* Totals section - fixed position on the right */}
                    <div className="flex justify-end">
                        <div className="w-2/5 text-xs">
                            {/* Subtotal */}
                            <div className="flex justify-between py-1">
                                <span className={`${(isBandW || isBandWPOI) ? 'text-black' : 'text-gray-600'}`}>Subtotal</span>
                                <span className={`font-semibold text-right ${(isBandW || isBandWPOI) ? 'text-black' : 'text-gray-800'}`}>₹{quote.subTotal.toFixed(2)}</span>
                            </div>
                            {/* GST */}
                            <div className="flex justify-between py-1">
                                <span className={`${(isBandW || isBandWPOI) ? 'text-black' : 'text-gray-600'}`}>GST ({quote.lineItems[0]?.taxRate || 18}%)</span>
                                <span className={`font-semibold text-right ${(isBandW || isBandWPOI) ? 'text-black' : 'text-gray-800'}`}>₹{quote.gstTotal.toFixed(2)}</span>
                            </div>
                            {/* Grand Total */}
                            <div className="flex justify-between py-2 mt-1 border-t-2 border-black">
                                <span className={`font-bold text-base ${(isBandW || isBandWPOI) ? 'text-black' : 'text-gray-800'}`}>Grand Total</span>
                                <span className={`font-bold text-base text-right ${(isBandW || isBandWPOI) ? 'text-black' : 'text-gray-800'}`}>₹{quote.total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Signature - moved higher with less padding */}
                    <div className="flex justify-end pt-2 text-xs">
                        <div className="w-48 text-center">
                            <div className="h-16 flex justify-center items-center">
                                {settings.signatureImage && (
                                    <img
                                        src={settings.signatureImage}
                                        alt="Signature"
                                        className="max-h-full"
                                        style={{ height: `${settings.signatureSize}px` }}
                                    />
                                )}
                            </div>
                            <div className={`pt-1 text-sm ${(isBandW || isBandWPOI) ? 'text-black' : 'text-gray-700'}`}>
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

export default QuotePrint;
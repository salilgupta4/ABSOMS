
import React from 'react';
import { Quote, PdfSettings, CompanyDetails } from '../../types';

interface QuotePrintProps {
    quote: Quote;
    settings: PdfSettings;
    companyDetails: CompanyDetails;
    isLastPage: boolean;
    itemStartIndex: number;
}

const AddressBlock: React.FC<{title: string, children: React.ReactNode}> = ({ title, children }) => (
    <div>
        <h3 className="text-[10px] font-bold text-gray-700 uppercase tracking-wide border-b border-gray-400 pb-1 mb-1">{title}</h3>
        <div className="text-[9px] space-y-0.5 text-gray-800">
            {children}
        </div>
    </div>
);

const MetaBlock: React.FC<{label: string, value: React.ReactNode}> = ({label, value}) => (
    <div className="text-[10px] text-center">
        <p className="font-bold text-gray-600">{label}</p>
        <p className="text-gray-800">{value}</p>
    </div>
)

const QuotePrint: React.FC<QuotePrintProps> = ({ quote, settings, companyDetails, isLastPage, itemStartIndex }) => {
    if (!quote) return null;
    const { billingAddress, shippingAddress } = quote;
    const isBandW = settings.template === 'BandW';

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
            {/* Header */}
            <h1 className="text-2xl font-bold text-center uppercase tracking-wider mb-2">Quotation</h1>

            <div className="flex justify-between items-start text-center mb-3 p-2 border border-black w-full">
                <MetaBlock label="Quotation No." value={`${quote.quoteNumber}${quote.revisionNumber ? `-Rev${quote.revisionNumber}` : ''}`} />
                <MetaBlock label="Date" value={new Date(quote.issueDate).toLocaleDateString('en-GB')} />
                <MetaBlock label="Status" value={quote.status} />
                <MetaBlock label="Valid Until" value={new Date(quote.expiryDate).toLocaleDateString('en-GB')} />
            </div>

            {/* Addresses */}
            <div className="grid grid-cols-3 gap-4 mb-4 text-xs">
                <AddressBlock title="Bill To">
                    {formatAddress(billingAddress)}
                    <p className="mt-1"><strong>GSTIN:</strong> {quote.customerGstin}</p>
                </AddressBlock>
                <AddressBlock title="Ship To">
                    {formatAddress(shippingAddress)}
                </AddressBlock>
                <AddressBlock title="Contact Person">
                    <p className="font-bold">{quote.contactName}</p>
                    <p>Phone: {quote.contactPhone}</p>
                    <p>Email: {quote.contactEmail}</p>
                </AddressBlock>
            </div>


            {/* Line Items */}
            <table className="w-full text-[9px]">
                <thead className={isBandW ? 'bg-gray-200 text-black' : 'bg-black text-white'}>
                    <tr>
                        <th className="py-2 px-1 text-center font-semibold w-8 align-middle">Sl.</th>
                        <th className="py-2 px-1 text-left font-semibold align-middle w-auto">Description</th>
                        {settings.showHsnCode && <th className="py-2 px-1 text-center font-semibold w-16 align-middle">HSN</th>}
                        <th className="py-2 px-1 text-center font-semibold w-12 align-middle">Qty</th>
                        <th className="py-2 px-1 text-center font-semibold w-12 align-middle">Unit</th>
                        <th className="py-2 px-1 text-right font-semibold w-20 align-middle">Rate</th>
                        <th className="py-2 px-1 text-right font-semibold w-24 align-middle">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {quote.lineItems.map((item, index) => (
                        <tr key={item.id} className="border-b border-gray-300">
                            <td className="py-1 px-1 align-top text-center">{itemStartIndex + index + 1}</td>
                            <td className="py-1 px-1 align-top">
                                <p className="font-semibold text-gray-800">{item.productName}</p>
                                <p className="text-gray-600 whitespace-pre-wrap mt-0.5">{item.description}</p>
                            </td>
                            {settings.showHsnCode && <td className="py-1 px-1 text-center align-top">{item.hsnCode}</td>}
                            <td className="py-1 px-1 text-center align-top">{item.quantity}</td>
                            <td className="py-1 px-1 text-center align-top">{item.unit}</td>
                            <td className="py-1 px-1 text-right align-top">{item.unitPrice.toFixed(2)}</td>
                            <td className="py-1 px-1 text-right align-top font-semibold">{item.total.toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            
            {!isLastPage && (
                <div className="text-center italic text-gray-500 pt-2">Continued on next page...</div>
            )}

            {isLastPage && (
                 <div className="mt-2">
                    {/* Totals */}
                    <div className="flex justify-end">
                        <div className="w-2/5 text-xs">
                            <div className="flex justify-between py-1"><span className="text-gray-600">Subtotal</span><span className="font-semibold text-right">₹{quote.subTotal.toFixed(2)}</span></div>
                            <div className="flex justify-between py-1"><span className="text-gray-600">GST ({quote.lineItems[0]?.taxRate || 18}%)</span><span className="font-semibold text-right">₹{quote.gstTotal.toFixed(2)}</span></div>
                            <div className="flex justify-between py-2 mt-1 border-t-2 border-black"><span className="font-bold text-base">Grand Total</span><span className="font-bold text-base text-right">₹{quote.total.toFixed(2)}</span></div>
                        </div>
                    </div>
                    {/* Footer Content: Terms and Signature */}
                    <div className="flex justify-between items-end pt-4 text-xs">
                        <div className="w-1/2 pr-4">
                            {quote.terms && quote.terms.length > 0 &&
                                <div className="mb-4">
                                    <h4 className="font-semibold text-gray-700 mb-1">Terms & Conditions:</h4>
                                    <ul className="list-disc list-inside text-gray-600 space-y-1 text-[9px]">
                                        {quote.terms.map((term, index) => (
                                            <li key={index}>{term}</li>
                                        ))}
                                    </ul>
                                </div>
                            }
                        </div>
                        <div className="w-1/2 flex justify-end">
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
                                <div className="pt-1 text-sm">
                                    Authorized By
                                </div>
                                <p className="text-[10px]">For {companyDetails.name}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default QuotePrint;
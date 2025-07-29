
import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
const { useParams, useNavigate } = ReactRouterDOM;
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Loader } from 'lucide-react';
import { Quote } from '../../types';
import { getQuote } from './QuoteList';
import { createSalesOrderFromQuote } from './SalesOrderList';

const SalesOrderForm: React.FC = () => {
    const { quoteId } = useParams();
    const navigate = useNavigate();
    
    const [quote, setQuote] = useState<Quote | null>(null);
    const [clientPoNumber, setClientPoNumber] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!quoteId) {
            navigate('/sales/quotes');
            return;
        }
        setLoading(true);
        getQuote(quoteId).then(data => {
            if (data && data.status === 'Approved') {
                setQuote(data);
            } else {
                alert("Quote not found or not approved!");
                navigate('/sales/quotes');
            }
            setLoading(false);
        }).catch(() => {
            alert("Error fetching quote.");
            setLoading(false);
            navigate('/sales/quotes');
        });
    }, [quoteId, navigate]);

    const handleCreateSalesOrder = async () => {
        if (!quote) return;
        setSaving(true);
        try {
            await createSalesOrderFromQuote(quote, clientPoNumber);
            alert("Sales Order created successfully!");
            navigate('/sales/orders');
        } catch (error) {
            console.error(error);
            alert("Failed to create Sales Order.");
            setSaving(false);
        }
    };

    if (loading || !quote) {
        return <Card title="Loading Quote for Conversion..."><p className="p-4 text-center">Loading...</p></Card>
    }

    return (
        <div className="space-y-6">
            <h3 className="text-2xl font-bold text-slate-800">Convert Quote to Sales Order</h3>

            <Card title={`Reviewing Quote #${quote.quoteNumber}`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <p><strong>Customer:</strong> {quote.customerName}</p>
                        <p><strong>Quote Date:</strong> {new Date(quote.issueDate).toLocaleDateString()}</p>
                        <p><strong>Contact:</strong> {quote.contactName}</p>
                        <p><strong>Shipping To:</strong> {quote.shippingAddress.line1}, {quote.shippingAddress.city}</p>
                        <p className="font-bold text-lg">Total: ₹{quote.total.toFixed(2)}</p>
                    </div>
                     <div>
                        <label htmlFor="clientPoNumber" className="block text-sm font-medium text-slate-700">Client PO Number</label>
                        <input 
                          type="text" 
                          id="clientPoNumber"
                          value={clientPoNumber}
                          onChange={(e) => setClientPoNumber(e.target.value)}
                          className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm"
                        />
                    </div>
                </div>
            </Card>

            <Card title="Line Items">
                <table className="w-full text-sm">
                    <thead><tr><th className="text-left p-2">Product</th><th className="p-2">Qty</th><th className="text-right p-2">Total</th></tr></thead>
                    <tbody>
                        {quote.lineItems.map(item => (
                            <tr key={item.productId} className="border-t">
                                <td className="p-2">{item.productName}</td>
                                <td className="p-2 text-center">{item.quantity} {item.unit}</td>
                                <td className="p-2 text-right">₹{item.total.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>

             <div className="flex justify-end space-x-3 bg-white p-4 sticky bottom-0 border-t border-slate-200 -mx-6 -mb-8 rounded-b-lg">
                <Button type="button" variant="secondary" onClick={() => navigate('/sales/quotes')} disabled={saving}>Cancel</Button>
                <Button type="button" onClick={handleCreateSalesOrder} disabled={saving} icon={saving ? <Loader size={16} className="animate-spin" /> : null}>
                    {saving ? 'Creating SO...' : 'Create Sales Order'}
                </Button>
            </div>
        </div>
    );
};

export default SalesOrderForm;
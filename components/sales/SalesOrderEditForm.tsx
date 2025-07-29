
import React, { useState, useEffect, useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
const { useParams, useNavigate } = ReactRouterDOM;
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Loader } from 'lucide-react';
import { SalesOrder, DocumentLineItem } from '../../types';
import { getSalesOrder, reviseSalesOrder } from './SalesOrderList';

const GST_RATE = 18; // In a real app, this should come from settings or the product itself

const SalesOrderEditForm: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [order, setOrder] = useState<SalesOrder | null>(null);
    const [lineItems, setLineItems] = useState<DocumentLineItem[]>([]);
    const [clientPoNumber, setClientPoNumber] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!id) {
            navigate('/sales/orders');
            return;
        }
        setLoading(true);
        getSalesOrder(id).then(data => {
            if (data) {
                setOrder(data);
                setLineItems(data.lineItems.map(li => ({...li}))); // Deep copy for editing
                setClientPoNumber(data.clientPoNumber);
            } else {
                alert("Sales Order not found!");
                navigate('/sales/orders');
            }
            setLoading(false);
        }).catch(() => {
            alert("Error fetching sales order.");
            setLoading(false);
            navigate('/sales/orders');
        });
    }, [id, navigate]);

    const updateLineItem = (lineItemId: string, field: 'quantity' | 'unitPrice' | 'description', value: number | string) => {
        setLineItems(prev => prev.map(item => {
            if (item.id === lineItemId) {
                const newItem = { ...item };
                if (field === 'description') {
                    newItem.description = String(value);
                } else {
                    const numValue = Number(value);
                    if (field === 'quantity') {
                        newItem.quantity = Math.max(0, numValue);
                    } else if (field === 'unitPrice') {
                        newItem.unitPrice = Math.max(0, numValue);
                    }
                }
                newItem.total = newItem.quantity * newItem.unitPrice;
                return newItem;
            }
            return item;
        }));
    };
    
    const { subTotal, gstTotal, total } = useMemo(() => {
        const sub = lineItems.reduce((acc, item) => acc + item.total, 0);
        const gst = sub * (GST_RATE / 100);
        return { subTotal: sub, gstTotal: gst, total: sub + gst };
    }, [lineItems]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!order) return;
        setSaving(true);
        
        try {
            await reviseSalesOrder(order.id, lineItems, clientPoNumber);
            alert("Sales Order revised successfully! A new quote has been generated.");
            navigate('/sales/orders');
        } catch (error: any) {
            console.error(error);
            alert(`Failed to revise Sales Order: ${error.message}`);
            setSaving(false);
        }
    };

    if (loading || !order) {
        return <Card title="Loading Sales Order..."><p className="p-4 text-center">Loading...</p></Card>
    }

    return (
        <form onSubmit={handleSave} className="space-y-6">
            <h3 className="text-2xl font-bold text-slate-800">Revise Sales Order #{order.orderNumber}</h3>

            <Card title="Order Details">
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="clientPoNumber" className="block text-sm font-medium text-slate-700">Client PO Number</label>
                        <input 
                          type="text" 
                          id="clientPoNumber"
                          value={clientPoNumber}
                          onChange={(e) => setClientPoNumber(e.target.value)}
                          className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm"
                        />
                    </div>
                    <p className="text-sm">
                        <strong>Customer:</strong> {order.customerName}<br/>
                        <strong>Date:</strong> {new Date(order.orderDate).toLocaleDateString()}<br/>
                        <strong>Original Quote:</strong> {order.quoteNumber}
                     </p>
                </div>
            </Card>

             <Card title="Line Items">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-left text-slate-600">
                            <tr>
                                <th className="p-2 w-1/3">Product</th>
                                <th className="p-2 w-1/3">Description</th>
                                <th className="p-2" style={{width: '120px'}}>Quantity</th>
                                <th className="p-2" style={{width: '120px'}}>Rate</th>
                                <th className="p-2 w-[120px] text-right">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lineItems.map(item => (
                                <tr key={item.id} className="border-t border-slate-200 align-top">
                                    <td className="p-2 font-medium">{item.productName}</td>
                                    <td className="p-2">
                                        <textarea
                                            value={item.description}
                                            onChange={e => updateLineItem(item.id, 'description', e.target.value)}
                                            className="w-full px-2 py-1 bg-white border border-slate-300 rounded-md text-xs"
                                            rows={2}
                                        />
                                    </td>
                                    <td className="p-2">
                                        <input type="number" value={item.quantity} onChange={e => updateLineItem(item.id, 'quantity', parseFloat(e.target.value))} step="0.001" className="w-24 px-2 py-1 bg-white border border-slate-300 rounded-md" />
                                    </td>
                                    <td className="p-2">
                                        <input type="number" value={item.unitPrice} onChange={e => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value))} step="0.01" className="w-24 px-2 py-1 bg-white border border-slate-300 rounded-md" />
                                    </td>
                                    <td className="p-2 text-right font-semibold">₹{item.total.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
             <Card title="Summary">
                <div className="space-y-2 text-sm p-4">
                    <div className="flex justify-between"><span className="text-slate-600">Subtotal:</span> <span className="font-medium">₹{subTotal.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-600">GST ({GST_RATE}%):</span> <span className="font-medium">₹{gstTotal.toFixed(2)}</span></div>
                    <hr className="my-2"/>
                    <div className="flex justify-between text-lg font-bold text-primary"><span >Grand Total:</span> <span>₹{total.toFixed(2)}</span></div>
                </div>
             </Card>

             <div className="flex justify-end space-x-3 bg-white p-4 sticky bottom-0 border-t border-slate-200 -mx-6 -mb-8 rounded-b-lg">
                <Button type="button" variant="secondary" onClick={() => navigate('/sales/orders')} disabled={saving}>Cancel</Button>
                <Button type="submit" disabled={saving} icon={saving ? <Loader size={16} className="animate-spin" /> : null}>
                    {saving ? 'Saving Revision...' : 'Save and Revise'}
                </Button>
            </div>
        </form>
    );
};

export default SalesOrderEditForm;
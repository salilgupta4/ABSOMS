
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader, Trash2 } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import SearchableSelect from '../ui/SearchableSelect';
import { getVendors } from '../vendors/VendorList';
import { getProducts } from '../products/ProductList';
import { savePurchaseOrder, getPurchaseOrder } from './PurchaseOrderList';
import { getCompanyDetails } from '../settings/CompanyDetails';
import { Vendor, Product, DocumentLineItem, PurchaseOrder } from '../../types';

const GST_RATE = 18; // 18%

const PurchaseOrderForm: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = !!id;

    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    
    const [vendorId, setVendorId] = useState('');
    const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [lineItems, setLineItems] = useState<DocumentLineItem[]>([]);
    const [additionalDescription, setAdditionalDescription] = useState('');
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            const [vendorData, productData, poData] = await Promise.all([
                getVendors(),
                getProducts(),
                id ? getPurchaseOrder(id) : Promise.resolve(null)
            ]);
            
            setVendors(vendorData);
            setProducts(productData);

            if (poData && isEditing) {
                setVendorId(poData.vendorId);
                setOrderDate(new Date(poData.orderDate).toISOString().split('T')[0]);
                setLineItems(poData.lineItems);
                setAdditionalDescription(poData.additionalDescription || '');
                setDeliveryAddress(poData.deliveryAddress || '');
            } else {
                const companyDetails = await getCompanyDetails();
                setDeliveryAddress(companyDetails.deliveryAddress || '');
            }
            setLoading(false);
        };
        loadData();
    }, [id, isEditing]);

    const addProductLineItem = (productId: string) => {
        if (!productId) return;
        const product = products.find(p => p.id === productId);
        if (!product) return;

        const newItem: DocumentLineItem = {
            id: `li_${Date.now()}_${Math.random()}`,
            productId: product.id,
            productName: product.name,
            description: product.description,
            hsnCode: product.hsnCode,
            quantity: 1,
            unit: product.unit,
            unitPrice: product.rate,
            taxRate: GST_RATE,
            total: product.rate
        };
        setLineItems(prev => [...prev, newItem]);
    };
    
    const updateLineItem = (lineItemId: string, field: 'quantity' | 'unitPrice' | 'description', value: string | number) => {
        setLineItems(prev => prev.map(item => {
            if (item.id === lineItemId) {
                const updatedItem = { ...item };
                if (field === 'description') {
                    updatedItem.description = String(value);
                } else if (typeof value === 'number') {
                     if (field === 'quantity' || field === 'unitPrice') {
                        updatedItem[field] = Math.max(0, value);
                    }
                    updatedItem.total = updatedItem.quantity * updatedItem.unitPrice;
                }
                return updatedItem;
            }
            return item;
        }));
    };

    const removeLineItem = (lineItemId: string) => {
        setLineItems(prev => prev.filter(item => item.id !== lineItemId));
    };

    const { subTotal, gstTotal, total } = useMemo(() => {
        const sub = lineItems.reduce((acc, item) => acc + item.total, 0);
        const gst = sub * (GST_RATE / 100);
        return { subTotal: sub, gstTotal: gst, total: sub + gst };
    }, [lineItems]);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!vendorId || lineItems.length === 0) {
            alert("Please select a vendor and add at least one product.");
            return;
        }
        setSaving(true);
        
        const vendor = vendors.find(v => v.id === vendorId);
        if (!vendor) {
            alert("Selected vendor not found.");
            setSaving(false);
            return;
        }

        const poData = {
            id,
            vendorId,
            vendorName: vendor.name,
            vendorGstin: vendor.gstin,
            vendorAddress: vendor.address,
            orderDate,
            deliveryAddress,
            lineItems,
            subTotal,
            gstTotal,
            total: Math.round(total),
            additionalDescription,
        };
        
        try {
            await savePurchaseOrder(poData as Omit<PurchaseOrder, 'id' | 'poNumber' | 'status'> & { id?: string });
            navigate('/purchase/orders');
        } catch (error) {
            console.error(error);
            alert("Failed to save purchase order.");
            setSaving(false);
        }
    };

    if (loading) {
        return <Card title={isEditing ? 'Loading Purchase Order...' : 'New Purchase Order'}><p className="p-4 text-center">Loading data...</p></Card>
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Card title={isEditing ? 'Edit Purchase Order' : 'New Purchase Order'}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Vendor</label>
                        <SearchableSelect
                            value={vendorId}
                            onChange={setVendorId}
                            options={vendors.map(v => ({ value: v.id, label: v.name }))}
                            placeholder="Select a vendor"
                        />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Order Date</label>
                        <input type="date" value={orderDate} onChange={e => setOrderDate(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm"/>
                    </div>
                </div>
                 <div className="mt-4">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Deliver To Address</label>
                    <textarea 
                        value={deliveryAddress} 
                        onChange={e => setDeliveryAddress(e.target.value)} 
                        rows={3} 
                        required 
                        className="mt-1 block w-full p-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
                    />
                </div>
            </Card>

            <Card title="Line Items">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-left text-slate-600 dark:text-slate-400">
                            <tr>
                                <th className="p-2 w-1/3">Product</th>
                                <th className="p-2 w-1/3">Description</th>
                                <th className="p-2" style={{width: '120px'}}>Quantity</th>
                                <th className="p-2" style={{width: '120px'}}>Rate</th>
                                <th className="p-2 text-right" style={{width: '130px'}}>Total</th>
                                <th className="p-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {lineItems.map(item => (
                                <tr key={item.id} className="border-t border-slate-200 dark:border-slate-700 align-top">
                                    <td className="p-2 font-medium">{item.productName}</td>
                                    <td className="p-2">
                                        <textarea
                                            value={item.description}
                                            onChange={e => updateLineItem(item.id, 'description', e.target.value)}
                                            className="w-full px-2 py-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-xs"
                                            rows={2}
                                        />
                                    </td>
                                    <td className="p-2">
                                        <div className="flex items-center space-x-2">
                                            <input type="number" value={item.quantity} onChange={e => updateLineItem(item.id, 'quantity', parseFloat(e.target.value))} step="0.001" className="w-20 px-2 py-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md" />
                                            <span>{item.unit}</span>
                                        </div>
                                    </td>
                                     <td className="p-2">
                                        <input type="number" value={item.unitPrice} step="0.01" onChange={e => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value))} className="w-24 px-2 py-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md" />
                                    </td>
                                    <td className="p-2 text-right font-semibold">₹{item.total.toFixed(2)}</td>
                                    <td className="p-2 text-center">
                                        <button type="button" onClick={() => removeLineItem(item.id)} className="text-red-500 hover:text-red-700"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <SearchableSelect
                        onChange={addProductLineItem}
                        options={products.map(p => ({ value: p.id, label: p.name }))}
                        value=""
                        placeholder="Add a product..."
                    />
                </div>
            </Card>

            <Card title="Additional Description / Notes">
                <textarea value={additionalDescription} onChange={e => setAdditionalDescription(e.target.value)} rows={5} className="w-full p-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-sm" placeholder="Add any special notes or instructions for the vendor..."></textarea>
            </Card>
            
             <Card title="Summary">
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">Subtotal:</span> <span className="font-medium">₹{subTotal.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">GST ({GST_RATE}%):</span> <span className="font-medium">₹{gstTotal.toFixed(2)}</span></div>
                    <hr className="my-2"/>
                    <div className="flex justify-between text-lg font-bold text-primary"><span >Grand Total:</span> <span>₹{total.toFixed(2)}</span></div>
                </div>
             </Card>

            <div className="flex justify-end space-x-3 bg-white dark:bg-slate-800 p-4 sticky bottom-0 border-t border-slate-200 dark:border-slate-700 -mx-6 -mb-8 rounded-b-lg">
                <Button type="button" variant="secondary" onClick={() => navigate('/purchase/orders')} disabled={saving}>Cancel</Button>
                <Button type="submit" disabled={saving || lineItems.length === 0} icon={saving ? <Loader size={16} className="animate-spin" /> : null}>
                    {saving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Purchase Order')}
                </Button>
            </div>
        </form>
    );
};

export default PurchaseOrderForm;

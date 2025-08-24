

import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
const { useParams, useNavigate } = ReactRouterDOM;
import Card from '../ui/Card';
import Button from '../ui/Button';
import SearchableSelect from '../ui/SearchableSelect';
import { Loader } from 'lucide-react';
import { SalesOrder, Customer } from '../../types';
import { useSalesStore } from '@/stores/salesStore';
import { getSalesOrder } from '@/services/salesService';
import { getCustomer } from '@/components/customers/CustomerList';

const DeliveryOrderForm: React.FC = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const { createDeliveryOrder } = useSalesStore();

    const [order, setOrder] = useState<SalesOrder | null>(null);
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [deliveryQuantities, setDeliveryQuantities] = useState<Record<string, number>>({});
    const [shippingAddressId, setShippingAddressId] = useState<string>('');
    const [contactId, setContactId] = useState<string>('');
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [additionalDescription, setAdditionalDescription] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!orderId) {
            navigate('/sales/orders');
            return;
        }
        setLoading(true);
        getSalesOrder(orderId).then(soData => {
            if (!soData) throw new Error("Sales Order not found");
            setOrder(soData);
            setShippingAddressId(soData.shippingAddress.id);
            setAdditionalDescription(soData.additionalDescription || '');
            setDeliveryQuantities(
                soData.lineItems.reduce((acc, item) => ({ ...acc, [item.id]: 0 }), {})
            );
            return getCustomer(soData.customerId);
        }).then(customerData => {
            if (!customerData) throw new Error("Customer not found for this order");
            setCustomer(customerData);
            setContactId(customerData.contacts?.find(c => c.isPrimary)?.id || customerData.contacts?.[0]?.id || '');
            setLoading(false);
        }).catch(err => {
            alert(err.message);
            navigate('/sales/orders');
            setLoading(false);
        });
    }, [orderId, navigate]);

    const handleQuantityChange = (lineItemId: string, value: string) => {
        const numValue = parseFloat(value) || 0;
        setDeliveryQuantities(prev => ({ ...prev, [lineItemId]: numValue }));
    };

    const handleSubmit = async () => {
        if (!order || !customer) return;
        
        const deliveryItems = order.lineItems
            .map(item => ({...item, quantity: deliveryQuantities[item.id]}))
            .filter(item => Number(item.quantity) > 0);
            
        if (deliveryItems.length === 0) {
            alert("Please enter a quantity for at least one item.");
            return;
        }

        const selectedShippingAddress = customer.shippingAddresses?.find(a => a.id === shippingAddressId);
        if (!selectedShippingAddress) {
            alert("Please select a valid shipping address.");
            return;
        }

        const selectedContact = customer.contacts?.find(c => c.id === contactId);
        if (!selectedContact) {
            alert("Please select a valid contact person.");
            return;
        }


        setSaving(true);
        try {
            await createDeliveryOrder(order.id, deliveryItems, selectedShippingAddress, selectedContact.id, selectedContact.name, selectedContact.phone, selectedContact.email, vehicleNumber, additionalDescription);
            alert("Delivery Order created successfully!");
            navigate('/sales/deliveries');
        } catch (error) {
            console.error(error);
            alert("Failed to create Delivery Order.");
            setSaving(false);
        }
    };
    
    if (loading || !order || !customer) {
         return <Card title="Loading Sales Order..."><p className="p-4 text-center">Loading...</p></Card>
    }

    const isSubmittable = Object.values(deliveryQuantities).some(qty => Number(qty) > 0);

    return (
        <div className="space-y-4">
            <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Create Delivery from SO #{order.orderNumber}</h3>
            
             <Card title="Shipping Details">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Shipping Address</label>
                        <SearchableSelect
                            value={shippingAddressId}
                            onChange={setShippingAddressId}
                            options={customer.shippingAddresses?.map(a => ({ value: a.id, label: `${a.line1}, ${a.city}` })) || []}
                        />
                    </div>
                     <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Contact Person</label>
                        <SearchableSelect
                            value={contactId}
                            onChange={setContactId}
                            options={customer.contacts?.map(c => ({ value: c.id, label: c.name })) || []}
                        />
                    </div>
                    <div>
                        <label htmlFor="vehicleNumber" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Delivery Vehicle Number</label>
                        <input
                            type="text"
                            id="vehicleNumber"
                            value={vehicleNumber}
                            onChange={(e) => setVehicleNumber(e.target.value)}
                            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder:text-slate-400 dark:placeholder:text-slate-500"
                            placeholder="e.g., MH 01 AB 1234"
                        />
                    </div>
                </div>
             </Card>

            <Card title="Items to Deliver">
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Enter the quantity to deliver for each item. You cannot deliver more than the remaining quantity.</p>
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead className="text-left text-slate-600 dark:text-slate-400">
                            <tr>
                                <th className="p-1 w-2/5">Product</th>
                                <th className="p-1 text-center">Ordered</th>
                                <th className="p-1 text-center">Delivered</th>
                                <th className="p-1 text-center">Remaining</th>
                                <th className="p-1 w-1/5 text-center font-bold">Deliver Now</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.lineItems.map(item => {
                                const delivered = order.deliveredQuantities[item.id] || 0;
                                const remaining = item.quantity - delivered;
                                if (remaining <= 0) return null; // Don't show fully delivered items

                                return (
                                    <tr key={item.id} className="border-t dark:border-slate-700">
                                        <td className="p-1 font-medium">{item.productName}</td>
                                        <td className="p-1 text-center">{item.quantity} {item.unit}</td>
                                        <td className="p-1 text-center">{delivered} {item.unit}</td>
                                        <td className="p-1 text-center font-semibold">{remaining} {item.unit}</td>
                                        <td className="p-1 text-center">
                                            <input 
                                                type="number" 
                                                min="0"
                                                max={remaining}
                                                step="0.001"
                                                value={deliveryQuantities[item.id] || '0'}
                                                onChange={e => handleQuantityChange(item.id, e.target.value)}
                                                className="w-24 px-2 py-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-center"
                                            />
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>

            <Card title="Additional Description / Notes">
                <textarea 
                    value={additionalDescription} 
                    onChange={e => setAdditionalDescription(e.target.value)} 
                    rows={4} 
                    className="w-full p-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-sm" 
                    placeholder="Add any special delivery notes or instructions..."></textarea>
            </Card>

            <div className="flex justify-end space-x-3 bg-white dark:bg-slate-800 p-4 sticky bottom-0 border-t border-slate-200 dark:border-slate-700 -mx-6 -mb-8 rounded-b-lg">
                <Button type="button" variant="secondary" onClick={() => navigate('/sales/orders')} disabled={saving}>Cancel</Button>
                <Button type="button" onClick={handleSubmit} disabled={saving || !isSubmittable} icon={saving ? <Loader size={16} className="animate-spin" /> : null}>
                    {saving ? 'Creating...' : 'Create Delivery Order'}
                </Button>
            </div>
        </div>
    );
};

export default DeliveryOrderForm;
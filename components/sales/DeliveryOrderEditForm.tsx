

import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
const { useParams, useNavigate } = ReactRouterDOM;
import Card from '../ui/Card';
import Button from '../ui/Button';
import SearchableSelect from '../ui/SearchableSelect';
import { Loader } from 'lucide-react';
import { DeliveryOrder, Customer, PointOfContact } from '../../types';
import { getDeliveryOrder, updateDeliveryOrder } from './DeliveryOrderList';
import { getCustomer } from '../customers/CustomerList';
import { getPointsOfContact } from '@/services/pointOfContactService';

const DeliveryOrderEditForm: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();

    const [order, setOrder] = useState<DeliveryOrder | null>(null);
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [pointsOfContact, setPointsOfContact] = useState<PointOfContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!id) {
            navigate('/sales/deliveries');
            return;
        }
        setLoading(true);
        Promise.all([
            getDeliveryOrder(id),
            getPointsOfContact()
        ]).then(([data, contactsData]) => {
            if (data) {
                // Format date for input field
                data.deliveryDate = new Date(data.deliveryDate).toISOString().split('T')[0];
                setOrder(data);
                setPointsOfContact(contactsData || []);
                return getCustomer(data.customerId);
            } else {
                throw new Error("Delivery Order not found.");
            }
        }).then(customerData => {
            if (customerData) {
                setCustomer(customerData);
            } else {
                 throw new Error("Associated customer not found.");
            }
            setLoading(false);
        }).catch(err => {
            alert(err.message);
            navigate('/sales/deliveries');
            setLoading(false);
        });
    }, [id, navigate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        if (!order) return;
        setOrder({ ...order, [e.target.name]: e.target.value });
    };

    const handleContactChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        if (!order || !customer) return;
        const selectedContact = customer.contacts?.find(c => c.id === e.target.value);
        if (selectedContact) {
            setOrder({ 
                ...order, 
                contactId: selectedContact.id,
                contactName: selectedContact.name,
                contactPhone: selectedContact.phone
            });
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!order) return;

        setSaving(true);
        try {
            await updateDeliveryOrder(order);
            alert("Delivery Order updated successfully!");
            navigate(`/sales/deliveries/${order.id}/view`);
        } catch (error: any) {
            alert(`Error updating delivery order: ${error.message}`);
            setSaving(false);
        }
    };

    if (loading || !order) {
        return <Card title="Loading Delivery Order..." bodyClassName="text-center p-8"><Loader className="animate-spin" /></Card>;
    }

    return (
        <form onSubmit={handleSave} className="space-y-4">
            <h3 className="text-2xl font-bold text-slate-800">Edit Delivery Order #{order.deliveryNumber}</h3>

            <Card title="Dispatch Details">
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="deliveryDate" className="block text-xs font-medium text-slate-700 mb-1">Delivery Date</label>
                        <input
                            type="date"
                            id="deliveryDate"
                            name="deliveryDate"
                            value={order.deliveryDate}
                            onChange={handleChange}
                            required
                            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm"
                        />
                    </div>
                    <div>
                        <label htmlFor="vehicleNumber" className="block text-xs font-medium text-slate-700 mb-1">Delivery Vehicle Number</label>
                        <input
                            type="text"
                            id="vehicleNumber"
                            name="vehicleNumber"
                            value={order.vehicleNumber || ''}
                            onChange={handleChange}
                            className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm"
                            placeholder="e.g., MH 01 AB 1234"
                        />
                    </div>
                     <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">Contact Person</label>
                        <select 
                            name="contactId"
                            value={order.contactId} 
                            onChange={handleContactChange} 
                            required 
                            disabled={!customer} 
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md disabled:bg-slate-100"
                        >
                            {customer?.contacts?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                </div>
            </Card>

            <Card title="Our Point of Contact (Optional)">
                <div className="p-6">
                    <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Our Point of Contact</label>
                        <SearchableSelect
                            value={order.pointOfContactId || ''}
                            onChange={(value) => setOrder({ ...order, pointOfContactId: value || undefined })}
                            options={pointsOfContact.map(c => ({
                                value: c.id,
                                label: `${c.name}${c.designation ? ` - ${c.designation}` : ''}`
                            }))}
                            placeholder="Select point of contact (optional)"
                            disabled={saving}
                        />
                    </div>
                </div>
            </Card>

             <Card title="Additional Description / Notes">
                <div className="p-6">
                    <textarea 
                        name="additionalDescription"
                        value={order.additionalDescription || ''} 
                        onChange={handleChange}
                        rows={4} 
                        className="w-full p-2 border border-slate-300 rounded-md text-sm" 
                        placeholder="Add any special delivery notes or instructions..."></textarea>
                </div>
            </Card>

            <Card title="Line Items (Read-only)">
                 <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead className="text-left text-slate-600">
                            <tr>
                                <th className="p-1">Product</th>
                                <th className="p-1 text-center">Quantity Delivered</th>
                            </tr>
                        </thead>
                        <tbody>
                            {order.lineItems.map(item => (
                                <tr key={item.id} className="border-t">
                                    <td className="p-1 font-medium">{item.productName}</td>
                                    <td className="p-1 text-center">{item.quantity} {item.unit}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            <div className="flex justify-end space-x-3 bg-white p-4 sticky bottom-0 border-t border-slate-200 -mx-6 -mb-8 rounded-b-lg">
                <Button type="button" variant="secondary" onClick={() => navigate(`/sales/deliveries/${order.id}/view`)} disabled={saving}>Cancel</Button>
                <Button type="submit" disabled={saving} icon={saving ? <Loader size={16} className="animate-spin" /> : null}>
                    {saving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>
        </form>
    );
};

export default DeliveryOrderEditForm;
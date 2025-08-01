

import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
const { useParams, useNavigate } = ReactRouterDOM;
import { Plus, Trash2, Home, Building, Loader } from 'lucide-react';
import { Contact, Address, CustomerFormData, UserRole } from '../../types';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { getCustomer, saveCustomer } from './CustomerList';
import { useAuth } from '@/contexts/AuthContext';

const emptyContact: Omit<Contact, 'id'> = { name: '', email: '', phone: '', isPrimary: false };
const emptyAddress: Omit<Address, 'id'> = { line1: '', city: '', state: '', pincode: '', isDefault: false, line2: '' };

const newCustomerTemplate: CustomerFormData = {
    name: '',
    gstin: '',
    contacts: [{ ...emptyContact, isPrimary: true }],
    billingAddress: { ...emptyAddress, isDefault: true },
    shippingAddresses: [{ ...emptyAddress, isDefault: true }],
};

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 dark:text-slate-100 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400" />
);

const CustomerForm: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isEditing = !!id;
    const isViewer = user?.role === UserRole.Viewer;

    const [customer, setCustomer] = useState<CustomerFormData>(newCustomerTemplate);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isEditing && id) {
            setLoading(true);
            getCustomer(id).then(data => {
                if (data) {
                    const formData: CustomerFormData = {
                        id: data.id,
                        name: data.name,
                        gstin: data.gstin,
                        contacts: data.contacts || [{...emptyContact, isPrimary: true}],
                        billingAddress: data.billingAddress || {...emptyAddress, isDefault: true},
                        shippingAddresses: data.shippingAddresses || [{...emptyAddress, isDefault: true}],
                    };
                    setCustomer(formData);
                } else {
                    alert("Customer not found.");
                    navigate('/customers');
                }
                setLoading(false);
            }).catch(() => setLoading(false));
        } else {
            setCustomer(newCustomerTemplate);
        }
    }, [id, isEditing, navigate]);

    const handleCustomerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCustomer(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleBillingAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setCustomer(prev => ({ ...prev, billingAddress: { ...prev.billingAddress, [e.target.name]: e.target.value } }));
    };

    const handleContactChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const newContacts = [...customer.contacts];
        const contact = newContacts[index];
        newContacts[index] = { ...contact, [e.target.name]: e.target.value };
        setCustomer(prev => ({ ...prev, contacts: newContacts }));
    };
    
    const setPrimaryContact = (index: number) => {
        const newContacts = customer.contacts.map((contact, i) => ({
            ...contact,
            isPrimary: i === index,
        }));
        setCustomer(prev => ({ ...prev, contacts: newContacts }));
    };

    const addContact = () => {
        setCustomer(prev => ({ ...prev, contacts: [...prev.contacts, { ...emptyContact, id: `new_${Date.now()}` }] }));
    };
    
    const removeContact = (index: number) => {
        if (customer.contacts.length <= 1) {
            alert("At least one contact is required.");
            return;
        }
        const newContacts = customer.contacts.filter((_, i) => i !== index);
        if (!newContacts.some(c => c.isPrimary) && newContacts.length > 0) {
            newContacts[0].isPrimary = true;
        }
        setCustomer(prev => ({...prev, contacts: newContacts}));
    };
    
    const handleShippingAddressChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const newAddresses = [...customer.shippingAddresses];
        const address = newAddresses[index];
        newAddresses[index] = { ...address, [e.target.name]: e.target.value };
        setCustomer(prev => ({ ...prev, shippingAddresses: newAddresses }));
    };

    const setDefaultShipping = (index: number) => {
        const newAddresses = customer.shippingAddresses.map((addr, i) => ({
            ...addr,
            isDefault: i === index,
        }));
        setCustomer(prev => ({ ...prev, shippingAddresses: newAddresses }));
    };

    const addShippingAddress = () => {
        setCustomer(prev => ({ ...prev, shippingAddresses: [...prev.shippingAddresses, { ...emptyAddress, id: `new_${Date.now()}` }] }));
    };
    
    const removeShippingAddress = (index: number) => {
         if (customer.shippingAddresses.length <= 1) {
            alert("At least one shipping address is required.");
            return;
        }
        const newAddresses = customer.shippingAddresses.filter((_, i) => i !== index);
         if (!newAddresses.some(a => a.isDefault) && newAddresses.length > 0) {
            newAddresses[0].isDefault = true;
        }
        setCustomer(prev => ({...prev, shippingAddresses: newAddresses}));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isViewer) return;
        setLoading(true);
        try {
            await saveCustomer(customer);
            alert(`Customer ${isEditing ? 'updated' : 'created'} successfully!`);
            navigate('/customers');
        } catch (error) {
            console.error("Failed to save customer:", error);
            alert("Failed to save customer. Please try again.");
            setLoading(false);
        }
    };

    if (loading && isEditing) {
        return <Card title="Loading Customer..." bodyClassName="p-10 text-center">Loading customer data...</Card>
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Card title={isEditing ? `Edit Customer: ${customer.name}` : 'New Customer'}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Customer Name</label>
                        <Input type="text" name="name" value={customer.name} onChange={handleCustomerChange} required disabled={loading || isViewer}/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">GSTIN</label>
                        <Input type="text" name="gstin" value={customer.gstin} onChange={handleCustomerChange} required disabled={loading || isViewer}/>
                    </div>
                </div>
            </Card>

            <Card
                title="Contacts"
                actions={!isViewer && <Button type="button" variant="secondary" size="sm" onClick={addContact} icon={<Plus size={16} />} disabled={loading || isViewer}>Add Contact</Button>}
            >
                <div className="space-y-4">
                    {customer.contacts.map((contact, index) => (
                        <div key={contact.id || index} className="p-4 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 space-y-3 relative">
                            {!isViewer && (
                                <div className="absolute top-2 right-2 flex items-center space-x-2">
                                    <button type="button" onClick={() => setPrimaryContact(index)} className={`px-2 py-0.5 text-xs rounded-full ${contact.isPrimary ? 'bg-primary text-white cursor-default' : 'bg-slate-200 hover:bg-slate-300'}`} disabled={loading || !!contact.isPrimary}>
                                        {contact.isPrimary ? 'Primary' : 'Set as Primary'}
                                    </button>
                                    <button type="button" onClick={() => removeContact(index)} className="text-red-500 hover:text-red-700 disabled:opacity-50" disabled={customer.contacts.length <= 1 || loading}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div><label className="text-xs text-slate-600 dark:text-slate-400">Name</label><Input name="name" value={contact.name} onChange={e => handleContactChange(index, e)} required disabled={loading || isViewer}/></div>
                                <div><label className="text-xs text-slate-600 dark:text-slate-400">Email</label><Input type="email" name="email" value={contact.email} onChange={e => handleContactChange(index, e)} required disabled={loading || isViewer}/></div>
                                <div><label className="text-xs text-slate-600 dark:text-slate-400">Phone</label><Input name="phone" value={contact.phone} onChange={e => handleContactChange(index, e)} required disabled={loading || isViewer}/></div>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <Card title="Billing Address" icon={<Building size={18} />}>
                    <div className="space-y-3">
                       <div><label className="text-xs text-slate-600 dark:text-slate-400">Address Line 1</label><Input name="line1" value={customer.billingAddress.line1} onChange={handleBillingAddressChange} required disabled={loading || isViewer}/></div>
                       <div><label className="text-xs text-slate-600 dark:text-slate-400">Address Line 2 (Optional)</label><Input name="line2" value={customer.billingAddress.line2 || ''} onChange={handleBillingAddressChange} disabled={loading || isViewer}/></div>
                       <div><label className="text-xs text-slate-600 dark:text-slate-400">City</label><Input name="city" value={customer.billingAddress.city} onChange={handleBillingAddressChange} required disabled={loading || isViewer}/></div>
                       <div className="grid grid-cols-2 gap-4">
                            <div><label className="text-xs text-slate-600 dark:text-slate-400">State</label><Input name="state" value={customer.billingAddress.state} onChange={handleBillingAddressChange} required disabled={loading || isViewer}/></div>
                            <div><label className="text-xs text-slate-600 dark:text-slate-400">Pincode</label><Input name="pincode" value={customer.billingAddress.pincode} onChange={handleBillingAddressChange} required disabled={loading || isViewer}/></div>
                       </div>
                    </div>
                 </Card>
                 
                 <Card 
                    title="Shipping Addresses" 
                    icon={<Home size={18} />}
                    actions={!isViewer && <Button type="button" variant="secondary" size="sm" onClick={addShippingAddress} icon={<Plus size={16} />} disabled={loading || isViewer}>Add Address</Button>}
                 >
                     <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                        {customer.shippingAddresses.map((addr, index) => (
                            <div key={addr.id || index} className="p-4 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 space-y-3 relative">
                                {!isViewer && (
                                    <div className="absolute top-2 right-2 flex items-center space-x-2">
                                        <button type="button" onClick={() => setDefaultShipping(index)} className={`px-2 py-0.5 text-xs rounded-full ${addr.isDefault ? 'bg-primary text-white cursor-default' : 'bg-slate-200 hover:bg-slate-300'}`} disabled={loading || !!addr.isDefault}>
                                            {addr.isDefault ? 'Default' : 'Set as Default'}
                                        </button>
                                        <button type="button" onClick={() => removeShippingAddress(index)} className="text-red-500 hover:text-red-700 disabled:opacity-50" disabled={customer.shippingAddresses.length <= 1 || loading}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )}
                                <div className="space-y-3">
                                   <div><label className="text-xs text-slate-600 dark:text-slate-400">Address Line 1</label><Input name="line1" value={addr.line1} onChange={e => handleShippingAddressChange(index, e)} required disabled={loading || isViewer}/></div>
                                   <div><label className="text-xs text-slate-600 dark:text-slate-400">Address Line 2 (Optional)</label><Input name="line2" value={addr.line2 || ''} onChange={e => handleShippingAddressChange(index, e)} disabled={loading || isViewer}/></div>
                                   <div><label className="text-xs text-slate-600 dark:text-slate-400">City</label><Input name="city" value={addr.city} onChange={e => handleShippingAddressChange(index, e)} required disabled={loading || isViewer}/></div>
                                   <div className="grid grid-cols-2 gap-4">
                                        <div><label className="text-xs text-slate-600 dark:text-slate-400">State</label><Input name="state" value={addr.state} onChange={e => handleShippingAddressChange(index, e)} required disabled={loading || isViewer}/></div>
                                        <div><label className="text-xs text-slate-600 dark:text-slate-400">Pincode</label><Input name="pincode" value={addr.pincode} onChange={e => handleShippingAddressChange(index, e)} required disabled={loading || isViewer}/></div>
                                   </div>
                                </div>
                            </div>
                        ))}
                    </div>
                 </Card>
            </div>

            <div className="flex justify-end space-x-3 bg-white dark:bg-slate-800 p-4 sticky bottom-0 border-t border-slate-200 dark:border-slate-700 -mx-6 -mb-8 rounded-b-lg">
                <Button type="button" variant="secondary" onClick={() => navigate('/customers')} disabled={loading}>Cancel</Button>
                {!isViewer && (
                    <Button type="submit" disabled={loading} icon={loading ? <Loader size={16} className="animate-spin" /> : null}>
                        {loading ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Customer')}
                    </Button>
                )}
            </div>
        </form>
    );
};

export default CustomerForm;
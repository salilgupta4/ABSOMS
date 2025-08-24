
import React, { useState, useEffect, useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
const { useParams, useNavigate } = ReactRouterDOM;
import { Trash2, Loader } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import SearchableSelect from '@/components/ui/SearchableSelect';
import { getCustomers, getCustomer } from '@/components/customers/CustomerList';
import { getProducts } from '@/components/products/ProductList';
import { saveQuote, getQuote } from '@/services/salesService';
import { getTerms } from '@/components/settings/termsService';
import { getPointsOfContact, getDefaultPointOfContact } from '@/services/pointOfContactService';
import { Customer, Product, DocumentLineItem, Quote, PointOfContact, CompanyDetails, UserRole } from '@/types';
import { getCompanyDetails } from '@/components/settings/CompanyDetails';
import { getEmailService } from '@/services/emailService';
import { useAuth } from '@/contexts/AuthContext';
import { canPerformAction } from '@/utils/permissions';

const GST_RATE = 18; // 18%

import { useSalesStore } from '@/stores/salesStore';

const QuoteForm: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = !!id;
    const { saveQuote } = useSalesStore();
    const { user } = useAuth();

    // Permission checks
    const canCreate = canPerformAction(user, 'create');
    const canEdit = canPerformAction(user, 'edit');
    const isViewer = user?.role === UserRole.Viewer;

    // Prevent access if user doesn't have required permissions
    if ((!isEditing && !canCreate) || (isEditing && !canEdit)) {
        return (
            <div className="flex items-center justify-center h-64 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="text-center">
                    <h3 className="text-lg font-medium text-red-800 dark:text-red-200 mb-2">Access Denied</h3>
                    <p className="text-red-600 dark:text-red-400">You don't have permission to {isEditing ? 'edit' : 'create'} quotes.</p>
                    <Button 
                        variant="secondary" 
                        onClick={() => navigate('/sales/quotes')}
                        className="mt-4"
                    >
                        Back to Quotes
                    </Button>
                </div>
            </div>
        );
    }

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [predefinedTerms, setPredefinedTerms] = useState<string[]>([]);
    const [pointsOfContact, setPointsOfContact] = useState<PointOfContact[]>([]);
    
    const [customerId, setCustomerId] = useState('');
    const [contactId, setContactId] = useState('');
    const [shippingAddressId, setShippingAddressId] = useState('');
    const [pointOfContactId, setPointOfContactId] = useState('');
    const [expiryDate, setExpiryDate] = useState('');
    const [lineItems, setLineItems] = useState<DocumentLineItem[]>([]);
    
    const [selectedTerms, setSelectedTerms] = useState<string[]>([]);
    const [customTerm, setCustomTerm] = useState('');

    const [additionalDescription, setAdditionalDescription] = useState('');
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [customerLoading, setCustomerLoading] = useState(false);
    const [companyDetails, setCompanyDetails] = useState<CompanyDetails | null>(null);

    // Initial data load
    useEffect(() => {
        Promise.all([getCustomers(), getProducts(), getTerms(), getPointsOfContact(), getCompanyDetails(), id ? getQuote(id) : Promise.resolve(null)])
        .then(async ([customerData, productData, termsData, contactsData, companyData, quoteData]) => {
            setCustomers(customerData);
            setProducts(productData);
            setPredefinedTerms(termsData);
            setPointsOfContact(contactsData);
            setCompanyDetails(companyData);

            if (quoteData && isEditing) {
                // Pre-fill form if editing
                setCustomerId(quoteData.customerId);
                // The useEffect for customerId will trigger fetching the full customer details
                
                setContactId(quoteData.contactId);
                setShippingAddressId(quoteData.shippingAddress?.id || '');
                setPointOfContactId(quoteData.pointOfContactId || '');
                setExpiryDate(new Date(quoteData.expiryDate).toISOString().split('T')[0]);
                setLineItems(quoteData.lineItems);

                if (Array.isArray(quoteData.terms)) {
                    const savedTerms = quoteData.terms;
                    const selected = savedTerms.filter(t => termsData.includes(t));
                    const custom = savedTerms.find(t => !termsData.includes(t)) || '';
                    setSelectedTerms(selected);
                    setCustomTerm(custom);
                } else if (typeof quoteData.terms === 'string') {
                    setCustomTerm(quoteData.terms);
                }
                setAdditionalDescription(quoteData.additionalDescription || '');
            } else {
                // Set defaults for new quote
                const today = new Date();
                today.setDate(today.getDate() + 15);
                setExpiryDate(today.toISOString().split('T')[0]);
                setSelectedTerms(termsData.slice(0, 2));
                
                // Set default point of contact
                const defaultContact = contactsData.find(c => c.isDefault) || contactsData[0];
                if (defaultContact) {
                    setPointOfContactId(defaultContact.id);
                }
            }
            setLoading(false);
        }).catch(err => {
            console.error(err);
            alert("Failed to load necessary data for quote form.");
            setLoading(false);
        });
    }, [id, isEditing]);

    // When customer changes, fetch their details. For new quotes, set default contact/address.
    useEffect(() => {
        if (customerId) {
            setCustomerLoading(true);
            getCustomer(customerId).then(data => {
                setSelectedCustomer(data || null);
                if (data) {
                    // For new quotes, automatically select the primary contact and address.
                    // For existing quotes, we don't want to override the values loaded from the quote data.
                    if (!isEditing) {
                        setContactId(data.contacts?.find(c => c.isPrimary)?.id || data.contacts?.[0]?.id || '');
                        setShippingAddressId(data.shippingAddresses?.find(a => a.isDefault)?.id || data.shippingAddresses?.[0]?.id || '');
                    }
                }
                setCustomerLoading(false);
            });
        } else {
            setSelectedCustomer(null);
            setContactId('');
            setShippingAddressId('');
        }
    }, [customerId, isEditing]);
    
    const addProductLineItem = (productId: string) => {
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
    
    const updateLineItem = (lineItemId: string, field: 'quantity' | 'description' | 'unitPrice', value: string | number) => {
        setLineItems(prev => prev.map(item => {
            if (item.id === lineItemId) {
                const updatedItem = { ...item };
                if (field === 'quantity') {
                    updatedItem.quantity = Math.max(0, Number(value));
                } else if (field === 'unitPrice') {
                    updatedItem.unitPrice = Math.max(0, Number(value));
                } else if (field === 'description') {
                    updatedItem.description = String(value);
                }
                updatedItem.total = updatedItem.quantity * updatedItem.unitPrice;
                return updatedItem;
            }
            return item;
        }));
    };

    const removeLineItem = (lineItemId: string) => {
        setLineItems(prev => prev.filter(item => item.id !== lineItemId));
    };

    const handleTermToggle = (term: string) => {
        setSelectedTerms(prev => 
            prev.includes(term) ? prev.filter(t => t !== term) : [...prev, term]
        );
    };

    const { subTotal, gstTotal, total } = useMemo(() => {
        const sub = lineItems.reduce((acc, item) => acc + item.total, 0);
        const gst = sub * (GST_RATE / 100);
        return { subTotal: sub, gstTotal: gst, total: sub + gst };
    }, [lineItems]);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!customerId || lineItems.length === 0 || !contactId || !shippingAddressId) {
            alert("Please select a customer, contact, shipping address, and add at least one product.");
            return;
        }
        setSaving(true);
        
        const customer = selectedCustomer;
        const contact = customer?.contacts?.find(c => c.id === contactId);
        const shippingAddress = customer?.shippingAddresses?.find(a => a.id === shippingAddressId);
        const billingAddress = customer?.billingAddress;

        if (!customer || !contact || !shippingAddress || !billingAddress) {
            alert("Selected customer, contact, or address details are incomplete.");
            setSaving(false);
            return;
        }
        
        const finalTerms = [...selectedTerms, customTerm.trim()].filter(Boolean);

        const quoteData = {
            id,
            customerId,
            customerName: customer.name,
            customerGstin: customer.gstin,
            contactId,
            contactName: contact.name,
            contactPhone: contact.phone,
            contactEmail: contact.email,
            billingAddress,
            shippingAddress,
            issueDate: new Date().toISOString(),
            expiryDate,
            lineItems,
            subTotal,
            gstTotal,
            total: Math.round(total),
            terms: finalTerms,
            additionalDescription,
            pointOfContactId: pointOfContactId || undefined,
        };
        
        try {
            await saveQuote(quoteData as Omit<Quote, 'status' | 'quoteNumber'>);
            alert('Quote saved successfully!');
            navigate('/sales/quotes');
        } catch (error) {
            console.error(error);
            alert("Failed to save quote.");
            setSaving(false);
        }
    };

    if (loading) {
        return <Card title={isEditing ? 'Loading Quote...' : 'New Quote'}><div className="p-4 text-center flex justify-center items-center"><Loader className="animate-spin mr-2"/>Loading data...</div></Card>
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <Card title={isEditing ? 'Edit Quote' : 'New Quote'}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Customer</label>
                        <SearchableSelect
                            value={customerId}
                            onChange={setCustomerId}
                            options={customers.map(c => ({ value: c.id, label: c.name }))}
                            placeholder="Select a customer"
                        />
                    </div>
                     <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Contact Person</label>
                         <SearchableSelect
                            value={contactId}
                            onChange={setContactId}
                            options={selectedCustomer?.contacts?.map(c => ({ value: c.id, label: c.name })) || []}
                            placeholder={customerLoading ? "Loading..." : "Select a contact"}
                            disabled={!selectedCustomer || customerLoading}
                        />
                    </div>
                     <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Shipping Address</label>
                        <SearchableSelect
                            value={shippingAddressId}
                            onChange={setShippingAddressId}
                            options={selectedCustomer?.shippingAddresses?.map(a => ({ value: a.id, label: `${a.line1}, ${a.city}` })) || []}
                            placeholder={customerLoading ? "Loading..." : "Select an address"}
                            disabled={!selectedCustomer || customerLoading}
                        />
                    </div>
                     <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Point of Contact</label>
                        <SearchableSelect
                            value={pointOfContactId}
                            onChange={setPointOfContactId}
                            options={pointsOfContact.map(c => ({ 
                                value: c.id, 
                                label: `${c.name}${c.designation ? ` - ${c.designation}` : ''}`
                            }))}
                            placeholder="Select point of contact"
                        />
                    </div>
                     <div>
                        <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Expiry Date</label>
                        <input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm"/>
                    </div>
                </div>
            </Card>

            <Card title="Line Items">
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead className="text-left text-slate-600 dark:text-slate-400">
                            <tr>
                                <th className="p-1 w-1/3">Product</th>
                                <th className="p-1 w-1/3">Description</th>
                                <th className="p-1" style={{width: '120px'}}>Quantity</th>
                                <th className="p-1" style={{width: '120px'}}>Rate</th>
                                <th className="p-1" style={{width: '130px', textAlign: 'right'}}>Total</th>
                                <th className="p-1"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {lineItems.map(item => (
                                <tr key={item.id} className="border-t border-slate-200 dark:border-slate-700 align-top">
                                    <td className="p-1 font-medium">{item.productName}</td>
                                    <td className="p-1">
                                        <textarea
                                            value={item.description}
                                            onChange={e => updateLineItem(item.id, 'description', e.target.value)}
                                            className="w-full px-1 py-0.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-xs"
                                            rows={1}
                                        />
                                    </td>
                                    <td className="p-1">
                                        <div className="flex items-center space-x-2">
                                            <input type="number" value={item.quantity} onChange={e => updateLineItem(item.id, 'quantity', parseFloat(e.target.value))} step="0.001" className="w-20 px-2 py-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md" />
                                            <span>{item.unit}</span>
                                        </div>
                                    </td>
                                    <td className="p-1">
                                       <input 
                                            type="number"
                                            value={item.unitPrice}
                                            onChange={e => updateLineItem(item.id, 'unitPrice', parseFloat(e.target.value))}
                                            step="0.01"
                                            className="w-24 px-2 py-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-right"
                                        />
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                 <Card title="Terms & Conditions">
                    <div className="space-y-2">
                        <p className="text-xs text-slate-500 mb-2">Select predefined terms:</p>
                        <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                            {predefinedTerms.map(term => (
                                <label key={term} className="flex items-center text-sm">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedTerms.includes(term)}
                                        onChange={() => handleTermToggle(term)}
                                        className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary"
                                    />
                                    <span className="ml-2 text-slate-700 dark:text-slate-300">{term}</span>
                                </label>
                            ))}
                        </div>
                         <div className="pt-2">
                            <label className="text-xs text-slate-500 mb-1 block">Add a custom term (optional):</label>
                            <input 
                                type="text"
                                value={customTerm}
                                onChange={e => setCustomTerm(e.target.value)}
                                className="w-full p-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
                                placeholder="One-off term or condition"
                            />
                        </div>
                    </div>
                 </Card>
                 <Card title="Additional Description / Notes">
                    <textarea value={additionalDescription} onChange={e => setAdditionalDescription(e.target.value)} rows={5} className="w-full p-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-sm" placeholder="Add any special notes or instructions here..."></textarea>
                 </Card>
            </div>
            
             <Card title="Summary">
                <div className="space-y-2">
                    <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">Subtotal:</span> <span className="font-medium">₹{subTotal.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-slate-600 dark:text-slate-400">GST ({GST_RATE}%):</span> <span className="font-medium">₹{gstTotal.toFixed(2)}</span></div>
                    <hr className="my-2 border-slate-200 dark:border-slate-700"/>
                    <div className="flex justify-between text-lg font-bold text-primary"><span >Grand Total:</span> <span>₹{Math.round(total).toFixed(2)}</span></div>
                </div>
             </Card>

            <div className="flex justify-end space-x-3 bg-white dark:bg-slate-800 p-4 sticky bottom-0 border-t border-slate-200 dark:border-slate-700 -mx-6 -mb-8 rounded-b-lg">
                <Button type="button" variant="secondary" onClick={() => navigate('/sales/quotes')} disabled={saving}>Cancel</Button>
                <Button type="submit" disabled={saving || lineItems.length === 0} icon={saving ? <Loader size={16} className="animate-spin" /> : null}>
                    {saving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Quote')}
                </Button>
            </div>
        </form>
    );
};

export default QuoteForm;
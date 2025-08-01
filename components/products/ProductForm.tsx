

import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
const { useParams, useNavigate } = ReactRouterDOM;
import { Loader, Package } from 'lucide-react';
import { ProductFormData, UserRole } from '../../types';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { getProduct, saveProduct } from './ProductList';
import { useAuth } from '@/contexts/AuthContext';

const newProductTemplate: ProductFormData = {
    name: '',
    description: '',
    unit: '',
    rate: 0,
    hsnCode: '',
};

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 dark:text-slate-100 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400" />
);

const TextArea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} rows={3} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 dark:text-slate-100 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400" />
);

const ProductForm: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isEditing = !!id;
    const isViewer = user?.role === UserRole.Viewer;

    const [product, setProduct] = useState<ProductFormData>(newProductTemplate);
    const [loading, setLoading] = useState(false);
    const [pageTitle, setPageTitle] = useState('New Product');

    useEffect(() => {
        if (isEditing && id) {
            setLoading(true);
            getProduct(id).then(data => {
                if (data) {
                    setProduct(data);
                    setPageTitle(`Edit: ${data.name}`);
                }
                setLoading(false);
            }).catch(() => setLoading(false));
        } else {
            setProduct(newProductTemplate);
            setPageTitle('New Product');
        }
    }, [id, isEditing]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setProduct(prev => ({ 
            ...prev, 
            [name]: (e.target as HTMLInputElement).type === 'number' ? parseFloat(value) || 0 : value 
        }));
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isViewer) return;
        setLoading(true);
        try {
            await saveProduct(product);
            alert(`Product ${isEditing ? 'updated' : 'created'} successfully!`);
            navigate('/products');
        } catch (error) {
            console.error("Failed to save product:", error);
            alert("Failed to save product. Please try again.");
            setLoading(false);
        }
    };

    if (loading && isEditing) {
        return <Card title="Loading Product..." bodyClassName="p-10 text-center">Loading product data...</Card>
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Card title={pageTitle} icon={<Package size={20} />}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Product Name</label>
                        <Input type="text" name="name" value={product.name} onChange={handleChange} required disabled={loading || isViewer}/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Description</label>
                        <TextArea name="description" value={product.description} onChange={handleChange} required disabled={loading || isViewer}/>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Unit (e.g., pcs, kg)</label>
                            <Input type="text" name="unit" value={product.unit} onChange={handleChange} required disabled={loading || isViewer}/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Rate (₹)</label>
                            <Input type="number" name="rate" value={product.rate} onChange={handleChange} required disabled={loading || isViewer} step="0.01" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">HSN Code</label>
                            <Input type="text" name="hsnCode" value={product.hsnCode} onChange={handleChange} required disabled={loading || isViewer}/>
                        </div>
                    </div>
                </div>
            </Card>

            <div className="flex justify-end space-x-3 bg-white dark:bg-slate-800 p-4 sticky bottom-0 border-t border-slate-200 dark:border-slate-700 -mx-6 -mb-8 rounded-b-lg">
                <Button type="button" variant="secondary" onClick={() => navigate('/products')} disabled={loading}>Cancel</Button>
                {!isViewer && (
                    <Button type="submit" disabled={loading} icon={loading ? <Loader size={16} className="animate-spin" /> : null}>
                        {loading ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Product')}
                    </Button>
                )}
            </div>
        </form>
    );
};

export default ProductForm;
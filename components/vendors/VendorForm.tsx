

import React, { useState, useEffect } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
const { useParams, useNavigate } = ReactRouterDOM;
import { Loader, Building } from 'lucide-react';
import { VendorFormData, UserRole } from '../../types';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { getVendor, saveVendor } from './VendorList';
import { useAuth } from '@/contexts/AuthContext';

const newVendorTemplate: VendorFormData = {
    name: '',
    gstin: '',
    address: '',
};

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
    <input {...props} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-100 dark:text-slate-800 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400" />
);

const TextArea = (props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
    <textarea {...props} rows={3} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-100 dark:text-slate-800 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400" />
);

const VendorForm: React.FC = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const isEditing = !!id;
    const isViewer = user?.role === UserRole.Viewer;

    const [vendor, setVendor] = useState<VendorFormData>(newVendorTemplate);
    const [loading, setLoading] = useState(false);
    const [pageTitle, setPageTitle] = useState('New Vendor');

    useEffect(() => {
        if (isEditing && id) {
            setLoading(true);
            getVendor(id).then(data => {
                if (data) {
                    setVendor(data);
                    setPageTitle(`Edit: ${data.name}`);
                }
                setLoading(false);
            }).catch(() => setLoading(false));
        } else {
            setVendor(newVendorTemplate);
            setPageTitle('New Vendor');
        }
    }, [id, isEditing]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setVendor(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isViewer) return;
        setLoading(true);
        try {
            await saveVendor(vendor);
            alert(`Vendor ${isEditing ? 'updated' : 'created'} successfully!`);
            navigate('/vendors');
        } catch (error) {
            console.error("Failed to save vendor:", error);
            alert("Failed to save vendor. Please try again.");
            setLoading(false);
        }
    };

    if (loading && isEditing) {
        return <Card title="Loading Vendor..." bodyClassName="p-10 text-center">Loading vendor data...</Card>
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <Card title={pageTitle} icon={<Building size={20} />}>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Vendor Name</label>
                        <Input type="text" name="name" value={vendor.name} onChange={handleChange} required disabled={loading || isViewer}/>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">GSTIN</label>
                        <Input type="text" name="gstin" value={vendor.gstin} onChange={handleChange} required disabled={loading || isViewer}/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Address</label>
                        <TextArea name="address" value={vendor.address} onChange={handleChange} required disabled={loading || isViewer}/>
                    </div>
                </div>
            </Card>

            <div className="flex justify-end space-x-3 bg-white dark:bg-slate-800 p-4 sticky bottom-0 border-t border-slate-200 dark:border-slate-700 -mx-6 -mb-8 rounded-b-lg">
                <Button type="button" variant="secondary" onClick={() => navigate('/vendors')} disabled={loading}>Cancel</Button>
                {!isViewer && (
                    <Button type="submit" disabled={loading || isViewer} icon={loading ? <Loader size={16} className="animate-spin" /> : null}>
                        {loading ? 'Saving...' : (isEditing ? 'Save Changes' : 'Create Vendor')}
                    </Button>
                )}
            </div>
        </form>
    );
};

export default VendorForm;


import React, { useState, useEffect } from 'react';
import { CompanyDetails as CompanyDetailsType, BankDetails, UserRole } from '@/types';
import Button from '@/components/ui/Button';
import { Loader } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// --- FIRESTORE SERVICE ---
const SETTINGS_KEY = 'companyDetails';
const settingsDocRef = doc(db, "settings", SETTINGS_KEY);

const defaultDetails: CompanyDetailsType = {
    name: 'My Awesome Company',
    gstin: '27ABCDE1234F1Z5',
    address: '123 Business Lane, Commerce City, Maharashtra, 400001',
    phone: '+91 98765 43210',
    email: 'contact@awesome.co',
    bankDetails: {
        name: 'State Bank of India',
        branch: 'SME PARISHRAMA BHAVAN BRANCH',
        accountNumber: '43069993078',
        ifsc: 'SBIN0063776',
    },
    deliveryAddress: 'Main Warehouse, Gate 3, Industrial Complex, Pune, Maharashtra, 411033',
};

export const getCompanyDetails = async (): Promise<CompanyDetailsType> => {
    const docSnap = await getDoc(settingsDocRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        // Ensure bankDetails exists and has all properties
        const bankDetails = { ...defaultDetails.bankDetails, ...(data.bankDetails || {}) };
        return { ...defaultDetails, ...data, bankDetails } as CompanyDetailsType;
    } else {
        // If not stored, just return default details. Do not attempt to write.
        return defaultDetails;
    }
}

export const saveCompanyDetails = async (details: CompanyDetailsType): Promise<CompanyDetailsType> => {
    await setDoc(settingsDocRef, details);
    return details;
}
// --- END FIRESTORE SERVICE ---

const InputField: React.FC<{ label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; name: string; disabled?: boolean; }> = ({ label, value, onChange, name, disabled }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
        <input type="text" name={name} id={name} value={value} onChange={onChange} disabled={disabled} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-100 dark:text-slate-800 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400" />
    </div>
);
const TextAreaField: React.FC<{ label: string; value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; name: string; disabled?: boolean; rows?: number }> = ({ label, value, onChange, name, disabled, rows=3 }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
        <textarea name={name} id={name} value={value} onChange={onChange} rows={rows} disabled={disabled} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-100 dark:text-slate-800 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400" />
    </div>
);


const CompanyDetails: React.FC = () => {
    const { user } = useAuth();
    const [details, setDetails] = useState<CompanyDetailsType | null>(null);
    const [loading, setLoading] = useState(true);

    const isViewer = user?.role === UserRole.Viewer;

    useEffect(() => {
        setLoading(true);
        getCompanyDetails().then(data => {
            setDetails(data);
            setLoading(false);
        });
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        if (!details) return;
        setDetails({ ...details, [e.target.name]: e.target.value });
    };

    const handleBankDetailsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!details) return;
        setDetails({
            ...details,
            bankDetails: {
                ...(details.bankDetails || {}),
                [e.target.name]: e.target.value,
            } as BankDetails,
        });
    };

    const handleSave = () => {
        if (!details || isViewer) return;
        setLoading(true);
        saveCompanyDetails(details).then(() => {
            alert('Company details saved!');
            setLoading(false);
        });
    };

    if (loading || !details) {
        return <Loader className="animate-spin" />;
    }

    return (
        <div>
            <h4 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-6">Company Details</h4>
            <div className="space-y-4">
                <InputField label="Company Name" name="name" value={details.name} onChange={handleChange} disabled={loading || isViewer} />
                <InputField label="GST Identification Number (GSTIN)" name="gstin" value={details.gstin} onChange={handleChange} disabled={loading || isViewer} />
                <TextAreaField label="Company Address (Billing)" name="address" value={details.address} onChange={handleChange} disabled={loading || isViewer} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField label="Phone Number" name="phone" value={details.phone} onChange={handleChange} disabled={loading || isViewer} />
                    <InputField label="Email Address" name="email" value={details.email} onChange={handleChange} disabled={loading || isViewer} />
                </div>
                 <div className="p-4 border rounded-lg border-slate-200 dark:border-slate-700">
                    <h5 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">Bank Details</h5>
                    <div className="space-y-4">
                        <InputField label="Bank Name" name="name" value={details.bankDetails?.name || ''} onChange={handleBankDetailsChange} disabled={loading || isViewer} />
                        <InputField label="Branch Name" name="branch" value={details.bankDetails?.branch || ''} onChange={handleBankDetailsChange} disabled={loading || isViewer} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <InputField label="Account Number" name="accountNumber" value={details.bankDetails?.accountNumber || ''} onChange={handleBankDetailsChange} disabled={loading || isViewer} />
                           <InputField label="IFSC Code" name="ifsc" value={details.bankDetails?.ifsc || ''} onChange={handleBankDetailsChange} disabled={loading || isViewer} />
                        </div>
                    </div>
                 </div>
                <TextAreaField label="Default Delivery Address (for Purchase Orders)" name="deliveryAddress" value={details.deliveryAddress || ''} onChange={handleChange} disabled={loading || isViewer} />
            </div>
            {!isViewer && (
                <div className="mt-6 text-right">
                    <Button onClick={handleSave} disabled={loading} icon={loading ? <Loader size={16} className="animate-spin" /> : null}>
                        {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            )}
        </div>
    );
};

export default CompanyDetails;
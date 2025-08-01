

import React, { useState, useEffect } from 'react';
import { CompanyDetails as CompanyDetailsType, BankDetails, UserRole, EmailSettings } from '@/types';
import Button from '@/components/ui/Button';
import { Loader, Mail, TestTube } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getEmailService } from '@/services/emailService';

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
    emailSettings: {
        emailjsServiceId: '',
        emailjsTemplateId: '',
        emailjsPublicKey: '',
        fromEmail: '',
        notificationEmail: '',
        enableNotifications: false,
    },
};

export const getCompanyDetails = async (): Promise<CompanyDetailsType> => {
    const docSnap = await getDoc(settingsDocRef);
    if (docSnap.exists()) {
        const data = docSnap.data();
        // Ensure bankDetails and emailSettings exist and have all properties
        const bankDetails = { ...defaultDetails.bankDetails, ...(data.bankDetails || {}) };
        const emailSettings = { ...defaultDetails.emailSettings, ...(data.emailSettings || {}) };
        return { ...defaultDetails, ...data, bankDetails, emailSettings } as CompanyDetailsType;
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
        <input type="text" name={name} id={name} value={value} onChange={onChange} disabled={disabled} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 dark:text-slate-100 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400" />
    </div>
);
const TextAreaField: React.FC<{ label: string; value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; name: string; disabled?: boolean; rows?: number }> = ({ label, value, onChange, name, disabled, rows=3 }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
        <textarea name={name} id={name} value={value} onChange={onChange} rows={rows} disabled={disabled} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 dark:text-slate-100 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400" />
    </div>
);

const NumberField: React.FC<{ label: string; value: number; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; name: string; disabled?: boolean; min?: number; max?: number }> = ({ label, value, onChange, name, disabled, min, max }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
        <input type="number" name={name} id={name} value={value} onChange={onChange} disabled={disabled} min={min} max={max} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 dark:text-slate-100 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400" />
    </div>
);

const PasswordField: React.FC<{ label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; name: string; disabled?: boolean }> = ({ label, value, onChange, name, disabled }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
        <input type="password" name={name} id={name} value={value} onChange={onChange} disabled={disabled} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 dark:text-slate-100 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400" />
    </div>
);

const CheckboxField: React.FC<{ label: string; checked: boolean; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; name: string; disabled?: boolean }> = ({ label, checked, onChange, name, disabled }) => (
    <div className="flex items-center">
        <input type="checkbox" name={name} id={name} checked={checked} onChange={onChange} disabled={disabled} className="h-4 w-4 text-primary focus:ring-primary border-slate-300 dark:border-slate-600 rounded disabled:opacity-50" />
        <label htmlFor={name} className="ml-2 block text-sm text-slate-700 dark:text-slate-300">{label}</label>
    </div>
);


const CompanyDetails: React.FC = () => {
    const { user } = useAuth();
    const [details, setDetails] = useState<CompanyDetailsType | null>(null);
    const [loading, setLoading] = useState(true);
    const [testingEmail, setTestingEmail] = useState(false);

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

    const handleEmailSettingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!details) return;
        const { name, value, type, checked } = e.target;
        setDetails({
            ...details,
            emailSettings: {
                ...(details.emailSettings || defaultDetails.emailSettings),
                [name]: type === 'checkbox' ? checked : value,
            } as EmailSettings,
        });
    };

    const handleTestEmail = async () => {
        if (!details?.emailSettings || isViewer) return;
        
        setTestingEmail(true);
        try {
            const emailService = getEmailService(details.emailSettings);
            const success = await emailService.testConnection();
            
            if (success) {
                await emailService.sendEmail({
                    to: details.emailSettings.notificationEmail,
                    subject: 'Test Email - ABS OMS Email Configuration',
                    html: `
                        <h2>Email Configuration Test</h2>
                        <p>This is a test email to verify your email configuration is working correctly.</p>
                        <p>Company: ${details.name}</p>
                        <p>Sent at: ${new Date().toLocaleString()}</p>
                    `
                });
                alert('Test email sent successfully!');
            } else {
                alert('Email connection test failed. Please check your settings.');
            }
        } catch (error) {
            console.error('Email test failed:', error);
            alert('Email test failed: ' + (error as Error).message);
        } finally {
            setTestingEmail(false);
        }
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
                
                <div className="p-4 border rounded-lg border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                        <h5 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center">
                            <Mail className="mr-2" size={16} />
                            Email Notification Settings
                        </h5>
                        {details.emailSettings?.enableNotifications && !isViewer && (
                            <Button 
                                variant="secondary" 
                                size="sm" 
                                onClick={handleTestEmail} 
                                disabled={testingEmail}
                                icon={testingEmail ? <Loader size={14} className="animate-spin" /> : <TestTube size={14} />}
                            >
                                {testingEmail ? 'Testing...' : 'Test Email'}
                            </Button>
                        )}
                    </div>
                    <div className="space-y-4">
                        <CheckboxField 
                            label="Enable email notifications for new documents" 
                            name="enableNotifications" 
                            checked={details.emailSettings?.enableNotifications || false} 
                            onChange={handleEmailSettingsChange} 
                            disabled={loading || isViewer} 
                        />
                        
                        {details.emailSettings?.enableNotifications && (
                            <>
                                <div className="text-sm text-slate-600 dark:text-slate-400 bg-blue-50 dark:bg-blue-900/20 p-3 rounded mb-4">
                                    <p className="font-medium mb-1">📧 EmailJS Configuration Required</p>
                                    <p>This system uses EmailJS for sending emails. You'll need to:</p>
                                    <ol className="list-decimal list-inside mt-2 space-y-1">
                                        <li>Create a free account at <a href="https://emailjs.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">emailjs.com</a></li>
                                        <li>Create an email service (Gmail, Outlook, etc.)</li>
                                        <li>Create an email template with variables: to_email, from_email, subject, html_content</li>
                                        <li>Get your Service ID, Template ID, and Public Key</li>
                                    </ol>
                                </div>

                                <div className="space-y-4">
                                    <InputField 
                                        label="EmailJS Service ID" 
                                        name="emailjsServiceId" 
                                        value={details.emailSettings?.emailjsServiceId || ''} 
                                        onChange={handleEmailSettingsChange} 
                                        disabled={loading || isViewer} 
                                    />
                                    <InputField 
                                        label="EmailJS Template ID" 
                                        name="emailjsTemplateId" 
                                        value={details.emailSettings?.emailjsTemplateId || ''} 
                                        onChange={handleEmailSettingsChange} 
                                        disabled={loading || isViewer} 
                                    />
                                    <InputField 
                                        label="EmailJS Public Key" 
                                        name="emailjsPublicKey" 
                                        value={details.emailSettings?.emailjsPublicKey || ''} 
                                        onChange={handleEmailSettingsChange} 
                                        disabled={loading || isViewer} 
                                    />
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <InputField 
                                        label="From Email Address" 
                                        name="fromEmail" 
                                        value={details.emailSettings?.fromEmail || ''} 
                                        onChange={handleEmailSettingsChange} 
                                        disabled={loading || isViewer} 
                                    />
                                    <InputField 
                                        label="Notification Email Address" 
                                        name="notificationEmail" 
                                        value={details.emailSettings?.notificationEmail || ''} 
                                        onChange={handleEmailSettingsChange} 
                                        disabled={loading || isViewer} 
                                    />
                                </div>
                                
                                <div className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-3 rounded">
                                    <p className="font-medium mb-2">📋 EmailJS Template Variables:</p>
                                    <p>Your email template should include these variables:</p>
                                    <ul className="list-disc list-inside mt-2 space-y-1">
                                        <li><code>{'{{to_email}}'}</code> - Recipient email address</li>
                                        <li><code>{'{{from_email}}'}</code> - Sender email address</li>
                                        <li><code>{'{{subject}}'}</code> - Email subject</li>
                                        <li><code>{'{{message}}'}</code> - Plain text content (formatted)</li>
                                        <li><code>{'{{html_content}}'}</code> - Raw HTML content</li>
                                        <li><code>{'{{has_attachment}}'}</code> - "Yes" or "No"</li>
                                        <li><code>{'{{pdf_filename}}'}</code> - PDF filename</li>
                                    </ul>
                                    <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs">
                                        <p className="font-medium">💡 Tip for better formatting:</p>
                                        <p>Use <code>{'{{message}}'}</code> for clean, formatted text content instead of raw HTML.</p>
                                        <p className="mt-1"><strong>Note:</strong> PDF attachments require EmailJS Pro plan. Free plan will show attachment info in email body.</p>
                                    </div>
                                </div>
                            </>
                        )}
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
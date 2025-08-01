

import React, { useState, useEffect, useRef } from 'react';
import { PdfSettings, CompanyDetails as CompanyDetailsType, Quote, DocumentStatus, UserRole, PointOfContact } from '@/types';
import Button from '@/components/ui/Button';
import { getPdfSettings, savePdfSettings } from '@/components/settings/pdfSettingsService';
import { getCompanyDetails } from '@/components/settings/CompanyDetails';
import { Loader } from 'lucide-react';
import PrintWrapper from '../Print/PrintWrapper';
import QuotePrint from '../Print/QuotePrint';
import { useAuth } from '@/contexts/AuthContext';

const SizeSlider: React.FC<{ label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; unit?: string; disabled?: boolean; }> = 
({ label, value, onChange, min = 20, max = 250, unit = 'px', disabled }) => (
    <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
        <div className="flex items-center space-x-3">
            <input
                type="range"
                min={min}
                max={max}
                value={value}
                onChange={(e) => onChange(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 disabled:opacity-50"
                disabled={disabled}
            />
            <span className="text-sm text-slate-600 dark:text-slate-400 font-mono w-16 text-right">{value}{unit}</span>
        </div>
    </div>
);

const ToggleSwitch: React.FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; }> = ({ label, checked, onChange, disabled }) => (
    <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
        <button
            type="button"
            className={`${
                checked ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-600'
            } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50`}
            role="switch"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            disabled={disabled}
        >
            <span
                aria-hidden="true"
                className={`${
                checked ? 'translate-x-5' : 'translate-x-0'
                } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
            />
        </button>
    </div>
);


const PdfCustomizer: React.FC = () => {
    const { user } = useAuth();
    const [settings, setSettings] = useState<PdfSettings | null>(null);
    const [companyDetails, setCompanyDetails] = useState<CompanyDetailsType | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const previewContainerRef = useRef<HTMLDivElement>(null);
    const [previewScale, setPreviewScale] = useState(0.5);

    const isViewer = user?.role === UserRole.Viewer;

    useEffect(() => {
        setLoading(true);
        Promise.all([
            getPdfSettings(),
            getCompanyDetails()
        ]).then(([settingsData, companyData]) => {
            setSettings(settingsData);
            setCompanyDetails(companyData);
            setError(null);
        }).catch(err => {
            console.error("Failed to load PDF settings:", err);
            setError("Could not load settings. Please try again later.");
        }).finally(() => {
            setLoading(false);
        });
    }, []);

    useEffect(() => {
        const calculateScale = () => {
            if (previewContainerRef.current) {
                // A4 paper is 210mm wide. Let's give it some padding.
                const containerWidth = previewContainerRef.current.offsetWidth - 20;
                const pdfWidth = 794; // 210mm at 96dpi
                setPreviewScale(Math.min(1, containerWidth / pdfWidth));
            }
        };

        calculateScale();
        window.addEventListener('resize', calculateScale);
        return () => window.removeEventListener('resize', calculateScale);
    }, [settings]);


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'companyLogo' | 'signatureImage' | 'footerImage') => {
        if (e.target.files && e.target.files[0] && settings) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSettings({ ...settings, [field]: reader.result as string });
            };
            reader.readAsDataURL(e.target.files[0]);
        }
    };

    const handleSave = () => {
        if (!settings || isViewer) return;
        setLoading(true);
        savePdfSettings(settings).then(() => {
            alert("PDF settings saved!");
        }).catch(err => {
            alert("Failed to save PDF settings.");
            console.error(err);
        }).finally(() => {
            setLoading(false);
        });
    };
    
    if (loading) {
        return <div className="flex justify-center items-center p-8"><Loader className="animate-spin" /></div>;
    }
    
    if (error) {
        return <div className="p-4 text-center text-red-600 bg-red-100 rounded-md">{error}</div>;
    }

    if (!settings || !companyDetails) {
         return <div className="p-4 text-center text-slate-500">Could not load settings data.</div>;
    }
    
    // Create a dummy quote for preview purposes
    const dummyQuote: Quote = {
        id: 'q-dummy',
        quoteNumber: 'Q-PREVIEW-001',
        issueDate: new Date().toISOString(),
        expiryDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
        status: DocumentStatus.Draft,
        customerId: 'c-dummy',
        customerName: 'Example Customer Pvt. Ltd.',
        customerGstin: '27EXAMPLE1234F1Z5',
        contactId: 'ct-dummy',
        contactName: 'John Doe',
        contactEmail: 'john.doe@example.com',
        contactPhone: '9988776655',
        billingAddress: { id: 'ba-dummy', line1: '123 Billing Street', city: 'Mumbai', state: 'Maharashtra', pincode: '400001', isDefault: true },
        shippingAddress: { id: 'sa-dummy', line1: '456 Shipping Avenue', city: 'Mumbai', state: 'Maharashtra', pincode: '400001', isDefault: true },
        lineItems: [
            { id: 'li-1', productId: 'p1', productName: 'Premium Grade Steel Plate (10mm)', description: 'High-tensile strength steel plate, suitable for construction.', hsnCode: '7208', quantity: 2, unit: 'kg', unitPrice: 80, taxRate: 18, total: 160 },
            { id: 'li-2', productId: 'p2', productName: 'Industrial Cement (Grade A)', description: 'Portland cement for heavy-duty applications.', hsnCode: '2523', quantity: 5, unit: 'bag', unitPrice: 450, taxRate: 18, total: 2250 },
        ],
        subTotal: 2410,
        gstTotal: 433.8,
        total: 2843.8,
        terms: ["Payment: 100% advance.", "Delivery: Within 2-3 weeks."],
        pointOfContactId: 'poc-dummy',
    };

    // Dummy point of contact for preview
    const dummyPointOfContact: PointOfContact = {
        id: 'poc-dummy',
        name: 'Jane Smith',
        designation: 'Sales Manager',
        phone: '+91 98765 43210',
        email: 'jane.smith@company.com',
        isDefault: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    const fileInputClasses = "mt-1 text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-light dark:file:bg-slate-700 file:text-primary dark:file:text-slate-200 hover:file:bg-blue-200 dark:hover:file:bg-slate-600 disabled:file:opacity-50";

    return (
        <div>
            <h4 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-6">PDF Customizer</h4>
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Controls */}
                <div className="lg:w-1/3 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Template</label>
                        <select value={settings.template} onChange={e => setSettings({...settings, template: e.target.value as any})} className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white dark:bg-slate-700 dark:text-slate-100 border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md disabled:opacity-50" disabled={isViewer}>
                            <option value="classic">Classic</option>
                            <option value="adaptec">Adaptec Style</option>
                            <option value="BandW">Black & White Professional</option>
                            <option value="BandW POI">B&W with Our Point of Contact</option>
                            <option value="modern">Modern</option>
                            <option value="elegant">Elegant</option>
                        </select>
                    </div>
                     <ToggleSwitch label="Show HSN Code Column" checked={settings.showHsnCode} onChange={val => setSettings({...settings, showHsnCode: val})} disabled={isViewer}/>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Accent Color</label>
                        <input type="color" value={settings.accentColor} onChange={e => setSettings({...settings, accentColor: e.target.value})} className="mt-1 p-1 h-10 w-full block bg-white border border-slate-300 rounded-md cursor-pointer disabled:opacity-50" disabled={isViewer} />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Company Logo</label>
                        <input type="file" accept="image/*" onChange={e => handleFileChange(e, 'companyLogo')} className={fileInputClasses} disabled={isViewer} />
                        {settings.companyLogo && <SizeSlider label="Logo Width" value={settings.logoSize} onChange={val => setSettings({...settings, logoSize: val})} min={30} max={250} disabled={isViewer} />}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Signature Image</label>
                        <input type="file" accept="image/*" onChange={e => handleFileChange(e, 'signatureImage')} className={fileInputClasses} disabled={isViewer} />
                        {settings.signatureImage && <SizeSlider label="Signature Height" value={settings.signatureSize} onChange={val => setSettings({...settings, signatureSize: val})} min={20} max={150} disabled={isViewer} />}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Footer Image</label>
                        <input type="file" accept="image/*" onChange={e => handleFileChange(e, 'footerImage')} className={fileInputClasses} disabled={isViewer} />
                        {settings.footerImage && <SizeSlider label="Footer Height" value={settings.footerImageSize} onChange={val => setSettings({...settings, footerImageSize: val})} min={20} max={150} disabled={isViewer} />}
                    </div>

                    {!isViewer && (
                         <div className="mt-6 text-right">
                            <Button onClick={handleSave} disabled={loading} icon={loading ? <Loader className="animate-spin" /> : null}>
                               {loading ? 'Saving...' : 'Save PDF Settings'}
                            </Button>
                        </div>
                    )}
                </div>

                {/* Preview */}
                <div className="lg:w-2/3 border-2 border-dashed border-slate-300 dark:border-slate-600 p-4 rounded-lg bg-slate-100 dark:bg-slate-900 overflow-hidden" ref={previewContainerRef}>
                     <div style={{ transform: `scale(${previewScale})`, transformOrigin: 'top left' }}>
                         <PrintWrapper companyDetails={companyDetails} settings={settings} totalPages={1} currentPage={1}>
                             <QuotePrint quote={dummyQuote} settings={settings} companyDetails={companyDetails} isLastPage={true} itemStartIndex={0} pointOfContact={dummyPointOfContact}/>
                         </PrintWrapper>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PdfCustomizer;
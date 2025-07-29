

import React, { useState, useEffect } from 'react';
import { DocumentNumberingSettings, DocumentNumberingFormat, UserRole } from '@/types';
import Button from '@/components/ui/Button';
import { Loader, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/services/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

// --- FIRESTORE SERVICE ---
const SETTINGS_KEY = 'docNumbering';
const settingsDocRef = doc(db, "settings", SETTINGS_KEY);

const defaultSettings: DocumentNumberingSettings = {
    quote: { prefix: 'Q-', nextNumber: 1, suffix: '/24-25', useCustomerPrefix: false },
    salesOrder: { prefix: 'SO-', nextNumber: 1, suffix: '', useCustomerPrefix: false },
    deliveryOrder: { prefix: 'DO-', nextNumber: 1, suffix: '', useCustomerPrefix: false },
    purchaseOrder: { prefix: 'PO-', nextNumber: 1, suffix: '', useCustomerPrefix: false },
};

export const getDocumentNumberingSettings = async (): Promise<DocumentNumberingSettings> => {
    const docSnap = await getDoc(settingsDocRef);
    if (docSnap.exists()) {
        return { ...defaultSettings, ...docSnap.data() } as DocumentNumberingSettings;
    } else {
        await saveDocumentNumberingSettings(defaultSettings);
        return defaultSettings;
    }
};

export const saveDocumentNumberingSettings = async (settings: DocumentNumberingSettings): Promise<DocumentNumberingSettings> => {
    await setDoc(settingsDocRef, settings);
    return settings;
};
// --- END FIRESTORE SERVICE ---


const NumberingForm: React.FC<{
    title: string;
    settings: DocumentNumberingFormat;
    onChange: (newSettings: DocumentNumberingFormat) => void;
    disabled?: boolean;
}> = ({ title, settings, onChange, disabled }) => {
    
    const handleChange = (field: keyof DocumentNumberingFormat, value: string | number | boolean) => {
        onChange({ ...settings, [field]: value });
    };

    const inputClass = "mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-100 dark:text-slate-800 border border-slate-300 rounded-md shadow-sm disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400";

    return (
        <div className="space-y-4 p-4 border rounded-lg border-slate-200 dark:border-slate-700">
            <h5 className="font-semibold dark:text-slate-200">{title}</h5>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Example: <strong>{settings.prefix}{String(settings.nextNumber).padStart(4, '0')}{settings.suffix}</strong>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Prefix</label>
                    <input type="text" value={settings.prefix} onChange={e => handleChange('prefix', e.target.value)} disabled={disabled} className={inputClass}/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Next Number</label>
                    <input type="number" value={settings.nextNumber} onChange={e => handleChange('nextNumber', parseInt(e.target.value))} disabled={disabled} className={inputClass}/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Suffix</label>
                    <input type="text" value={settings.suffix} onChange={e => handleChange('suffix', e.target.value)} disabled={disabled} className={inputClass}/>
                </div>
            </div>
        </div>
    );
};


const DocumentNumbering: React.FC = () => {
    const { user } = useAuth();
    const [settings, setSettings] = useState<DocumentNumberingSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const isViewer = user?.role === UserRole.Viewer;

    useEffect(() => {
        setLoading(true);
        getDocumentNumberingSettings().then(data => {
            setSettings(data);
            setLoading(false);
        });
    }, []);

    const handleSettingsChange = (docType: keyof DocumentNumberingSettings, newFormat: DocumentNumberingFormat) => {
        if (!settings) return;
        setSettings({ ...settings, [docType]: newFormat });
    };

    const handleSave = () => {
        if (!settings || isViewer) return;
        setLoading(true);
        saveDocumentNumberingSettings(settings).then(() => {
            alert('Settings saved!');
            setLoading(false);
        });
    };
    
    if (loading || !settings) {
        return <Loader className="animate-spin"/>;
    }

    return (
        <div>
            <h4 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-6">Document Numbering</h4>
            <div className="p-3 mb-6 bg-blue-50 dark:bg-slate-700 border-l-4 border-blue-500 text-blue-800 dark:text-blue-200 rounded-r-lg flex items-start space-x-3">
              <Info size={20} className="mt-0.5 shrink-0"/>
              <p className="text-sm">You can use placeholders in the prefix or suffix fields. Use <strong>{'{CUST}'}</strong> for customer names (in Quotes, SOs, DOs) and <strong>{'{VEND}'}</strong> for vendor names (in POs). This will be replaced by the first 4 letters of the name.</p>
            </div>
            <div className="space-y-6">
                 <NumberingForm 
                    title="Quote Numbering"
                    settings={settings.quote}
                    onChange={(newFormat) => handleSettingsChange('quote', newFormat)}
                    disabled={loading || isViewer}
                 />
                 <NumberingForm 
                    title="Sales Order Numbering"
                    settings={settings.salesOrder}
                    onChange={(newFormat) => handleSettingsChange('salesOrder', newFormat)}
                    disabled={loading || isViewer}
                 />
                 <NumberingForm 
                    title="Delivery Order Numbering"
                    settings={settings.deliveryOrder}
                    onChange={(newFormat) => handleSettingsChange('deliveryOrder', newFormat)}
                    disabled={loading || isViewer}
                 />
                 <NumberingForm 
                    title="Purchase Order Numbering"
                    settings={settings.purchaseOrder}
                    onChange={(newFormat) => handleSettingsChange('purchaseOrder', newFormat)}
                    disabled={loading || isViewer}
                 />
            </div>
            {!isViewer && (
                <div className="mt-6 text-right">
                    <Button onClick={handleSave} disabled={loading} icon={loading ? <Loader size={16} className="animate-spin" /> : null}>
                        {loading ? 'Saving...' : 'Save All Settings'}
                    </Button>
                </div>
            )}
        </div>
    );
};

export default DocumentNumbering;
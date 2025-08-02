import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Loader } from 'lucide-react';
import { getPayrollSettings, savePayrollSettings } from '@/services/payrollService';
import { PayrollSettings as PayrollSettingsType } from '@/types';
import PayslipGenerator from './PayslipGenerator'; // Using the generator as a preview

const ToggleSwitch: React.FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void; }> = ({ label, checked, onChange }) => (
    <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">{label}</label>
        <button
            type="button"
            className={`${checked ? 'bg-primary' : 'bg-slate-200 dark:bg-slate-600'} relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out`}
            onClick={() => onChange(!checked)}
        >
            <span className={`${checked ? 'translate-x-5' : 'translate-x-0'} pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`} />
        </button>
    </div>
);

const PayrollSettingsComponent: React.FC = () => {
    const [settings, setSettings] = useState<Partial<PayrollSettingsType>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        getPayrollSettings().then(data => {
            setSettings(data);
        }).finally(() => setLoading(false));
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setSettings(prev => ({...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handlePercentageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({...prev, [name]: parseFloat(value) || 0 }));
    }

    const handleSave = async () => {
        setSaving(true);
        try {
            await savePayrollSettings(settings as PayrollSettingsType);
            alert("Settings saved successfully!");
        } catch (error) {
            alert("Failed to save settings.");
        } finally {
            setSaving(false);
        }
    };
    
    if (loading) return <Card title="Loading Settings..."><Loader className="animate-spin" /></Card>;
    
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
                <Card title="Salary Components (%)">
                     <p className="text-sm text-slate-500 mb-4">Define how the Cost-to-Company (CTC) is broken down. These must add up to 100%.</p>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label>Basic Pay %</label>
                            <input type="number" name="basic_pay_percentage" value={settings.basic_pay_percentage || ''} onChange={handlePercentageChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-slate-100"/>
                        </div>
                         <div>
                            <label>HRA %</label>
                            <input type="number" name="hra_percentage" value={settings.hra_percentage || ''} onChange={handlePercentageChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-slate-100"/>
                        </div>
                         <div>
                            <label>Special Allowance %</label>
                            <input type="number" name="special_allowance_percentage" value={settings.special_allowance_percentage || ''} onChange={handlePercentageChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-slate-100"/>
                        </div>
                    </div>
                </Card>

                <Card title="Statutory Deductions">
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4 items-center">
                            <ToggleSwitch label="PF Enabled" checked={!!settings.pf_enabled} onChange={val => setSettings(p => ({...p, pf_enabled: val}))}/>
                            <div>
                                <label>PF Contribution (%)</label>
                                <input type="number" name="pf_percentage" value={settings.pf_percentage || ''} onChange={handlePercentageChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-slate-100" disabled={!settings.pf_enabled}/>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 items-center">
                            <ToggleSwitch label="ESI Enabled" checked={!!settings.esi_enabled} onChange={val => setSettings(p => ({...p, esi_enabled: val}))}/>
                             <div>
                                <label>ESI Contribution (%)</label>
                                <input type="number" name="esi_percentage" value={settings.esi_percentage || ''} onChange={handlePercentageChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-slate-100" disabled={!settings.esi_enabled}/>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 items-center">
                           <ToggleSwitch label="Professional Tax (PT) Enabled" checked={!!settings.pt_enabled} onChange={val => setSettings(p => ({...p, pt_enabled: val}))}/>
                           <div>
                                <label>PT Amount (₹)</label>
                                <input type="number" name="pt_amount" value={settings.pt_amount || ''} onChange={handlePercentageChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-slate-100" disabled={!settings.pt_enabled}/>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 items-center">
                           <ToggleSwitch label="TDS Enabled" checked={!!settings.tds_enabled} onChange={val => setSettings(p => ({...p, tds_enabled: val}))}/>
                           <div>
                                <label>TDS Deduction (%)</label>
                                <input type="number" name="tds_percentage" value={settings.tds_percentage || ''} onChange={handlePercentageChange} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-slate-100" disabled={!settings.tds_enabled}/>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 items-center">
                           <div></div>
                           <div>
                                <label>TDS Annual Salary Limit (₹)</label>
                                <input 
                                    type="number" 
                                    name="tds_annual_limit" 
                                    value={settings.tds_annual_limit || ''} 
                                    onChange={handlePercentageChange} 
                                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-slate-100" 
                                    disabled={!settings.tds_enabled}
                                    placeholder="250000"
                                />
                                <p className="text-xs text-slate-500 mt-1">TDS will only apply to employees whose annual salary exceeds this amount</p>
                            </div>
                        </div>
                    </div>
                </Card>
                <div className="text-right">
                    <Button onClick={handleSave} disabled={saving} icon={saving && <Loader className="animate-spin" />}>{saving ? 'Saving...' : 'Save All Settings'}</Button>
                </div>
            </div>

            <div className="lg:col-span-1">
                <Card title="Payslip Preview">
                    <PayslipGenerator settings={settings as PayrollSettingsType} isPreview />
                </Card>
            </div>
        </div>
    );
};

export default PayrollSettingsComponent;
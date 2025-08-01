import React, { useState, useEffect } from 'react';
import Button from '@/components/ui/Button';
import { PayrollEmployee, EmployeeCategory, BankAccount } from '@/types';
import { savePayrollEmployee } from '@/services/payrollService';
import { Loader, Trash2, Plus } from 'lucide-react';
import Card from '../ui/Card';

interface EmployeeFormProps {
    employeeToEdit: PayrollEmployee | null;
    onSave: () => void;
    onCancel: () => void;
}

const formInputClass = "mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 dark:text-slate-100 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm";
const selectClass = `${formInputClass} pr-8`;

const emptyBankAccount: Omit<BankAccount, 'id'> = { bankName: '', accountNumber: '', ifsc: '', isDefault: false };


const EmployeeForm: React.FC<EmployeeFormProps> = ({ employeeToEdit, onSave, onCancel }) => {
    const [employee, setEmployee] = useState<Partial<PayrollEmployee>>({});
    const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const initialEmployee = employeeToEdit || { status: 'Active', department: 'Other', category: EmployeeCategory.InOffice, bankAccounts: [] };
        setEmployee(initialEmployee);
        setBankAccounts(initialEmployee.bankAccounts || []);
    }, [employeeToEdit]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setEmployee(prev => ({ ...prev, [name]: value }));
    };

    const handleCtcChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const numValue = parseFloat(value) || 0;
        
        if (name === 'annual_ctc') {
            setEmployee(prev => ({...prev, annual_ctc: numValue, monthly_ctc: Math.round(numValue / 12) }));
        } else if (name === 'monthly_ctc') {
            setEmployee(prev => ({...prev, monthly_ctc: numValue, annual_ctc: numValue * 12 }));
        }
    }

    // --- Bank Account Handlers ---
    const handleBankAccountChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const newBankAccounts = [...bankAccounts];
        newBankAccounts[index] = { ...newBankAccounts[index], [e.target.name]: e.target.value };
        setBankAccounts(newBankAccounts);
    };

    const addBankAccount = () => {
        const newAccount: BankAccount = { ...emptyBankAccount, id: `new_${Date.now()}`, isDefault: bankAccounts.length === 0 };
        setBankAccounts([...bankAccounts, newAccount]);
    };

    const removeBankAccount = (index: number) => {
        const newBankAccounts = bankAccounts.filter((_, i) => i !== index);
        if (newBankAccounts.length > 0 && !newBankAccounts.some(acc => acc.isDefault)) {
            newBankAccounts[0].isDefault = true;
        }
        setBankAccounts(newBankAccounts);
    };

    const setDefaultBankAccount = (index: number) => {
        setBankAccounts(
            bankAccounts.map((acc, i) => ({...acc, isDefault: i === index }))
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const employeeData = { ...employee, bankAccounts };
            await savePayrollEmployee(employeeData as any);
            onSave();
        } catch (error) {
            console.error(error);
            alert('Failed to save employee.');
        } finally {
            setSaving(false);
        }
    };
    
    return (
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium">Full Name *</label>
                    <input name="name" value={employee.name || ''} onChange={handleChange} required className={formInputClass} />
                </div>
                <div>
                    <label className="block text-sm font-medium">Employee Category *</label>
                    <select name="category" value={employee.category} onChange={handleChange} required className={selectClass}>
                        {Object.values(EmployeeCategory).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium">Annual CTC (₹) *</label>
                    <input type="number" name="annual_ctc" value={employee.annual_ctc || ''} onChange={handleCtcChange} required className={formInputClass} />
                </div>
                <div>
                    <label className="block text-sm font-medium">Monthly CTC (₹) *</label>
                    <input type="number" name="monthly_ctc" value={employee.monthly_ctc || ''} onChange={handleCtcChange} required className={formInputClass} />
                </div>
                <div>
                    <label className="block text-sm font-medium">Employee ID</label>
                    <input name="employee_id" value={employee.employee_id || ''} onChange={handleChange} className={formInputClass} placeholder="Auto-generated if empty" />
                </div>
                <div>
                    <label className="block text-sm font-medium">Department</label>
                    <select name="department" value={employee.department} onChange={handleChange} className={selectClass}>
                        <option value="Rebar Couplers">Rebar Couplers</option>
                        <option value="Aluminium Formwork">Aluminium Formwork</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
                 <div>
                    <label className="block text-sm font-medium">Status</label>
                    <select name="status" value={employee.status} onChange={handleChange} className={selectClass}>
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                    </select>
                </div>
            </div>
            
            <Card title="Bank Account Details" actions={<Button type="button" variant="secondary" size="sm" onClick={addBankAccount} icon={<Plus size={16}/>}>Add Account</Button>}>
                 <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                    {bankAccounts.map((account, index) => (
                        <div key={account.id} className="p-4 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/20 space-y-3 relative">
                            <div className="absolute top-2 right-2 flex items-center space-x-2">
                                <button type="button" onClick={() => setDefaultBankAccount(index)} className={`px-2 py-0.5 text-xs rounded-full ${account.isDefault ? 'bg-primary text-white cursor-default' : 'bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-200'}`} disabled={saving || !!account.isDefault}>
                                    {account.isDefault ? 'Default' : 'Set Default'}
                                </button>
                                <button type="button" onClick={() => removeBankAccount(index)} className="text-red-500 hover:text-red-700 disabled:opacity-50" disabled={saving}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div><label className="text-xs">Bank Name</label><input name="bankName" value={account.bankName} onChange={e => handleBankAccountChange(index, e)} required className={formInputClass} /></div>
                                <div><label className="text-xs">Account Number</label><input name="accountNumber" value={account.accountNumber} onChange={e => handleBankAccountChange(index, e)} required className={formInputClass} /></div>
                                <div><label className="text-xs">IFSC Code</label><input name="ifsc" value={account.ifsc} onChange={e => handleBankAccountChange(index, e)} required className={formInputClass} /></div>
                            </div>
                        </div>
                    ))}
                    {bankAccounts.length === 0 && <p className="text-center text-slate-500 py-4">No bank accounts added.</p>}
                </div>
            </Card>

             <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700 mt-6 -mx-6 -mb-6 px-6 pb-6">
                <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
                <Button type="submit" disabled={saving} icon={saving ? <Loader size={16} className="animate-spin" /> : null}>
                    {saving ? 'Saving...' : 'Save Employee'}
                </Button>
            </div>
        </form>
    );
};

export default EmployeeForm;

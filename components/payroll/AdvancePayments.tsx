import React, { useState, useEffect, useMemo } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Plus, Edit, Trash2, History as HistoryIcon, ArrowUp, ArrowDown } from 'lucide-react';
import { AdvancePayment, PayrollEmployee } from '@/types';
import { getAdvancePayments, saveAdvancePayment, deleteAdvancePayment, getPayrollEmployees } from '@/services/payrollService';
import SearchableSelect from '@/components/ui/SearchableSelect';

const AdvancePayments: React.FC = () => {
    const [advances, setAdvances] = useState<AdvancePayment[]>([]);
    const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
    const [, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [editingAdvance, setEditingAdvance] = useState<Partial<AdvancePayment>>({});
    const [viewingAdvance, setViewingAdvance] = useState<AdvancePayment | null>(null);

    const fetchData = () => {
        setLoading(true);
        Promise.all([getAdvancePayments(), getPayrollEmployees()])
            .then(([advData, empData]) => {
                const enrichedData = advData.map(adv => ({
                    ...adv,
                    employeeName: empData.find(e => e.id === adv.employee_id)?.name || 'Unknown'
                }));
                setAdvances(enrichedData as any);
                setEmployees(empData);
            })
            .catch(() => alert("Failed to load data."))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAdd = () => {
        setEditingAdvance({ date_given: new Date().toISOString().split('T')[0] });
        setIsModalOpen(true);
    };

    const handleEdit = (advance: AdvancePayment) => {
        setEditingAdvance(advance);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this advance payment? This action cannot be undone and will not revert any deductions already made.")) {
            await deleteAdvancePayment(id);
            fetchData();
        }
    };

    const handleViewHistory = (advance: AdvancePayment) => {
        setViewingAdvance(advance);
        setIsHistoryModalOpen(true);
    };
    
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await saveAdvancePayment(editingAdvance as any);
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            alert("Failed to save advance payment.");
        }
    };
    
    const sortedAdvances = useMemo(() => {
        return [...advances].sort((a, b) => {
            if (a.status === 'Active' && b.status !== 'Active') return -1;
            if (a.status !== 'Active' && b.status === 'Active') return 1;
            return new Date(b.date_given).getTime() - new Date(a.date_given).getTime();
        });
    }, [advances]);

    const statusColors: Record<string, string> = {
        'Active': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        'Fully Deducted': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    };

    return (
        <>
            <Card title="Salary Advances" actions={<Button onClick={handleAdd} icon={<Plus />}>New Advance</Button>}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr>
                                <th className="p-2 text-left">Employee</th>
                                <th className="p-2 text-right">Total Given</th>
                                <th className="p-2 text-right">Balance</th>
                                <th className="p-2 text-center">Date Given</th>
                                <th className="p-2 text-center">Status</th>
                                <th className="p-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedAdvances.map(adv => (
                                <tr key={adv.id} className="border-t">
                                    <td className="p-2">{(adv as any).employeeName}</td>
                                    <td className="p-2 text-right">₹{adv.amount.toLocaleString()}</td>
                                    <td className="p-2 text-right text-red-600 font-semibold">₹{adv.balance_amount.toLocaleString()}</td>
                                    <td className="p-2 text-center">{new Date(adv.date_given).toLocaleDateString()}</td>
                                    <td className="p-2 text-center"><span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[adv.status]}`}>{adv.status}</span></td>
                                    <td className="p-2 text-right">
                                        <button onClick={() => handleViewHistory(adv)} className="p-2 text-slate-500 hover:text-primary"><HistoryIcon size={16}/></button>
                                        <button onClick={() => handleEdit(adv)} className="p-2 text-slate-500 hover:text-primary" disabled={adv.status === 'Fully Deducted'}><Edit size={16}/></button>
                                        <button onClick={() => handleDelete(adv.id)} className="p-2 text-slate-500 hover:text-red-500"><Trash2 size={16}/></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingAdvance.id ? "Edit Advance" : "New Advance"}>
                <form onSubmit={handleSave} className="p-4 space-y-4">
                    <div>
                        <label>Employee</label>
                        <SearchableSelect 
                            value={editingAdvance.employee_id || ''}
                            onChange={val => setEditingAdvance(p => ({...p, employee_id: val}))}
                            options={employees.map(e => ({value: e.id, label: e.name}))}
                            disabled={!!editingAdvance.id}
                        />
                        {editingAdvance.id && <p className="text-xs text-slate-500 mt-1">Topping up an existing advance will add to the current balance.</p>}
                    </div>
                     <div>
                        <label>Amount (₹)</label>
                        <input type="number" value={editingAdvance.amount || ''} onChange={e => setEditingAdvance(p => ({...p, amount: +e.target.value}))} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-slate-100" required/>
                    </div>
                     <div>
                        <label>Date Given</label>
                        <input type="date" value={editingAdvance.date_given?.split('T')[0] || ''} onChange={e => setEditingAdvance(p => ({...p, date_given: e.target.value}))} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-slate-100" required/>
                    </div>
                     <div>
                        <label>Notes</label>
                        <textarea value={editingAdvance.notes || ''} onChange={e => setEditingAdvance(p => ({...p, notes: e.target.value}))} className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-slate-100" />
                    </div>
                    <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button><Button type="submit">Save</Button></div>
                </form>
            </Modal>
             <Modal isOpen={isHistoryModalOpen} onClose={() => setIsHistoryModalOpen(false)} title={`Advance History for ${(viewingAdvance as any)?.employeeName}`}>
                <div className="p-4">
                    <ul className="space-y-3">
                        {viewingAdvance?.transactions?.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((tx, index) => (
                           <li key={index} className="flex items-start space-x-3 p-2 rounded-md bg-slate-50 dark:bg-slate-700/50">
                                {tx.type === 'deducted' ? 
                                    <span className="flex-shrink-0 h-8 w-8 rounded-full bg-red-100 dark:bg-red-900/50 flex items-center justify-center"><ArrowUp size={16} className="text-red-600"/></span>
                                    : <span className="flex-shrink-0 h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center"><ArrowDown size={16} className="text-green-600"/></span>
                                }
                                <div className="flex-grow">
                                    <p className="font-semibold text-sm">{tx.notes}</p>
                                    <p className="text-xs text-slate-500">{new Date(tx.date).toLocaleString()}</p>
                                </div>
                                <p className={`font-bold text-sm ${tx.type === 'deducted' ? 'text-red-600' : 'text-green-600'}`}>
                                    {tx.type === 'deducted' ? '-' : '+'} ₹{tx.amount.toLocaleString()}
                                </p>
                           </li>
                        ))}
                    </ul>
                </div>
            </Modal>
        </>
    );
};

export default AdvancePayments;
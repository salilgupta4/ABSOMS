import React, { useState, useEffect, useMemo } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Plus, Edit, Trash2, ArrowUpDown, DollarSign, History, Minus, TrendingUp } from 'lucide-react';
import { PayrollEmployee, AdvancePayment, AdvanceTransaction } from '@/types';
import { getPayrollEmployees, deletePayrollEmployee, getAdvancePayments, saveAdvancePayment } from '@/services/payrollService';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import EmployeeForm from './EmployeeForm';
import { useAuth } from '@/contexts/AuthContext';
import { canPerformAction } from '@/utils/permissions';

type SortKey = 'employee_id' | 'name' | 'department' | 'category' | 'monthly_ctc';

const EmployeeList: React.FC = () => {
    const { user } = useAuth();
    const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
    const [advances, setAdvances] = useState<AdvancePayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isAdvanceModalOpen, setIsAdvanceModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<PayrollEmployee | null>(null);
    const [selectedEmployee, setSelectedEmployee] = useState<PayrollEmployee | null>(null);
    const [advanceAmount, setAdvanceAmount] = useState<string>('');
    const [advanceNotes, setAdvanceNotes] = useState<string>('');
    const [advanceType, setAdvanceType] = useState<'add' | 'deduct'>('add');
    const [viewingAdvance, setViewingAdvance] = useState<AdvancePayment | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });
    
    const canCreate = canPerformAction(user, 'create');
    const canEdit = canPerformAction(user, 'edit');
    const canDelete = canPerformAction(user, 'delete');

    const fetchData = () => {
        setLoading(true);
        Promise.all([getPayrollEmployees(), getAdvancePayments()])
            .then(([empData, advData]) => {
                setEmployees(empData);
                setAdvances(advData);
            })
            .catch(err => {
                console.error("Failed to fetch data:", err);
                alert("Failed to fetch data.");
            })
            .finally(() => {
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAdd = () => {
        setEditingEmployee(null);
        setIsModalOpen(true);
    };

    const handleEdit = (employee: PayrollEmployee) => {
        setEditingEmployee(employee);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this employee? This cannot be undone.")) {
            try {
                await deletePayrollEmployee(id);
                fetchData();
            } catch (error) {
                alert("Failed to delete employee.");
            }
        }
    };

    const handleSave = () => {
        setIsModalOpen(false);
        fetchData();
    };

    const handleAdvanceAction = (employee: PayrollEmployee, type: 'add' | 'deduct') => {
        setSelectedEmployee(employee);
        setAdvanceType(type);
        setAdvanceAmount('');
        setAdvanceNotes('');
        setIsAdvanceModalOpen(true);
    };

    const handleAdvanceSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedEmployee || !advanceAmount) return;

        const amount = parseFloat(advanceAmount);
        if (amount <= 0) {
            alert("Please enter a valid amount.");
            return;
        }

        try {
            if (advanceType === 'add') {
                // Add advance - create new advance payment or top up existing
                await saveAdvancePayment({
                    employee_id: selectedEmployee.id,
                    amount: amount,
                    date_given: new Date().toISOString(),
                    notes: advanceNotes || `Advance added for ${selectedEmployee.name}`
                });
            } else {
                // Deduct advance - handle deduction by directly updating Firestore
                const existingAdvance = advances.find(adv => 
                    adv.employee_id === selectedEmployee.id && adv.status === 'Active'
                );
                
                if (!existingAdvance) {
                    alert("No active advance found for this employee to deduct from.");
                    return;
                }

                if (amount > existingAdvance.balance_amount) {
                    alert("Deduction amount cannot exceed current advance balance.");
                    return;
                }

                // Create a manual deduction transaction by directly updating Firestore
                const updatedTransactions: AdvanceTransaction[] = [
                    ...(existingAdvance.transactions || []),
                    {
                        date: new Date().toISOString(),
                        type: 'deducted',
                        amount: amount,
                        notes: advanceNotes || `Manual deduction for ${selectedEmployee.name}`
                    }
                ];

                const newBalanceAmount = existingAdvance.balance_amount - amount;
                const newStatus = newBalanceAmount <= 0 ? 'Fully Deducted' : 'Active';

                await updateDoc(doc(db, 'payroll_advances', existingAdvance.id), {
                    balance_amount: newBalanceAmount,
                    status: newStatus,
                    transactions: updatedTransactions,
                    notes: advanceNotes || `Manual deduction for ${selectedEmployee.name}`
                });
            }

            setIsAdvanceModalOpen(false);
            fetchData();
        } catch (error) {
            console.error("Failed to process advance:", error);
            console.error("Error details:", error.message, error.stack);
            alert(`Failed to save advance payment: ${error.message || 'Unknown error'}`);
        }
    };

    const handleViewHistory = (employee: PayrollEmployee) => {
        const employeeAdvance = advances.find(adv => 
            adv.employee_id === employee.id && adv.status === 'Active'
        );
        setViewingAdvance(employeeAdvance || null);
        setSelectedEmployee(employee);
        setIsHistoryModalOpen(true);
    };

    const getEmployeeAdvanceBalance = (employeeId: string): number => {
        const advance = advances.find(adv => 
            adv.employee_id === employeeId && adv.status === 'Active'
        );
        return advance?.balance_amount || 0;
    };
    
    const requestSort = (key: SortKey) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const sortedAndFilteredEmployees = useMemo(() => {
        let filtered = employees.filter(emp =>
            emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (emp.employee_id && emp.employee_id.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        return filtered.sort((a, b) => {
            const aValue = a[sortConfig.key] || '';
            const bValue = b[sortConfig.key] || '';
            if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
    }, [employees, searchTerm, sortConfig]);

    const SortableHeader: React.FC<{ sortKey: SortKey, children: React.ReactNode}> = ({ sortKey, children }) => (
        <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort(sortKey)}>
            <div className="flex items-center">
                {children}
                <ArrowUpDown size={14} className="ml-2 opacity-50"/>
            </div>
        </th>
    );

    const statusColors: Record<'Active' | 'Inactive', string> = {
        Active: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        Inactive: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    };

    return (
        <>
            <Card
                title="Manage Employees"
                actions={canCreate && <Button onClick={handleAdd} icon={<Plus size={16} />}>Add Employee</Button>}
                bodyClassName=""
            >
                <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <input
                        type="text"
                        placeholder="Filter by name or employee ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full md:w-1/3 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm"
                    />
                </div>
                {loading ? (
                    <p className="p-4 text-center">Loading employees...</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                            <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-700">
                                <tr>
                                    <SortableHeader sortKey="employee_id">ID</SortableHeader>
                                    <SortableHeader sortKey="name">Name</SortableHeader>
                                    <SortableHeader sortKey="department">Department</SortableHeader>
                                    <SortableHeader sortKey="category">Category</SortableHeader>
                                    <SortableHeader sortKey="monthly_ctc">Monthly CTC</SortableHeader>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3 text-right">Advance Balance</th>
                                    <th className="px-6 py-3 text-center">Advance Actions</th>
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedAndFilteredEmployees.map(emp => {
                                    const advanceBalance = getEmployeeAdvanceBalance(emp.id);
                                    return (
                                        <tr key={emp.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                                            <td className="px-6 py-4">{emp.employee_id}</td>
                                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{emp.name}</td>
                                            <td className="px-6 py-4">{emp.department}</td>
                                            <td className="px-6 py-4">{emp.category}</td>
                                            <td className="px-6 py-4">₹{emp.monthly_ctc.toLocaleString()}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[emp.status]}`}>
                                                    {emp.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`font-semibold ${advanceBalance > 0 ? 'text-red-600 dark:text-red-400' : 'text-slate-500'}`}>
                                                    ₹{advanceBalance.toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center justify-center space-x-1">
                                                    {canCreate && (
                                                        <button 
                                                            onClick={() => handleAdvanceAction(emp, 'add')}
                                                            className="p-1.5 text-green-600 hover:bg-green-100 dark:hover:bg-green-900 rounded-full transition-colors"
                                                            title="Add Advance"
                                                        >
                                                            <TrendingUp size={14} />
                                                        </button>
                                                    )}
                                                    {canEdit && advanceBalance > 0 && (
                                                        <button 
                                                            onClick={() => handleAdvanceAction(emp, 'deduct')}
                                                            className="p-1.5 text-orange-600 hover:bg-orange-100 dark:hover:bg-orange-900 rounded-full transition-colors"
                                                            title="Deduct Advance"
                                                        >
                                                            <Minus size={14} />
                                                        </button>
                                                    )}
                                                    <button 
                                                        onClick={() => handleViewHistory(emp)}
                                                        className="p-1.5 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-colors"
                                                        title="View History"
                                                    >
                                                        <History size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                               <div className="flex items-center justify-end space-x-1">
                                                    {canEdit && <button onClick={() => handleEdit(emp)} className="p-2 text-primary hover:bg-primary-light dark:hover:bg-slate-700 rounded-full transition-colors">
                                                        <Edit size={16} />
                                                    </button>}
                                                    {canDelete && <button onClick={() => handleDelete(emp.id)} className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                                                        <Trash2 size={16} />
                                                    </button>}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                                 {sortedAndFilteredEmployees.length === 0 && (
                                    <tr className="bg-white dark:bg-slate-800 border-b dark:border-slate-700">
                                        <td colSpan={9} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                                            No employees found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingEmployee ? `Edit ${editingEmployee.name}` : 'Add New Employee'}
            >
                <EmployeeForm
                    employeeToEdit={editingEmployee}
                    onSave={handleSave}
                    onCancel={() => setIsModalOpen(false)}
                />
            </Modal>

            {/* Advance Management Modal */}
            <Modal
                isOpen={isAdvanceModalOpen}
                onClose={() => setIsAdvanceModalOpen(false)}
                title={`${advanceType === 'add' ? 'Add' : 'Deduct'} Advance - ${selectedEmployee?.name}`}
            >
                <form onSubmit={handleAdvanceSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Amount (₹)
                        </label>
                        <input
                            type="number"
                            value={advanceAmount}
                            onChange={(e) => setAdvanceAmount(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-700 dark:text-slate-100 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                            placeholder="Enter amount"
                            required
                            min="1"
                            step="0.01"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Notes (Optional)
                        </label>
                        <textarea
                            value={advanceNotes}
                            onChange={(e) => setAdvanceNotes(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-700 dark:text-slate-100 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary"
                            rows={3}
                            placeholder="Enter notes about this advance transaction"
                        />
                    </div>
                    {advanceType === 'deduct' && selectedEmployee && (
                        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
                            <p className="text-sm text-yellow-800 dark:text-yellow-200">
                                Current advance balance: ₹{getEmployeeAdvanceBalance(selectedEmployee.id).toLocaleString()}
                            </p>
                        </div>
                    )}
                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="secondary" onClick={() => setIsAdvanceModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="submit" className={advanceType === 'add' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-600 hover:bg-orange-700'}>
                            {advanceType === 'add' ? 'Add' : 'Deduct'} Advance
                        </Button>
                    </div>
                </form>
            </Modal>

            {/* Advance History Modal */}
            <Modal
                isOpen={isHistoryModalOpen}
                onClose={() => setIsHistoryModalOpen(false)}
                title={`Advance History - ${selectedEmployee?.name}`}
            >
                <div className="p-4">
                    {viewingAdvance ? (
                        <>
                            <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-md">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-slate-600 dark:text-slate-400">Total Given:</span>
                                        <span className="ml-2 font-semibold">₹{viewingAdvance.amount.toLocaleString()}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-600 dark:text-slate-400">Current Balance:</span>
                                        <span className="ml-2 font-semibold text-red-600 dark:text-red-400">₹{viewingAdvance.balance_amount.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="max-h-96 overflow-y-auto">
                                <h4 className="font-medium mb-3">Transaction History</h4>
                                {viewingAdvance.transactions && viewingAdvance.transactions.length > 0 ? (
                                    <ul className="space-y-3">
                                        {viewingAdvance.transactions
                                            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                            .map((tx, index) => (
                                                <li key={index} className="flex items-start space-x-3 p-3 rounded-md bg-slate-50 dark:bg-slate-700/50">
                                                    <span className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                                                        tx.type === 'deducted' 
                                                            ? 'bg-red-100 dark:bg-red-900/50' 
                                                            : 'bg-green-100 dark:bg-green-900/50'
                                                    }`}>
                                                        {tx.type === 'deducted' ? 
                                                            <Minus size={16} className="text-red-600" /> :
                                                            <TrendingUp size={16} className="text-green-600" />
                                                        }
                                                    </span>
                                                    <div className="flex-grow">
                                                        <p className="font-medium text-sm">{tx.notes}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                                            {new Date(tx.date).toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <p className={`font-bold text-sm ${
                                                        tx.type === 'deducted' ? 'text-red-600' : 'text-green-600'
                                                    }`}>
                                                        {tx.type === 'deducted' ? '-' : '+'} ₹{tx.amount.toLocaleString()}
                                                    </p>
                                                </li>
                                            ))
                                        }
                                    </ul>
                                ) : (
                                    <p className="text-center text-slate-500 dark:text-slate-400 py-4">
                                        No advance transactions found.
                                    </p>
                                )}
                            </div>
                        </>
                    ) : (
                        <p className="text-center text-slate-500 dark:text-slate-400 py-8">
                            No active advance found for this employee.
                        </p>
                    )}
                </div>
            </Modal>
        </>
    );
};

export default EmployeeList;

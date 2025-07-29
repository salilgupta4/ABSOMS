import React, { useState, useEffect, useMemo } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Plus, Edit, Trash2, ArrowUpDown } from 'lucide-react';
import { PayrollEmployee } from '@/types';
import { getPayrollEmployees, deletePayrollEmployee } from '@/services/payrollService';
import EmployeeForm from './EmployeeForm';

type SortKey = 'employee_id' | 'name' | 'department' | 'category' | 'monthly_ctc';

const EmployeeList: React.FC = () => {
    const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<PayrollEmployee | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' }>({ key: 'name', direction: 'ascending' });

    const fetchEmployees = () => {
        setLoading(true);
        getPayrollEmployees().then(data => {
            setEmployees(data);
        }).catch(err => {
            console.error("Failed to fetch employees:", err);
            alert("Failed to fetch employees.");
        }).finally(() => {
            setLoading(false);
        });
    };

    useEffect(() => {
        fetchEmployees();
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
                fetchEmployees();
            } catch (error) {
                alert("Failed to delete employee.");
            }
        }
    };

    const handleSave = () => {
        setIsModalOpen(false);
        fetchEmployees();
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
                actions={<Button onClick={handleAdd} icon={<Plus size={16} />}>Add Employee</Button>}
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
                                    <th className="px-6 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedAndFilteredEmployees.map(emp => (
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
                                           <div className="flex items-center justify-end space-x-1">
                                                <button onClick={() => handleEdit(emp)} className="p-2 text-primary hover:bg-primary-light dark:hover:bg-slate-700 rounded-full transition-colors">
                                                    <Edit size={16} />
                                                </button>
                                                <button onClick={() => handleDelete(emp.id)} className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-slate-700 rounded-full transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                 {sortedAndFilteredEmployees.length === 0 && (
                                    <tr className="bg-white dark:bg-slate-800 border-b dark:border-slate-700">
                                        <td colSpan={7} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
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
        </>
    );
};

export default EmployeeList;

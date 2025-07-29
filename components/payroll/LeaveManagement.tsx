import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Plus, Edit, Trash2, ArrowUpDown, Check, X } from 'lucide-react';
import { LeaveRequest, PayrollEmployee } from '@/types';
import { getLeaveRequests, saveLeaveRequest, updateLeaveRequestStatus, deleteLeaveRequest, getPayrollEmployees } from '@/services/payrollService';
import SearchableSelect from '@/components/ui/SearchableSelect';

const LeaveManagement: React.FC = () => {
    const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
    const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingLeave, setEditingLeave] = useState<Partial<LeaveRequest>>({});

    const fetchData = () => {
        setLoading(true);
        Promise.all([getLeaveRequests(), getPayrollEmployees()])
            .then(([leavesData, empData]) => {
                const enrichedLeaves = leavesData.map(leave => ({
                    ...leave,
                    employeeName: empData.find(e => e.id === leave.employee_id)?.name || 'Unknown'
                }));
                setLeaves(enrichedLeaves as any);
                setEmployees(empData);
            })
            .catch(err => alert("Failed to load data."))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAdd = () => {
        setEditingLeave({});
        setIsModalOpen(true);
    };

    const handleEdit = (leave: LeaveRequest) => {
        setEditingLeave(leave);
        setIsModalOpen(true);
    };
    
    const handleStatusUpdate = async (id: string, status: 'approved' | 'rejected') => {
        try {
            await updateLeaveRequestStatus(id, status, 'admin_user_id'); // Replace with actual admin user ID
            fetchData();
        } catch (error) {
            alert(`Failed to update status.`);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm("Are you sure you want to delete this leave request?")) {
            try {
                await deleteLeaveRequest(id);
                fetchData();
            } catch (error) {
                alert("Failed to delete leave request.");
            }
        }
    };
    
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { employee_id, leave_type, start_date, end_date, reason } = editingLeave;
            if (!employee_id || !leave_type || !start_date || !end_date || !reason) {
                return alert("All fields are required.");
            }
            const total_days = (new Date(end_date).getTime() - new Date(start_date).getTime()) / (1000 * 3600 * 24) + 1;
            
            await saveLeaveRequest({ ...editingLeave, total_days } as any);
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            alert("Failed to save leave request.");
        }
    };

    const statusColors: Record<string, string> = {
        pending: 'bg-yellow-100 text-yellow-800',
        approved: 'bg-green-100 text-green-800',
        rejected: 'bg-red-100 text-red-800',
    };

    return (
        <>
            <Card title="Leave Management" actions={<Button onClick={handleAdd} icon={<Plus />}>New Request</Button>}>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr>
                                <th className="p-2 text-left">Employee</th>
                                <th className="p-2 text-left">Type</th>
                                <th className="p-2 text-left">Dates</th>
                                <th className="p-2 text-center">Days</th>
                                <th className="p-2 text-center">Status</th>
                                <th className="p-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leaves.map(leave => (
                                <tr key={leave.id} className="border-t">
                                    <td className="p-2">{(leave as any).employeeName}</td>
                                    <td className="p-2 capitalize">{leave.leave_type}</td>
                                    <td className="p-2">{new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}</td>
                                    <td className="p-2 text-center">{leave.total_days}</td>
                                    <td className="p-2 text-center"><span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[leave.status]}`}>{leave.status}</span></td>
                                    <td className="p-2 text-right">
                                        {leave.status === 'pending' && (
                                            <>
                                                <button onClick={() => handleStatusUpdate(leave.id, 'approved')} className="p-2 text-green-600"><Check /></button>
                                                <button onClick={() => handleStatusUpdate(leave.id, 'rejected')} className="p-2 text-red-600"><X /></button>
                                            </>
                                        )}
                                        <button onClick={() => handleEdit(leave)} className="p-2"><Edit /></button>
                                        <button onClick={() => handleDelete(leave.id)} className="p-2"><Trash2 /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Leave Request">
                <form onSubmit={handleSave} className="p-4 space-y-4">
                    <div>
                        <label>Employee</label>
                        <SearchableSelect
                            value={editingLeave.employee_id || ''}
                            onChange={(val) => setEditingLeave(p => ({...p, employee_id: val}))}
                            options={employees.map(e => ({ value: e.id, label: e.name }))}
                        />
                    </div>
                    <div>
                        <label>Leave Type</label>
                        <select value={editingLeave.leave_type} onChange={e => setEditingLeave(p => ({...p, leave_type: e.target.value as any}))} className="w-full p-2 border rounded">
                            <option>Select Type</option>
                            <option value="sick">Sick</option>
                            <option value="casual">Casual</option>
                            <option value="earned">Earned</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                         <div><label>Start Date</label><input type="date" value={editingLeave.start_date || ''} onChange={e => setEditingLeave(p => ({...p, start_date: e.target.value}))} className="w-full p-2 border rounded"/></div>
                         <div><label>End Date</label><input type="date" value={editingLeave.end_date || ''} onChange={e => setEditingLeave(p => ({...p, end_date: e.target.value}))} className="w-full p-2 border rounded"/></div>
                    </div>
                     <div>
                        <label>Reason</label>
                        <textarea value={editingLeave.reason || ''} onChange={e => setEditingLeave(p => ({...p, reason: e.target.value}))} className="w-full p-2 border rounded" />
                    </div>
                    <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button><Button type="submit">Save</Button></div>
                </form>
            </Modal>
        </>
    );
};

export default LeaveManagement;
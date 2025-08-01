

import React, { useState, useEffect, useMemo } from 'react';
import { User, UserRole, UserFormData } from '../../types';
import Button from '../ui/Button';
import Card from '../ui/Card';
import Modal from '../ui/Modal';
import UserForm from './UserForm';
import { getUsers, saveUser, deleteUser } from './userService';
import { Plus, Edit, Trash2, Loader, ArrowUpDown, CheckSquare, XSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { canPerformAction, canAccessAdminFeatures } from '@/utils/permissions';

type SortKey = 'name' | 'email' | 'role';

const UserManagement: React.FC = () => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<UserFormData | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>({ key: 'name', direction: 'ascending' });

    const canCreate = canPerformAction(currentUser, 'create') && canAccessAdminFeatures(currentUser);
    const canEdit = canPerformAction(currentUser, 'edit') && canAccessAdminFeatures(currentUser);
    const canDelete = canPerformAction(currentUser, 'delete') && canAccessAdminFeatures(currentUser);
    const isSuperAdmin = canAccessAdminFeatures(currentUser);

    const fetchUsers = () => {
        setLoading(true);
        getUsers().then(data => {
            setUsers(data);
            setLoading(false);
        }).catch(() => setLoading(false));
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleAddUser = () => {
        if (!canCreate) return;
        setEditingUser(null);
        setIsModalOpen(true);
    };
    
    const handleEditUser = (user: User) => {
        if (!canEdit) return;
        setEditingUser(user);
        setIsModalOpen(true);
    }

    const handleDeleteUser = (userId: string) => {
        if (!canDelete) return;
        if (window.confirm("Are you sure you want to delete this user?")) {
            deleteUser(userId).then(() => {
                fetchUsers();
            });
        }
    }

    const handleSaveUser = async (userData: UserFormData) => {
        if (!canCreate && !canEdit) return;
        setSaving(true);
        
        const isNewUser = !userData.id;
        console.log('Attempting to save user:', userData);
        
        try {
            const result = await saveUser(userData);
            console.log('User saved successfully:', result);
            setIsModalOpen(false);
            setEditingUser(null);
            
            if (isNewUser) {
                alert(
                    `User ${userData.email} has been created successfully!\n\n` +
                    `Important: You have been automatically signed out because Firebase ` +
                    `signs in the new user when created. The new user can now log in with ` +
                    `their credentials.\n\n` +
                    `You will need to log back in as an administrator.`
                );
            } else {
                // For existing user updates, refresh the list
                fetchUsers();
            }
        } catch (error) {
            console.error("Failed to save user - detailed error:", error);
            
            // Provide specific error messages
            const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
            
            if (errorMessage.includes("email-already-in-use")) {
                alert("Failed to create user: This email address is already in use.");
            } else if (errorMessage.includes("weak-password")) {
                alert("Failed to create user: Password should be at least 6 characters.");
            } else if (errorMessage.includes("invalid-email")) {
                alert("Failed to create user: Please enter a valid email address.");
            } else {
                alert(`Failed to save user: ${errorMessage}`);
            }
        } finally {
            setSaving(false);
        }
    };
    
    const requestSort = (key: SortKey) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const sortedAndFilteredUsers = useMemo(() => {
        let sortableItems = [...users];

        if (searchTerm) {
            sortableItems = sortableItems.filter(user =>
                user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                user.email.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                return 0;
            });
        }
        return sortableItems;
    }, [users, searchTerm, sortConfig]);

    const SortableHeader: React.FC<{ sortKey: SortKey, children: React.ReactNode}> = ({ sortKey, children }) => (
        <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort(sortKey)}>
            <div className="flex items-center">
                {children}
                <ArrowUpDown size={14} className="ml-2 opacity-50"/>
            </div>
        </th>
    );

    const roleColors = {
        [UserRole.Admin]: 'bg-red-100 text-red-800',
        [UserRole.Maker]: 'bg-blue-100 text-blue-800',
        [UserRole.Approver]: 'bg-green-100 text-green-800',
        [UserRole.Viewer]: 'bg-slate-100 text-slate-800',
    };

    return (
        <>
            <Card
                title="User Management"
                actions={canCreate && <Button onClick={handleAddUser} icon={<Plus size={16} />}>Add User</Button>}
                bodyClassName=""
            >
                 <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <input
                        type="text"
                        placeholder="Filter by name or email..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full md:w-1/3 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm"
                    />
                </div>
                {loading ? (
                    <div className="p-6 text-center text-slate-500 flex justify-center items-center">
                        <Loader className="animate-spin mr-2"/> Loading users...
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-500">
                            <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                                <tr>
                                    <SortableHeader sortKey="name">Name</SortableHeader>
                                    <SortableHeader sortKey="email">Email</SortableHeader>
                                    <SortableHeader sortKey="role">Role</SortableHeader>
                                    <th scope="col" className="px-6 py-3">ERP Access</th>
                                    <th scope="col" className="px-6 py-3">Payroll Access</th>
                                    <th scope="col" className="px-6 py-3">Projects Access</th>
                                    {(canEdit || canDelete) && <th scope="col" className="px-6 py-3 text-right">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {sortedAndFilteredUsers.map((user) => (
                                    <tr key={user.id} className="bg-white border-b hover:bg-slate-50">
                                        <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">{user.name}</td>
                                        <td className="px-6 py-4">{user.email}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${roleColors[user.role]}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {user.hasErpAccess ? <CheckSquare size={18} className="text-green-500" /> : <XSquare size={18} className="text-slate-400" />}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {user.hasPayrollAccess ? <CheckSquare size={18} className="text-green-500" /> : <XSquare size={18} className="text-slate-400" />}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            {user.hasProjectsAccess ? <CheckSquare size={18} className="text-green-500" /> : <XSquare size={18} className="text-slate-400" />}
                                        </td>
                                        {(canEdit || canDelete) && (
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end space-x-2">
                                                    {canEdit && <button onClick={() => handleEditUser(user)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full"><Edit size={16} /></button>}
                                                    {canDelete && currentUser?.id !== user.id && <button onClick={() => handleDeleteUser(user.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-full"><Trash2 size={16} /></button>}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            <Modal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                title={editingUser ? 'Edit User' : 'Add New User'}
            >
                <UserForm
                    userToEdit={editingUser}
                    onSave={handleSaveUser}
                    onCancel={() => setIsModalOpen(false)}
                    saving={saving}
                />
            </Modal>
        </>
    );
};

export default UserManagement;
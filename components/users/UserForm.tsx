
import React, { useState, useEffect } from 'react';
import { UserFormData, UserRole } from '../../types';
import Button from '../ui/Button';
import { Loader } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface UserFormProps {
  userToEdit: UserFormData | null;
  onSave: (user: UserFormData) => void;
  onCancel: () => void;
  saving: boolean;
}

const formInputClass = "mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm";
const selectClass = "mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md";

const UserForm: React.FC<UserFormProps> = ({ userToEdit, onSave, onCancel, saving }) => {
  const { user: currentUser } = useAuth();
  const [user, setUser] = useState<UserFormData>({ name: '', email: '', role: UserRole.Viewer, password: '', hasErpAccess: true, hasPayrollAccess: false });
  const isEditing = !!userToEdit?.id;
  const isSuperAdmin = currentUser?.role === UserRole.Admin;

  useEffect(() => {
    if (userToEdit) {
      setUser({ ...userToEdit, password: '' });
    } else {
      setUser({ name: '', email: '', role: UserRole.Viewer, password: '', hasErpAccess: true, hasPayrollAccess: false });
    }
  }, [userToEdit]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const isCheckbox = type === 'checkbox';
    const checked = isCheckbox ? (e.target as HTMLInputElement).checked : undefined;
    
    setUser(prev => ({ ...prev, [name]: isCheckbox ? checked : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditing && !user.password) {
      alert("Password is required for new users.");
      return;
    }
    
    // Warn about logout behavior for new users
    if (!isEditing) {
      const confirmed = window.confirm(
        "Creating a new user will sign you out due to Firebase limitations. " +
        "You will need to log back in as an administrator after the user is created. " +
        "\n\nDo you want to continue?"
      );
      if (!confirmed) {
        return;
      }
    }
    
    onSave(user);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-slate-700">Full Name</label>
        <input type="text" name="name" id="name" value={user.name} onChange={handleChange} required className={formInputClass} disabled={!isSuperAdmin}/>
      </div>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-slate-700">Email Address</label>
        <input type="email" name="email" id="email" value={user.email} onChange={handleChange} required className={formInputClass} disabled={!isSuperAdmin} />
      </div>
      <div>
        <label htmlFor="role" className="block text-sm font-medium text-slate-700">Role</label>
        <select name="role" id="role" value={user.role} onChange={handleChange} required className={selectClass} disabled={!isSuperAdmin}>
          {Object.values(UserRole).map(role => (
            <option key={role} value={role}>{role}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-slate-700">
          Password {isEditing && <span className="text-xs text-slate-500">(Leave blank to keep unchanged)</span>}
        </label>
        <input type="password" name="password" id="password" value={user.password || ''} onChange={handleChange} required={!isEditing} className={formInputClass} disabled={!isSuperAdmin}/>
      </div>
      
      {isSuperAdmin && (
          <div className="space-y-4 pt-4 border-t">
              <h4 className="text-sm font-medium text-slate-700">Module Permissions</h4>
              <label className="flex items-center space-x-3">
                  <input type="checkbox" name="hasErpAccess" checked={user.hasErpAccess} onChange={handleChange} className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary" />
                  <span>Allow access to ERP modules (Sales, Purchase, Inventory)</span>
              </label>
              <label className="flex items-center space-x-3">
                  <input type="checkbox" name="hasPayrollAccess" checked={user.hasPayrollAccess} onChange={handleChange} className="h-5 w-5 rounded border-slate-300 text-primary focus:ring-primary" />
                  <span>Allow access to Payroll module</span>
              </label>
          </div>
      )}

      <div className="flex justify-end space-x-3 pt-4 border-t mt-6">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button type="submit" disabled={saving || !isSuperAdmin} icon={saving ? <Loader size={16} className="animate-spin" /> : null}>
          {saving ? 'Saving...' : 'Save User'}
        </Button>
      </div>
    </form>
  );
};

export default UserForm;
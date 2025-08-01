import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Plus, Edit, Trash2, User, Phone, Mail, Star, StarOff } from 'lucide-react';
import { PointOfContact } from '@/types';
import { 
    getPointsOfContact, 
    savePointOfContact, 
    deletePointOfContact, 
    setAsDefault 
} from '@/services/pointOfContactService';

const PointOfContactManagement: React.FC = () => {
    const [contacts, setContacts] = useState<PointOfContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<Partial<PointOfContact>>({});
    const [saving, setSaving] = useState(false);

    const fetchContacts = async () => {
        try {
            setLoading(true);
            const data = await getPointsOfContact();
            setContacts(data);
        } catch (error) {
            console.error('Failed to fetch points of contact:', error);
            alert('Failed to load points of contact');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContacts();
    }, []);

    const handleAdd = () => {
        setEditingContact({
            name: '',
            designation: '',
            phone: '',
            email: '',
            isDefault: contacts.length === 0 // First contact is default
        });
        setIsModalOpen(true);
    };

    const handleEdit = (contact: PointOfContact) => {
        setEditingContact(contact);
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!editingContact.name || !editingContact.phone || !editingContact.email) {
            alert('Please fill in all required fields');
            return;
        }

        try {
            setSaving(true);
            await savePointOfContact(editingContact as any);
            setIsModalOpen(false);
            setEditingContact({});
            await fetchContacts();
        } catch (error: any) {
            console.error('Failed to save point of contact:', error);
            alert(`Failed to save point of contact: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
            try {
                await deletePointOfContact(id);
                await fetchContacts();
            } catch (error: any) {
                console.error('Failed to delete point of contact:', error);
                alert(`Failed to delete point of contact: ${error.message}`);
            }
        }
    };

    const handleSetDefault = async (id: string) => {
        try {
            await setAsDefault(id);
            await fetchContacts();
        } catch (error: any) {
            console.error('Failed to set default:', error);
            alert(`Failed to set as default: ${error.message}`);
        }
    };

    const handleInputChange = (field: keyof PointOfContact, value: string | boolean) => {
        setEditingContact(prev => ({
            ...prev,
            [field]: value
        }));
    };

    if (loading) {
        return <Card title="Points of Contact"><div className="p-4 text-center">Loading...</div></Card>;
    }

    return (
        <>
            <Card 
                title="Points of Contact" 
                actions={
                    <Button onClick={handleAdd} icon={<Plus size={16} />}>
                        Add Point of Contact
                    </Button>
                }
            >
                <div className="p-6">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                        Manage company points of contact that will appear on quotes, orders, and PDFs. 
                        The default contact will be automatically selected for new documents.
                    </p>

                    {contacts.length === 0 ? (
                        <div className="text-center py-8">
                            <User className="mx-auto h-12 w-12 text-slate-400" />
                            <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100">No contacts yet</h3>
                            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                Add your first point of contact to get started.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {contacts.map(contact => (
                                <div 
                                    key={contact.id} 
                                    className={`relative p-4 rounded-lg border ${
                                        contact.isDefault 
                                            ? 'border-blue-200 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20' 
                                            : 'border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-800'
                                    }`}
                                >
                                    {contact.isDefault && (
                                        <div className="absolute -top-2 -right-2">
                                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                <Star size={12} className="mr-1" />
                                                Default
                                            </span>
                                        </div>
                                    )}
                                    
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <h4 className="font-semibold text-slate-900 dark:text-slate-100">{contact.name}</h4>
                                            <p className="text-sm text-slate-600 dark:text-slate-400">{contact.designation}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2 mb-4">
                                        <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                                            <Phone size={14} className="mr-2" />
                                            {contact.phone}
                                        </div>
                                        <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                                            <Mail size={14} className="mr-2" />
                                            {contact.email}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <button
                                                onClick={() => handleEdit(contact)}
                                                className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-100 rounded"
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(contact.id, contact.name)}
                                                className="p-1 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                        
                                        {!contact.isDefault && (
                                            <button
                                                onClick={() => handleSetDefault(contact.id)}
                                                className="flex items-center px-2 py-1 text-xs text-slate-600 dark:text-slate-400 hover:text-blue-600 hover:bg-blue-100 rounded"
                                            >
                                                <StarOff size={12} className="mr-1" />
                                                Set Default
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Card>

            <Modal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingContact({});
                }}
                title={editingContact.id ? 'Edit Point of Contact' : 'Add Point of Contact'}
            >
                <form onSubmit={handleSave} className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Name *
                        </label>
                        <input
                            type="text"
                            value={editingContact.name || ''}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-slate-100"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Designation
                        </label>
                        <input
                            type="text"
                            value={editingContact.designation || ''}
                            onChange={(e) => handleInputChange('designation', e.target.value)}
                            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-slate-100"
                            placeholder="e.g., Sales Manager, Director"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Phone *
                        </label>
                        <input
                            type="tel"
                            value={editingContact.phone || ''}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-slate-100"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Email *
                        </label>
                        <input
                            type="email"
                            value={editingContact.email || ''}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-slate-100"
                            required
                        />
                    </div>

                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="isDefault"
                            checked={editingContact.isDefault || false}
                            onChange={(e) => handleInputChange('isDefault', e.target.checked)}
                            className="mr-2"
                        />
                        <label htmlFor="isDefault" className="text-sm text-slate-700 dark:text-slate-300">
                            Set as default point of contact
                        </label>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                                setIsModalOpen(false);
                                setEditingContact({});
                            }}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving ? 'Saving...' : 'Save'}
                        </Button>
                    </div>
                </form>
            </Modal>
        </>
    );
};

export default PointOfContactManagement;
import React, { useState, useEffect } from 'react';
import { X, Save, Loader } from 'lucide-react';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { TransportTransaction } from '@/types';
import { transportService } from '@/services/transportService';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transporterId: string;
  onTransactionAdded: () => void;
  editTransaction?: TransportTransaction;
}

const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  transporterId,
  onTransactionAdded,
  editTransaction
}) => {
  const [formData, setFormData] = useState({
    type: 'cost' as 'cost' | 'payment',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editTransaction) {
      setFormData({
        type: editTransaction.type,
        amount: editTransaction.amount.toString(),
        description: editTransaction.description,
        date: new Date(editTransaction.date).toISOString().split('T')[0]
      });
    } else {
      setFormData({
        type: 'cost',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
    }
  }, [editTransaction, isOpen]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.description.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      if (editTransaction) {
        await transportService.updateTransportTransaction(transporterId, editTransaction.id, {
          type: formData.type,
          amount: amount,
          description: formData.description.trim(),
          date: new Date(formData.date).toISOString()
        });
        alert('Transaction updated successfully!');
      } else {
        await transportService.addTransportTransaction(transporterId, {
          type: formData.type,
          amount: amount,
          description: formData.description.trim(),
          date: new Date(formData.date).toISOString()
        });
        
        const statusMessage = formData.type === 'cost' 
          ? 'Transport cost added successfully!' 
          : 'Payment submitted for approval successfully!';
        
        alert(statusMessage);
      }
      
      onTransactionAdded();
      handleClose();
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert(`Failed to ${editTransaction ? 'update' : 'add'} transaction`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        type: 'cost',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-md">
      <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">
          {editTransaction ? 'Edit Transaction' : 'Add Transaction'}
        </h3>
        <button
          onClick={handleClose}
          disabled={loading}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6">
        <div className="space-y-4">
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Transaction Type *
            </label>
            <select
              id="type"
              name="type"
              value={formData.type}
              onChange={handleChange}
              disabled={loading}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
            >
              <option value="cost">Transport Cost</option>
              <option value="payment">Payment Made</option>
            </select>
          </div>

          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Amount *
            </label>
            <input
              type="number"
              id="amount"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              required
              disabled={loading}
              step="0.01"
              min="0.01"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
              placeholder="Enter amount"
            />
          </div>

          <div>
            <label htmlFor="date" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Date *
            </label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              disabled={loading}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Description *
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              required
              disabled={loading}
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
              placeholder="Enter description"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <Button
            type="button"
            variant="secondary"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
            icon={loading ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
          >
            {loading ? (editTransaction ? 'Updating...' : 'Adding...') : (editTransaction ? 'Update Transaction' : 'Add Transaction')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default TransactionModal;
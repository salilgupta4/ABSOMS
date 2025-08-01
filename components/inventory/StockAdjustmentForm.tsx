
import React, { useState, useEffect } from 'react';
import { Product } from '../../types';
import Button from '../ui/Button';
import SearchableSelect from '../ui/SearchableSelect';
import { Loader } from 'lucide-react';
import { getProducts } from '../products/ProductList';
import { addStockMovement } from './inventoryService';
import { useAuth } from '@/contexts/AuthContext';

interface StockAdjustmentFormProps {
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
  setSaving: (isSaving: boolean) => void;
}

const StockAdjustmentForm: React.FC<StockAdjustmentFormProps> = ({ onSave, onCancel, saving, setSaving }) => {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [type, setType] = useState<'in' | 'out'>('in');
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('Manual Adjustment');

  useEffect(() => {
    getProducts().then(setProducts);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Form submission started with values:', {
      selectedProductId,
      type,
      quantity,
      notes
    });
    
    if (!selectedProductId || selectedProductId.trim() === '') {
      alert('Please select a product.');
      return;
    }
    
    if (!quantity || quantity <= 0) {
      alert('Please enter a valid quantity greater than 0.');
      return;
    }
    
    if (!notes || notes.trim() === '') {
      alert('Please enter notes for this adjustment.');
      return;
    }
    
    setSaving(true);
    const selectedProduct = products.find(p => p.id === selectedProductId);
    if (!selectedProduct) {
        alert('Selected product not found in product list.');
        setSaving(false);
        return;
    }
    
    console.log('Selected product found:', selectedProduct);
    console.log('Current user:', user);
    
    if (!user) {
      alert('You must be logged in to add stock adjustments.');
      setSaving(false);
      return;
    }

    try {
      console.log('Saving stock movement with data:', {
        productId: selectedProductId,
        productName: selectedProduct.name,
        type,
        quantity,
        notes,
      });
      
      const result = await addStockMovement({
        productId: selectedProductId,
        productName: selectedProduct.name,
        type,
        quantity,
        notes,
      });
      console.log('Stock movement saved successfully:', result);
      onSave();
    } catch (error) {
      console.error('Failed to save stock adjustment - detailed error:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        stack: error.stack
      });
      alert(`Failed to save stock adjustment: ${error.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div>
        <label htmlFor="product" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Product</label>
         <SearchableSelect
            value={selectedProductId}
            onChange={setSelectedProductId}
            options={products.map(p => ({ value: p.id, label: p.name }))}
            placeholder="Select a product"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Adjustment Type</label>
          <select
            id="type"
            value={type}
            onChange={(e) => setType(e.target.value as 'in' | 'out')}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
          >
            <option value="in">Stock In (Increase)</option>
            <option value="out">Stock Out (Decrease)</option>
          </select>
        </div>
        <div>
          <label htmlFor="quantity" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Quantity</label>
          <input
            type="number"
            id="quantity"
            value={quantity}
            min="0.001"
            step="0.001"
            onChange={(e) => setQuantity(parseFloat(e.target.value) || 1)}
            required
            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm"
          />
        </div>
      </div>
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Notes</label>
        <input
          type="text"
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          required
          className="mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm"
        />
      </div>
      <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700 mt-6">
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>Cancel</Button>
        <Button type="submit" disabled={saving} icon={saving ? <Loader size={16} className="animate-spin" /> : null}>
          {saving ? 'Saving...' : 'Adjust Stock'}
        </Button>
      </div>
    </form>
  );
};

export default StockAdjustmentForm;

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Transporter } from '@/types';
import { transportService } from '@/services/transportService';

const TransporterForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    vehicleNumber: ''
  });
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditing);

  useEffect(() => {
    if (isEditing && id) {
      loadTransporter(id);
    }
  }, [id, isEditing]);

  const loadTransporter = async (transporterId: string) => {
    try {
      setInitialLoading(true);
      const transporter = await transportService.getTransporter(transporterId);
      if (transporter) {
        setFormData({
          name: transporter.name,
          phone: transporter.phone,
          vehicleNumber: transporter.vehicleNumber
        });
      }
    } catch (error) {
      console.error('Error loading transporter:', error);
      alert('Failed to load transporter');
    } finally {
      setInitialLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.phone.trim() || !formData.vehicleNumber.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      if (isEditing && id) {
        await transportService.updateTransporter(id, formData);
        alert('Transporter updated successfully!');
      } else {
        await transportService.createTransporter(formData);
        alert('Transporter created successfully!');
      }
      navigate('/transport/list');
    } catch (error) {
      console.error('Error saving transporter:', error);
      alert('Failed to save transporter');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    navigate('/transport/list');
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center mb-6">
        <Button
          variant="secondary"
          size="sm"
          icon={<ArrowLeft size={16} />}
          onClick={handleBack}
          className="mr-4"
        >
          Back
        </Button>
        <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-200">
          {isEditing ? 'Edit Transporter' : 'Add New Transporter'}
        </h3>
      </div>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Transporter Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
              placeholder="Enter transporter name"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Phone Number *
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
              placeholder="Enter phone number"
            />
          </div>

          <div>
            <label htmlFor="vehicleNumber" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Vehicle Number *
            </label>
            <input
              type="text"
              id="vehicleNumber"
              name="vehicleNumber"
              value={formData.vehicleNumber}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-primary focus:border-primary dark:bg-slate-700 dark:text-slate-100"
              placeholder="Enter vehicle number"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handleBack}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              icon={loading ? <Loader size={16} className="animate-spin" /> : <Save size={16} />}
            >
              {loading ? 'Saving...' : (isEditing ? 'Update Transporter' : 'Create Transporter')}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default TransporterForm;
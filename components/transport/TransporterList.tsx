import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, Phone, Truck, CreditCard } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Transporter } from '@/types';
import { transportService } from '@/services/transportService';
import { useAuth } from '@/contexts/AuthContext';
import TransactionModal from './TransactionModal';

const TransporterList: React.FC = () => {
  const { user } = useAuth();
  const [transporters, setTransporters] = useState<Array<Transporter & { balance: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [selectedTransporterId, setSelectedTransporterId] = useState<string>('');

  useEffect(() => {
    loadTransporters();
  }, []);

  const loadTransporters = async () => {
    try {
      setLoading(true);
      const data = await transportService.getAllTransportersWithBalances();
      setTransporters(data);
    } catch (error) {
      console.error('Error loading transporters:', error);
      alert('Failed to load transporters');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${Math.abs(amount).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete transporter "${name}"?`)) {
      return;
    }

    try {
      await transportService.deleteTransporter(id);
      await loadTransporters();
      alert('Transporter deleted successfully');
    } catch (error) {
      console.error('Error deleting transporter:', error);
      alert('Failed to delete transporter');
    }
  };

  const handleAddTransaction = (transporterId: string) => {
    setSelectedTransporterId(transporterId);
    setShowTransactionModal(true);
  };

  const handleTransactionAdded = () => {
    loadTransporters(); // Refresh the list to update balances
    setShowTransactionModal(false);
    setSelectedTransporterId('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-200">Transport Management</h3>
          <p className="text-slate-600 dark:text-slate-400 mt-1">Manage transporters, vehicles, and track costs & payments</p>
        </div>
        <Link to="/transport/new">
          <Button icon={<Plus size={16} />}>
            Add Transporter
          </Button>
        </Link>
      </div>

      {transporters.length === 0 ? (
        <Card className="text-center py-12">
          <div className="mx-auto w-16 h-16 bg-primary-light rounded-full flex items-center justify-center mb-4">
            <Truck size={32} className="text-primary" />
          </div>
          <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-2">No transporters found</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-4">Get started by adding your first transporter</p>
          <Link to="/transport/new">
            <Button>Add Transporter</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4">
          {transporters.map((transporter) => (
            <Link key={transporter.id} to={`/transport/${transporter.id}/ledger`} className="block">
              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-10 h-10 bg-primary-light rounded-full flex items-center justify-center">
                        <Truck size={20} className="text-primary" />
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                          {transporter.name}
                        </h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Vehicle: {transporter.vehicleNumber}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center text-sm text-slate-600 dark:text-slate-400">
                        <Phone size={14} className="mr-1" />
                        {transporter.phone}
                      </div>
                      <div className={`text-sm font-medium px-2 py-1 rounded-full ${
                        transporter.balance > 0 
                          ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' 
                          : transporter.balance < 0 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                          : 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-400'
                      }`}>
                        {transporter.balance === 0 
                          ? 'Settled' 
                          : transporter.balance > 0 
                          ? `We owe ${formatCurrency(transporter.balance)}` 
                          : `They owe ${formatCurrency(transporter.balance)}`
                        }
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<CreditCard size={16} />}
                      onClick={(e) => {
                        e.preventDefault();
                        handleAddTransaction(transporter.id);
                      }}
                    >
                      Add Transaction
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Edit size={16} />}
                      onClick={(e) => {
                        e.preventDefault();
                        window.location.href = `#/transport/${transporter.id}/edit`;
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<Trash2 size={16} />}
                      onClick={(e) => {
                        e.preventDefault();
                        handleDelete(transporter.id, transporter.name);
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => setShowTransactionModal(false)}
        transporterId={selectedTransporterId}
        onTransactionAdded={handleTransactionAdded}
      />
    </div>
  );
};

export default TransporterList;
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, ArrowRight, MapPin } from 'lucide-react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { TransportTransaction, Transporter, UserRole } from '@/types';
import { transportService } from '@/services/transportService';
import { useAuth } from '@/contexts/AuthContext';

const PendingPaymentsCard: React.FC = () => {
  const { user } = useAuth();
  const [pendingPayments, setPendingPayments] = useState<Array<{ transporter: Transporter; transaction: TransportTransaction }>>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === UserRole.Admin;

  useEffect(() => {
    if (isAdmin) {
      loadPendingPayments();
    }
  }, [isAdmin]);

  const loadPendingPayments = async () => {
    try {
      setLoading(true);
      const data = await transportService.getPendingPayments();
      setPendingPayments(data);
    } catch (error) {
      console.error('Error loading pending payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short'
    });
  };

  // Don't render if user is not admin
  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center mb-4">
          <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mr-3">
            <Clock size={20} className="text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Pending Transport Payments</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">Loading...</p>
          </div>
        </div>
      </Card>
    );
  }

  if (pendingPayments.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mr-3">
              <Clock size={20} className="text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Pending Transport Payments</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">No payments pending approval</p>
            </div>
          </div>
          <span className="text-2xl font-bold text-green-600">0</span>
        </div>
      </Card>
    );
  }

  const totalPendingAmount = pendingPayments.reduce((sum, item) => sum + item.transaction.amount, 0);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mr-3">
            <Clock size={20} className="text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Pending Transport Payments</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {pendingPayments.length} payment{pendingPayments.length !== 1 ? 's' : ''} awaiting approval
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-orange-600">{pendingPayments.length}</p>
          <p className="text-sm text-slate-600 dark:text-slate-400">{formatCurrency(totalPendingAmount)}</p>
        </div>
      </div>

      <div className="space-y-3 mb-4">
        {pendingPayments.slice(0, 3).map(({ transporter, transaction }) => (
          <div key={transaction.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                <MapPin size={14} className="text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{transporter.name}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {transaction.description} • {formatDate(transaction.created_at)}
                </p>
              </div>
            </div>
            <p className="text-sm font-semibold text-orange-600">{formatCurrency(transaction.amount)}</p>
          </div>
        ))}
        {pendingPayments.length > 3 && (
          <p className="text-sm text-slate-600 dark:text-slate-400 text-center">
            +{pendingPayments.length - 3} more pending payment{pendingPayments.length - 3 !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      <Link to="/transport/pending">
        <Button variant="secondary" size="sm" icon={<ArrowRight size={16} />} className="w-full">
          Review Pending Payments
        </Button>
      </Link>
    </Card>
  );
};

export default PendingPaymentsCard;
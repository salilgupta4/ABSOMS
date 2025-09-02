import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, MapPin, ArrowLeft } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { TransportTransaction, Transporter, UserRole } from '@/types';
import { transportService } from '@/services/transportService';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const PendingPaymentsList: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendingPayments, setPendingPayments] = useState<Array<{ transporter: Transporter; transaction: TransportTransaction }>>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === UserRole.Admin;

  useEffect(() => {
    if (isAdmin) {
      loadPendingPayments();
    } else {
      navigate('/transport/list');
    }
  }, [isAdmin, navigate]);

  const loadPendingPayments = async () => {
    try {
      setLoading(true);
      const data = await transportService.getPendingPayments();
      setPendingPayments(data);
    } catch (error) {
      console.error('Error loading pending payments:', error);
      alert('Failed to load pending payments');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (transporterId: string, transactionId: string) => {
    try {
      await transportService.approveTransaction(transporterId, transactionId, user!.id);
      await loadPendingPayments();
      alert('Payment approved successfully!');
    } catch (error) {
      console.error('Error approving payment:', error);
      alert('Failed to approve payment');
    }
  };

  const handleReject = async (transporterId: string, transactionId: string) => {
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;

    try {
      await transportService.rejectTransaction(transporterId, transactionId, user!.id, reason);
      await loadPendingPayments();
      alert('Payment rejected successfully!');
    } catch (error) {
      console.error('Error rejecting payment:', error);
      alert('Failed to reject payment');
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const totalPendingAmount = pendingPayments.reduce((sum, item) => sum + item.transaction.amount, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button
            variant="secondary"
            size="sm"
            icon={<ArrowLeft size={16} />}
            onClick={() => navigate('/transport/list')}
            className="mr-4"
          >
            Back
          </Button>
          <div>
            <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-200">
              Pending Transport Payments
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              {pendingPayments.length} payment{pendingPayments.length !== 1 ? 's' : ''} awaiting approval • Total: {formatCurrency(totalPendingAmount)}
            </p>
          </div>
        </div>
      </div>

      {pendingPayments.length === 0 ? (
        <Card className="text-center py-12">
          <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200 mb-2">All caught up!</h3>
          <p className="text-slate-600 dark:text-slate-400">No transport payments pending approval</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {pendingPayments.map(({ transporter, transaction }) => (
            <Card key={transaction.id} className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                    <MapPin size={20} className="text-orange-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                        {transporter.name}
                      </h4>
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        ({transporter.vehicleNumber})
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      {transaction.description}
                    </p>
                    <div className="flex items-center space-x-4 text-xs text-slate-500 dark:text-slate-400">
                      <span>Payment Date: {formatDate(transaction.date)}</span>
                      <span>Requested: {formatDateTime(transaction.created_at)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-2xl font-bold text-orange-600">
                      {formatCurrency(transaction.amount)}
                    </p>
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                      <Clock size={12} className="mr-1" />
                      Pending Approval
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<CheckCircle size={16} />}
                      onClick={() => handleApprove(transporter.id, transaction.id)}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<XCircle size={16} />}
                      onClick={() => handleReject(transporter.id, transaction.id)}
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PendingPaymentsList;
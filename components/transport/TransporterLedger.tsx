import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, TrendingUp, TrendingDown, DollarSign, Download, FileText, Filter, Edit, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { Transporter, TransportTransaction, UserRole } from '@/types';
import { transportService } from '@/services/transportService';
import TransactionModal from './TransactionModal';
import { useAuth } from '@/contexts/AuthContext';

const TransporterLedger: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [transporter, setTransporter] = useState<Transporter | null>(null);
  const [transactions, setTransactions] = useState<TransportTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<TransportTransaction[]>([]);
  const [balance, setBalance] = useState({ totalCosts: 0, totalPayments: 0, balance: 0 });
  const [openingBalance, setOpeningBalance] = useState(0);
  const [closingBalance, setClosingBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editTransaction, setEditTransaction] = useState<TransportTransaction | undefined>(undefined);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    type: 'all' as 'all' | 'cost' | 'payment',
    status: 'all' as 'all' | 'pending' | 'approved' | 'rejected'
  });
  const [showFilters, setShowFilters] = useState(false);

  const isAdmin = user?.role === UserRole.Admin;

  useEffect(() => {
    if (id) {
      loadData(id);
    }
  }, [id]);

  useEffect(() => {
    applyFilters();
  }, [transactions, filters]);

  const loadData = async (transporterId: string) => {
    try {
      setLoading(true);
      const [transporterData, transactionsData, balanceData] = await Promise.all([
        transportService.getTransporter(transporterId),
        transportService.getTransporterTransactions(transporterId),
        transportService.getTransporterBalance(transporterId)
      ]);
      
      setTransporter(transporterData);
      setTransactions(transactionsData);
      setBalance(balanceData);
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Failed to load transporter data');
    } finally {
      setLoading(false);
    }
  };

  const calculateOpeningBalance = () => {
    if (!filters.dateFrom) return 0;
    
    // Get all approved transactions before the filter date
    const transactionsBeforeFilter = transactions.filter(t => 
      t.status === 'approved' && new Date(t.date) < new Date(filters.dateFrom)
    );
    
    const costsBeforeFilter = transactionsBeforeFilter
      .filter(t => t.type === 'cost')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const paymentsBeforeFilter = transactionsBeforeFilter
      .filter(t => t.type === 'payment')
      .reduce((sum, t) => sum + t.amount, 0);
    
    return costsBeforeFilter - paymentsBeforeFilter;
  };

  const applyFilters = () => {
    let filtered = [...transactions];
    
    // Calculate opening balance first
    const opening = calculateOpeningBalance();
    setOpeningBalance(opening);
    
    if (filters.dateFrom) {
      filtered = filtered.filter(t => new Date(t.date) >= new Date(filters.dateFrom));
    }
    
    if (filters.dateTo) {
      filtered = filtered.filter(t => new Date(t.date) <= new Date(filters.dateTo));
    }
    
    if (filters.type !== 'all') {
      filtered = filtered.filter(t => t.type === filters.type);
    }
    
    if (filters.status !== 'all') {
      filtered = filtered.filter(t => t.status === filters.status);
    }
    
    // Calculate closing balance
    const approvedFiltered = filtered.filter(t => t.status === 'approved');
    const filteredCosts = approvedFiltered
      .filter(t => t.type === 'cost')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const filteredPayments = approvedFiltered
      .filter(t => t.type === 'payment')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const closing = opening + filteredCosts - filteredPayments;
    setClosingBalance(closing);
    
    setFilteredTransactions(filtered);
  };

  const handleTransactionAdded = () => {
    if (id) {
      loadData(id);
    }
    setEditTransaction(undefined);
  };

  const handleEditTransaction = (transaction: TransportTransaction) => {
    setEditTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditTransaction(undefined);
  };

  const handleApproveTransaction = async (transactionId: string) => {
    if (!id || !isAdmin) return;
    
    try {
      await transportService.approveTransaction(id, transactionId, user!.id);
      await loadData(id);
      alert('Transaction approved successfully!');
    } catch (error) {
      console.error('Error approving transaction:', error);
      alert('Failed to approve transaction');
    }
  };

  const handleRejectTransaction = async (transactionId: string) => {
    if (!id || !isAdmin) return;
    
    const reason = prompt('Please provide a reason for rejection:');
    if (!reason) return;
    
    try {
      await transportService.rejectTransaction(id, transactionId, user!.id, reason);
      await loadData(id);
      alert('Transaction rejected successfully!');
    } catch (error) {
      console.error('Error rejecting transaction:', error);
      alert('Failed to reject transaction');
    }
  };

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!id) return;
    
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    
    try {
      await transportService.deleteTransportTransaction(id, transactionId);
      await loadData(id);
      alert('Transaction deleted successfully!');
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Failed to delete transaction');
    }
  };

  const formatCurrencyForCSV = (amount: number) => {
    // Format without commas for CSV to avoid delimiter conflicts
    return amount.toFixed(2);
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Description', 'Debit', 'Credit', 'Balance', 'Status'];
    const rows = [];
    
    // Add header
    rows.push(headers.join(','));
    
    // Add opening balance if date filter is applied
    if (filters.dateFrom) {
      rows.push([
        filters.dateFrom,
        'Opening Balance',
        '"Balance Brought Forward"',
        openingBalance > 0 ? formatCurrencyForCSV(openingBalance) : '',
        openingBalance < 0 ? formatCurrencyForCSV(Math.abs(openingBalance)) : '',
        formatCurrencyForCSV(Math.abs(openingBalance)),
        'Balance'
      ].join(','));
    }
    
    // Add transactions with running balance
    let runningBalance = openingBalance;
    filteredTransactions.forEach(t => {
      if (t.status === 'approved') {
        if (t.type === 'cost') {
          runningBalance += t.amount;
        } else {
          runningBalance -= t.amount;
        }
      }
      
      rows.push([
        formatDate(t.date),
        t.type === 'cost' ? 'Transport Cost' : 'Payment Made',
        `"${t.description.replace(/"/g, '""')}"`,
        t.type === 'cost' ? formatCurrencyForCSV(t.amount) : '',
        t.type === 'payment' ? formatCurrencyForCSV(t.amount) : '',
        formatCurrencyForCSV(Math.abs(runningBalance)),
        t.status ? (t.status.charAt(0).toUpperCase() + t.status.slice(1)) : 'Unknown'
      ].join(','));
    });
    
    // Add closing balance if date filter is applied
    if (filters.dateFrom) {
      rows.push([
        filters.dateTo || formatDate(new Date().toISOString()),
        'Closing Balance',
        '"Balance Carried Forward"',
        closingBalance > 0 ? formatCurrencyForCSV(closingBalance) : '',
        closingBalance < 0 ? formatCurrencyForCSV(Math.abs(closingBalance)) : '',
        formatCurrencyForCSV(Math.abs(closingBalance)),
        'Balance'
      ].join(','));
    }
    
    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const dateRange = filters.dateFrom ? `_${filters.dateFrom}_to_${filters.dateTo || 'current'}` : '';
    link.download = `${transporter?.name}_ledger${dateRange}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToPDF = async () => {
    const dateRange = filters.dateFrom 
      ? ` (${formatDate(filters.dateFrom)} to ${filters.dateTo ? formatDate(filters.dateTo) : 'Current'})` 
      : '';
    
    let tableRows = [];
    
    // Add opening balance if date filter is applied
    if (filters.dateFrom) {
      tableRows.push(`
        <tr style="background-color: #f9f9f9; font-weight: bold;">
          <td>${formatDate(filters.dateFrom)}</td>
          <td>Opening Balance</td>
          <td>${openingBalance > 0 ? formatCurrency(openingBalance) : ''}</td>
          <td>${openingBalance < 0 ? formatCurrency(Math.abs(openingBalance)) : ''}</td>
          <td style="text-align: right;">${formatCurrency(Math.abs(openingBalance))}</td>
          <td>Balance</td>
        </tr>
      `);
    }
    
    // Add transactions with running balance
    let pdfRunningBalance = openingBalance;
    tableRows = tableRows.concat(filteredTransactions.map(t => {
      if (t.status === 'approved') {
        if (t.type === 'cost') {
          pdfRunningBalance += t.amount;
        } else {
          pdfRunningBalance -= t.amount;
        }
      }
      
      return `
        <tr>
          <td>${formatDate(t.date)}</td>
          <td>${t.description}</td>
          <td style="text-align: right;">${t.type === 'cost' ? formatCurrency(t.amount) : ''}</td>
          <td style="text-align: right;">${t.type === 'payment' ? formatCurrency(t.amount) : ''}</td>
          <td style="text-align: right;">${formatCurrency(Math.abs(pdfRunningBalance))}</td>
          <td>${t.status ? (t.status.charAt(0).toUpperCase() + t.status.slice(1)) : 'Unknown'}</td>
        </tr>
      `;
    }));
    
    // Add closing balance if date filter is applied
    if (filters.dateFrom) {
      tableRows.push(`
        <tr style="background-color: #f9f9f9; font-weight: bold; border-top: 2px solid #333;">
          <td>${filters.dateTo ? formatDate(filters.dateTo) : formatDate(new Date().toISOString())}</td>
          <td>Closing Balance</td>
          <td>${closingBalance > 0 ? formatCurrency(closingBalance) : ''}</td>
          <td>${closingBalance < 0 ? formatCurrency(Math.abs(closingBalance)) : ''}</td>
          <td style="text-align: right;">${formatCurrency(Math.abs(closingBalance))}</td>
          <td>Balance</td>
        </tr>
      `);
    }
    
    const printContent = document.createElement('div');
    printContent.innerHTML = `
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
        th { background-color: #f2f2f2; font-weight: bold; }
        .header { text-align: center; margin-bottom: 10px; }
        .header h2 { margin: 5px 0; font-size: 18px; }
        .header p { margin: 3px 0; font-size: 12px; }
        .debit { text-align: right; }
        .credit { text-align: right; }
        .balance-row { background-color: #f9f9f9; font-weight: bold; }
      </style>
      <div class="header">
        <h2>${transporter?.name} - Transport Ledger</h2>
        <p>Vehicle: ${transporter?.vehicleNumber} | Phone: ${transporter?.phone}</p>
        <p>Period: ${dateRange || 'All Transactions'}</p>
        <p>Generated on: ${new Date().toLocaleDateString('en-IN')}</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Description</th>
            <th class="debit">Debit</th>
            <th class="credit">Credit</th>
            <th class="debit">Balance</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows.join('')}
        </tbody>
      </table>
    `;
    
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(printContent.innerHTML);
      newWindow.document.close();
      newWindow.print();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!transporter || !id) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-slate-800 dark:text-slate-200">Transporter not found</h3>
        <Button onClick={() => navigate('/transport/list')} className="mt-4">
          Back to Transport List
        </Button>
      </div>
    );
  }

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
              {transporter.name} - Ledger
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Vehicle: {transporter.vehicleNumber} • Phone: {transporter.phone}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="secondary"
            icon={<Filter size={16} />}
            onClick={() => setShowFilters(!showFilters)}
          >
            Filters
          </Button>
          <Button 
            variant="secondary"
            icon={<Download size={16} />}
            onClick={exportToCSV}
          >
            CSV
          </Button>
          <Button 
            variant="secondary"
            icon={<FileText size={16} />}
            onClick={exportToPDF}
          >
            PDF
          </Button>
          <Button 
            icon={<Plus size={16} />}
            onClick={() => setIsModalOpen(true)}
          >
            Add Transaction
          </Button>
        </div>
      </div>

      {showFilters && (
        <Card className="p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">From Date</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">To Date</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Type</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({...filters, type: e.target.value as any})}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-slate-100"
              >
                <option value="all">All Types</option>
                <option value="cost">Transport Costs</option>
                <option value="payment">Payments</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value as any})}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md dark:bg-slate-700 dark:text-slate-100"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </Card>
      )}

      {/* Balance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mr-3">
              <TrendingUp size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Costs</p>
              <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                {formatCurrency(balance.totalCosts)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mr-3">
              <TrendingDown size={20} className="text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Total Payments</p>
              <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                {formatCurrency(balance.totalPayments)}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
              balance.balance > 0 
                ? 'bg-orange-100 dark:bg-orange-900/30' 
                : balance.balance < 0 
                ? 'bg-green-100 dark:bg-green-900/30' 
                : 'bg-slate-100 dark:bg-slate-700'
            }`}>
              <DollarSign size={20} className={
                balance.balance > 0 
                  ? 'text-orange-600' 
                  : balance.balance < 0 
                  ? 'text-green-600' 
                  : 'text-slate-600'
              } />
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Balance</p>
              <p className={`text-lg font-semibold ${
                balance.balance > 0 
                  ? 'text-orange-600' 
                  : balance.balance < 0 
                  ? 'text-green-600' 
                  : 'text-slate-800 dark:text-slate-200'
              }`}>
                {formatCurrency(Math.abs(balance.balance))}
                {balance.balance > 0 && ' (We owe)'}
                {balance.balance < 0 && ' (They owe)'}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mr-3">
              <span className="text-blue-600 font-semibold">#</span>
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Transactions</p>
              <p className="text-lg font-semibold text-slate-800 dark:text-slate-200">
                {transactions.length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Transaction History */}
      <Card>
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h4 className="text-lg font-medium text-slate-800 dark:text-slate-200">Transaction History</h4>
        </div>
        
        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-600 dark:text-slate-400 mb-4">No transactions found</p>
            <Button onClick={() => setIsModalOpen(true)}>Add First Transaction</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-slate-700 dark:text-slate-300">Description</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-700 dark:text-slate-300">Debit (Costs)</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-700 dark:text-slate-300">Credit (Payments)</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-slate-700 dark:text-slate-300">Balance</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-slate-700 dark:text-slate-300">Status</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-slate-700 dark:text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-600">
                {/* Opening Balance Row */}
                {filters.dateFrom && (
                  <tr className="bg-slate-50 dark:bg-slate-700 font-semibold">
                    <td className="px-4 py-3 text-sm text-slate-800 dark:text-slate-200">
                      {formatDate(filters.dateFrom)}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          Opening Balance
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Balance Brought Forward
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {openingBalance > 0 ? (
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {formatCurrency(openingBalance)}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {openingBalance < 0 ? (
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {formatCurrency(Math.abs(openingBalance))}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {formatCurrency(Math.abs(openingBalance))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                        Balance
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-slate-400 text-xs">-</span>
                    </td>
                  </tr>
                )}
                
                {/* Transaction Rows */}
                {filteredTransactions.map((transaction, index) => {
                  // Calculate running balance
                  let runningBalance = openingBalance;
                  for (let i = 0; i <= index; i++) {
                    const t = filteredTransactions[i];
                    if (t.status === 'approved') {
                      if (t.type === 'cost') {
                        runningBalance += t.amount;
                      } else {
                        runningBalance -= t.amount;
                      }
                    }
                  }
                  
                  return (
                    <tr key={transaction.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                    <td className="px-4 py-3 text-sm text-slate-800 dark:text-slate-200">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                          {transaction.description}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {transaction.type === 'cost' ? 'Transport Cost' : 'Payment Made'}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {transaction.type === 'cost' ? (
                        <span className="font-semibold text-red-600">
                          {formatCurrency(transaction.amount)}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {transaction.type === 'payment' ? (
                        <span className="font-semibold text-green-600">
                          {formatCurrency(transaction.amount)}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <span className={`font-medium ${
                        runningBalance > 0 ? 'text-red-600' : runningBalance < 0 ? 'text-green-600' : 'text-slate-600'
                      }`}>
                        {formatCurrency(Math.abs(runningBalance))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        transaction.status === 'approved' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : transaction.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}>
                        {transaction.status === 'approved' && <CheckCircle size={12} className="mr-1" />}
                        {transaction.status === 'pending' && <Clock size={12} className="mr-1" />}
                        {transaction.status === 'rejected' && <XCircle size={12} className="mr-1" />}
                        {transaction.status ? (transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)) : 'Unknown'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center space-x-1">
                        {transaction.status === 'pending' && isAdmin && (
                          <>
                            <button
                              onClick={() => handleApproveTransaction(transaction.id)}
                              className="p-1 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/30 rounded"
                              title="Approve"
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button
                              onClick={() => handleRejectTransaction(transaction.id)}
                              className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                              title="Reject"
                            >
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleEditTransaction(transaction)}
                          className="p-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteTransaction(transaction.id)}
                          className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
                
                {/* Closing Balance Row */}
                {filters.dateFrom && (
                  <tr className="bg-slate-50 dark:bg-slate-700 font-semibold border-t-2 border-slate-300 dark:border-slate-600">
                    <td className="px-4 py-3 text-sm text-slate-800 dark:text-slate-200">
                      {filters.dateTo ? formatDate(filters.dateTo) : formatDate(new Date().toISOString())}
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                          Closing Balance
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Balance Carried Forward
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {closingBalance > 0 ? (
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {formatCurrency(closingBalance)}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      {closingBalance < 0 ? (
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {formatCurrency(Math.abs(closingBalance))}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {formatCurrency(Math.abs(closingBalance))}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                        Balance
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-slate-400 text-xs">-</span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        transporterId={id}
        onTransactionAdded={handleTransactionAdded}
        editTransaction={editTransaction}
      />
    </div>
  );
};

export default TransporterLedger;
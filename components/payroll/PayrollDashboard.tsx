import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Card from '@/components/ui/Card';
import { Loader, Users, BadgeIndianRupee, Clock } from 'lucide-react';
import { getPayrollRecords, getYearlyPayrollRecords, getAdvancePayments } from '@/services/payrollService';
import { PayrollRecord, AdvancePayment } from '@/types';
import { Link } from 'react-router-dom';
import Modal from '@/components/ui/Modal';

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; color: string; loading: boolean, to?: string, onClick?: () => void }> = React.memo(({ title, value, icon, color, loading, to, onClick }) => {
    const content = (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-md flex items-center transition-all duration-300 hover:shadow-lg hover:-translate-y-1 h-full cursor-pointer">
            <div className={`p-3 rounded-lg ${color}`}>
                {icon}
            </div>
            <div className="ml-3 overflow-hidden">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">{title}</p>
                {loading ? <Loader size={24} className="animate-spin mt-1" /> : <p className="text-2xl lg:text-3xl font-bold text-slate-800 dark:text-slate-100 truncate">{value}</p>}
            </div>
        </div>
    );
    return to ? <Link to={to}>{content}</Link> : <button onClick={onClick} className="w-full text-left">{content}</button>;
});

const BarChart: React.FC<{ data: { label: string, value: number }[], color: string }> = React.memo(({ data, color }) => {
    const maxValue = Math.max(...data.map(d => d.value), 1);
    return (
        <div className="flex justify-around items-end h-40 p-2 bg-slate-50 dark:bg-slate-800 rounded">
            {data.map(item => (
                <div key={item.label} className="flex flex-col items-center w-1/4">
                    <div className="h-full flex items-end w-full justify-center">
                        <div className="w-1/2 rounded-t" style={{ height: `${(item.value / maxValue) * 100}%`, backgroundColor: color }}></div>
                    </div>
                    <span className="text-xs mt-1">{item.label}</span>
                </div>
            ))}
        </div>
    );
});


const PayrollDashboard: React.FC = React.memo(() => {
    const [loading, setLoading] = useState(true);
    const [allRecords, setAllRecords] = useState<PayrollRecord[]>([]);
    const [allAdvances, setAllAdvances] = useState<AdvancePayment[]>([]);
    const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 7));

    const [isOvertimeModalOpen, setIsOvertimeModalOpen] = useState(false);
    const [isDeductionsModalOpen, setIsDeductionsModalOpen] = useState(false);

    // Memoize fetch function with optimized data fetching
    const fetchDashboardData = useCallback(async () => {
        setLoading(true);
        try {
            const recordsPromise = viewMode === 'monthly'
                ? getPayrollRecords(selectedDate)
                : getYearlyPayrollRecords(selectedDate.slice(0, 4));
            
            const recordsData = await recordsPromise;
            setAllRecords(recordsData);
            
            // Only fetch advances for employees who have payroll records (more efficient)
            const employeeIds = [...new Set(recordsData.map(r => r.employee_id))];
            const advancesData = employeeIds.length > 0 ? await getAdvancePayments(employeeIds) : [];
            setAllAdvances(advancesData);
        } catch (error) {
            console.error("Failed to load payroll dashboard data:", error);
        } finally {
            setLoading(false);
        }
    }, [selectedDate, viewMode]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);

    const dashboardData = useMemo(() => {
        const roundToNearestTen = (num: number) => Math.round(num / 10) * 10;
        const formatCurrency = (value: number) => `₹${roundToNearestTen(value).toLocaleString('en-IN')}`;

        // Early return if no data to avoid unnecessary computation
        if (allRecords.length === 0) {
            return { 
                stats: {
                    totalRecords: 0,
                    totalGross: 0,
                    totalDeductions: 0,
                    totalNet: 0,
                    totalOvertimeAmount: 0,
                    totalOtHours: 0
                }, 
                overtimeByCategory: {}, 
                deductionsByMonth: {}, 
                highestAdvanceGiven: 0, 
                highestDeductionMade: 0, 
                formatCurrency 
            };
        }

        // Use single reduce for better performance
        const aggregatedData = allRecords.reduce((acc, r) => {
            acc.totalGross += r.gross_pay || 0;
            acc.totalDeductions += r.total_deductions || 0;
            acc.totalNet += r.net_pay || 0;
            acc.totalOvertimeAmount += r.overtime || 0;
            acc.totalOtHours += r.overtime_hours || 0;
            acc.highestDeductionMade = Math.max(acc.highestDeductionMade, r.advance_deduction || 0);
            
            // Overtime by category
            if (r.category && r.overtime > 0) {
                acc.overtimeByCategory[r.category] = (acc.overtimeByCategory[r.category] || 0) + r.overtime;
            }
            
            // Deductions by month
            if (r.payroll_month && r.total_deductions > 0) {
                const month = new Date(r.payroll_month + '-02').toLocaleString('default', { month: 'short' });
                acc.deductionsByMonth[month] = (acc.deductionsByMonth[month] || 0) + r.total_deductions;
            }
            
            return acc;
        }, {
            totalGross: 0,
            totalDeductions: 0,
            totalNet: 0,
            totalOvertimeAmount: 0,
            totalOtHours: 0,
            highestDeductionMade: 0,
            overtimeByCategory: {} as Record<string, number>,
            deductionsByMonth: {} as Record<string, number>
        });

        const stats = {
            totalRecords: allRecords.length,
            totalGross: roundToNearestTen(aggregatedData.totalGross),
            totalDeductions: roundToNearestTen(aggregatedData.totalDeductions),
            totalNet: roundToNearestTen(aggregatedData.totalNet),
            totalOvertimeAmount: roundToNearestTen(aggregatedData.totalOvertimeAmount),
            totalOtHours: Math.round(aggregatedData.totalOtHours)
        };

        const highestAdvanceGiven = allAdvances.length > 0 
            ? Math.max(...allAdvances.map(adv => adv.amount || 0)) 
            : 0;

        return { 
            stats, 
            overtimeByCategory: aggregatedData.overtimeByCategory, 
            deductionsByMonth: aggregatedData.deductionsByMonth, 
            highestAdvanceGiven: roundToNearestTen(highestAdvanceGiven), 
            highestDeductionMade: roundToNearestTen(aggregatedData.highestDeductionMade), 
            formatCurrency 
        };
    }, [allRecords, allAdvances]);

    // Memoize modal handlers
    const handleOvertimeModalToggle = useCallback(() => {
        setIsOvertimeModalOpen(prev => !prev);
    }, []);

    const handleDeductionsModalToggle = useCallback(() => {
        setIsDeductionsModalOpen(prev => !prev);
    }, []);

    const currentYear = new Date().getFullYear();
    const months = [
        { short: 'JAN', full: 'January', value: '01' },
        { short: 'FEB', full: 'February', value: '02' },
        { short: 'MAR', full: 'March', value: '03' },
        { short: 'APR', full: 'April', value: '04' },
        { short: 'MAY', full: 'May', value: '05' },
        { short: 'JUN', full: 'June', value: '06' },
        { short: 'JUL', full: 'July', value: '07' },
        { short: 'AUG', full: 'August', value: '08' },
        { short: 'SEP', full: 'September', value: '09' },
        { short: 'OCT', full: 'October', value: '10' },
        { short: 'NOV', full: 'November', value: '11' },
        { short: 'DEC', full: 'December', value: '12' }
    ];

    const handleMonthSelect = useCallback((monthValue: string) => {
        const year = selectedDate.slice(0, 4);
        setSelectedDate(`${year}-${monthValue}`);
        setViewMode('monthly');
    }, [selectedDate]);

    return (
        <div className="space-y-6">
            <Card>
                <div className="space-y-4">
                    <div className="flex items-center space-x-4">
                        <label className="font-medium">View Mode:</label>
                        <select value={viewMode} onChange={e => setViewMode(e.target.value as any)} className="p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-slate-100">
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                        </select>
                        <input type={viewMode} value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-slate-100" />
                    </div>
                    
                    {viewMode === 'monthly' && (
                        <div className="space-y-2">
                            <label className="font-medium text-sm">Quick Month Selection:</label>
                            <div className="grid grid-cols-6 sm:grid-cols-12 gap-2">
                                {months.map(month => {
                                    const monthDate = `${currentYear}-${month.value}`;
                                    const isSelected = selectedDate === monthDate;
                                    return (
                                        <button
                                            key={month.short}
                                            onClick={() => handleMonthSelect(month.value)}
                                            className={`px-3 py-2 text-xs font-medium rounded transition-all duration-200 ${
                                                isSelected 
                                                    ? 'bg-blue-500 text-white shadow-md' 
                                                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
                                            }`}
                                            title={`${month.full} ${currentYear}`}
                                        >
                                            {month.short}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                <StatCard title="Total Records" to="/payroll/reports" value={String(dashboardData.stats.totalRecords)} icon={<Users className="text-blue-500" />} color="bg-blue-100 dark:bg-blue-900/30" loading={loading} />
                <StatCard title="Total Gross Pay" to="/payroll/reports" value={dashboardData.formatCurrency(dashboardData.stats.totalGross)} icon={<BadgeIndianRupee className="text-green-500" />} color="bg-green-100 dark:bg-green-900/30" loading={loading} />
                <StatCard title="Total Deductions" onClick={handleDeductionsModalToggle} value={dashboardData.formatCurrency(dashboardData.stats.totalDeductions)} icon={<BadgeIndianRupee className="text-amber-500" />} color="bg-amber-100 dark:bg-amber-900/30" loading={loading} />
                <StatCard title="Total Net Pay" to="/payroll/reports" value={dashboardData.formatCurrency(dashboardData.stats.totalNet)} icon={<BadgeIndianRupee className="text-purple-500" />} color="bg-purple-100 dark:bg-purple-900/30" loading={loading} />
                <StatCard title="Total Overtime" onClick={handleOvertimeModalToggle} value={dashboardData.formatCurrency(dashboardData.stats.totalOvertimeAmount)} icon={<Clock className="text-cyan-500" />} color="bg-cyan-100 dark:bg-cyan-900/30" loading={loading} />
                <StatCard title="OT Hours" onClick={handleOvertimeModalToggle} value={`${dashboardData.stats.totalOtHours} hrs`} icon={<Clock className="text-red-500" />} color="bg-red-100 dark:bg-red-900/30" loading={loading} />
            </div>

             <Modal isOpen={isOvertimeModalOpen} onClose={handleOvertimeModalToggle} title="Overtime Insights">
                <div className="p-6">
                    <h3 className="font-semibold mb-2">Overtime Cost by Category</h3>
                    <BarChart data={Object.entries(dashboardData.overtimeByCategory).map(([label, value]) => ({ label, value }))} color="#06b6d4" />
                    <ul className="text-sm mt-4">
                        {Object.entries(dashboardData.overtimeByCategory).map(([cat, val]) => <li key={cat}>{cat}: <strong>{dashboardData.formatCurrency(val)}</strong></li>)}
                    </ul>
                </div>
            </Modal>
             <Modal isOpen={isDeductionsModalOpen} onClose={handleDeductionsModalToggle} title="Deductions Insights">
                <div className="p-6">
                    <h3 className="font-semibold mb-2">Deductions Trend</h3>
                    <BarChart data={Object.entries(dashboardData.deductionsByMonth).map(([label, value]) => ({ label, value }))} color="#f59e0b" />
                     <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
                        <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded">
                            <p className="font-semibold">Highest Advance Given (All Time)</p>
                            <p className="text-xl font-bold">{dashboardData.formatCurrency(dashboardData.highestAdvanceGiven)}</p>
                        </div>
                        <div className="p-3 bg-slate-100 dark:bg-slate-700 rounded">
                            <p className="font-semibold">Highest Deduction Made (Period)</p>
                            <p className="text-xl font-bold">{dashboardData.formatCurrency(dashboardData.highestDeductionMade)}</p>
                        </div>
                    </div>
                </div>
            </Modal>
        </div>
    );
});

export default PayrollDashboard;

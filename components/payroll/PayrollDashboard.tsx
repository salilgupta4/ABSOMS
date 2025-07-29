import React, { useState, useEffect, useMemo } from 'react';
import Card from '@/components/ui/Card';
import { Loader, Users, BadgeIndianRupee, Clock } from 'lucide-react';
import { getPayrollRecords, getYearlyPayrollRecords, getAdvancePayments } from '@/services/payrollService';
import { PayrollRecord, AdvancePayment } from '@/types';
import { Link } from 'react-router-dom';
import Modal from '@/components/ui/Modal';

const StatCard: React.FC<{ title: string; value: string; icon: React.ReactNode; color: string; loading: boolean, to?: string, onClick?: () => void }> = ({ title, value, icon, color, loading, to, onClick }) => {
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
};

const BarChart: React.FC<{ data: { label: string, value: number }[], color: string }> = ({ data, color }) => {
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
};


const PayrollDashboard: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [allRecords, setAllRecords] = useState<PayrollRecord[]>([]);
    const [allAdvances, setAllAdvances] = useState<AdvancePayment[]>([]);
    const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 7));

    const [isOvertimeModalOpen, setIsOvertimeModalOpen] = useState(false);
    const [isDeductionsModalOpen, setIsDeductionsModalOpen] = useState(false);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                const recordsPromise = viewMode === 'monthly'
                    ? getPayrollRecords(selectedDate)
                    : getYearlyPayrollRecords(selectedDate.slice(0, 4));
                const [recordsData, advancesData] = await Promise.all([recordsPromise, getAdvancePayments()]);
                setAllRecords(recordsData);
                setAllAdvances(advancesData);
            } catch (error) {
                console.error("Failed to load payroll dashboard data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, [selectedDate, viewMode]);

    const dashboardData = useMemo(() => {
        const roundToNearestTen = (num: number) => Math.round(num / 10) * 10;
        const formatCurrency = (value: number) => `₹${roundToNearestTen(value).toLocaleString('en-IN')}`;

        const stats = {
            totalRecords: allRecords.length,
            totalGross: roundToNearestTen(allRecords.reduce((sum, r) => sum + r.gross_pay, 0)),
            totalDeductions: roundToNearestTen(allRecords.reduce((sum, r) => sum + r.total_deductions, 0)),
            totalNet: roundToNearestTen(allRecords.reduce((sum, r) => sum + r.net_pay, 0)),
            totalOvertimeAmount: roundToNearestTen(allRecords.reduce((sum, r) => sum + r.overtime, 0)),
            totalOtHours: Math.round(allRecords.reduce((sum, r) => sum + (r.overtime_hours || 0), 0))
        };
        
        const overtimeByCategory = allRecords.reduce((acc, r) => {
            acc[r.category] = (acc[r.category] || 0) + r.overtime;
            return acc;
        }, {} as Record<string, number>);

        const deductionsByMonth = allRecords.reduce((acc, r) => {
            const month = new Date(r.payroll_month + '-02').toLocaleString('default', { month: 'short' });
            acc[month] = (acc[month] || 0) + r.total_deductions;
            return acc;
        }, {} as Record<string, number>);

        const highestAdvanceGiven = allAdvances.reduce((max, adv) => Math.max(max, adv.amount), 0);
        const highestDeductionMade = allRecords.reduce((max, rec) => Math.max(max, rec.advance_deduction), 0);

        return { stats, overtimeByCategory, deductionsByMonth, highestAdvanceGiven, highestDeductionMade, formatCurrency };
    }, [allRecords, allAdvances]);

    return (
        <div className="space-y-6">
            <Card>
                <div className="flex items-center space-x-4">
                    <label className="font-medium">View Mode:</label>
                    <select value={viewMode} onChange={e => setViewMode(e.target.value as any)} className="p-2 border rounded bg-white dark:bg-slate-700">
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                    </select>
                    <input type={viewMode} value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="p-2 border rounded bg-white dark:bg-slate-700" />
                </div>
            </Card>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                <StatCard title="Total Records" to="/payroll/reports" value={String(dashboardData.stats.totalRecords)} icon={<Users className="text-blue-500" />} color="bg-blue-100 dark:bg-blue-900/30" loading={loading} />
                <StatCard title="Total Gross Pay" to="/payroll/reports" value={dashboardData.formatCurrency(dashboardData.stats.totalGross)} icon={<BadgeIndianRupee className="text-green-500" />} color="bg-green-100 dark:bg-green-900/30" loading={loading} />
                <StatCard title="Total Deductions" onClick={() => setIsDeductionsModalOpen(true)} value={dashboardData.formatCurrency(dashboardData.stats.totalDeductions)} icon={<BadgeIndianRupee className="text-amber-500" />} color="bg-amber-100 dark:bg-amber-900/30" loading={loading} />
                <StatCard title="Total Net Pay" to="/payroll/reports" value={dashboardData.formatCurrency(dashboardData.stats.totalNet)} icon={<BadgeIndianRupee className="text-purple-500" />} color="bg-purple-100 dark:bg-purple-900/30" loading={loading} />
                <StatCard title="Total Overtime" onClick={() => setIsOvertimeModalOpen(true)} value={dashboardData.formatCurrency(dashboardData.stats.totalOvertimeAmount)} icon={<Clock className="text-cyan-500" />} color="bg-cyan-100 dark:bg-cyan-900/30" loading={loading} />
                <StatCard title="OT Hours" onClick={() => setIsOvertimeModalOpen(true)} value={`${dashboardData.stats.totalOtHours} hrs`} icon={<Clock className="text-red-500" />} color="bg-red-100 dark:bg-red-900/30" loading={loading} />
            </div>

             <Modal isOpen={isOvertimeModalOpen} onClose={() => setIsOvertimeModalOpen(false)} title="Overtime Insights">
                <div className="p-6">
                    <h3 className="font-semibold mb-2">Overtime Cost by Category</h3>
                    <BarChart data={Object.entries(dashboardData.overtimeByCategory).map(([label, value]) => ({ label, value }))} color="#06b6d4" />
                    <ul className="text-sm mt-4">
                        {Object.entries(dashboardData.overtimeByCategory).map(([cat, val]) => <li key={cat}>{cat}: <strong>{dashboardData.formatCurrency(val)}</strong></li>)}
                    </ul>
                </div>
            </Modal>
             <Modal isOpen={isDeductionsModalOpen} onClose={() => setIsDeductionsModalOpen(false)} title="Deductions Insights">
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
};

export default PayrollDashboard;

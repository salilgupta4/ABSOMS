import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Eye, Loader, FileText } from 'lucide-react';
import { getPayrollRecords } from '@/services/payrollService';
import { PayrollRecord, PayrollSettings } from '@/types';
import PayslipExporter from './PayslipExporter';
import PayslipGenerator from './PayslipGenerator';
import { getPayrollSettings } from '@/services/payrollService';

const convertToCSV = (data: PayrollRecord[]): string => {
    const headers = Object.keys(data[0] || {}).join(',');
    const rows = data.map(row => 
        Object.values(row).map(value => {
            const stringValue = String(value).replace(/"/g, '""');
            return `"${stringValue}"`;
        }).join(',')
    );
    return [headers, ...rows].join('\n');
};


const PayrollReports: React.FC = () => {
    const [records, setRecords] = useState<PayrollRecord[]>([]);
    const [settings, setSettings] = useState<PayrollSettings | null>(null);
    const [loading, setLoading] = useState(false);
    const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));
    const [viewingRecord, setViewingRecord] = useState<PayrollRecord | null>(null);

    const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    const handleMonthClick = (monthIndex: number) => {
        const monthStr = String(monthIndex + 1).padStart(2, '0');
        setMonthFilter(`${currentYear}-${monthStr}`);
    };

    useEffect(() => {
        setLoading(true);
        Promise.all([
            getPayrollRecords(monthFilter),
            getPayrollSettings()
        ]).then(([recordsData, settingsData]) => {
            setRecords(recordsData);
            setSettings(settingsData);
        }).catch(() => alert("Failed to fetch reports."))
        .finally(() => setLoading(false));
    }, [monthFilter]);

    const handleExportCsv = () => {
        if (records.length === 0) return;
        const csvString = convertToCSV(records);
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `payroll-report-${monthFilter}.csv`;
        link.click();
    };


    return (
        <>
        <Card 
            title="Payroll Reports" 
            actions={
                <div className="flex items-center space-x-2">
                    <Button variant="secondary" onClick={handleExportCsv} disabled={records.length === 0} icon={<FileText size={16}/>}>Export as CSV</Button>
                    <PayslipExporter
                        payrollRecords={records}
                        selectedMonth={monthFilter}
                    />
                </div>
            }
        >
            <div className="p-4 border-b space-y-4">
                <div className="flex items-center space-x-4">
                    <label className="font-medium">Report for Month:</label>
                    <input type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} className="p-2 border rounded bg-white dark:bg-slate-700" />
                </div>
                <div className="flex flex-wrap gap-2">
                    <label className="font-medium mr-2">Quick Select:</label>
                    {months.map((month, index) => (
                        <button
                            key={month}
                            onClick={() => handleMonthClick(index)}
                            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                                parseInt(monthFilter.split('-')[1]) === index + 1 && parseInt(monthFilter.split('-')[0]) === currentYear
                                    ? 'bg-primary text-white'
                                    : index <= currentMonth
                                    ? 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                                    : 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                            }`}
                            disabled={index > currentMonth}
                        >
                            {month}
                        </button>
                    ))}
                </div>
            </div>
            {loading ? <div className="p-4 text-center"><Loader className="animate-spin" /></div> : records.length > 0 ? (
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 dark:bg-slate-700/50">
                            <tr>
                                <th className="p-2 text-left">Employee</th>
                                <th className="p-2 text-right">Gross Pay</th>
                                <th className="p-2 text-right">Deductions</th>
                                <th className="p-2 text-right">Net Pay</th>
                                <th className="p-2 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map(r => (
                                <tr key={r.id} className="border-t dark:border-slate-700">
                                    <td className="p-2">{r.employee_name} ({r.employee_code})</td>
                                    <td className="p-2 text-right">₹{r.gross_pay.toLocaleString()}</td>
                                    <td className="p-2 text-right text-red-500">₹{r.total_deductions.toLocaleString()}</td>
                                    <td className="p-2 text-right font-bold text-green-600">₹{r.net_pay.toLocaleString()}</td>
                                    <td className="p-2 text-center">
                                        <Button variant="secondary" size="sm" onClick={() => setViewingRecord(r)} icon={<Eye size={14} />}>
                                            View Payslip
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <p className="text-center p-8 text-slate-500">No payroll records found for this month.</p>
            )}
        </Card>
        {viewingRecord && settings && (
            <PayslipGenerator
                record={viewingRecord}
                settings={settings}
                visible={!!viewingRecord}
                onClose={() => setViewingRecord(null)}
            />
        )}
        </>
    );
};

export default PayrollReports;
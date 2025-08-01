import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Loader, PlayCircle, Settings, UserCheck, Trash2, RotateCcw } from 'lucide-react';
import { PayrollEmployee, EmployeeCategory, PayrollSettings, AdvancePayment, PayrollRecord } from '@/types';
import { getPayrollEmployees, getPayrollRecords, savePayrollRecords, getPayrollSettings, getAdvancePayments, deletePayrollRun, revertSinglePayrollRecord } from '@/services/payrollService';
import Modal from '@/components/ui/Modal';
import { useAuth } from '@/contexts/AuthContext';
import { canPerformAction } from '@/utils/permissions';

interface PayrollInputs {
    [employeeId: string]: {
        days_present: number;
        overtime_hours: number;
        overtime_days: number;
        advance_deduction: number;
        remittance_account_id: string;
    };
}

interface ProcessingSummary {
    success: boolean;
    message: string;
    details?: { name: string; netPay: number }[];
}


const RunPayroll: React.FC = React.memo(() => {
    const { user } = useAuth();
    const [employees, setEmployees] = useState<PayrollEmployee[]>([]);
    const [advances, setAdvances] = useState<AdvancePayment[]>([]);
    const [settings, setSettings] = useState<PayrollSettings | null>(null);
    const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
    
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    
    // Memoize permission checks to avoid recalculation on every render
    const permissions = useMemo(() => ({
        canCreate: canPerformAction(user, 'create'),
        canEdit: canPerformAction(user, 'edit'),
        canDelete: canPerformAction(user, 'delete')
    }), [user]);
    
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [payrollInputs, setPayrollInputs] = useState<PayrollInputs>({});
    const [selectedEmployees, setSelectedEmployees] = useState<Record<string, boolean>>({});
    const [processingSummary, setProcessingSummary] = useState<ProcessingSummary | null>(null);

    // Memoize fetchData to prevent recreation on every render
    const fetchData = useCallback(() => {
        setLoading(true);
        Promise.all([
            getPayrollEmployees(),
            getPayrollSettings(),
            getAdvancePayments(),
            getPayrollRecords(selectedMonth)
        ]).then(([empData, settingsData, advData, recordsData]) => {
            const activeEmployees = empData.filter(e => e.status === 'Active');
            setEmployees(activeEmployees);
            setSettings(settingsData);
            setAdvances(advData);
            setPayrollRecords(recordsData);
            
            const inputs: PayrollInputs = {};
            const activeAdvances = advData.filter(a => a.status === 'Active');

            activeEmployees.forEach(emp => {
                const empAdvance = activeAdvances.find(a => a.employee_id === emp.id);
                let suggestedDeduction = 0;
                
                if (empAdvance && settingsData) {
                    const estGross = emp.monthly_ctc;
                    const maxDeduction = estGross * 0.30; // 30% of CTC as a rough max
                    suggestedDeduction = Math.min(empAdvance.balance_amount, maxDeduction);
                }

                const defaultAccount = emp.bankAccounts?.find(a => a.isDefault) || emp.bankAccounts?.[0];

                inputs[emp.id] = { 
                    days_present: 30, 
                    overtime_hours: 0, 
                    overtime_days: 0, 
                    advance_deduction: Math.round(suggestedDeduction),
                    remittance_account_id: defaultAccount?.id || ''
                };
            });
            setPayrollInputs(inputs);
            
        }).catch(console.error).finally(() => setLoading(false));
    }, [selectedMonth]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    // Memoize input change handler to prevent child re-renders
    const handleInputChange = useCallback((employeeId: string, field: keyof PayrollInputs[string], value: number | string) => {
        setPayrollInputs(prev => ({ ...prev, [employeeId]: { ...prev[employeeId], [field]: value }}));
    }, []);

    // Memoize employee selection handler
    const handleEmployeeSelect = useCallback((employeeId: string, isSelected: boolean) => {
        setSelectedEmployees(prev => ({...prev, [employeeId]: isSelected}));
    }, []);
    
    const processedEmployeeIds = useMemo(() => new Set(payrollRecords.map(r => r.employee_id)), [payrollRecords]);
    
    // Memoize select all handler with expensive filtering operations
    const handleSelectAll = useCallback((category: EmployeeCategory) => {
        const categoryEmpIds = employees.filter(e => e.category === category && !processedEmployeeIds.has(e.id)).map(e => e.id);
        const allSelected = categoryEmpIds.every(id => selectedEmployees[id]);
        const newSelected: Record<string, boolean> = {...selectedEmployees};
        categoryEmpIds.forEach(id => newSelected[id] = !allSelected);
        setSelectedEmployees(newSelected);
    }, [employees, processedEmployeeIds, selectedEmployees]);
    
    // Memoize expensive salary calculation function
    const calculateSalary = useCallback((employee: PayrollEmployee, inputs: PayrollInputs[string]) => {
        if (!settings) return null;

        const { days_present, overtime_hours, overtime_days } = inputs;
        const monthlyCTC = employee.monthly_ctc;
        let basicPay = 0, overtimePay = 0;

        switch (employee.category) {
            case EmployeeCategory.InOffice:
                const absenceDays = 30 - days_present;
                const deductionDays = Math.max(0, absenceDays - 2);
                basicPay = (monthlyCTC * (30 - deductionDays)) / 30;
                break;
            case EmployeeCategory.Factory:
                const dailyRateF = monthlyCTC / 30;
                basicPay = dailyRateF * days_present;
                overtimePay = (dailyRateF / 8) * overtime_hours;
                break;
            case EmployeeCategory.OnSite:
                const dailyRateO = monthlyCTC / 30;
                basicPay = dailyRateO * days_present;
                overtimePay = dailyRateO * overtime_days;
                break;
        }
        
        const basic = (basicPay * settings.basic_pay_percentage) / 100;
        const hra = (basicPay * settings.hra_percentage) / 100;
        const special = (basicPay * settings.special_allowance_percentage) / 100;
        const gross = basic + hra + special + overtimePay;
        
        const pf = settings.pf_enabled ? (basic * settings.pf_percentage) / 100 : 0;
        const esi = settings.esi_enabled && gross <= 21000 ? (gross * settings.esi_percentage) / 100 : 0;
        const pt = settings.pt_enabled ? settings.pt_amount : 0;
        const tds = settings.tds_enabled ? (gross * settings.tds_percentage) / 100 : 0;
        
        return { basic, hra, special, overtime: overtimePay, gross, pf, esi, pt, tds };
    }, [settings]);
    
    // Memoize process handler
    const handleProcess = useCallback(async () => {
        setProcessing(true);
        const toProcess = Object.keys(selectedEmployees).filter(id => selectedEmployees[id]);
        if(toProcess.length === 0) {
            alert("No employees selected.");
            setProcessing(false);
            return;
        }
        
        const recordsToSave: Omit<PayrollRecord, 'id'>[] = [];
        
        for(const empId of toProcess) {
            const employee = employees.find(e => e.id === empId);
            const inputs = payrollInputs[empId];
            if(!employee || !inputs || !settings) continue;
            
            const calcs = calculateSalary(employee, inputs);
            if(!calcs) continue;

            const totalDeductions = calcs.pf + calcs.esi + calcs.pt + calcs.tds + (inputs.advance_deduction || 0);
            const netPay = calcs.gross - totalDeductions;
            
            const remittanceAccount = employee.bankAccounts?.find(a => a.id === inputs.remittance_account_id);

            const recordData: any = {
                employee_id: empId,
                employee_name: employee.name,
                employee_code: employee.employee_id,
                category: employee.category,
                payroll_month: selectedMonth,
                status: 'Processed',
                days_present: inputs.days_present || 0,
                overtime_hours: inputs.overtime_hours || 0,
                overtime_days: inputs.overtime_days || 0,
                basic_pay: calcs.basic,
                hra: calcs.hra,
                special_allowance: calcs.special,
                overtime: calcs.overtime,
                gross_pay: calcs.gross,
                pf: calcs.pf,
                esi: calcs.esi,
                pt: calcs.pt,
                tds: calcs.tds,
                advance_deduction: inputs.advance_deduction || 0,
                total_deductions: totalDeductions,
                net_pay: netPay,
                remittance_account: remittanceAccount || null,
            };

            const overtime_details = employee.category === EmployeeCategory.Factory ? `${inputs.overtime_hours || 0} hrs`
                         : employee.category === EmployeeCategory.OnSite ? `${inputs.overtime_days || 0} days`
                         : undefined;
            
            if (overtime_details !== undefined) {
                recordData.overtime_details = overtime_details;
            }
            
            recordsToSave.push(recordData);
        }
        
        try {
            await savePayrollRecords(recordsToSave);
            setProcessingSummary({
                success: true,
                message: `Successfully processed payroll for ${recordsToSave.length} employees.`,
                details: recordsToSave.map(r => ({ name: r.employee_name, netPay: r.net_pay }))
            });
            fetchData();
        } catch (error) {
            console.error(error);
             setProcessingSummary({
                success: false,
                message: `Failed to process payroll. Error: ${(error as Error).message}`
            });
        } finally {
            setProcessing(false);
        }
    }, [selectedEmployees, employees, payrollInputs, settings, calculateSalary, selectedMonth, fetchData]);

    // Memoize delete run handler
    const handleDeleteRun = useCallback(async () => {
        if(window.confirm(`Are you sure you want to delete the entire payroll run for ${selectedMonth}? This will also revert any advance deductions made. This action cannot be undone.`)){
            setProcessing(true);
            try {
                await deletePayrollRun(selectedMonth);
                alert("Payroll run deleted successfully.");
                fetchData();
            } catch (error) {
                alert("Failed to delete payroll run.");
                console.error(error);
            } finally {
                setProcessing(false);
            }
        }
    }, [selectedMonth, fetchData]);

    // Memoize revert record handler
    const handleRevertRecord = useCallback(async (recordId: string) => {
        if(window.confirm("Are you sure you want to revert this employee's payroll? This will delete the record and allow you to process it again.")){
             setProcessing(true);
            try {
                await revertSinglePayrollRecord(recordId);
                alert("Record reverted successfully.");
                fetchData();
            } catch (error) {
                alert("Failed to revert record.");
                console.error(error);
            } finally {
                setProcessing(false);
            }
        }
    }, [fetchData]);

    // Memoize expensive render function
    const renderEmployeeTable = useCallback((category: EmployeeCategory) => {
        const filteredEmployees = employees.filter(e => e.category === category && !processedEmployeeIds.has(e.id));
        if(filteredEmployees.length === 0) return <p className="text-slate-500 p-4 text-center">No pending employees in this category for {selectedMonth}.</p>;
        
        const allSelected = filteredEmployees.length > 0 && filteredEmployees.every(emp => selectedEmployees[emp.id]);
        
        return (
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="text-left bg-slate-100 dark:bg-slate-800">
                        <tr>
                            <th className="p-2 w-12"><input type="checkbox" checked={allSelected} onChange={() => handleSelectAll(category)} disabled={!permissions.canEdit} /></th>
                            <th className="p-2">Employee</th>
                            <th className="p-2">Days Present</th>
                            <th className="p-2">Overtime</th>
                            <th className="p-2">Advance Deduction</th>
                            <th className="p-2">Bank Account</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEmployees.map(emp => {
                            const empAdvance = advances.find(a => a.employee_id === emp.id && a.status === 'Active');
                            return (
                                <tr key={emp.id} className="border-b dark:border-slate-700">
                                    <td className="p-2"><input type="checkbox" checked={!!selectedEmployees[emp.id]} onChange={e => handleEmployeeSelect(emp.id, e.target.checked)} disabled={!permissions.canEdit} /></td>
                                    <td className="p-2 font-medium">{emp.name}</td>
                                    <td className="p-2"><input type="number" value={payrollInputs[emp.id]?.days_present} onChange={e => handleInputChange(emp.id, 'days_present', parseFloat(e.target.value) || 0)} className="w-20 p-1 bg-white dark:bg-slate-700 border rounded" disabled={!permissions.canEdit} /></td>
                                    <td className="p-2">
                                        {emp.category === 'Factory Worker' ? 
                                            <input type="number" value={payrollInputs[emp.id]?.overtime_hours} onChange={e => handleInputChange(emp.id, 'overtime_hours', parseFloat(e.target.value) || 0)} className="w-20 p-1 bg-white dark:bg-slate-700 border rounded" disabled={!permissions.canEdit} />
                                         : emp.category === 'On-site Personnel' ?
                                            <input type="number" value={payrollInputs[emp.id]?.overtime_days} onChange={e => handleInputChange(emp.id, 'overtime_days', parseFloat(e.target.value) || 0)} className="w-20 p-1 bg-white dark:bg-slate-700 border rounded" disabled={!permissions.canEdit} />
                                         : <input type="text" value="N/A" disabled className="w-20 p-1 text-center bg-slate-100 dark:bg-slate-800 border rounded" />
                                        }
                                    </td>
                                    <td className="p-2">
                                        <div className="flex items-center space-x-2">
                                            <input type="number" value={payrollInputs[emp.id]?.advance_deduction} onChange={e => handleInputChange(emp.id, 'advance_deduction', parseFloat(e.target.value) || 0)} className="w-24 p-1 bg-white dark:bg-slate-700 border rounded" disabled={!permissions.canEdit} />
                                            {empAdvance && (
                                                <span className="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                                    Bal: {empAdvance.balance_amount.toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-2">
                                         <select
                                            value={payrollInputs[emp.id]?.remittance_account_id}
                                            onChange={e => handleInputChange(emp.id, 'remittance_account_id', e.target.value)}
                                            className="p-1 border rounded bg-white dark:bg-slate-700 text-xs"
                                            disabled={!permissions.canEdit || !emp.bankAccounts || emp.bankAccounts.length === 0}
                                        >
                                            {emp.bankAccounts && emp.bankAccounts.length > 0 ? (
                                                emp.bankAccounts.map(acc => (
                                                    <option key={acc.id} value={acc.id}>
                                                        {acc.bankName} - ...{acc.accountNumber.slice(-4)}
                                                    </option>
                                                ))
                                            ) : (
                                                <option value="">No Account</option>
                                            )}
                                        </select>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        )
    }, [employees, processedEmployeeIds, selectedMonth, selectedEmployees, handleSelectAll, payrollInputs, permissions.canEdit, handleInputChange, handleEmployeeSelect, advances]);
    
    if (loading) return <Card title="Loading Payroll Data..."><Loader className="animate-spin" /></Card>;
    if (!settings) return <Card title="Payroll Configuration Needed"><p className="p-4">Please configure your payroll settings first.</p><Button to="/payroll/settings" icon={<Settings/>}>Go to Settings</Button></Card>

    return (
        <div className="space-y-6">
            <Card title="Run Payroll" actions={permissions.canCreate && <Button onClick={handleProcess} disabled={processing || loading} icon={processing ? <Loader className="animate-spin" /> : <PlayCircle />}>Process Selected</Button>}>
                <div className="p-4 border-b">
                    <label className="mr-4">Payroll for Month:</label>
                    <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} className="p-2 border border-slate-300 dark:border-slate-600 rounded bg-white dark:bg-slate-700 dark:text-slate-100" />
                </div>
                
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold p-4">In-office Employees</h3>
                        {renderEmployeeTable(EmployeeCategory.InOffice)}
                    </div>
                     <div>
                        <h3 className="text-lg font-semibold p-4">Factory Workers</h3>
                        {renderEmployeeTable(EmployeeCategory.Factory)}
                    </div>
                     <div>
                        <h3 className="text-lg font-semibold p-4">On-site Personnel</h3>
                        {renderEmployeeTable(EmployeeCategory.OnSite)}
                    </div>
                </div>
            </Card>

            <Card title="Processed Payroll for This Month" actions={payrollRecords.length > 0 && permissions.canDelete && <Button variant="danger" onClick={handleDeleteRun} disabled={processing} icon={<Trash2 size={16}/>}>Delete This Run</Button>}>
                {payrollRecords.length > 0 ? (
                     <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-left bg-slate-100 dark:bg-slate-800">
                                <tr>
                                    <th className="p-2">Employee</th>
                                    <th className="p-2 text-right">Net Pay</th>
                                    <th className="p-2 text-center">Status</th>
                                    <th className="p-2 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {payrollRecords.map(r => (
                                    <tr key={r.id} className="border-b dark:border-slate-700">
                                        <td className="p-2">{r.employee_name}</td>
                                        <td className="p-2 text-right font-semibold">₹{r.net_pay.toLocaleString()}</td>
                                        <td className="p-2 text-center"><UserCheck className="text-green-500 inline-block" /></td>
                                        <td className="p-2 text-right">
                                            {permissions.canEdit && <Button variant="secondary" size="sm" onClick={() => handleRevertRecord(r.id)} disabled={processing} icon={<RotateCcw size={14}/>}>
                                                Revert
                                            </Button>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ): (
                    <p className="text-slate-500 text-center p-4">No payroll processed for {selectedMonth} yet.</p>
                )}
            </Card>

             <Modal isOpen={!!processingSummary} onClose={() => setProcessingSummary(null)} title={processingSummary?.success ? "Payroll Processed" : "Processing Failed"}>
                <div className="p-6">
                    <p className={`text-lg ${processingSummary?.success ? 'text-green-600' : 'text-red-600'}`}>{processingSummary?.message}</p>
                    {processingSummary?.success && processingSummary.details && (
                        <div className="mt-4 max-h-60 overflow-y-auto">
                            <ul className="list-disc list-inside text-sm space-y-1">
                                {processingSummary.details.map(d => (
                                    <li key={d.name}>
                                        {d.name}: <span className="font-semibold">₹{d.netPay.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                     <div className="text-right mt-6">
                        <Button onClick={() => setProcessingSummary(null)}>Close</Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
});

export default RunPayroll;
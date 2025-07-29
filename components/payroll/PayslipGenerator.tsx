import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { PayrollRecord, PayrollSettings, CompanyDetails, PdfSettings } from '@/types';
import { getCompanyDetails } from '../settings/CompanyDetails';
import { getPdfSettings } from '../settings/pdfSettingsService';

interface PayslipProps {
    record?: PayrollRecord;
    settings: Partial<PayrollSettings>;
    visible?: boolean;
    onClose?: () => void;
    isPreview?: boolean;
}

const PayslipRow: React.FC<{ label: string, value: number | string }> = ({ label, value }) => (
    <div className="flex justify-between py-1.5 px-2 text-sm even:bg-slate-50 dark:even:bg-slate-700/50">
        <span>{label}</span>
        <span className="font-medium">{typeof value === 'number' ? `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : value}</span>
    </div>
);

const getOvertimeDetailsText = (record: PayrollRecord): string => {
    if (!record || record.overtime <= 0 || !record.overtime_details) {
        return 'Overtime';
    }
    const details = record.overtime_details;
    const numericPart = parseFloat(details);
    if (isNaN(numericPart) || numericPart === 0) {
        return `Overtime (${details})`;
    }
    const rate = record.overtime / numericPart;
    const unit = details.includes('hrs') ? 'hr' : 'day';

    return `Overtime (${numericPart.toFixed(1)} ${unit}s @ ₹${rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/${unit})`;
}


const PayslipGenerator: React.FC<PayslipProps> = ({ record, settings, visible, onClose, isPreview = false }) => {
    const [companyDetails, setCompanyDetails] = useState<CompanyDetails | null>(null);
    const [pdfSettings, setPdfSettings] = useState<PdfSettings | null>(null);

    useEffect(() => {
        if (visible || isPreview) {
            Promise.all([getCompanyDetails(), getPdfSettings()]).then(([cd, ps]) => {
                setCompanyDetails(cd);
                setPdfSettings(ps);
            });
        }
    }, [visible, isPreview]);

    const data: PayrollRecord = isPreview ? {
        employee_name: 'John Doe',
        employee_code: 'EMP001',
        payroll_month: new Date().toISOString().slice(0, 7),
        overtime_details: '10 hrs',
        basic_pay: 25000, hra: 10000, special_allowance: 5000, overtime: 2000, gross_pay: 42000,
        pf: 1800, esi: 735, pt: 200, tds: 1000, advance_deduction: 5000, total_deductions: 8735,
        net_pay: 33265,
        category: 'Factory Worker',
        remittance_account: { id: '1', bankName: 'State Bank of India', accountNumber: '...1234', ifsc: 'SBIN0000', isDefault: true }
    } as any : record!;

    if (!data || !companyDetails || !pdfSettings) return null;
    
    const RemittanceInfo = () => {
        if (!data.remittance_account) return null;
        const { bankName, accountNumber } = data.remittance_account;
        const maskedAccountNumber = `xxxx${accountNumber.slice(-4)}`;
        return (
             <div className="mt-4 text-xs text-center text-slate-500 border-t pt-2">
                <p>Remittance made to: {bankName}, A/c No: {maskedAccountNumber}</p>
            </div>
        );
    }

    const PayslipContent = () => (
        <div className="p-6 bg-white dark:bg-slate-800">
            <div className="text-center mb-6">
                {pdfSettings.companyLogo && <img src={pdfSettings.companyLogo} alt="Logo" className="mx-auto h-12 mb-2" />}
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">{companyDetails.name}</h3>
                 <p className="text-xs text-slate-500">{companyDetails.address}</p>
                 <p className="text-xs text-slate-500">{companyDetails.email}</p>
                <h4 className="font-semibold mt-4">Payslip for {new Date(`${data.payroll_month}-02`).toLocaleString('default', { month: 'long', year: 'numeric' })}</h4>
            </div>
            <div className="flex justify-between text-sm mb-4 p-3 bg-slate-100 dark:bg-slate-700 rounded-md">
                <div>
                    <p className="font-semibold">{data.employee_name}</p>
                    <p className="text-xs">{data.employee_code}</p>
                    <p className="text-xs">{data.category}</p>
                </div>
                <div className="text-right">
                    <p><strong>Gross Pay:</strong> ₹{data.gross_pay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                    <p className="text-lg font-bold text-primary">Net Pay: ₹{data.net_pay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h4 className="font-semibold text-green-600 border-b pb-1 mb-2">Earnings</h4>
                    <PayslipRow label="Basic Pay" value={data.basic_pay} />
                    <PayslipRow label="House Rent Allowance (HRA)" value={data.hra} />
                    <PayslipRow label="Special Allowance" value={data.special_allowance} />
                    {data.overtime > 0 && <PayslipRow label={getOvertimeDetailsText(data)} value={data.overtime} />}
                    <div className="flex justify-between py-2 px-2 mt-2 font-bold bg-green-50 dark:bg-green-900/20"><span >Gross Earnings</span><span>₹{data.gross_pay.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                </div>
                 <div>
                    <h4 className="font-semibold text-red-600 border-b pb-1 mb-2">Deductions</h4>
                    {settings.pf_enabled && <PayslipRow label="Provident Fund (PF)" value={data.pf} />}
                    {settings.esi_enabled && data.esi > 0 && <PayslipRow label="Employee State Insurance (ESI)" value={data.esi} />}
                    {settings.pt_enabled && <PayslipRow label="Professional Tax (PT)" value={data.pt} />}
                    {settings.tds_enabled && data.tds > 0 && <PayslipRow label="Tax Deducted at Source (TDS)" value={data.tds} />}
                    {data.advance_deduction > 0 && <PayslipRow label="Advance / Other Deductions" value={data.advance_deduction} />}
                     <div className="flex justify-between py-2 px-2 mt-2 font-bold bg-red-50 dark:bg-red-900/20"><span >Total Deductions</span><span>₹{data.total_deductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                </div>
            </div>
            <RemittanceInfo />
        </div>
    );

    if (isPreview) {
        return <PayslipContent />;
    }

    return (
        <Modal isOpen={!!visible} onClose={onClose!} title="View Payslip">
            <PayslipContent />
        </Modal>
    );
};

export default PayslipGenerator;

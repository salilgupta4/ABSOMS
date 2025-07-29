import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import Button from '@/components/ui/Button';
import { PayrollRecord, PayrollSettings, CompanyDetails, PdfSettings } from '@/types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Download, Loader } from 'lucide-react';
import { getPayrollSettings } from '@/services/payrollService';
import { getCompanyDetails } from '@/components/settings/CompanyDetails';
import { getPdfSettings } from '../settings/pdfSettingsService';

interface PayslipExporterProps {
    payrollRecords: PayrollRecord[];
    selectedMonth: string;
}

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


const PayslipContent: React.FC<{ record: PayrollRecord, payrollSettings: PayrollSettings, pdfSettings: PdfSettings, companyDetails: CompanyDetails }> = ({ record, payrollSettings, pdfSettings, companyDetails }) => {
    const formatCurrency = (val: number) => val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    const RemittanceInfo = () => {
        if (!record.remittance_account) return null;
        const { bankName, accountNumber } = record.remittance_account;
        const maskedAccountNumber = `xxxx${accountNumber.slice(-4)}`;
        return <p>Remittance made to: {bankName}, A/c No: {maskedAccountNumber}</p>;
    }

    return (
        <div className="p-4 bg-white" style={{ fontFamily: 'sans-serif', fontSize: '10px' }}>
            {/* Header */}
            <div className="flex justify-between items-center pb-2 border-b-2" style={{borderColor: pdfSettings.accentColor}}>
                <div>
                    <h3 className="font-bold text-lg">{companyDetails.name}</h3>
                    <p className="text-xs text-slate-600 whitespace-pre-line">{companyDetails.address}</p>
                    <p className="text-xs text-slate-600">{companyDetails.email}</p>
                </div>
                <div className="text-right">
                    <h4 className="font-bold text-xl" style={{color: pdfSettings.accentColor}}>Payslip</h4>
                    <p className="text-xs text-slate-600">For {new Date(`${record.payroll_month}-02`).toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
                </div>
            </div>
            {/* Employee Details */}
            <div className="grid grid-cols-2 gap-x-4 text-xs mt-3 p-2 bg-slate-50 rounded">
                <div className="space-y-1">
                    <p><strong>Employee Name:</strong> {record.employee_name}</p>
                    <p><strong>Employee ID:</strong> {record.employee_code}</p>
                    <p><strong>Category:</strong> {record.category}</p>
                </div>
                <div className="space-y-1 text-right">
                    <p><strong>Total Days:</strong> 30</p>
                    <p><strong>Days Present:</strong> {record.days_present}</p>
                </div>
            </div>
            
            {/* Earnings & Deductions */}
            <div className="grid grid-cols-2 gap-4 text-xs mt-3">
                <div>
                    <p className="font-bold p-1 text-center text-white" style={{backgroundColor: pdfSettings.accentColor}}>Earnings</p>
                    <div className="flex justify-between mt-1 px-1 py-0.5"><p>Basic Pay:</p> <p>₹{formatCurrency(record.basic_pay)}</p></div>
                    <div className="flex justify-between px-1 py-0.5 bg-slate-50"><p>HRA:</p> <p>₹{formatCurrency(record.hra)}</p></div>
                    <div className="flex justify-between px-1 py-0.5"><p>Special Allowance:</p> <p>₹{formatCurrency(record.special_allowance)}</p></div>
                    {record.overtime > 0 && <div className="flex justify-between px-1 py-0.5 bg-slate-50"><p>{getOvertimeDetailsText(record)}</p> <p>₹{formatCurrency(record.overtime)}</p></div>}
                </div>
                 <div>
                    <p className="font-bold p-1 text-center text-white" style={{backgroundColor: pdfSettings.accentColor}}>Deductions</p>
                    {record.pf > 0 && <div className="flex justify-between mt-1 px-1 py-0.5"><p>Provident Fund:</p> <p>₹{formatCurrency(record.pf)}</p></div>}
                    {record.esi > 0 && <div className="flex justify-between px-1 py-0.5 bg-slate-50"><p>ESI:</p> <p>₹{formatCurrency(record.esi)}</p></div>}
                    {record.pt > 0 && <div className="flex justify-between px-1 py-0.5"><p>Professional Tax:</p> <p>₹{formatCurrency(record.pt)}</p></div>}
                    {record.tds > 0 && <div className="flex justify-between px-1 py-0.5 bg-slate-50"><p>TDS:</p> <p>₹{formatCurrency(record.tds)}</p></div>}
                    {record.advance_deduction > 0 && <div className="flex justify-between px-1 py-0.5"><p>Advance:</p> <p>₹{formatCurrency(record.advance_deduction)}</p></div>}
                </div>
            </div>
             {/* Totals */}
            <div className="grid grid-cols-2 gap-4 text-xs mt-2 font-bold">
                 <div className="flex justify-between p-1 bg-slate-200"><p>Gross Earnings:</p> <p>₹{formatCurrency(record.gross_pay)}</p></div>
                 <div className="flex justify-between p-1 bg-slate-200"><p>Total Deductions:</p> <p>₹{formatCurrency(record.total_deductions)}</p></div>
            </div>
            {/* Net Pay */}
            <div className="mt-3 p-2 text-center rounded" style={{backgroundColor: pdfSettings.accentColor, color: 'white'}}>
                 <span className="font-bold text-md">Net Salary: ₹{formatCurrency(record.net_pay)}</span>
            </div>
             {/* Footer */}
            <div className="mt-4 text-xs text-center text-slate-500">
                {record.remittance_account && <RemittanceInfo />}
                <p>This is a computer-generated payslip and does not require a signature.</p>
            </div>
        </div>
    );
};

const PayslipPage: React.FC<{ records: PayrollRecord[], payrollSettings: PayrollSettings, pdfSettings: PdfSettings, companyDetails: CompanyDetails }> = ({ records, payrollSettings, pdfSettings, companyDetails }) => (
    <div style={{ width: '210mm', height: '297mm', display: 'flex', flexDirection: 'column', backgroundColor: 'white' }}>
        <div style={{ flex: 1, borderBottom: '1px dashed #ccc', boxSizing: 'border-box', padding: '5mm' }}>
            {records[0] && <PayslipContent record={records[0]} payrollSettings={payrollSettings} pdfSettings={pdfSettings} companyDetails={companyDetails} />}
        </div>
        <div style={{ flex: 1, boxSizing: 'border-box', padding: '5mm' }}>
            {records[1] && <PayslipContent record={records[1]} payrollSettings={payrollSettings} pdfSettings={pdfSettings} companyDetails={companyDetails} />}
        </div>
    </div>
);


const PayslipExporter: React.FC<PayslipExporterProps> = ({ payrollRecords, selectedMonth }) => {
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        setExporting(true);
        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const payrollSettings = await getPayrollSettings();
            const companyDetails = await getCompanyDetails();
            const pdfSettings = await getPdfSettings();

            // Group records into pairs for 2-up printing
            for (let i = 0; i < payrollRecords.length; i += 2) {
                const recordPair = payrollRecords.slice(i, i + 2);
                
                const printContainer = document.createElement('div');
                printContainer.style.position = 'absolute';
                printContainer.style.left = '-9999px';
                document.body.appendChild(printContainer);

                const root = ReactDOM.createRoot(printContainer);
                root.render(<PayslipPage records={recordPair} payrollSettings={payrollSettings} pdfSettings={pdfSettings} companyDetails={companyDetails}/>);
                
                await new Promise(resolve => setTimeout(resolve, 100));

                const canvas = await html2canvas(printContainer, { scale: 2 });
                const imgData = canvas.toDataURL('image/png');
                
                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight(), undefined, 'FAST');

                root.unmount();
                document.body.removeChild(printContainer);
            }

            pdf.save(`Payslips-${selectedMonth}.pdf`);
        } catch (error) {
            console.error("PDF Export Error:", error);
            alert("Failed to generate PDF payslips.");
        } finally {
            setExporting(false);
        }
    };

    return (
        <Button onClick={handleExport} disabled={exporting || payrollRecords.length === 0} icon={exporting ? <Loader className="animate-spin" /> : <Download />}>
            {exporting ? 'Generating...' : 'Export All Payslips (PDF)'}
        </Button>
    );
};

export default PayslipExporter;
import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import Button from '@/components/ui/Button';
import { PayrollRecord, PayrollSettings, CompanyDetails } from '@/types';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Download, Loader } from 'lucide-react';
import { getPayrollSettings } from '@/services/payrollService';
import { getCompanyDetails } from '@/components/settings/CompanyDetails';
import PrintWrapper from '../Print/PrintWrapper'; // Assuming a generic print wrapper
import QuotePrint from '../Print/QuotePrint'; // Reusing for layout structure

interface MonthlyPayslipExportProps {
    payrollRecords: PayrollRecord[];
    selectedMonth: any; // dayjs object
}

const PayslipContent: React.FC<{ record: PayrollRecord, settings: PayrollSettings, companyDetails: CompanyDetails }> = ({ record, settings, companyDetails }) => (
    <div className="p-4" style={{ fontFamily: 'sans-serif', fontSize: '10px' }}>
        <h3 className="text-center font-bold text-lg mb-2">{companyDetails.name}</h3>
        <p className="text-center text-xs mb-4">{companyDetails.address}</p>
        <h4 className="text-center font-semibold text-md mb-2">Payslip for {record.payroll_month}</h4>
        <div className="flex justify-between text-xs mb-2">
            <span><strong>Employee:</strong> {record.employee_name}</span>
            <span><strong>ID:</strong> {record.employee_code}</span>
        </div>
        <hr className="my-2"/>
        <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
                <p className="font-bold">Earnings</p>
                <div className="flex justify-between"><p>Basic Pay:</p> <p>₹{record.basic_pay.toLocaleString()}</p></div>
                <div className="flex justify-between"><p>HRA:</p> <p>₹{record.hra.toLocaleString()}</p></div>
                <div className="flex justify-between"><p>Special Allowance:</p> <p>₹{record.special_allowance.toLocaleString()}</p></div>
                <div className="flex justify-between"><p>Overtime:</p> <p>₹{record.overtime.toLocaleString()}</p></div>
                <hr className="my-1"/>
                <div className="flex justify-between font-bold"><p>Gross Pay:</p> <p>₹{record.gross_pay.toLocaleString()}</p></div>
            </div>
             <div>
                <p className="font-bold">Deductions</p>
                <div className="flex justify-between"><p>PF:</p> <p>₹{record.pf.toLocaleString()}</p></div>
                <div className="flex justify-between"><p>ESI:</p> <p>₹{record.esi.toLocaleString()}</p></div>
                <div className="flex justify-between"><p>PT:</p> <p>₹{record.pt.toLocaleString()}</p></div>
                <div className="flex justify-between"><p>TDS:</p> <p>₹{record.tds.toLocaleString()}</p></div>
                <div className="flex justify-between"><p>Advance:</p> <p>₹{record.advance_deduction.toLocaleString()}</p></div>
                <hr className="my-1"/>
                <div className="flex justify-between font-bold"><p>Total Deductions:</p> <p>₹{record.total_deductions.toLocaleString()}</p></div>
            </div>
        </div>
        <hr className="my-2"/>
        <div className="text-right font-bold text-sm">Net Pay: ₹{record.net_pay.toLocaleString()}</div>
    </div>
);

const MonthlyPayslipExport: React.FC<MonthlyPayslipExportProps> = ({ payrollRecords, selectedMonth }) => {
    const [exporting, setExporting] = useState(false);

    const handleExport = async () => {
        setExporting(true);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const settings = await getPayrollSettings();
        const companyDetails = await getCompanyDetails();

        for (let i = 0; i < payrollRecords.length; i++) {
            const record = payrollRecords[i];
            const printContainer = document.createElement('div');
            printContainer.style.position = 'absolute';
            printContainer.style.left = '-9999px';
            printContainer.style.width = '210mm';
            document.body.appendChild(printContainer);

            const root = ReactDOM.createRoot(printContainer);
            root.render(<PayslipContent record={record} settings={settings} companyDetails={companyDetails}/>);
            
            await new Promise(resolve => setTimeout(resolve, 100));

            const canvas = await html2canvas(printContainer, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');
            
            if (i > 0) pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');

            root.unmount();
            document.body.removeChild(printContainer);
        }

        pdf.save(`Payslips-${selectedMonth.format('YYYY-MM')}.pdf`);
        setExporting(false);
    };

    return (
        <Button onClick={handleExport} disabled={exporting || payrollRecords.length === 0} icon={exporting ? <Loader className="animate-spin" /> : <Download />}>
            {exporting ? 'Generating...' : 'Export All Payslips (PDF)'}
        </Button>
    );
};

export default MonthlyPayslipExport;
import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Download, Upload, Server, AlertTriangle, Loader, FileText, Package, Wrench, ShieldCheck, UserPlus, ExternalLink } from 'lucide-react';
import * as dataService from '@/services/dataService';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';
import Modal from '../ui/Modal';
import { CsvExportableModule } from '@/services/dataService';

const DataManagement: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [fixLoading, setFixLoading] = useState(false);
    const [seeding, setSeeding] = useState(false);
    const [message, setMessage] = useState('');
    const [isJsonImportModalOpen, setJsonImportModalOpen] = useState(false);
    const [isCsvImportModalOpen, setCsvImportModalOpen] = useState(false);
    const [isAdjustmentModalOpen, setAdjustmentModalOpen] = useState(false);

    const [jsonToImport, setJsonToImport] = useState('');
    const [csvToImport, setCsvToImport] = useState('');
    const [csvModule, setCsvModule] = useState<CsvExportableModule>('customers');
    const { user } = useAuth();

    // Redirect Admin users to the new comprehensive data management center
    if (user?.role === UserRole.Admin) {
        return (
            <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border">
                <div className="flex items-center gap-3 mb-4">
                    <ExternalLink className="text-blue-600 dark:text-blue-400" size={24} />
                    <h4 className="text-xl font-semibold text-slate-800 dark:text-slate-200">Enhanced Data Management</h4>
                </div>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                    A new comprehensive Data Management Center is now available with enhanced features including data validation, integrity checks, and system backup/restore.
                </p>
                <Button 
                    onClick={() => window.location.href = '/#/settings/data'}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    icon={<ExternalLink size={16} />}
                >
                    Access Data Management Center
                </Button>
            </div>
        );
    }

    if (user?.role === UserRole.Viewer) {
        return (
             <div>
                <h4 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-6">Data Management</h4>
                <p className="text-slate-600 dark:text-slate-400">You do not have permission to access data management features.</p>
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-2">
                        <ShieldCheck className="text-blue-600 dark:text-blue-400" size={20} />
                        <h5 className="font-semibold text-blue-800 dark:text-blue-200">Need Access?</h5>
                    </div>
                    <p className="text-blue-700 dark:text-blue-300 text-sm">
                        Contact your administrator to request access to data management features.
                    </p>
                </div>
            </div>
        )
    }

    const handleJsonExport = async () => {
        setLoading(true);
        setMessage('Exporting all data...');
        try {
            const jsonString = await dataService.exportAllDataAsJson();
            const blob = new Blob([jsonString], { type: 'application/json' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `abs-oms-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setMessage('Export successful!');
        } catch (error: any) {
            setMessage(`Error during export: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };
    
    const handleJsonImport = async () => {
        if (!jsonToImport) {
            setMessage('Please paste JSON data to import.');
            return;
        }
        if (!window.confirm("WARNING: This will overwrite ALL existing data in the system. This action is irreversible. Are you sure you want to proceed?")) {
            return;
        }
        
        setLoading(true);
        setMessage('Importing data...');
        try {
            await dataService.importAllDataFromJson(jsonToImport);
            setMessage('Import successful! The page will now reload.');
            setTimeout(() => window.location.reload(), 2000);
        } catch (error: any) {
             setMessage(`Error during import: ${error.message}`);
        } finally {
            setLoading(false);
            setJsonImportModalOpen(false);
        }
    }

    const handleCsvExport = async (module: CsvExportableModule) => {
        setLoading(true);
        setMessage(`Exporting ${module}...`);
        try {
            await dataService.exportModuleToCSV(module);
            setMessage(`${module.charAt(0).toUpperCase() + module.slice(1)} exported successfully!`);
        } catch (error: any) {
            setMessage(`Error exporting ${module}: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleInventoryExport = async () => {
        setLoading(true);
        setMessage('Exporting inventory...');
        try {
            await dataService.exportInventoryToCSV();
            setMessage('Inventory status exported successfully!');
        } catch (error: any) {
            setMessage(`Error exporting inventory: ${error.message}`);
        } finally {
            setLoading(false);
        }
    }

    const handleCsvImport = async () => {
        if (!csvToImport) {
            setMessage("Please select a CSV file to import.");
            return;
        }
        setLoading(true);
        setMessage(`Importing ${csvModule}...`);
        try {
            const count = await dataService.importModuleFromCSV(csvModule, csvToImport);
            setMessage(`Successfully imported/updated ${count} records in ${csvModule}.`);
            setCsvToImport('');
        } catch (error: any) {
            setMessage(`Error importing from CSV: ${error.message}`);
        } finally {
            setLoading(false);
            setCsvImportModalOpen(false);
        }
    };
    
    const handleAdjustmentImport = async () => {
        if (!csvToImport) {
            setMessage("Please select a CSV file to import.");
            return;
        }
        setLoading(true);
        setMessage('Importing stock adjustments...');
        try {
            const count = await dataService.importStockAdjustmentsFromCSV(csvToImport);
            setMessage(`Successfully imported ${count} stock adjustments. Inventory will be updated.`);
             setCsvToImport('');
        } catch (error: any) {
            setMessage(`Error importing stock adjustments: ${error.message}`);
        } finally {
            setLoading(false);
            setAdjustmentModalOpen(false);
        }
    }

    const handleFileRead = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                setCsvToImport(event.target?.result as string);
            };
            reader.readAsText(file);
        }
    };

    const handleFixCustomerData = async () => {
        if (!window.confirm("This will scan all customers and fix missing contact/address IDs and structures. This is generally safe but it's recommended to take a backup first. Proceed?")) {
            return;
        }
        setFixLoading(true);
        setMessage("Starting customer data fix... This may take a moment.");
        try {
            const fixCount = await dataService.fixCustomerDataIntegrity();
            setMessage(`Scan complete. Fixed ${fixCount} customer records.`);
        } catch (error: any) {
            setMessage(`Error fixing data: ${error.message}`);
            console.error(error);
        } finally {
            setFixLoading(false);
        }
    };

    const handleSeedPayroll = async () => {
        if (!window.confirm("This will add demo employees and advance payments to your system. It will not overwrite existing data. Proceed?")) {
            return;
        }
        setSeeding(true);
        setMessage("Seeding demo payroll data...");
        try {
            const result = await dataService.seedDemoPayrollData();
            setMessage(`Successfully added ${result.employees} new employees and ${result.advances} new advance records.`);
        } catch (error: any) {
             setMessage(`Error during seeding: ${error.message}`);
        } finally {
            setSeeding(false);
        }
    };
    
    return (
        <>
            <div>
                <h4 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-6">Data Management</h4>
                {message && <div className={`p-3 mb-4 rounded-md text-sm ${message.startsWith('Error') ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200' : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'}`}>{message}</div>}

                <div className="space-y-8">
                     <Card title="CSV Import / Export" icon={<FileText size={18} />}>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">Export module data to CSV for editing, or import from CSV to bulk update/create records. Import will update records if 'id' matches, otherwise it creates a new one.</p>
                        <div className="space-y-4">
                            <div>
                                <h5 className="font-semibold text-base mb-2">Export Data</h5>
                                <div className="flex flex-wrap gap-2">
                                    <Button onClick={() => handleCsvExport('customers')} disabled={loading} icon={<Download size={16}/>}>Customers</Button>
                                    <Button onClick={() => handleCsvExport('products')} disabled={loading} icon={<Download size={16}/>}>Products</Button>
                                    <Button onClick={() => handleCsvExport('vendors')} disabled={loading} icon={<Download size={16}/>}>Vendors</Button>
                                    <Button onClick={() => handleCsvExport('quotes')} disabled={loading} icon={<Download size={16}/>}>Quotes</Button>
                                    <Button onClick={() => handleCsvExport('sales_orders')} disabled={loading} icon={<Download size={16}/>}>Sales Orders</Button>
                                    <Button onClick={() => handleCsvExport('purchase_orders')} disabled={loading} icon={<Download size={16}/>}>Purchase Orders</Button>
                                    <Button onClick={() => handleInventoryExport()} disabled={loading} icon={<Download size={16}/>}>Inventory Status</Button>
                                </div>
                            </div>
                             <div className="pt-4 border-t border-slate-200 dark:border-slate-600">
                                 <h5 className="font-semibold text-base mb-2">Import Data</h5>
                                <div className="flex flex-wrap gap-2">
                                    <Button onClick={() => setCsvImportModalOpen(true)} disabled={loading} icon={<Upload size={16}/>}>Import Master Data (CSV)</Button>
                                    <Button onClick={() => setAdjustmentModalOpen(true)} disabled={loading} icon={<Package size={16}/>}>Import Stock Adjustments</Button>
                                </div>
                            </div>
                        </div>
                    </Card>

                    <Card title="Demo Data" icon={<UserPlus size={18} />}>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                            Populate the system with sample data to explore features. This action will add new records and will not affect your existing data.
                        </p>
                        <Button
                            onClick={handleSeedPayroll}
                            disabled={loading || seeding}
                            icon={seeding ? <Loader className="animate-spin" /> : <UserPlus size={16} />}
                        >
                            {seeding ? 'Adding Data...' : 'Load Payroll Demo Data'}
                        </Button>
                    </Card>

                    <Card title="Data Integrity Checks" icon={<ShieldCheck size={18} />}>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                            Run these utilities to fix common data issues, such as missing IDs on older records created via import. It's recommended to back up your data before running a fix.
                        </p>
                        <Button
                            onClick={handleFixCustomerData}
                            disabled={loading || fixLoading}
                            icon={fixLoading ? <Loader className="animate-spin" /> : <Wrench size={16} />}
                        >
                            {fixLoading ? 'Fixing Data...' : 'Scan & Fix Customer Contacts/Addresses'}
                        </Button>
                    </Card>

                    <Card title="System Backup & Restore" icon={<Server size={18} />}>
                        <div className="flex items-start p-3 mb-6 bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 text-red-800 dark:text-red-200 rounded-r-lg space-x-3">
                            <AlertTriangle size={40} className="mt-0.5 shrink-0 text-red-500"/>
                            <div>
                                <h5 className="font-bold">Warning: Use with extreme caution!</h5>
                                <p className="text-sm">Importing a JSON backup file will completely <strong className="underline">overwrite all current data</strong> in the application. This action cannot be undone. Always export a fresh backup before importing.</p>
                            </div>
                        </div>
                        <div className="flex space-x-4">
                            <Button onClick={handleJsonExport} icon={loading ? <Loader className="animate-spin"/> : <Download size={16}/>} disabled={loading}>Export Full Backup (JSON)</Button>
                            <Button variant="danger" onClick={() => setJsonImportModalOpen(true)} icon={<Upload size={16}/>} disabled={loading}>Import from Backup (JSON)</Button>
                        </div>
                    </Card>
                </div>
            </div>

            {/* JSON Import Modal */}
            <Modal isOpen={isJsonImportModalOpen} onClose={() => setJsonImportModalOpen(false)} title="Import from JSON Backup">
                <div className="p-6 space-y-4">
                    <p className="text-sm text-slate-600 dark:text-slate-400">Paste the content of your JSON backup file into the text area below.</p>
                    <textarea 
                        className="w-full h-64 p-2 font-mono text-xs bg-slate-100 dark:bg-slate-700 border rounded-md"
                        value={jsonToImport}
                        onChange={(e) => setJsonToImport(e.target.value)}
                        placeholder='Paste your JSON backup content here...'
                    />
                     <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <Button variant="secondary" onClick={() => setJsonImportModalOpen(false)} disabled={loading}>Cancel</Button>
                        <Button variant="danger" onClick={handleJsonImport} disabled={loading} icon={loading ? <Loader className="animate-spin"/> : null}>
                            {loading ? 'Importing...' : 'Confirm and Overwrite Data'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* CSV Import Modal */}
            <Modal isOpen={isCsvImportModalOpen} onClose={() => setCsvImportModalOpen(false)} title="Import Master Data from CSV">
                 <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">1. Select Data Type</label>
                        <select
                            value={csvModule}
                            onChange={(e) => setCsvModule(e.target.value as any)}
                            className="mt-1 block w-full pl-3 pr-10 py-2 text-base bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                        >
                            <option value="customers">Customers</option>
                            <option value="products">Products</option>
                            <option value="vendors">Vendors</option>
                            <option value="quotes">Quotes</option>
                            <option value="sales_orders">Sales Orders</option>
                            <option value="purchase_orders">Purchase Orders</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">2. Select CSV File</label>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileRead}
                            className="mt-1 text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-light dark:file:bg-slate-700 file:text-primary dark:file:text-slate-200 hover:file:bg-blue-200 dark:hover:file:bg-slate-600"
                        />
                         <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            <strong>Note:</strong> To update a record, keep its existing 'id'. To create a new record, set the 'id' column to <strong>0</strong> or leave it blank. New records with a name that already exists will be skipped.
                        </p>
                    </div>
                    <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <Button variant="secondary" onClick={() => setCsvImportModalOpen(false)} disabled={loading}>Cancel</Button>
                        <Button onClick={handleCsvImport} disabled={loading || !csvToImport} icon={loading ? <Loader className="animate-spin"/> : null}>
                            {loading ? 'Importing...' : 'Upload and Process File'}
                        </Button>
                    </div>
                </div>
            </Modal>

             {/* Stock Adjustment Import Modal */}
            <Modal isOpen={isAdjustmentModalOpen} onClose={() => setAdjustmentModalOpen(false)} title="Import Stock Adjustments from CSV">
                 <div className="p-6 space-y-4">
                    <div className="prose prose-sm dark:prose-invert">
                        <p>Upload a CSV file to perform bulk stock adjustments.</p>
                        <p>The CSV must have the following headers:</p>
                        <ul>
                            <li><strong>productId</strong>: The ID of the product from the 'Products' export.</li>
                            <li><strong>type</strong>: Must be either `in` or `out`.</li>
                            <li><strong>quantity</strong>: The number of items to adjust.</li>
                            <li><strong>notes</strong>: A brief description for the adjustment (e.g., "Annual stock take").</li>
                        </ul>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mt-4">Select CSV File</label>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleFileRead}
                            className="mt-1 text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary-light dark:file:bg-slate-700 file:text-primary dark:file:text-slate-200 hover:file:bg-blue-200 dark:hover:file:bg-slate-600"
                        />
                    </div>
                    <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <Button variant="secondary" onClick={() => setAdjustmentModalOpen(false)} disabled={loading}>Cancel</Button>
                        <Button onClick={handleAdjustmentImport} disabled={loading || !csvToImport} icon={loading ? <Loader className="animate-spin"/> : null}>
                            {loading ? 'Importing...' : 'Import Adjustments'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}

export default DataManagement;
import React, { useState, useEffect } from 'react';
import {
    Database, Download, Upload, Shield, AlertTriangle, CheckCircle, 
    RefreshCw, Settings, FileText, HardDrive, BarChart3, Clock,
    Users, Package, ShoppingCart, FileSpreadsheet, AlertCircle,
    PlayCircle, RotateCcw, Eye, EyeOff, ArrowRight
} from 'lucide-react';
import Button from '@/components/ui/Button';
import {
    exportCollectionToCSV,
    importCollectionFromCSV,
    createSystemBackup,
    restoreSystemBackup,
    getAllCollectionStats,
    ExportResult,
    ImportResult,
    BackupResult,
    RestoreResult
} from '@/services/dataManagement';
import {
    runFullIntegrityCheck,
    IntegrityReport
} from '@/services/dataIntegrity';

interface CollectionInfo {
    name: string;
    displayName: string;
    icon: React.ReactNode;
    description: string;
    supportsCSV: boolean;
    recordCount: number;
    lastUpdated: string;
}

const COLLECTIONS: CollectionInfo[] = [
    {
        name: 'customers',
        displayName: 'Customers',
        icon: <Users size={20} />,
        description: 'Customer master data with contacts and addresses',
        supportsCSV: true,
        recordCount: 0,
        lastUpdated: ''
    },
    {
        name: 'products',
        displayName: 'Products',
        icon: <Package size={20} />,
        description: 'Product catalog with rates and HSN codes',
        supportsCSV: true,
        recordCount: 0,
        lastUpdated: ''
    },
    {
        name: 'vendors',
        displayName: 'Vendors',
        icon: <ShoppingCart size={20} />,
        description: 'Vendor master data',
        supportsCSV: true,
        recordCount: 0,
        lastUpdated: ''
    },
    {
        name: 'quotes',
        displayName: 'Quotes',
        icon: <FileText size={20} />,
        description: 'Sales quotations and revisions',
        supportsCSV: true,
        recordCount: 0,
        lastUpdated: ''
    },
    {
        name: 'sales_orders',
        displayName: 'Sales Orders',
        icon: <FileSpreadsheet size={20} />,
        description: 'Confirmed sales orders',
        supportsCSV: true,
        recordCount: 0,
        lastUpdated: ''
    },
    {
        name: 'payroll_employees',
        displayName: 'Employees',
        icon: <Users size={20} />,
        description: 'Employee master data for payroll',
        supportsCSV: true,
        recordCount: 0,
        lastUpdated: ''
    },
    {
        name: 'users',
        displayName: 'System Users',
        icon: <Shield size={20} />,
        description: 'Application user accounts',
        supportsCSV: true,
        recordCount: 0,
        lastUpdated: ''
    }
];

const DataManagement: React.FC = () => {
    const [collections, setCollections] = useState<CollectionInfo[]>(COLLECTIONS);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'import' | 'export' | 'backup' | 'integrity'>('overview');
    // const [selectedCollection, setSelectedCollection] = useState<string>('');
    const [integrityReport, setIntegrityReport] = useState<IntegrityReport | null>(null);
    const [showIntegrityDetails, setShowIntegrityDetails] = useState(false);
    const [operationStatus, setOperationStatus] = useState<{
        type: 'success' | 'error' | 'info' | 'warning';
        message: string;
    } | null>(null);

    // Load collection statistics
    useEffect(() => {
        loadCollectionStats();
    }, []);

    const loadCollectionStats = async () => {
        try {
            setLoading(true);
            const stats = await getAllCollectionStats();
            
            setCollections(prev => prev.map(collection => ({
                ...collection,
                recordCount: stats[collection.name]?.totalRecords || 0,
                lastUpdated: stats[collection.name]?.lastUpdated || ''
            })));
        } catch (error) {
            console.error('Failed to load collection stats:', error);
            setOperationStatus({
                type: 'error',
                message: 'Failed to load collection statistics'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async (collectionName: string) => {
        try {
            setLoading(true);
            const result: ExportResult = await exportCollectionToCSV(collectionName);
            
            if (result.success) {
                setOperationStatus({
                    type: 'success',
                    message: `Successfully exported ${result.recordCount} records to ${result.fileName}`
                });
            } else {
                setOperationStatus({
                    type: 'error',
                    message: result.error || 'Export failed'
                });
            }
        } catch (error) {
            setOperationStatus({
                type: 'error',
                message: `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async (collectionName: string, file: File) => {
        try {
            setLoading(true);
            
            const csvText = await file.text();
            const result: ImportResult = await importCollectionFromCSV(collectionName, csvText, {
                validateData: true,
                autoFix: true,
                skipInvalid: true
            });
            
            if (result.success) {
                setOperationStatus({
                    type: 'success',
                    message: `Successfully imported ${result.processed} records. ${result.skipped > 0 ? `Skipped ${result.skipped} invalid records.` : ''}`
                });
                
                if (result.warnings.length > 0) {
                    console.warn('Import warnings:', result.warnings);
                }
            } else {
                setOperationStatus({
                    type: 'error',
                    message: `Import failed: ${result.errors.join(', ')}`
                });
            }
            
            // Refresh collection stats
            await loadCollectionStats();
            
        } catch (error) {
            setOperationStatus({
                type: 'error',
                message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCreateBackup = async () => {
        try {
            setLoading(true);
            const result: BackupResult = await createSystemBackup();
            
            if (result.success) {
                setOperationStatus({
                    type: 'success',
                    message: `System backup created successfully: ${result.fileName} (${result.totalRecords} records from ${result.collections.length} collections)`
                });
            } else {
                setOperationStatus({
                    type: 'error',
                    message: result.error || 'Backup creation failed'
                });
            }
        } catch (error) {
            setOperationStatus({
                type: 'error',
                message: `Backup failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        } finally {
            setLoading(false);
        }
    };

    const handleRestoreBackup = async (file: File) => {
        if (!confirm('⚠️ WARNING: This will overwrite existing data. Are you sure you want to proceed with the restore?')) {
            return;
        }
        
        try {
            setLoading(true);
            
            const backupJson = await file.text();
            const result: RestoreResult = await restoreSystemBackup(backupJson, {
                overwriteExisting: true,
                validateData: true
            });
            
            if (result.success) {
                setOperationStatus({
                    type: 'success',
                    message: `System restored successfully: ${result.totalRecords} records restored to ${result.collections.length} collections`
                });
                
                if (result.warnings.length > 0) {
                    console.warn('Restore warnings:', result.warnings);
                }
                
                // Refresh collection stats
                await loadCollectionStats();
            } else {
                setOperationStatus({
                    type: 'error',
                    message: `Restore failed: ${result.errors.join(', ')}`
                });
            }
            
        } catch (error) {
            setOperationStatus({
                type: 'error',
                message: `Restore failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        } finally {
            setLoading(false);
        }
    };

    const handleIntegrityCheck = async (autoFix: boolean = false) => {
        try {
            setLoading(true);
            const report = await runFullIntegrityCheck({
                autoFix,
                includeReferential: true,
                includeConsistency: true
            });
            
            setIntegrityReport(report);
            
            if (report.total_issues === 0) {
                setOperationStatus({
                    type: 'success',
                    message: 'Data integrity check completed successfully. No issues found!'
                });
            } else if (autoFix && report.auto_fixed_issues > 0) {
                setOperationStatus({
                    type: 'info',
                    message: `Integrity check completed. Found ${report.total_issues} issues, automatically fixed ${report.auto_fixed_issues}. ${report.manual_fixes_required} issues require manual attention.`
                });
            } else {
                setOperationStatus({
                    type: 'warning',
                    message: `Integrity check completed. Found ${report.total_issues} issues that need attention.`
                });
            }
            
        } catch (error) {
            setOperationStatus({
                type: 'error',
                message: `Integrity check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            });
        } finally {
            setLoading(false);
        }
    };

    const renderOverview = () => (
        <div className="space-y-6">
            {/* System Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                            <Database size={24} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{collections.reduce((sum, c) => sum + c.recordCount, 0)}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Total Records</p>
                        </div>
                    </div>
                </div>
                
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                            <CheckCircle size={24} className="text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{collections.length}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Collections</p>
                        </div>
                    </div>
                </div>
                
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                            <Shield size={24} className="text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">{integrityReport ? integrityReport.total_issues : '---'}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Integrity Issues</p>
                        </div>
                    </div>
                </div>
                
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                            <Clock size={24} className="text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold">
                                {integrityReport ? new Date(integrityReport.timestamp).toLocaleDateString() : '---'}
                            </p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Last Check</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Collection Overview */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold">Collection Overview</h3>
                </div>
                <div className="p-6">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700">
                                    <th className="text-left py-3 px-4">Collection</th>
                                    <th className="text-left py-3 px-4">Records</th>
                                    <th className="text-left py-3 px-4">CSV Support</th>
                                    <th className="text-left py-3 px-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {collections.map((collection) => (
                                    <tr key={collection.name} className="border-b border-slate-100 dark:border-slate-800">
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-3">
                                                {collection.icon}
                                                <div>
                                                    <p className="font-medium">{collection.displayName}</p>
                                                    <p className="text-sm text-slate-600 dark:text-slate-400">
                                                        {collection.description}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 px-4">
                                            <span className="text-lg font-semibold">{collection.recordCount.toLocaleString()}</span>
                                        </td>
                                        <td className="py-4 px-4">
                                            {collection.supportsCSV ? (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-full text-xs">
                                                    <CheckCircle size={12} />
                                                    Supported
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-xs">
                                                    Not Available
                                                </span>
                                            )}
                                        </td>
                                        <td className="py-4 px-4">
                                            <div className="flex items-center gap-2">
                                                {collection.supportsCSV && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="secondary"
                                                            onClick={() => handleExport(collection.name)}
                                                            disabled={loading || collection.recordCount === 0}
                                                            icon={<Download size={14} />}
                                                        >
                                                            Export
                                                        </Button>
                                                        <label className="cursor-pointer">
                                                            <Button
                                                                as="span"
                                                                size="sm"
                                                                variant="secondary"
                                                                disabled={loading}
                                                                icon={<Upload size={14} />}
                                                            >
                                                                Import
                                                            </Button>
                                                            <input
                                                                type="file"
                                                                accept=".csv"
                                                                className="hidden"
                                                                onChange={(e) => {
                                                                    const file = e.target.files?.[0];
                                                                    if (file) {
                                                                        handleImport(collection.name, file);
                                                                    }
                                                                }}
                                                            />
                                                        </label>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderBackupRestore = () => (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* System Backup */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg">
                            <HardDrive size={24} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-lg font-semibold">System Backup</h3>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                        Create a complete backup of all system data including all collections and settings.
                    </p>
                    <Button
                        onClick={handleCreateBackup}
                        disabled={loading}
                        icon={<Download size={16} />}
                        className="w-full"
                    >
                        Create Full Backup
                    </Button>
                </div>

                {/* System Recovery */}
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                            <RotateCcw size={24} className="text-amber-600 dark:text-amber-400" />
                        </div>
                        <h3 className="text-lg font-semibold">System Restore</h3>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 mb-4">
                        Restore system from a previous backup. This will overwrite existing data.
                    </p>
                    <div className="border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg p-4">
                        <label className="cursor-pointer block text-center">
                            <Button
                                as="span"
                                variant="secondary"
                                disabled={loading}
                                icon={<Upload size={16} />}
                                className="w-full"
                            >
                                Select Backup File
                            </Button>
                            <input
                                type="file"
                                accept=".json"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        handleRestoreBackup(file);
                                    }
                                }}
                            />
                        </label>
                        <p className="text-xs text-slate-500 mt-2">Select a JSON backup file</p>
                    </div>
                </div>
            </div>

            {/* Backup Information */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-6 border">
                <h4 className="font-semibold mb-3">Backup Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                        <h5 className="font-medium mb-2">What's Included:</h5>
                        <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                            <li>• All customer data with contacts and addresses</li>
                            <li>• Complete product catalog</li>
                            <li>• Sales documents (quotes, orders, deliveries)</li>
                            <li>• Payroll data (employees, advances, records)</li>
                            <li>• System settings and configurations</li>
                            <li>• User accounts and permissions</li>
                        </ul>
                    </div>
                    <div>
                        <h5 className="font-medium mb-2">Important Notes:</h5>
                        <ul className="space-y-1 text-slate-600 dark:text-slate-400">
                            <li>• Backups are stored as JSON files</li>
                            <li>• All timestamps are preserved</li>
                            <li>• Data validation is applied during restore</li>
                            <li>• Restore operations cannot be undone</li>
                            <li>• Always test restores on non-production systems</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderIntegrityCheck = () => (
        <div className="space-y-6">
            {/* Integrity Check Controls */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                            <Shield size={24} className="text-green-600 dark:text-green-400" />
                        </div>
                        <h3 className="text-lg font-semibold">Data Integrity Check</h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            onClick={() => handleIntegrityCheck(false)}
                            disabled={loading}
                            variant="secondary"
                            icon={<PlayCircle size={16} />}
                        >
                            Run Check
                        </Button>
                        <Button
                            onClick={() => handleIntegrityCheck(true)}
                            disabled={loading}
                            icon={<Settings size={16} />}
                        >
                            Check & Auto-Fix
                        </Button>
                    </div>
                </div>
                <p className="text-slate-600 dark:text-slate-400">
                    Comprehensive data integrity and consistency validation across all collections.
                </p>
            </div>

            {/* Integrity Report */}
            {integrityReport && (
                <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border">
                    <div className="p-6 border-b border-slate-200 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold">Integrity Report</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                    Generated: {new Date(integrityReport.timestamp).toLocaleString()}
                                </span>
                                <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => setShowIntegrityDetails(!showIntegrityDetails)}
                                    icon={showIntegrityDetails ? <EyeOff size={14} /> : <Eye size={14} />}
                                >
                                    {showIntegrityDetails ? 'Hide' : 'Show'} Details
                                </Button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-6">
                        {/* Summary Stats */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <div className="text-center p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                                <p className="text-2xl font-bold">{integrityReport.total_documents}</p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Total Documents</p>
                            </div>
                            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                                    {integrityReport.summary.critical_issues}
                                </p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Critical Issues</p>
                            </div>
                            <div className="text-center p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                                    {integrityReport.summary.warning_issues}
                                </p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Warnings</p>
                            </div>
                            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                                    {integrityReport.auto_fixed_issues}
                                </p>
                                <p className="text-sm text-slate-600 dark:text-slate-400">Auto-Fixed</p>
                            </div>
                        </div>

                        {/* Issues List */}
                        {showIntegrityDetails && (
                            <div className="space-y-4">
                                {integrityReport.referential_issues.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                                            <AlertTriangle size={16} className="text-amber-500" />
                                            Referential Integrity Issues ({integrityReport.referential_issues.length})
                                        </h4>
                                        <div className="space-y-2">
                                            {integrityReport.referential_issues.map((issue, index) => (
                                                <div key={index} className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <p className="font-medium text-amber-800 dark:text-amber-200">
                                                                {issue.collection}/{issue.documentId}
                                                            </p>
                                                            <p className="text-sm text-amber-700 dark:text-amber-300">
                                                                {issue.description}
                                                            </p>
                                                        </div>
                                                        <span className={`px-2 py-1 rounded-full text-xs ${
                                                            issue.severity === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' :
                                                            issue.severity === 'warning' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' :
                                                            'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                                                        }`}>
                                                            {issue.severity}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {integrityReport.consistency_issues.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold mb-3 flex items-center gap-2">
                                            <AlertCircle size={16} className="text-red-500" />
                                            Data Consistency Issues ({integrityReport.consistency_issues.length})
                                        </h4>
                                        <div className="space-y-2">
                                            {integrityReport.consistency_issues.map((issue, index) => (
                                                <div key={index} className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                                    <div className="flex items-start justify-between">
                                                        <div>
                                                            <p className="font-medium text-red-800 dark:text-red-200">
                                                                {issue.collection}/{issue.documentId}
                                                            </p>
                                                            <p className="text-sm text-red-700 dark:text-red-300">
                                                                {issue.description}
                                                            </p>
                                                            {issue.expectedValue && (
                                                                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                                                                    Expected: {JSON.stringify(issue.expectedValue)} | 
                                                                    Actual: {JSON.stringify(issue.actualValue)}
                                                                </p>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            {issue.canAutoFix && (
                                                                <span className="px-2 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 rounded-full text-xs">
                                                                    Auto-fixable
                                                                </span>
                                                            )}
                                                            <span className={`px-2 py-1 rounded-full text-xs ${
                                                                issue.severity === 'critical' ? 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300' :
                                                                issue.severity === 'warning' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' :
                                                                'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                                                            }`}>
                                                                {issue.severity}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {integrityReport.total_issues === 0 && (
                                    <div className="text-center py-8">
                                        <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
                                        <h4 className="text-lg font-semibold text-green-600 dark:text-green-400">
                                            All Clear!
                                        </h4>
                                        <p className="text-slate-600 dark:text-slate-400">
                                            No data integrity issues found.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    Data Management Center
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                    Comprehensive data import, export, backup, and integrity management
                </p>
            </div>

            {/* Status Messages */}
            {operationStatus && (
                <div className={`mb-6 p-4 rounded-lg border ${
                    operationStatus.type === 'success' ? 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200' :
                    operationStatus.type === 'error' ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200' :
                    operationStatus.type === 'warning' ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200' :
                    'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200'
                }`}>
                    <div className="flex items-center justify-between">
                        <span>{operationStatus.message}</span>
                        <button
                            onClick={() => setOperationStatus(null)}
                            className="text-current hover:opacity-70"
                        >
                            ×
                        </button>
                    </div>
                </div>
            )}

            {/* Loading Overlay */}
            {loading && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-xl">
                        <div className="flex items-center gap-3">
                            <RefreshCw size={24} className="animate-spin text-blue-600" />
                            <span className="text-lg">Processing...</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Firebase Migration Notice */}
            <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Database size={20} className="text-purple-600 dark:text-purple-400" />
                        <div>
                            <h4 className="font-semibold text-purple-800 dark:text-purple-200">Firebase Data Migration</h4>
                            <p className="text-sm text-purple-700 dark:text-purple-300">Need to migrate from another Firebase project?</p>
                        </div>
                    </div>
                    <Button 
                        onClick={() => window.location.href = '/#/settings/migrate'}
                        variant="secondary"
                        icon={<ArrowRight size={16} />}
                        className="bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-200"
                    >
                        Open Migration Tool
                    </Button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="border-b border-slate-200 dark:border-slate-700 mb-6">
                <nav className="flex space-x-8">
                    {[
                        { id: 'overview', label: 'Overview', icon: <BarChart3 size={16} /> },
                        { id: 'backup', label: 'Backup & Restore', icon: <HardDrive size={16} /> },
                        { id: 'integrity', label: 'Data Integrity', icon: <Shield size={16} /> }
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 py-3 px-1 border-b-2 font-medium text-sm ${
                                activeTab === tab.id
                                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'backup' && renderBackupRestore()}
            {activeTab === 'integrity' && renderIntegrityCheck()}
        </div>
    );
};

export default DataManagement;
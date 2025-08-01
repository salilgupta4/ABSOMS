import React, { useState, useEffect } from 'react';
import {
    Database, Download, Upload, RefreshCw, CheckCircle, AlertTriangle, 
    XCircle, BarChart3, Clock, ArrowRight, Play, Pause, RotateCcw,
    Shield, FileCheck, Zap, TrendingUp
} from 'lucide-react';
import Button from '@/components/ui/Button';
import {
    migrateAllData,
    getOldFirebaseStats,
    validateMigration,
    MigrationResult,
    MigrationProgress
} from '@/services/firebaseMigration';
import {
    migrateFromExport,
    parseFirebaseExport,
    validateMigration as validateExportMigration,
    ExportMigrationResult,
    ExportMigrationProgress
} from '@/services/firebaseExportMigration';

const FirebaseMigration: React.FC = () => {
    const [migrationMode, setMigrationMode] = useState<'direct' | 'export'>('direct');
    const [migrationStatus, setMigrationStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
    const [progress, setProgress] = useState<MigrationProgress | null>(null);
    const [exportProgress, setExportProgress] = useState<ExportMigrationProgress | null>(null);
    const [result, setResult] = useState<MigrationResult | null>(null);
    const [exportResult, setExportResult] = useState<ExportMigrationResult | null>(null);
    const [oldStats, setOldStats] = useState<{ [collection: string]: number } | null>(null);
    const [validationResult, setValidationResult] = useState<any>(null);
    const [selectedCollections, setSelectedCollections] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [exportData, setExportData] = useState<any>(null);
    const [exportInfo, setExportInfo] = useState<{ collections: string[]; totalDocuments: number } | null>(null);
    const [credentials, setCredentials] = useState({ email: '', password: '' });
    const [showCredentialsForm, setShowCredentialsForm] = useState(false);

    const AVAILABLE_COLLECTIONS = [
        { id: 'users', name: 'System Users', description: 'User accounts and permissions' },
        { id: 'customers', name: 'Customers', description: 'Customer master data with contacts' },
        { id: 'products', name: 'Products', description: 'Product catalog and inventory items' },
        { id: 'vendors', name: 'Vendors', description: 'Vendor and supplier information' },
        { id: 'quotes', name: 'Sales Quotes', description: 'Sales quotations and revisions' },
        { id: 'sales_orders', name: 'Sales Orders', description: 'Confirmed sales orders' },
        { id: 'delivery_orders', name: 'Delivery Orders', description: 'Delivery and dispatch records' },
        { id: 'purchase_orders', name: 'Purchase Orders', description: 'Purchase orders to vendors' },
        { id: 'stock_movements', name: 'Stock Movements', description: 'Inventory transactions' },
        { id: 'payroll_employees', name: 'Employees', description: 'Employee master data' },
        { id: 'payroll_advances', name: 'Advance Payments', description: 'Employee advance payments' },
        { id: 'payroll_records', name: 'Payroll Records', description: 'Processed payroll data' },
        { id: 'payroll_settings', name: 'Payroll Settings', description: 'Payroll configuration' },
        { id: 'chat_messages', name: 'Chat Messages', description: 'Internal communication' },
        { id: 'scratchpads', name: 'Scratchpads', description: 'Notes and calculations' },
        { id: 'settings', name: 'System Settings', description: 'Application configuration' },
        { id: 'company_settings', name: 'Company Settings', description: 'Company profile and details' }
    ];

    // Load old Firebase statistics
    useEffect(() => {
        loadOldFirebaseStats();
    }, []);

    const loadOldFirebaseStats = async () => {
        try {
            setLoading(true);
            const stats = await getOldFirebaseStats();
            setOldStats(stats);
            
            // Auto-select collections that have data
            const collectionsWithData = Object.keys(stats).filter(collection => stats[collection] > 0);
            setSelectedCollections(collectionsWithData);
        } catch (error) {
            console.error('Failed to load old Firebase stats:', error);
            alert('Failed to connect to old Firebase project. Please check the configuration.');
        } finally {
            setLoading(false);
        }
    };

    const handleExportFileUpload = async (file: File) => {
        try {
            setLoading(true);
            const fileContent = await file.text();
            const parseResult = parseFirebaseExport(fileContent);
            
            if (!parseResult.success) {
                alert('Failed to parse export file: ' + parseResult.error);
                return;
            }
            
            setExportData(parseResult.data);
            setExportInfo({
                collections: parseResult.collections,
                totalDocuments: parseResult.totalDocuments
            });
            
            // Auto-select all available collections from export
            setSelectedCollections(parseResult.collections);
            
        } catch (error) {
            console.error('Failed to read export file:', error);
            alert('Failed to read export file: ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    const handleExportMigration = async () => {
        if (!exportData) {
            alert('Please upload a Firebase export file first.');
            return;
        }
        
        if (selectedCollections.length === 0) {
            alert('Please select at least one collection to migrate.');
            return;
        }

        const confirmed = window.confirm(
            `Are you sure you want to migrate ${selectedCollections.length} collections from the export file?\n\n` +
            `This will import data into the current Firebase project. ` +
            `Existing data with the same IDs will be overwritten.\n\n` +
            `Selected collections: ${selectedCollections.join(', ')}`
        );

        if (!confirmed) return;

        setMigrationStatus('running');
        setExportResult(null);
        setValidationResult(null);

        try {
            const migrationResult = await migrateFromExport(
                exportData,
                (progressUpdate) => {
                    setExportProgress(progressUpdate);
                },
                selectedCollections
            );

            setExportResult(migrationResult);
            setMigrationStatus(migrationResult.success ? 'completed' : 'error');

        } catch (error) {
            console.error('Export migration failed:', error);
            setMigrationStatus('error');
            setExportResult({
                success: false,
                processedCollections: [],
                totalDocuments: 0,
                successfulDocuments: 0,
                failedDocuments: 0,
                errors: [error instanceof Error ? error.message : 'Unknown migration error'],
                warnings: []
            });
        }
    };

    const handleMigration = async () => {
        if (selectedCollections.length === 0) {
            alert('Please select at least one collection to migrate.');
            return;
        }

        const confirmed = window.confirm(
            `Are you sure you want to migrate ${selectedCollections.length} collections?\n\n` +
            `This will copy data from the old Firebase project to the current one. ` +
            `Existing data with the same IDs will be overwritten.\n\n` +
            `Selected collections: ${selectedCollections.join(', ')}`
        );

        if (!confirmed) return;

        setMigrationStatus('running');
        setResult(null);
        setValidationResult(null);

        try {
            const migrationResult = await migrateAllData(
                (progressUpdate) => {
                    setProgress(progressUpdate);
                },
                selectedCollections,
                credentials.email && credentials.password ? credentials : undefined
            );

            setResult(migrationResult);
            setMigrationStatus(migrationResult.success ? 'completed' : 'error');

        } catch (error) {
            console.error('Migration failed:', error);
            setMigrationStatus('error');
            setResult({
                success: false,
                collectionResults: [],
                totalDocuments: 0,
                successfulDocuments: 0,
                failedDocuments: 0,
                errors: [error instanceof Error ? error.message : 'Unknown migration error']
            });
        }
    };

    const handleValidation = async () => {
        try {
            setLoading(true);
            let validation;
            
            if (migrationMode === 'export' && exportResult) {
                validation = await validateExportMigration(exportResult.processedCollections);
            } else {
                validation = await validateMigration();
            }
            
            setValidationResult(validation);
        } catch (error) {
            console.error('Validation failed:', error);
            alert('Validation failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    const toggleCollection = (collectionId: string) => {
        setSelectedCollections(prev => 
            prev.includes(collectionId)
                ? prev.filter(id => id !== collectionId)
                : [...prev, collectionId]
        );
    };

    const selectAll = () => {
        const allIds = AVAILABLE_COLLECTIONS.map(c => c.id);
        setSelectedCollections(allIds);
    };

    const selectNone = () => {
        setSelectedCollections([]);
    };

    const selectWithData = () => {
        if (migrationMode === 'export' && exportInfo) {
            setSelectedCollections(exportInfo.collections);
        } else if (oldStats) {
            const collectionsWithData = Object.keys(oldStats).filter(collection => oldStats[collection] > 0);
            setSelectedCollections(collectionsWithData);
        }
    };

    const getTotalDocuments = () => {
        if (migrationMode === 'export' && exportData) {
            return selectedCollections.reduce((total, collection) => {
                const collectionData = exportData[collection];
                if (collectionData && typeof collectionData === 'object') {
                    return total + Object.keys(collectionData).length;
                }
                return total;
            }, 0);
        } else if (oldStats) {
            return selectedCollections.reduce((total, collection) => total + (oldStats[collection] || 0), 0);
        }
        return 0;
    };

    const getCollectionDocumentCount = (collectionId: string) => {
        if (migrationMode === 'export' && exportData) {
            const collectionData = exportData[collectionId];
            if (collectionData && typeof collectionData === 'object') {
                return Object.keys(collectionData).length;
            }
            return 0;
        } else {
            return oldStats?.[collectionId] || 0;
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-6">
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white">
                        <Database size={24} />
                    </div>
                    Firebase Data Migration
                </h1>
                <p className="text-slate-600 dark:text-slate-400">
                    Migrate data from your old Firebase project (oms1-438fd) to the current project
                </p>
            </div>

            {/* Migration Status */}
            {migrationStatus === 'running' && progress && (
                <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <RefreshCw size={20} className="animate-spin text-blue-600" />
                        <h3 className="font-semibold text-blue-800 dark:text-blue-200">Migration in Progress</h3>
                    </div>
                    
                    <div className="space-y-3">
                        <div>
                            <div className="flex justify-between text-sm mb-1">
                                <span>Collections: {progress.completedCollections}/{progress.totalCollections}</span>
                                <span>{Math.round((progress.completedCollections / progress.totalCollections) * 100)}%</span>
                            </div>
                            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                                <div 
                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${(progress.completedCollections / progress.totalCollections) * 100}%` }}
                                />
                            </div>
                        </div>
                        
                        {progress.totalDocuments > 0 && (
                            <div>
                                <div className="flex justify-between text-sm mb-1">
                                    <span>Documents: {progress.currentDocuments}/{progress.totalDocuments}</span>
                                    <span>{Math.round((progress.currentDocuments / progress.totalDocuments) * 100)}%</span>
                                </div>
                                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                                    <div 
                                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${(progress.currentDocuments / progress.totalDocuments) * 100}%` }}
                                    />
                                </div>
                            </div>
                        )}
                        
                        <div className="text-sm text-slate-600 dark:text-slate-400">
                            <strong>Status:</strong> {progress.message}
                        </div>
                        
                        {progress.currentCollection && (
                            <div className="text-sm text-blue-600 dark:text-blue-400">
                                <strong>Current:</strong> {progress.currentCollection}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Migration Result */}
            {result && migrationStatus !== 'running' && (
                <div className={`mb-6 p-6 rounded-lg border ${
                    result.success 
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                }`}>
                    <div className="flex items-center gap-3 mb-4">
                        {result.success ? (
                            <CheckCircle size={20} className="text-green-600" />
                        ) : (
                            <XCircle size={20} className="text-red-600" />
                        )}
                        <h3 className={`font-semibold ${
                            result.success ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'
                        }`}>
                            Migration {result.success ? 'Completed Successfully' : 'Failed'}
                        </h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-lg">
                            <p className="text-2xl font-bold text-blue-600">{result.totalDocuments}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Total Documents</p>
                        </div>
                        <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-lg">
                            <p className="text-2xl font-bold text-green-600">{result.successfulDocuments}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Migrated</p>
                        </div>
                        <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-lg">
                            <p className="text-2xl font-bold text-red-600">{result.failedDocuments}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Failed</p>
                        </div>
                    </div>
                    
                    {result.errors.length > 0 && (
                        <div className="bg-red-100 dark:bg-red-900/30 p-3 rounded-lg">
                            <h4 className="font-semibold text-red-800 dark:text-red-200 mb-2">Errors:</h4>
                            <ul className="text-sm text-red-700 dark:text-red-300 space-y-1">
                                {result.errors.map((error, index) => (
                                    <li key={index}>• {error}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                    
                    <div className="mt-4 flex gap-2">
                        <Button 
                            onClick={handleValidation}
                            disabled={loading}
                            variant="secondary"
                            icon={<FileCheck size={16} />}
                        >
                            Validate Migration
                        </Button>
                        <Button 
                            onClick={loadOldFirebaseStats}
                            disabled={loading}
                            variant="secondary"
                            icon={<RefreshCw size={16} />}
                        >
                            Refresh Stats
                        </Button>
                    </div>
                </div>
            )}

            {/* Validation Result */}
            {validationResult && (
                <div className={`mb-6 p-6 rounded-lg border ${
                    validationResult.success
                        ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                }`}>
                    <div className="flex items-center gap-3 mb-4">
                        {validationResult.success ? (
                            <CheckCircle size={20} className="text-green-600" />
                        ) : (
                            <AlertTriangle size={20} className="text-amber-600" />
                        )}
                        <h3 className={`font-semibold ${
                            validationResult.success 
                                ? 'text-green-800 dark:text-green-200' 
                                : 'text-amber-800 dark:text-amber-200'
                        }`}>
                            Migration Validation Results
                        </h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                        <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-lg">
                            <p className="text-2xl font-bold text-slate-700 dark:text-slate-300">{validationResult.summary.totalCollections}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Total Collections</p>
                        </div>
                        <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-lg">
                            <p className="text-2xl font-bold text-green-600">{validationResult.summary.matchingCollections}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Matching</p>
                        </div>
                        <div className="text-center p-3 bg-white dark:bg-slate-800 rounded-lg">
                            <p className="text-2xl font-bold text-red-600">{validationResult.summary.mismatchedCollections}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400">Mismatched</p>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-700">
                                    <th className="text-left py-2">Collection</th>
                                    <th className="text-center py-2">Old Count</th>
                                    <th className="text-center py-2">New Count</th>
                                    <th className="text-center py-2">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {validationResult.collections.map((collection: any) => (
                                    <tr key={collection.name} className="border-b border-slate-100 dark:border-slate-800">
                                        <td className="py-2 font-medium">{collection.name}</td>
                                        <td className="text-center py-2">{collection.oldCount}</td>
                                        <td className="text-center py-2">{collection.newCount}</td>
                                        <td className="text-center py-2">
                                            {collection.matches ? (
                                                <CheckCircle size={16} className="text-green-600 mx-auto" />
                                            ) : (
                                                <XCircle size={16} className="text-red-600 mx-auto" />
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Collection Selection */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Select Collections to Migrate</h3>
                    <div className="flex gap-2">
                        <Button onClick={selectAll} variant="secondary" size="sm">Select All</Button>
                        <Button onClick={selectWithData} variant="secondary" size="sm">Select With Data</Button>
                        <Button onClick={selectNone} variant="secondary" size="sm">Select None</Button>
                    </div>
                </div>
                
                {loading ? (
                    <div className="flex items-center justify-center py-8">
                        <RefreshCw size={24} className="animate-spin text-blue-600" />
                        <span className="ml-2">Loading collection statistics...</span>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {AVAILABLE_COLLECTIONS.map((collection) => {
                                const documentCount = oldStats?.[collection.id] || 0;
                                const isSelected = selectedCollections.includes(collection.id);
                                
                                return (
                                    <div
                                        key={collection.id}
                                        onClick={() => toggleCollection(collection.id)}
                                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                                            isSelected
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <h4 className="font-medium">{collection.name}</h4>
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                    documentCount > 0
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                                                        : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                                                }`}>
                                                    {documentCount} docs
                                                </span>
                                                {isSelected && <CheckCircle size={16} className="text-blue-600" />}
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-400">{collection.description}</p>
                                    </div>
                                );
                            })}
                        </div>
                        
                        <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600 dark:text-slate-400">
                                    Selected: {selectedCollections.length} collections
                                </span>
                                <span className="text-sm font-medium">
                                    Total documents to migrate: {getTotalDocuments().toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Authentication for Old Firebase */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Shield size={20} />
                    Authentication for Old Firebase
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    To access data from your old Firebase project (oms1-438fd), please provide your credentials:
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            value={credentials.email}
                            onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                            placeholder="Enter your email"
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Password
                        </label>
                        <input
                            type="password"
                            value={credentials.password}
                            onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                            placeholder="Enter your password"
                            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                </div>
                
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="flex items-start gap-2">
                        <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-amber-800 dark:text-amber-200">
                            <strong>Security Note:</strong> Your credentials are only used to authenticate with the old Firebase project during migration. They are not stored or transmitted elsewhere.
                        </div>
                    </div>
                </div>
            </div>

            {/* Migration Controls */}
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold mb-4">Migration Controls</h3>
                
                <div className="flex items-center gap-4">
                    <Button
                        onClick={handleMigration}
                        disabled={migrationStatus === 'running' || selectedCollections.length === 0}
                        icon={<Play size={16} />}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        Start Migration
                    </Button>
                    
                    <Button
                        onClick={loadOldFirebaseStats}
                        disabled={loading || migrationStatus === 'running'}
                        variant="secondary"
                        icon={<RefreshCw size={16} />}
                    >
                        Refresh Statistics
                    </Button>
                    
                    <Button
                        onClick={handleValidation}
                        disabled={loading}
                        variant="secondary"
                        icon={<FileCheck size={16} />}
                    >
                        Validate Migration
                    </Button>
                </div>
                
                <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="flex items-start gap-2">
                        <AlertTriangle size={16} className="text-amber-600 mt-0.5" />
                        <div className="text-sm">
                            <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">Important Notes:</p>
                            <ul className="text-amber-700 dark:text-amber-300 space-y-1">
                                <li>• This will copy data from your old Firebase project (oms1-438fd)</li>
                                <li>• Documents with the same IDs will be overwritten in the current project</li>
                                <li>• Large datasets may take several minutes to migrate</li>
                                <li>• Validate the migration after completion to ensure data integrity</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FirebaseMigration;


import React, { useState, useEffect, useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
const { Link, useNavigate, useLocation } = ReactRouterDOM;
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Plus, FileUp, Edit, Trash2, Eye, ArrowUpDown, Download, Loader } from 'lucide-react';
import { Quote, DocumentStatus, PointOfContact } from '@/types';
import { db, Timestamp, DocumentSnapshot } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { canPerformAction } from '@/utils/permissions';
import { getDocumentNumberingSettings } from '../settings/DocumentNumbering';
import { getPointsOfContact } from '@/services/pointOfContactService';
import { collection, query, orderBy, getDocs, doc, getDoc, updateDoc, writeBatch, addDoc, deleteDoc } from 'firebase/firestore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useSearchableList } from '@/hooks/useSearchableList';
import SearchableInput from '@/components/ui/SearchableInput';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ReactDOM from 'react-dom/client';
import { getPdfSettings } from '../settings/pdfSettingsService';
import { getCompanyDetails } from '../settings/CompanyDetails';
import PrintWrapper from '../Print/PrintWrapper';
import QuotePrint from '../Print/QuotePrint';


// --- FIRESTORE DATA SERVICE ---
const processDoc = (docSnap: DocumentSnapshot): Quote => {
    const data = docSnap.data() as any;
    if (data.issueDate && data.issueDate instanceof Timestamp) {
        data.issueDate = data.issueDate.toDate().toISOString();
    }
    if (data.expiryDate && data.expiryDate instanceof Timestamp) {
        data.expiryDate = data.expiryDate.toDate().toISOString();
    }
    return { id: docSnap.id, ...data } as Quote;
};

export const getQuotes = async (): Promise<Quote[]> => {
    const q = query(collection(db, "quotes"), orderBy("issueDate", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(processDoc);
}

export const getQuote = async (id: string): Promise<Quote | undefined> => {
    const docRef = doc(db, 'quotes', id);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? processDoc(docSnap) : undefined;
};

export const saveQuote = async (quote: Omit<Quote, 'status' | 'quoteNumber'> & { id?: string }): Promise<Quote> => {
    const { id, ...dataToSave } = quote;
    const batch = writeBatch(db);

    if (id) { // Update
        const quoteRef = doc(db, 'quotes', id);
        batch.update(quoteRef, { ...dataToSave, issueDate: Timestamp.fromDate(new Date(dataToSave.issueDate)), expiryDate: Timestamp.fromDate(new Date(dataToSave.expiryDate)) });
        await batch.commit();
        const updatedDoc = await getQuote(id);
        if (!updatedDoc) throw new Error("Could not retrieve updated quote.");
        return updatedDoc;

    } else { // Create
        const settings = await getDocumentNumberingSettings();
        const qSettings = settings.quote;
        const prefix = qSettings.prefix.replace('{CUST}', dataToSave.customerName.substring(0, 4).toUpperCase());
        const suffix = qSettings.suffix.replace('{CUST}', dataToSave.customerName.substring(0, 4).toUpperCase());
        const newNumber = `${prefix}${String(qSettings.nextNumber).padStart(4, '0')}${suffix}`;
        
        const newQuoteData = {
            ...dataToSave,
            quoteNumber: newNumber,
            revisionNumber: 0,
            status: DocumentStatus.Draft,
            issueDate: Timestamp.fromDate(new Date(dataToSave.issueDate)),
            expiryDate: Timestamp.fromDate(new Date(dataToSave.expiryDate))
        };
        
        const newQuoteRef = doc(collection(db, 'quotes'));
        batch.set(newQuoteRef, newQuoteData);
        
        const settingsRef = doc(db, 'settings', 'docNumbering');
        settings.quote.nextNumber++;
        batch.set(settingsRef, settings);
        
        await batch.commit();

        const savedDoc = await getQuote(newQuoteRef.id);
        if (!savedDoc) throw new Error("Could not retrieve saved quote.");
        return savedDoc;
    }
};

export const updateQuote = async (updatedQuote: Quote): Promise<Quote> => {
    const { id, ...restOfQuote } = updatedQuote;
    await updateDoc(doc(db, 'quotes', id), {
        ...restOfQuote,
        issueDate: Timestamp.fromDate(new Date(updatedQuote.issueDate)),
        expiryDate: Timestamp.fromDate(new Date(updatedQuote.expiryDate)),
    });
    return updatedQuote;
}

export const deleteQuote = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, "quotes", id));
};

export const updateQuoteStatus = async (id: string, status: DocumentStatus): Promise<void> => {
    const quoteRef = doc(db, 'quotes', id);
    await updateDoc(quoteRef, { status });
};
// --- END FIRESTORE DATA SERVICE ---


const statusColors: { [key in DocumentStatus]?: string } = {
    [DocumentStatus.Draft]: 'bg-slate-100 text-slate-800 dark:bg-slate-600 dark:text-slate-200',
    [DocumentStatus.Sent]: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100',
    [DocumentStatus.Discussion]: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-800 dark:text-cyan-100',
    [DocumentStatus.Approved]: 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100',
    [DocumentStatus.Closed]: 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100',
    [DocumentStatus.Rejected]: 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100',
    [DocumentStatus.Superseded]: 'bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200 line-through',
};

type SortKey = 'quoteNumber' | 'customerName' | 'pointOfContact' | 'issueDate' | 'total' | 'status';

const isClosedStatus = (status: DocumentStatus) => 
    [DocumentStatus.Closed, DocumentStatus.Rejected, DocumentStatus.Superseded].includes(status);


const QuoteList: React.FC = () => {
    const { user } = useAuth();
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [pointsOfContact, setPointsOfContact] = useState<PointOfContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>({ key: 'issueDate', direction: 'descending' });
    const [generatingPdfId, setGeneratingPdfId] = useState<string | null>(null);
    const navigate = useNavigate();
    const location = useLocation();

    const canCreate = canPerformAction(user, 'create');
    const canEdit = canPerformAction(user, 'edit');
    const canDelete = canPerformAction(user, 'delete');
    
    const { searchInputRef } = useKeyboardShortcuts({
        newItemPath: '/sales/quotes/new',
        canCreate,
        searchTerm,
        setSearchTerm
    });
    
    const {
        filteredItems: searchResults,
        selectedIndex,
        showResults,
        handleInputFocus,
        handleInputChange,
        selectItem
    } = useSearchableList({
        items: quotes,
        searchTerm,
        setSearchTerm,
        getItemId: (quote) => quote.id,
        getItemUrl: (quote) => `/sales/quotes/${quote.id}/view`,
        searchFields: ['quoteNumber', 'customerName']
    });

    const fetchQuotes = async () => {
        setLoading(true);
        try {
            const [quotesData, contactsData] = await Promise.all([
                getQuotes(),
                getPointsOfContact()
            ]);
            setQuotes(quotesData);
            setPointsOfContact(contactsData);
            setLoading(false);
        } catch (err: any) {
            alert(`Error fetching quotes: ${err.message}`);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuotes();
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const status = params.get('statusFilter');
        if (status) {
            setStatusFilter(status);
        }
    }, [location.search]);

    const handleStatusChange = async (quoteId: string, newStatus: DocumentStatus) => {
        setUpdatingStatusId(quoteId);
        try {
            const quoteRef = doc(db, 'quotes', quoteId);
            await updateDoc(quoteRef, { status: newStatus });
            setQuotes(prevQuotes => prevQuotes.map(p => p.id === quoteId ? { ...p, status: newStatus } : p));
        } catch (error) {
            console.error("Failed to update status", error);
            alert("Failed to update status.");
        } finally {
            setUpdatingStatusId(null);
        }
    };

    const handleDelete = (id: string) => {
        if (window.confirm("Are you sure you want to delete this quote?")) {
            deleteQuote(id).then(fetchQuotes).catch(err => {
                console.error("Failed to delete quote:", err);
                alert("An error occurred while deleting the quote.");
            });
        }
    };

    const handleDownloadPdf = async (quote: Quote) => {
        setGeneratingPdfId(quote.id);
        try {
            const [companyDetails, pdfSettings] = await Promise.all([
                getCompanyDetails(),
                getPdfSettings()
            ]);

            if (!companyDetails || !pdfSettings) {
                alert('Company details or PDF settings not found');
                return;
            }

            const ITEMS_PER_PAGE = 12;
            const pdf = new jsPDF('p', 'mm', 'a4');
            const totalPages = Math.max(1, Math.ceil(quote.lineItems.length / ITEMS_PER_PAGE));
        
            for (let i = 0; i < totalPages; i++) {
                const itemStartIndex = i * ITEMS_PER_PAGE;
                const chunk = quote.lineItems.slice(itemStartIndex, itemStartIndex + ITEMS_PER_PAGE);
                const pageQuote = { ...quote, lineItems: chunk };
                const isLastPage = i === totalPages - 1;

                const printContainer = document.createElement('div');
                printContainer.style.position = 'absolute';
                printContainer.style.left = '-9999px';
                document.body.appendChild(printContainer);

                const root = ReactDOM.createRoot(printContainer);
                root.render(
                    <PrintWrapper companyDetails={companyDetails} settings={pdfSettings} currentPage={i + 1} totalPages={totalPages}>
                        <QuotePrint 
                            quote={pageQuote} 
                            settings={pdfSettings} 
                            companyDetails={companyDetails}
                            isLastPage={isLastPage}
                            itemStartIndex={itemStartIndex}
                            pointOfContact={pointsOfContact.find(p => p.id === quote.pointOfContactId)}
                        />
                    </PrintWrapper>
                );

                await new Promise(resolve => setTimeout(resolve, 100));

                const canvas = await html2canvas(printContainer, {
                    scale: 2,
                    useCORS: true,
                    allowTaint: true,
                });

                const imgData = canvas.toDataURL('image/png');
                const imgWidth = pdf.internal.pageSize.getWidth();
                const imgHeight = (canvas.height * imgWidth) / canvas.width;

                if (i > 0) pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

                root.unmount();
                document.body.removeChild(printContainer);
            }

            pdf.save(`${quote.quoteNumber}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF');
        } finally {
            setGeneratingPdfId(null);
        }
    };

    const requestSort = (key: SortKey) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getPointOfContactName = (pointOfContactId?: string) => {
        if (!pointOfContactId) return 'Not Set';
        const contact = pointsOfContact.find(c => c.id === pointOfContactId);
        return contact ? contact.name : 'Unknown';
    };

    const sortedAndFilteredQuotes = useMemo(() => {
        let sortableItems = [...quotes];

        if (statusFilter !== 'all') {
            if (statusFilter === 'open') {
                sortableItems = sortableItems.filter(q => 
                    [DocumentStatus.Draft, DocumentStatus.Sent, DocumentStatus.Discussion, DocumentStatus.Approved].includes(q.status)
                );
            } else {
                sortableItems = sortableItems.filter(q => q.status === statusFilter);
            }
        }

        if (searchTerm) {
            sortableItems = sortableItems.filter(q =>
                q.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                q.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                getPointOfContactName(q.pointOfContactId).toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        sortableItems.sort((a, b) => {
            const aClosed = isClosedStatus(a.status) ? 1 : 0;
            const bClosed = isClosedStatus(b.status) ? 1 : 0;
            if (aClosed !== bClosed) {
                return aClosed - bClosed;
            }

            if (sortConfig !== null) {
                if (sortConfig.key === 'pointOfContact') {
                    const aValue = getPointOfContactName(a.pointOfContactId);
                    const bValue = getPointOfContactName(b.pointOfContactId);
                    if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                    if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                } else {
                    const aValue = a[sortConfig.key];
                    const bValue = b[sortConfig.key];
                    
                    if (sortConfig.key === 'issueDate') {
                       return sortConfig.direction === 'ascending' ? new Date(aValue).getTime() - new Date(bValue).getTime() : new Date(bValue).getTime() - new Date(aValue).getTime();
                    }

                    if (aValue < bValue) {
                        return sortConfig.direction === 'ascending' ? -1 : 1;
                    }
                    if (aValue > bValue) {
                        return sortConfig.direction === 'ascending' ? 1 : -1;
                    }
                }
            }
            return 0;
        });
        return sortableItems;
    }, [quotes, pointsOfContact, searchTerm, sortConfig, statusFilter]);

    const SortableHeader: React.FC<{ sortKey: SortKey, children: React.ReactNode}> = ({ sortKey, children }) => (
        <th scope="col" className="px-4 py-2 cursor-pointer" onClick={() => requestSort(sortKey)}>
            <div className="flex items-center">
                {children}
                <ArrowUpDown size={14} className="ml-2 opacity-50"/>
            </div>
        </th>
    );

    return (
        <Card title="Quotes" actions={canCreate && <Button to="/sales/quotes/new" icon={<Plus size={16} />} shortcut="Ctrl+N">New Quote</Button>} bodyClassName="">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex flex-wrap gap-3 items-center">
                <SearchableInput
                    searchInputRef={searchInputRef}
                    searchTerm={searchTerm}
                    placeholder="Search quotes... (Press '/' to focus, ↑↓ to navigate, ↵ to select)"
                    filteredItems={searchResults}
                    selectedIndex={selectedIndex}
                    showResults={showResults}
                    onInputChange={handleInputChange}
                    onInputFocus={handleInputFocus}
                    onItemSelect={selectItem}
                    className="w-full sm:w-1/3"
                    renderItem={(quote, index, isSelected) => (
                        <div className="flex justify-between items-center">
                            <div>
                                <div className="font-medium">{quote.quoteNumber}</div>
                                <div className="text-xs opacity-75">{quote.customerName}</div>
                            </div>
                            <div className="text-xs opacity-60">
                                ₹{quote.total.toLocaleString()}
                            </div>
                        </div>
                    )}
                />
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full sm:w-auto px-3 py-1.5 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm"
                >
                    <option value="all">All Statuses</option>
                    <option value="open">All Open</option>
                    <option value={DocumentStatus.Draft}>Draft</option>
                    <option value={DocumentStatus.Sent}>Sent</option>
                    <option value={DocumentStatus.Discussion}>Discussion</option>
                    <option value={DocumentStatus.Approved}>Approved</option>
                    <option value={DocumentStatus.Closed}>Closed</option>
                    <option value={DocumentStatus.Rejected}>Rejected</option>
                    <option value={DocumentStatus.Superseded}>Superseded</option>
                </select>
            </div>
            {loading ? (
                <p className="p-3 text-center text-sm">Loading quotes...</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left text-slate-500 dark:text-slate-400">
                        <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-700">
                            <tr>
                                <SortableHeader sortKey="quoteNumber">Quote #</SortableHeader>
                                <SortableHeader sortKey="customerName">Customer</SortableHeader>
                                <SortableHeader sortKey="pointOfContact">Point of Contact</SortableHeader>
                                <SortableHeader sortKey="issueDate">Date</SortableHeader>
                                <SortableHeader sortKey="total">Total</SortableHeader>
                                <SortableHeader sortKey="status">Status</SortableHeader>
                                <th className="px-4 py-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedAndFilteredQuotes.map(q => (
                                <tr key={q.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                                    <td className="px-4 py-2 font-bold">
                                        <Link to={`/sales/quotes/${q.id}/view`} className="text-primary hover:underline">
                                            {q.quoteNumber}{q.revisionNumber ? `-Rev${q.revisionNumber}` : ''}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-2">{q.customerName}</td>
                                    <td className="px-4 py-2">
                                        <span className={`text-xs ${!q.pointOfContactId ? 'text-slate-400 italic' : ''}`}>
                                            {getPointOfContactName(q.pointOfContactId)}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2">{new Date(q.issueDate).toLocaleDateString('en-GB')}</td>
                                    <td className="px-4 py-2 font-medium">₹{q.total.toLocaleString()}</td>
                                    <td className="px-4 py-2">
                                        <select
                                            value={q.status}
                                            onChange={(e) => handleStatusChange(q.id, e.target.value as DocumentStatus)}
                                            disabled={updatingStatusId === q.id || isClosedStatus(q.status)}
                                            className={`w-28 p-1 text-xs font-medium rounded border-0 focus:ring-1 focus:ring-primary ${statusColors[q.status]}`}
                                        >
                                            {Object.values(DocumentStatus).filter(s => ![DocumentStatus.Dispatched, DocumentStatus.Partial, DocumentStatus.Superseded].includes(s)).map(status => (
                                                <option key={status} value={status}>{status}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        <div className="flex items-center justify-end space-x-1">
                                            {canCreate && q.status === DocumentStatus.Approved && !q.linkedSalesOrderId && (
                                                <Button size="sm" onClick={() => navigate(`/sales/orders/new/${q.id}`)} icon={<FileUp size={14} />}>
                                                    Create SO
                                                </Button>
                                            )}
                                            <button 
                                                onClick={() => handleDownloadPdf(q)} 
                                                disabled={generatingPdfId === q.id}
                                                className="p-2 text-blue-600 hover:bg-blue-100 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
                                                title="Download PDF"
                                            >
                                                {generatingPdfId === q.id ? <Loader size={16} className="animate-spin" /> : <Download size={16} />}
                                            </button>
                                            <Link to={`/sales/quotes/${q.id}/view`} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full"><Eye size={16} /></Link>
                                            {!isClosedStatus(q.status) && (
                                                <>
                                                    {canEdit && <Link to={`/sales/quotes/${q.id}/edit`} className="p-2 text-primary hover:bg-primary-light rounded-full"><Edit size={16} /></Link>}
                                                    {canDelete && <button onClick={() => handleDelete(q.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-full"><Trash2 size={16} /></button>}
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {sortedAndFilteredQuotes.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
                                        No quotes found. <Link to="/sales/quotes/new" className="text-primary hover:underline">Create one!</Link>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </Card>
    );
};

export default QuoteList;
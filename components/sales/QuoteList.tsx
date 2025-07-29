

import React, { useState, useEffect, useMemo } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
const { Link, useNavigate, useLocation } = ReactRouterDOM;
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { Plus, FileUp, Edit, Trash2, Eye, ArrowUpDown } from 'lucide-react';
import { Quote, DocumentStatus } from '@/types';
import { db, Timestamp, DocumentSnapshot } from '@/services/firebase';
import { getDocumentNumberingSettings } from '../settings/DocumentNumbering';
import { collection, query, orderBy, getDocs, doc, getDoc, updateDoc, writeBatch, addDoc, deleteDoc } from 'firebase/firestore';


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

const deleteQuote = async (id: string): Promise<void> => {
    await deleteDoc(doc(db, "quotes", id));
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

type SortKey = 'quoteNumber' | 'customerName' | 'issueDate' | 'total' | 'status';

const isClosedStatus = (status: DocumentStatus) => 
    [DocumentStatus.Closed, DocumentStatus.Rejected, DocumentStatus.Superseded].includes(status);


const QuoteList: React.FC = () => {
    const [quotes, setQuotes] = useState<Quote[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'ascending' | 'descending' } | null>({ key: 'issueDate', direction: 'descending' });
    const navigate = useNavigate();
    const location = useLocation();

    const fetchQuotes = () => {
        setLoading(true);
        getQuotes().then(data => {
            setQuotes(data);
            setLoading(false);
        }).catch(err => {
            alert(`Error fetching quotes: ${err.message}`);
            setLoading(false);
        });
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

    const requestSort = (key: SortKey) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
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
                q.customerName.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        sortableItems.sort((a, b) => {
            const aClosed = isClosedStatus(a.status) ? 1 : 0;
            const bClosed = isClosedStatus(b.status) ? 1 : 0;
            if (aClosed !== bClosed) {
                return aClosed - bClosed;
            }

            if (sortConfig !== null) {
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
            return 0;
        });
        return sortableItems;
    }, [quotes, searchTerm, sortConfig, statusFilter]);

    const SortableHeader: React.FC<{ sortKey: SortKey, children: React.ReactNode}> = ({ sortKey, children }) => (
        <th scope="col" className="px-6 py-3 cursor-pointer" onClick={() => requestSort(sortKey)}>
            <div className="flex items-center">
                {children}
                <ArrowUpDown size={14} className="ml-2 opacity-50"/>
            </div>
        </th>
    );

    return (
        <Card title="Quotes" actions={<Button to="/sales/quotes/new" icon={<Plus size={16} />}>New Quote</Button>} bodyClassName="">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-wrap gap-4 items-center">
                <input
                    type="text"
                    placeholder="Filter by quote # or customer..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full sm:w-1/3 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm"
                />
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full sm:w-auto px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm"
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
                <p className="p-4 text-center">Loading quotes...</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                        <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-50 dark:bg-slate-700">
                            <tr>
                                <SortableHeader sortKey="quoteNumber">Quote #</SortableHeader>
                                <SortableHeader sortKey="customerName">Customer</SortableHeader>
                                <SortableHeader sortKey="issueDate">Date</SortableHeader>
                                <SortableHeader sortKey="total">Total</SortableHeader>
                                <SortableHeader sortKey="status">Status</SortableHeader>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sortedAndFilteredQuotes.map(q => (
                                <tr key={q.id} className="bg-white dark:bg-slate-800 border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600">
                                    <td className="px-6 py-4 font-bold">
                                        <Link to={`/sales/quotes/${q.id}/view`} className="text-primary hover:underline">
                                            {q.quoteNumber}{q.revisionNumber ? `-Rev${q.revisionNumber}` : ''}
                                        </Link>
                                    </td>
                                    <td className="px-6 py-4">{q.customerName}</td>
                                    <td className="px-6 py-4">{new Date(q.issueDate).toLocaleDateString('en-GB')}</td>
                                    <td className="px-6 py-4">₹{q.total.toFixed(2)}</td>
                                    <td className="px-6 py-4">
                                        <select
                                            value={q.status}
                                            onChange={(e) => handleStatusChange(q.id, e.target.value as DocumentStatus)}
                                            disabled={updatingStatusId === q.id || isClosedStatus(q.status)}
                                            className={`w-32 p-1 text-xs font-medium rounded-md border-0 focus:ring-2 focus:ring-primary ${statusColors[q.status]}`}
                                        >
                                            {Object.values(DocumentStatus).filter(s => ![DocumentStatus.Dispatched, DocumentStatus.Partial, DocumentStatus.Superseded].includes(s)).map(status => (
                                                <option key={status} value={status}>{status}</option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex items-center justify-end space-x-2">
                                            {q.status === DocumentStatus.Approved && !q.linkedSalesOrderId && (
                                                <Button size="sm" onClick={() => navigate(`/sales/orders/new/${q.id}`)} icon={<FileUp size={14} />}>
                                                    Create SO
                                                </Button>
                                            )}
                                            <Link to={`/sales/quotes/${q.id}/view`} className="p-2 text-slate-500 hover:bg-slate-100 rounded-full"><Eye size={16} /></Link>
                                            {!isClosedStatus(q.status) && (
                                                <>
                                                    <Link to={`/sales/quotes/${q.id}/edit`} className="p-2 text-primary hover:bg-primary-light rounded-full"><Edit size={16} /></Link>
                                                    <button onClick={() => handleDelete(q.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-full"><Trash2 size={16} /></button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {sortedAndFilteredQuotes.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
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
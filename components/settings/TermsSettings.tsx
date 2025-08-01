

import React, { useState, useEffect } from 'react';
import { getTerms, saveTerms } from '@/components/settings/termsService';
import Button from '@/components/ui/Button';
import { Loader, Trash2, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';

const TermsSettings: React.FC = () => {
    const { user } = useAuth();
    const [terms, setTerms] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const isViewer = user?.role === UserRole.Viewer;

    useEffect(() => {
        setLoading(true);
        getTerms().then(data => {
            setTerms(data);
            setLoading(false);
        });
    }, []);

    const handleTermChange = (index: number, value: string) => {
        const newTerms = [...terms];
        newTerms[index] = value;
        setTerms(newTerms);
    };

    const addTerm = () => {
        if (isViewer) return;
        setTerms([...terms, '']);
    };

    const removeTerm = (index: number) => {
        if (isViewer) return;
        setTerms(terms.filter((_, i) => i !== index));
    };

    const handleSave = () => {
        if (isViewer) return;
        // Filter out any empty terms before saving
        const termsToSave = terms.filter(term => term.trim() !== '');
        setSaving(true);
        saveTerms(termsToSave).then((savedTerms) => {
            setTerms(savedTerms); // Update state with the cleaned terms
            alert('Terms saved successfully!');
            setSaving(false);
        });
    };

    if (loading) {
        return <Loader className="animate-spin" />;
    }

    return (
        <div>
            <h4 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">Terms & Conditions</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">Manage pre-defined terms for your quotes. These can be selected during quote creation.</p>
            
            <div className="space-y-4">
                {terms.map((term, index) => (
                    <div key={index} className="flex items-center space-x-2">
                        <input
                            type="text"
                            value={term}
                            onChange={(e) => handleTermChange(index, e.target.value)}
                            disabled={saving || isViewer}
                            placeholder="Enter term..."
                            className="flex-grow mt-1 block w-full px-3 py-2 bg-white dark:bg-slate-700 dark:text-slate-100 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-slate-700 dark:disabled:text-slate-400"
                        />
                        {!isViewer && (
                            <Button variant="danger" size="sm" onClick={() => removeTerm(index)} disabled={saving} aria-label="Remove term">
                                <Trash2 size={16} />
                            </Button>
                        )}
                    </div>
                ))}
            </div>

            {!isViewer && (
                <div className="mt-4">
                    <Button variant="secondary" onClick={addTerm} disabled={saving} icon={<Plus size={16} />}>
                        Add New Term
                    </Button>
                </div>
            )}

            {!isViewer && (
                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 text-right">
                    <Button onClick={handleSave} disabled={saving || loading} icon={saving ? <Loader size={16} className="animate-spin" /> : null}>
                        {saving ? 'Saving...' : 'Save Terms'}
                    </Button>
                </div>
            )}
        </div>
    );
};

export default TermsSettings;
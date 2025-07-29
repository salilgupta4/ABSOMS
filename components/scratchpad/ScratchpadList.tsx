
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SquarePen, Plus, Trash2, Loader, Grid, FileText } from 'lucide-react';
import { Scratchpad, ScratchpadType } from '@/types';
import { getScratchpads, createScratchpad, deleteScratchpad } from '@/services/scratchpadService';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';

const ScratchpadList: React.FC = () => {
    const [scratchpads, setScratchpads] = useState<Scratchpad[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newScratchpadName, setNewScratchpadName] = useState('');
    const [newScratchpadType, setNewScratchpadType] = useState<ScratchpadType>('grid');
    const navigate = useNavigate();

    const fetchScratchpads = () => {
        setLoading(true);
        getScratchpads().then(data => {
            setScratchpads(data);
            setLoading(false);
        }).catch(err => {
            console.error(err);
            alert("Failed to load scratchpads.");
            setLoading(false);
        });
    };

    useEffect(() => {
        fetchScratchpads();
    }, []);

    const handleCreate = async () => {
        if (!newScratchpadName.trim()) {
            alert("Please enter a name for the scratchpad.");
            return;
        }
        setLoading(true);
        setIsModalOpen(false);
        try {
            const newScratchpad = await createScratchpad(newScratchpadName, newScratchpadType);
            setNewScratchpadName('');
            navigate(`/scratchpad/${newScratchpad.id}`);
        } catch (error) {
            alert("Failed to create scratchpad.");
            setLoading(false);
        }
    };
    
    const handleDelete = async (id: string, name: string) => {
        if(window.confirm(`Are you sure you want to delete the scratchpad "${name}"? This action cannot be undone.`)) {
            setLoading(true);
            try {
                await deleteScratchpad(id);
                fetchScratchpads();
            } catch (error) {
                alert("Failed to delete scratchpad.");
                setLoading(false);
            }
        }
    }

    return (
        <>
            <Card
                title="Scratchpads"
                icon={<SquarePen size={20} />}
                actions={<Button onClick={() => setIsModalOpen(true)} icon={<Plus size={16} />}>New Scratchpad</Button>}
            >
                {loading ? (
                    <div className="flex justify-center items-center p-8">
                        <Loader className="animate-spin" />
                    </div>
                ) : scratchpads.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                        <p>No scratchpads found.</p>
                        <Button onClick={() => setIsModalOpen(true)} size="sm" className="mt-4">Create your first one!</Button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {scratchpads.map(pad => (
                            <div key={pad.id} className="bg-white dark:bg-slate-800 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-slate-200 dark:border-slate-700 flex flex-col">
                                <div className="p-4 flex-grow cursor-pointer" onClick={() => navigate(`/scratchpad/${pad.id}`)}>
                                    <div className="flex items-center gap-2">
                                        {pad.type === 'grid' ? <Grid size={18} className="text-slate-500"/> : <FileText size={18} className="text-slate-500"/>}
                                        <h3 className="font-semibold text-lg text-primary dark:text-blue-400">{pad.name}</h3>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                        Last updated: {new Date(pad.updatedAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="p-2 border-t border-slate-100 dark:border-slate-700/50 flex justify-end">
                                     <button onClick={() => handleDelete(pad.id, pad.name)} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-slate-700 rounded-full">
                                        <Trash2 size={16} />
                                     </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Card>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Scratchpad">
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                            Scratchpad Type
                        </label>
                        <div className="flex gap-2">
                             <button onClick={() => setNewScratchpadType('grid')} className={`flex-1 p-4 rounded-md border-2 text-center ${newScratchpadType === 'grid' ? 'border-primary bg-primary-light' : 'bg-slate-100 hover:bg-slate-200'}`}>
                                <Grid className="mx-auto mb-2" /> Grid
                            </button>
                            <button onClick={() => setNewScratchpadType('notepad')} className={`flex-1 p-4 rounded-md border-2 text-center ${newScratchpadType === 'notepad' ? 'border-primary bg-primary-light' : 'bg-slate-100 hover:bg-slate-200'}`}>
                                <FileText className="mx-auto mb-2" /> Notepad
                            </button>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="scratchpadName" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Scratchpad Name
                        </label>
                        <input
                            id="scratchpadName"
                            type="text"
                            value={newScratchpadName}
                            onChange={(e) => setNewScratchpadName(e.target.value)}
                            className="w-full mt-1 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm"
                            placeholder="e.g., Q3 Pricelist, Meeting Notes"
                            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                        />
                    </div>
                    <div className="flex justify-end space-x-2 pt-4 border-t border-slate-200 dark:border-slate-700">
                        <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreate} disabled={loading}>Create</Button>
                    </div>
                </div>
            </Modal>
        </>
    );
};

export default ScratchpadList;

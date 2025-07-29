
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader } from 'lucide-react';
import { Scratchpad } from '@/types';
import * as scratchpadService from '@/services/scratchpadService';
import GridView from './GridView';
import NotepadView from './NotepadView';

const ScratchpadView: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [scratchpad, setScratchpad] = useState<Scratchpad | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) {
            navigate('/scratchpad');
            return;
        }
        setLoading(true);
        scratchpadService.getScratchpad(id).then(data => {
            if (data) {
                setScratchpad(data);
            } else {
                alert("Scratchpad not found.");
                navigate('/scratchpad');
            }
            setLoading(false);
        }).catch(err => {
            console.error(err);
            alert("Failed to load scratchpad.");
            navigate('/scratchpad');
        });
    }, [id, navigate]);

    if (loading || !scratchpad) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader size={48} className="animate-spin" />
            </div>
        );
    }
    
    if (scratchpad.type === 'notepad') {
        return <NotepadView scratchpad={scratchpad} />;
    }

    // Default to grid for legacy or unspecified types
    return <GridView scratchpad={scratchpad} />;
};

export default ScratchpadView;

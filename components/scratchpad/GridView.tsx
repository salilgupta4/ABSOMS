import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Loader, CheckCircle, Plus, SquarePen, ZoomIn, ZoomOut, Upload, Download, Copy, Trash2, Undo, Redo, Search } from 'lucide-react';
import { Scratchpad, GridCell } from '@/types';
import * as scratchpadService from '@/services/scratchpadService';
import { useDebouncedCallback } from 'use-debounce';
import Button from '@/components/ui/Button';

// --- Helper Functions ---
const colToLetter = (col: number): string => {
    let temp, letter = '';
    while (col >= 0) {
        temp = col % 26;
        letter = String.fromCharCode(temp + 65) + letter;
        col = Math.floor(col / 26) - 1;
    }
    return letter;
};

const letterToCol = (letter: string): number => {
    let col = 0, length = letter.length;
    for (let i = 0; i < length; i++) {
        col += (letter.charCodeAt(i) - 64) * Math.pow(26, length - i - 1);
    }
    return col - 1;
};

interface CellPosition { row: number; col: number; }
interface CellRange { start: CellPosition; end: CellPosition; }

const getCellId = (pos: CellPosition): string => `${colToLetter(pos.col)}${pos.row + 1}`;

const parseCellId = (cellId: string): CellPosition | null => {
    const match = cellId.match(/^([A-Z]+)(\d+)$/i);
    if (!match) return null;
    const col = letterToCol(match[1].toUpperCase());
    const row = parseInt(match[2], 10) - 1;
    if (col < 0 || row < 0) return null;
    return { row, col };
};

const isInRange = (pos: CellPosition, range: CellRange): boolean => {
    const minRow = Math.min(range.start.row, range.end.row);
    const maxRow = Math.max(range.start.row, range.end.row);
    const minCol = Math.min(range.start.col, range.end.col);
    const maxCol = Math.max(range.start.col, range.end.col);
    return pos.row >= minRow && pos.row <= maxRow && pos.col >= minCol && pos.col <= maxCol;
};

const getRangeString = (range: CellRange): string => {
    return `${getCellId(range.start)}:${getCellId(range.end)}`;
};

// --- Enhanced Grid Component ---
const GridView: React.FC<{ scratchpad: Scratchpad }> = ({ scratchpad }) => {
    const id = scratchpad.id;
    const [gridData, setGridData] = useState<Record<string, GridCell>>(scratchpad.gridData || {});
    const [numRows, setNumRows] = useState(scratchpad.rows || 200);
    const [numCols, setNumCols] = useState(scratchpad.cols || 50);
    
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
    const [activeCell, setActiveCell] = useState<CellPosition>({ row: 0, col: 0 });
    const [selectedRange, setSelectedRange] = useState<CellRange | null>(null);
    const [isSelecting, setIsSelecting] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState('');
    const [zoom, setZoom] = useState(1);
    const [searchQuery, setSearchQuery] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    
    // History for undo/redo
    const [history, setHistory] = useState<Record<string, GridCell>[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    
    const formulaInputRef = useRef<HTMLInputElement>(null);
    const activeCellInputRef = useRef<HTMLInputElement>(null);
    const gridContainerRef = useRef<HTMLDivElement>(null);
    const selectionStartRef = useRef<CellPosition | null>(null);
    
    // --- History Management ---
    const addToHistory = (newData: Record<string, GridCell>) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push({ ...newData });
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };
    
    const undo = () => {
        if (historyIndex > 0) {
            const previousState = history[historyIndex - 1];
            setGridData(previousState);
            setHistoryIndex(historyIndex - 1);
            debouncedSave(previousState);
        }
    };
    
    const redo = () => {
        if (historyIndex < history.length - 1) {
            const nextState = history[historyIndex + 1];
            setGridData(nextState);
            setHistoryIndex(historyIndex + 1);
            debouncedSave(nextState);
        }
    };
    
    // --- Data Saving ---
    const debouncedSave = useDebouncedCallback(async (dataToSave: Record<string, GridCell>) => {
        setSaveStatus('saving');
        try {
            await scratchpadService.updateScratchpad(id, { gridData: dataToSave });
            setSaveStatus('saved');
        } catch (error) {
            console.error("Failed to save scratchpad", error);
            setSaveStatus('error');
        }
    }, 1000);

    const updateGridData = (newData: Record<string, GridCell>) => {
        addToHistory(gridData);
        setGridData(newData);
        debouncedSave(newData);
    };
    
    // --- Edit Logic ---
    const startEditing = (pos: CellPosition) => {
        const cellId = getCellId(pos);
        setEditValue(gridData[cellId]?.value || '');
        setIsEditing(true);
        setActiveCell(pos);
        setSelectedRange(null);
        setTimeout(() => activeCellInputRef.current?.focus(), 0);
    };

    const commitEdit = () => {
        if (!isEditing) return;
        const cellId = getCellId(activeCell);
        const newGridData = { ...gridData };
        if (editValue.trim() === '') {
            delete newGridData[cellId];
        } else {
            newGridData[cellId] = { value: editValue };
        }
        updateGridData(newGridData);
        setIsEditing(false);
    };
    
    const handleFormulaBarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const cellId = getCellId(activeCell);
        const newGridData = { ...gridData };
        if (value.trim() === '') {
            delete newGridData[cellId];
        } else {
            newGridData[cellId] = { value };
        }
        updateGridData(newGridData);
    };

    // --- Selection Logic ---
    const handleMouseDown = (pos: CellPosition, e: React.MouseEvent) => {
        e.preventDefault();
        if (isEditing) commitEdit();
        
        setActiveCell(pos);
        setIsSelecting(true);
        selectionStartRef.current = pos;
        
        if (e.shiftKey && selectedRange) {
            // Extend selection
            setSelectedRange({ start: selectedRange.start, end: pos });
        } else {
            // Start new selection
            setSelectedRange({ start: pos, end: pos });
        }
    };
    
    const handleMouseEnter = (pos: CellPosition) => {
        if (isSelecting && selectionStartRef.current) {
            setSelectedRange({ start: selectionStartRef.current, end: pos });
        }
    };
    
    const handleMouseUp = () => {
        setIsSelecting(false);
        selectionStartRef.current = null;
    };

    // --- Clipboard Operations ---
    const copySelection = async () => {
        if (!selectedRange) return;
        
        const minRow = Math.min(selectedRange.start.row, selectedRange.end.row);
        const maxRow = Math.max(selectedRange.start.row, selectedRange.end.row);
        const minCol = Math.min(selectedRange.start.col, selectedRange.end.col);
        const maxCol = Math.max(selectedRange.start.col, selectedRange.end.col);
        
        let clipboardData = '';
        for (let r = minRow; r <= maxRow; r++) {
            const rowData = [];
            for (let c = minCol; c <= maxCol; c++) {
                const cellId = getCellId({ row: r, col: c });
                rowData.push(gridData[cellId]?.value || '');
            }
            clipboardData += rowData.join('\t') + '\n';
        }
        
        try {
            await navigator.clipboard.writeText(clipboardData);
            alert('Copied to clipboard!');
        } catch (err) {
            console.error('Failed to copy to clipboard:', err);
        }
    };
    
    const pasteFromClipboard = async () => {
        try {
            const clipboardData = await navigator.clipboard.readText();
            const rows = clipboardData.split('\n').filter(row => row.trim());
            
            const newGridData = { ...gridData };
            const startRow = activeCell.row;
            const startCol = activeCell.col;
            
            rows.forEach((row, r) => {
                const cols = row.split('\t');
                cols.forEach((cellValue, c) => {
                    const targetRow = startRow + r;
                    const targetCol = startCol + c;
                    
                    if (targetRow < numRows && targetCol < numCols) {
                        const cellId = getCellId({ row: targetRow, col: targetCol });
                        if (cellValue.trim()) {
                            newGridData[cellId] = { value: cellValue.trim() };
                        } else {
                            delete newGridData[cellId];
                        }
                    }
                });
            });
            
            updateGridData(newGridData);
            
            // Update selection to show pasted area
            const endRow = Math.min(startRow + rows.length - 1, numRows - 1);
            const maxCols = Math.max(...rows.map(row => row.split('\t').length));
            const endCol = Math.min(startCol + maxCols - 1, numCols - 1);
            
            setSelectedRange({
                start: { row: startRow, col: startCol },
                end: { row: endRow, col: endCol }
            });
            
        } catch (err) {
            console.error('Failed to paste from clipboard:', err);
            alert('Failed to paste. Please try again or check clipboard permissions.');
        }
    };
    
    const deleteSelection = () => {
        if (!selectedRange) return;
        
        const newGridData = { ...gridData };
        const minRow = Math.min(selectedRange.start.row, selectedRange.end.row);
        const maxRow = Math.max(selectedRange.start.row, selectedRange.end.row);
        const minCol = Math.min(selectedRange.start.col, selectedRange.end.col);
        const maxCol = Math.max(selectedRange.start.col, selectedRange.end.col);
        
        for (let r = minRow; r <= maxRow; r++) {
            for (let c = minCol; c <= maxCol; c++) {
                const cellId = getCellId({ row: r, col: c });
                delete newGridData[cellId];
            }
        }
        
        updateGridData(newGridData);
    };

    // --- Formula Calculation Engine (Enhanced) ---
    const getCalculatedValue = useCallback((pos: CellPosition, visited: Set<string>): string | number => {
        const cellId = getCellId(pos);
        if (visited.has(cellId)) return '#REF!';
        const cell = gridData[cellId];
        if (!cell || !cell.value) return '';
        let value = cell.value;

        if (value.startsWith('=')) {
            visited.add(cellId);
            let formula = value.substring(1).toUpperCase();

            // Handle ranges (e.g., SUM(A1:B5))
            formula = formula.replace(/([A-Z]+)\((([A-Z]+\d+):([A-Z]+\d+))\)/g, (_, func, range, start, end) => {
                const startPos = parseCellId(start);
                const endPos = parseCellId(end);
                if (!startPos || !endPos) return '#NAME?';

                const values: number[] = [];
                for (let r = Math.min(startPos.row, endPos.row); r <= Math.max(startPos.row, endPos.row); r++) {
                    for (let c = Math.min(startPos.col, endPos.col); c <= Math.max(startPos.col, endPos.col); c++) {
                        const currentVal = getCalculatedValue({ row: r, col: c }, new Set(visited));
                        if (typeof currentVal === 'number') values.push(currentVal);
                    }
                }
                
                switch(func) {
                    case 'SUM': return String(values.reduce((a, b) => a + b, 0));
                    case 'AVERAGE': return String(values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0);
                    case 'COUNT': return String(values.length);
                    case 'MAX': return String(values.length > 0 ? Math.max(...values) : 0);
                    case 'MIN': return String(values.length > 0 ? Math.min(...values) : 0);
                    default: return '#NAME?';
                }
            });

            // Handle single cell references
            formula = formula.replace(/[A-Z]+\d+/g, match => {
                const refPos = parseCellId(match);
                if (!refPos) return '#REF!';
                return String(getCalculatedValue(refPos, new Set(visited)));
            });
            
            try {
                if (/^[\d\s\.\+\-\*\/\(\)]+$/.test(formula)) {
                    const result = new Function('return ' + formula)();
                    return parseFloat(result.toFixed(4));
                }
                return '#NAME?';
            } catch { return '#ERROR!'; }
        }
        
        const num = parseFloat(value);
        return isNaN(num) ? value : num;
    }, [gridData]);

    const displayGrid = useMemo(() => {
        const newDisplayGrid: Record<string, string> = {};
        Object.keys(gridData).forEach(cellId => {
            const pos = parseCellId(cellId);
            if(pos) newDisplayGrid[cellId] = String(getCalculatedValue(pos, new Set()));
        });
        return newDisplayGrid;
    }, [gridData, getCalculatedValue]);

    // --- Event Handlers ---
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (isEditing && !['Enter', 'Escape', 'Tab'].includes(e.key)) return;

        const { row, col } = activeCell;
        let nextRow = row, nextCol = col;
        
        // Handle Ctrl+key combinations
        if (e.ctrlKey || e.metaKey) {
            switch(e.key.toLowerCase()) {
                case 'c': e.preventDefault(); copySelection(); return;
                case 'v': e.preventDefault(); pasteFromClipboard(); return;
                case 'z': e.preventDefault(); undo(); return;
                case 'y': e.preventDefault(); redo(); return;
                case 'f': e.preventDefault(); setShowSearch(!showSearch); return;
            }
        }
        
        switch(e.key) {
            case 'ArrowUp': 
                e.preventDefault(); 
                commitEdit(); 
                nextRow = Math.max(0, row - 1); 
                if (e.shiftKey && selectedRange) {
                    setSelectedRange({ start: selectedRange.start, end: { row: nextRow, col } });
                } else {
                    setSelectedRange(null);
                }
                break;
            case 'ArrowDown': 
                e.preventDefault(); 
                commitEdit(); 
                nextRow = Math.min(numRows - 1, row + 1); 
                if (e.shiftKey && selectedRange) {
                    setSelectedRange({ start: selectedRange.start, end: { row: nextRow, col } });
                } else {
                    setSelectedRange(null);
                }
                break;
            case 'ArrowLeft': 
                if(!isEditing) {
                    e.preventDefault(); 
                    commitEdit(); 
                    nextCol = Math.max(0, col - 1);
                    if (e.shiftKey && selectedRange) {
                        setSelectedRange({ start: selectedRange.start, end: { row, col: nextCol } });
                    } else {
                        setSelectedRange(null);
                    }
                } 
                break;
            case 'ArrowRight': 
                if(!isEditing) {
                    e.preventDefault(); 
                    commitEdit(); 
                    nextCol = Math.min(numCols - 1, col + 1);
                    if (e.shiftKey && selectedRange) {
                        setSelectedRange({ start: selectedRange.start, end: { row, col: nextCol } });
                    } else {
                        setSelectedRange(null);
                    }
                } 
                break;
            case 'Enter':
                e.preventDefault();
                if (isEditing) {
                    commitEdit();
                }
                nextRow = e.shiftKey ? Math.max(0, row - 1) : Math.min(numRows - 1, row + 1);
                setSelectedRange(null);
                break;
            case 'Tab': 
                e.preventDefault(); 
                commitEdit(); 
                e.shiftKey ? nextCol = Math.max(0, col - 1) : nextCol = Math.min(numCols - 1, col + 1);
                setSelectedRange(null);
                break;
            case 'Escape': 
                e.preventDefault(); 
                setIsEditing(false); 
                setSelectedRange(null);
                return;
            case 'F2': 
                e.preventDefault(); 
                startEditing(activeCell); 
                return;
            case 'Delete': 
            case 'Backspace': 
                if (!isEditing) { 
                    e.preventDefault(); 
                    if (selectedRange) {
                        deleteSelection();
                    } else {
                        const newGridData = { ...gridData };
                        delete newGridData[getCellId(activeCell)];
                        updateGridData(newGridData);
                    }
                } 
                break;
            default: 
                if (!isEditing && e.key.length === 1 && !e.ctrlKey && !e.metaKey) { 
                    e.preventDefault(); 
                    startEditing(activeCell); 
                    setEditValue(e.key);
                }
        }
        setActiveCell({ row: nextRow, col: nextCol });
    };

    // --- Search functionality ---
    const highlightedCells = useMemo(() => {
        if (!searchQuery.trim()) return new Set<string>();
        
        const matches = new Set<string>();
        Object.entries(displayGrid).forEach(([cellId, value]) => {
            if (value.toLowerCase().includes(searchQuery.toLowerCase())) {
                matches.add(cellId);
            }
        });
        return matches;
    }, [searchQuery, displayGrid]);

    // --- Row/Column operations ---    
    const addRows = async (count: number = 50) => {
        const newRowCount = numRows + count;
        setNumRows(newRowCount);
        setSaveStatus('saving');
        try {
            await scratchpadService.updateScratchpad(id, { rows: newRowCount });
            setSaveStatus('saved');
        } catch (error) { 
            setSaveStatus('error'); 
        }
    };
    
    const addColumns = async (count: number = 10) => {
        const newColCount = numCols + count;
        setNumCols(newColCount);
        setSaveStatus('saving');
        try {
            await scratchpadService.updateScratchpad(id, { cols: newColCount });
            setSaveStatus('saved');
        } catch (error) { 
            setSaveStatus('error'); 
        }
    };
    
    // --- Export/Import ---
    const handleExport = () => {
        let csvContent = "";
        for (let r = 0; r < numRows; r++) {
            const row = [];
            for (let c = 0; c < numCols; c++) {
                const cellId = getCellId({ row: r, col: c });
                const value = gridData[cellId]?.value || '';
                row.push(`"${value.replace(/"/g, '""')}"`);
            }
            if(row.some(cell => cell !== '""')) {
                csvContent += row.join(',') + '\r\n';
            }
        }
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${scratchpad.name}.csv`;
        link.click();
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        // Check file type
        const fileExtension = file.name.toLowerCase().split('.').pop();
        
        if (fileExtension === 'xlsx' || fileExtension === 'xls') {
            alert('Excel files (.xlsx/.xls) are not supported yet. Please save your file as CSV format and try again.');
            e.target.value = ''; // Clear the input
            return;
        }
        
        if (fileExtension !== 'csv') {
            alert('Only CSV files are supported. Please select a .csv file.');
            e.target.value = ''; // Clear the input
            return;
        }
        
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const text = event.target?.result as string;
                const rows = text.split(/\r?\n/);
                const newData: Record<string, GridCell> = {};
                let importedCells = 0;
                
                rows.forEach((row, r) => {
                    if (row.trim()) {
                        const cols = row.split(',');
                        cols.forEach((col, c) => {
                            if (r < numRows && c < numCols) {
                                const cellId = getCellId({ row: r, col: c });
                                const value = col.trim().replace(/^"|"$/g, '').replace(/""/g, '"');
                                if (value) {
                                    newData[cellId] = { value };
                                    importedCells++;
                                }
                            }
                        });
                    }
                });
                
                updateGridData(newData);
                alert(`Import completed successfully! Imported ${importedCells} cells from CSV file.`);
            } catch (error) {
                alert('Error importing CSV file. Please check the file format and try again.');
                console.error('Import error:', error);
            }
        };
        
        reader.onerror = () => {
            alert('Error reading file. Please try again.');
        };
        
        reader.readAsText(file);
        e.target.value = ''; // Clear the input after processing
    };

    // Initialize history
    useEffect(() => {
        if (history.length === 0) {
            setHistory([gridData]);
            setHistoryIndex(0);
        }
    }, []);

    useEffect(() => {
        document.addEventListener('mouseup', handleMouseUp);
        return () => document.removeEventListener('mouseup', handleMouseUp);
    }, []);

    const activeCellId = getCellId(activeCell);
    const formulaBarValue = gridData[activeCellId]?.value || '';
    const selectedRangeString = selectedRange ? getRangeString(selectedRange) : activeCellId;

    return (
        <div className="flex flex-col h-full overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800" onKeyDown={handleKeyDown}>
            {/* Header */}
            <div className="p-4 border-b bg-white dark:bg-slate-800 shadow-lg sticky top-0 z-30">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg text-white">
                            <SquarePen size={24} />
                        </div>
                        <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            {scratchpad.name}
                        </span>
                    </h2>
                    <div className="flex items-center space-x-2">
                        {saveStatus === 'saving' && (
                            <div className="flex items-center text-amber-600 dark:text-amber-400">
                                <Loader size={16} className="animate-spin mr-2" />
                                <span className="text-sm font-medium">Saving...</span>
                            </div>
                        )}
                        {saveStatus === 'saved' && (
                            <div className="flex items-center text-green-600 dark:text-green-400">
                                <CheckCircle size={16} className="mr-2" />
                                <span className="text-sm font-medium">Saved</span>
                            </div>
                        )}
                        {saveStatus === 'error' && (
                            <span className="text-sm font-medium text-red-600 dark:text-red-400">Save Error</span>
                        )}
                    </div>
                </div>
                
                {/* Toolbar */}
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Button onClick={() => setZoom(z => Math.min(2, z + 0.1))} variant="secondary" size="sm" icon={<ZoomIn size={14} />} />
                        <Button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} variant="secondary" size="sm" icon={<ZoomOut size={14} />} />
                        <span className="text-sm text-slate-600 dark:text-slate-400 font-mono">{Math.round(zoom * 100)}%</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Button onClick={undo} disabled={historyIndex <= 0} variant="secondary" size="sm" icon={<Undo size={14} />} title="Undo (Ctrl+Z)" />
                        <Button onClick={redo} disabled={historyIndex >= history.length - 1} variant="secondary" size="sm" icon={<Redo size={14} />} title="Redo (Ctrl+Y)" />
                        <Button onClick={copySelection} disabled={!selectedRange} variant="secondary" size="sm" icon={<Copy size={14} />} title="Copy (Ctrl+C)" />
                        <Button onClick={deleteSelection} disabled={!selectedRange} variant="secondary" size="sm" icon={<Trash2 size={14} />} title="Delete Selection" />
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Button onClick={handleExport} variant="secondary" size="sm" icon={<Download size={14} />}>Export</Button>
                        <label className="cursor-pointer" title="Import CSV files only">
                            <Button as="span" variant="secondary" size="sm" icon={<Upload size={14}/>}>
                                Import CSV
                                <input type="file" accept=".csv" onChange={handleImport} className="hidden" />
                            </Button>
                        </label>
                        <Button onClick={() => addRows()} variant="secondary" size="sm" icon={<Plus size={14}/>}>+50 Rows</Button>
                        <Button onClick={() => addColumns()} variant="secondary" size="sm" icon={<Plus size={14}/>}>+10 Cols</Button>
                    </div>
                </div>
            </div>
            
            {/* Formula Bar */}
            <div className="flex items-center p-2 bg-slate-100 dark:bg-slate-900/80 border-b sticky top-[120px] z-20">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="px-3 py-2 font-mono text-sm border bg-white dark:bg-slate-700 rounded-md shadow-sm min-w-[100px] font-semibold text-blue-600 dark:text-blue-400">
                        {selectedRangeString}
                    </div>
                    <input 
                        ref={formulaInputRef} 
                        type="text" 
                        value={formulaBarValue} 
                        onFocus={() => startEditing(activeCell)} 
                        onChange={handleFormulaBarChange} 
                        onBlur={commitEdit} 
                        placeholder="Enter formula or value..." 
                        className="flex-1 px-3 py-2 font-mono text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                    <Button 
                        onClick={() => setShowSearch(!showSearch)} 
                        variant={showSearch ? "primary" : "secondary"} 
                        size="sm" 
                        icon={<Search size={14} />} 
                        title="Search (Ctrl+F)"
                    />
                    {showSearch && (
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search..."
                            className="px-2 py-1 text-sm border rounded-md bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 w-32"
                        />
                    )}
                </div>
            </div>

            {/* Grid */}
            <div ref={gridContainerRef} tabIndex={0} className="flex-grow overflow-auto focus:outline-none bg-white dark:bg-slate-900" style={{ zoom }}>
                <table className="min-w-full border-separate border-spacing-0 table-fixed">
                    <thead className="sticky top-0 z-10">
                        <tr>
                            <th className="sticky left-0 w-16 p-0 text-center bg-gradient-to-r from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 border-r border-b z-20 shadow-sm"></th>
                            {Array.from({ length: numCols }).map((_, c) => (
                                <th key={c} className="w-32 p-2 text-center bg-gradient-to-b from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-800 border-b border-r font-semibold text-sm text-slate-700 dark:text-slate-300 shadow-sm">
                                    {colToLetter(c)}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {Array.from({ length: numRows }).map((_, r) => (
                            <tr key={r} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                <td className="sticky left-0 w-16 p-0 text-center bg-gradient-to-r from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-800 border-r border-b z-20 text-sm font-semibold text-slate-600 dark:text-slate-400 shadow-sm group-hover:bg-slate-300 dark:group-hover:bg-slate-600">
                                    {r + 1}
                                </td>
                                {Array.from({ length: numCols }).map((_, c) => {
                                    const cellId = getCellId({ row: r, col: c });
                                    const isActive = activeCell.row === r && activeCell.col === c;
                                    const isSelected = selectedRange && isInRange({ row: r, col: c }, selectedRange);
                                    const isHighlighted = highlightedCells.has(cellId);
                                    
                                    return (
                                        <td 
                                            key={cellId} 
                                            onMouseDown={(e) => handleMouseDown({ row: r, col: c }, e)}
                                            onMouseEnter={() => handleMouseEnter({ row: r, col: c })}
                                            onDoubleClick={() => startEditing({ row: r, col: c })}
                                            className={`relative p-0 border-b border-r cursor-cell transition-colors duration-150 ${
                                                isSelected ? 'bg-blue-100 dark:bg-blue-900/30' : 
                                                isHighlighted ? 'bg-yellow-100 dark:bg-yellow-900/30' : 
                                                'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                                            }`}
                                        >
                                            {isEditing && isActive ? (
                                                <input 
                                                    ref={activeCellInputRef} 
                                                    value={editValue} 
                                                    onChange={e => setEditValue(e.target.value)} 
                                                    onBlur={commitEdit}
                                                    className="absolute inset-0 w-full h-full px-2 py-1 font-mono text-sm bg-white dark:bg-slate-800 outline-none ring-2 ring-blue-500 z-20"
                                                />
                                            ) : (
                                                <>
                                                    <div className={`px-2 py-1 h-full w-full text-sm truncate font-mono ${
                                                        displayGrid[cellId]?.toString().startsWith('#') ? 'text-red-500 font-semibold' : 
                                                        typeof displayGrid[cellId] === 'number' ? 'text-blue-600 dark:text-blue-400 font-medium text-right' : 
                                                        'text-slate-700 dark:text-slate-300'
                                                    }`}>
                                                        {displayGrid[cellId] || ''}
                                                    </div>
                                                    {isActive && (
                                                        <div className="absolute inset-0 ring-2 ring-blue-500 pointer-events-none z-10 bg-blue-50/20 dark:bg-blue-900/20" />
                                                    )}
                                                </>
                                            )}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {/* Status Bar */}
            <div className="px-4 py-2 bg-slate-100 dark:bg-slate-800 border-t text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <span>Ready</span>
                    {selectedRange && (
                        <span className="font-mono bg-blue-100 dark:bg-blue-900/50 px-2 py-1 rounded">
                            Selection: {getRangeString(selectedRange)}
                        </span>
                    )}
                    {searchQuery && (
                        <span className="font-mono bg-yellow-100 dark:bg-yellow-900/50 px-2 py-1 rounded">
                            Found: {highlightedCells.size} matches
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    <span>{numRows} × {numCols} cells</span>
                    <span>Zoom: {Math.round(zoom * 100)}%</span>
                </div>
            </div>
        </div>
    );
};

export default GridView;
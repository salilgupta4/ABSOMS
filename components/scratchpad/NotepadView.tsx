import React, { useState, useRef, useEffect } from 'react';
import { Loader, CheckCircle, SquarePen, Bold, Italic, List, ListOrdered, Underline, AlignLeft, AlignCenter, AlignRight, Palette, Type, Highlighter, Link, Image } from 'lucide-react';
import { Scratchpad } from '@/types';
import * as scratchpadService from '@/services/scratchpadService';
import { useDebouncedCallback } from 'use-debounce';
import Button from '@/components/ui/Button';

const NotepadView: React.FC<{ scratchpad: Scratchpad }> = ({ scratchpad }) => {
    const id = scratchpad.id;
    const [content, setContent] = useState(scratchpad.content || '');
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
    const [showFormatting, setShowFormatting] = useState(false);
    const [selectedColor, setSelectedColor] = useState('#000000');
    const [selectedBgColor, setSelectedBgColor] = useState('#ffffff');
    const editorRef = useRef<HTMLDivElement>(null);

    const debouncedSave = useDebouncedCallback(async (newContent: string) => {
        setSaveStatus('saving');
        try {
            await scratchpadService.updateScratchpad(id, { content: newContent });
            setSaveStatus('saved');
        } catch (error) {
            console.error("Failed to save scratchpad", error);
            setSaveStatus('error');
        }
    }, 1000);

    const handleContentChange = () => {
        if (editorRef.current) {
            const newContent = editorRef.current.innerHTML;
            debouncedSave(newContent);
        }
    };
    
    useEffect(() => {
        if (editorRef.current && editorRef.current.innerHTML !== scratchpad.content) {
            editorRef.current.innerHTML = scratchpad.content || '';
        }
        setContent(scratchpad.content || '');
    }, [scratchpad.content]);

    const formatDoc = (cmd: string, value: string | null = null) => {
        if (editorRef.current) {
            editorRef.current.focus();
            document.execCommand(cmd, false, value ?? undefined);
            handleContentChange();
        }
    };

    const insertLink = () => {
        const url = prompt('Enter URL:');
        if (url) {
            formatDoc('createLink', url);
        }
    };

    const insertImage = () => {
        const url = prompt('Enter image URL:');
        if (url) {
            formatDoc('insertImage', url);
        }
    };

    const applyTextColor = (color: string) => {
        setSelectedColor(color);
        formatDoc('foreColor', color);
    };

    const applyBackgroundColor = (color: string) => {
        setSelectedBgColor(color);
        formatDoc('hiliteColor', color);
    };

    const predefinedColors = [
        '#000000', '#333333', '#666666', '#999999', '#cccccc', '#ffffff',
        '#ff0000', '#ff6666', '#ffcccc', '#ff9999', '#ff3333', '#cc0000',
        '#00ff00', '#66ff66', '#ccffcc', '#99ff99', '#33ff33', '#00cc00',
        '#0000ff', '#6666ff', '#ccccff', '#9999ff', '#3333ff', '#0000cc',
        '#ffff00', '#ffff66', '#ffffcc', '#ffff99', '#ffff33', '#cccc00',
        '#ff00ff', '#ff66ff', '#ffccff', '#ff99ff', '#ff33ff', '#cc00cc',
        '#00ffff', '#66ffff', '#ccffff', '#99ffff', '#33ffff', '#00cccc',
        '#ffa500', '#ffb366', '#ffd9cc', '#ffc299', '#ff8c33', '#cc6600',
        '#800080', '#9966b3', '#ccb3e6', '#b399d9', '#8033cc', '#660066',
        '#008080', '#66b3b3', '#cce6e6', '#99d9d9', '#33cccc', '#006666'
    ];

    const fontSizes = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px', '36px', '48px'];
    const fontFamilies = ['Arial', 'Georgia', 'Times New Roman', 'Courier New', 'Verdana', 'Helvetica', 'Comic Sans MS', 'Impact'];
    
    return (
        <div className="flex flex-col h-full overflow-hidden bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
            {/* Header */}
            <div className="p-4 border-b bg-white dark:bg-slate-800 shadow-lg sticky top-0 z-30">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-2xl font-bold flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg text-white">
                            <SquarePen size={24} />
                        </div>
                        <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
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
            </div>
            
            {/* Enhanced Toolbar */}
            <div className="p-3 bg-gradient-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-700 border-b sticky top-[88px] z-20">
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Basic Formatting */}
                    <div className="flex items-center gap-1 border-r pr-2">
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => formatDoc('bold')} 
                            icon={<Bold size={16} />} 
                            title="Bold (Ctrl+B)"
                            className="hover:bg-blue-100 dark:hover:bg-blue-900/50"
                        />
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => formatDoc('italic')} 
                            icon={<Italic size={16} />} 
                            title="Italic (Ctrl+I)"
                            className="hover:bg-blue-100 dark:hover:bg-blue-900/50"
                        />
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => formatDoc('underline')} 
                            icon={<Underline size={16} />} 
                            title="Underline (Ctrl+U)"
                            className="hover:bg-blue-100 dark:hover:bg-blue-900/50"
                        />
                    </div>

                    {/* Font Family & Size */}
                    <div className="flex items-center gap-1 border-r pr-2">
                        <select 
                            onChange={(e) => formatDoc('fontName', e.target.value)}
                            className="px-2 py-1 text-sm border rounded bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            title="Font Family"
                        >
                            <option value="">Font</option>
                            {fontFamilies.map(font => (
                                <option key={font} value={font} style={{ fontFamily: font }}>
                                    {font}
                                </option>
                            ))}
                        </select>
                        <select 
                            onChange={(e) => formatDoc('fontSize', e.target.value)}
                            className="px-2 py-1 text-sm border rounded bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                            title="Font Size"
                        >
                            <option value="">Size</option>
                            {fontSizes.map(size => (
                                <option key={size} value={size.replace('px', '')}>
                                    {size}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Text Color */}
                    <div className="flex items-center gap-1 border-r pr-2">
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => setShowFormatting(!showFormatting)} 
                            icon={<Type size={16} />} 
                            title="Text Color"
                            className="hover:bg-purple-100 dark:hover:bg-purple-900/50"
                        />
                        <div 
                            className="w-6 h-6 border-2 border-white rounded cursor-pointer shadow-sm"
                            style={{ backgroundColor: selectedColor }}
                            onClick={() => setShowFormatting(!showFormatting)}
                            title="Current text color"
                        />
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => setShowFormatting(!showFormatting)} 
                            icon={<Highlighter size={16} />} 
                            title="Highlight Color"
                            className="hover:bg-yellow-100 dark:hover:bg-yellow-900/50"
                        />
                        <div 
                            className="w-6 h-6 border-2 border-white rounded cursor-pointer shadow-sm"
                            style={{ backgroundColor: selectedBgColor }}
                            onClick={() => setShowFormatting(!showFormatting)}
                            title="Current highlight color"
                        />
                    </div>

                    {/* Alignment */}
                    <div className="flex items-center gap-1 border-r pr-2">
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => formatDoc('justifyLeft')} 
                            icon={<AlignLeft size={16} />} 
                            title="Align Left"
                            className="hover:bg-green-100 dark:hover:bg-green-900/50"
                        />
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => formatDoc('justifyCenter')} 
                            icon={<AlignCenter size={16} />} 
                            title="Align Center"
                            className="hover:bg-green-100 dark:hover:bg-green-900/50"
                        />
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => formatDoc('justifyRight')} 
                            icon={<AlignRight size={16} />} 
                            title="Align Right"
                            className="hover:bg-green-100 dark:hover:bg-green-900/50"
                        />
                    </div>

                    {/* Lists */}
                    <div className="flex items-center gap-1 border-r pr-2">
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => formatDoc('insertUnorderedList')} 
                            icon={<List size={16} />} 
                            title="Bullet List"
                            className="hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                        />
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => formatDoc('insertOrderedList')} 
                            icon={<ListOrdered size={16} />} 
                            title="Numbered List"
                            className="hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                        />
                    </div>

                    {/* Insert */}
                    <div className="flex items-center gap-1">
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={insertLink} 
                            icon={<Link size={16} />} 
                            title="Insert Link"
                            className="hover:bg-cyan-100 dark:hover:bg-cyan-900/50"
                        />
                        <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={insertImage} 
                            icon={<Image size={16} />} 
                            title="Insert Image"
                            className="hover:bg-cyan-100 dark:hover:bg-cyan-900/50"
                        />
                    </div>
                </div>

                {/* Color Palette */}
                {showFormatting && (
                    <div className="mt-3 p-3 bg-white dark:bg-slate-800 rounded-lg shadow-lg border">
                        <div className="mb-3">
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Text Colors</h4>
                            <div className="grid grid-cols-12 gap-1">
                                {predefinedColors.map(color => (
                                    <button
                                        key={`text-${color}`}
                                        className="w-6 h-6 rounded border-2 border-white shadow-sm hover:scale-110 transition-transform"
                                        style={{ backgroundColor: color }}
                                        onClick={() => applyTextColor(color)}
                                        title={color}
                                    />
                                ))}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Highlight Colors</h4>
                            <div className="grid grid-cols-12 gap-1">
                                {predefinedColors.map(color => (
                                    <button
                                        key={`bg-${color}`}
                                        className="w-6 h-6 rounded border-2 border-white shadow-sm hover:scale-110 transition-transform"
                                        style={{ backgroundColor: color }}
                                        onClick={() => applyBackgroundColor(color)}
                                        title={color}
                                    />
                                ))}
                            </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                            <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Custom:</label>
                            <input
                                type="color"
                                value={selectedColor}
                                onChange={(e) => applyTextColor(e.target.value)}
                                className="w-8 h-8 border border-slate-300 rounded cursor-pointer"
                                title="Custom text color"
                            />
                            <input
                                type="color"
                                value={selectedBgColor}
                                onChange={(e) => applyBackgroundColor(e.target.value)}
                                className="w-8 h-8 border border-slate-300 rounded cursor-pointer"
                                title="Custom highlight color"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Editor */}
            <div className="flex-grow overflow-auto p-6 md:p-8 bg-gradient-to-br from-white via-blue-50/30 to-purple-50/30 dark:from-slate-900 dark:via-slate-800/50 dark:to-slate-700/50">
                <div className="max-w-4xl mx-auto">
                    <div
                        ref={editorRef}
                        contentEditable
                        onInput={handleContentChange}
                        className="min-h-[600px] prose prose-lg dark:prose-invert max-w-none focus:outline-none bg-white dark:bg-slate-800 rounded-xl shadow-xl p-8 border border-slate-200 dark:border-slate-700 transition-shadow hover:shadow-2xl"
                        style={{
                            fontFamily: 'Georgia, serif',
                            lineHeight: '1.8',
                            fontSize: '16px'
                        }}
                        dangerouslySetInnerHTML={{ __html: content }}
                        onFocus={() => {
                            if (editorRef.current && !editorRef.current.innerHTML.trim()) {
                                editorRef.current.innerHTML = '<p>Start typing your notes here...</p>';
                            }
                        }}
                        onBlur={() => {
                            if (editorRef.current && editorRef.current.innerHTML === '<p>Start typing your notes here...</p>') {
                                editorRef.current.innerHTML = '';
                            }
                        }}
                    />
                    
                    {/* Floating Action Hints */}
                    <div className="mt-6 flex flex-wrap gap-2 justify-center opacity-60 hover:opacity-100 transition-opacity">
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-full">
                            📝 Rich text editing
                        </span>
                        <span className="text-xs bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 px-2 py-1 rounded-full">
                            🎨 Colors & fonts
                        </span>
                        <span className="text-xs bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 px-2 py-1 rounded-full">
                            🔗 Links & images
                        </span>
                        <span className="text-xs bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 px-2 py-1 rounded-full">
                            ⚡ Auto-save
                        </span>
                    </div>
                </div>
            </div>

            {/* Status Bar */}
            <div className="px-4 py-2 bg-white dark:bg-slate-800 border-t text-xs text-slate-600 dark:text-slate-400 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        Ready
                    </span>
                    <span>Rich Text Editor</span>
                </div>
                <div className="flex items-center gap-4">
                    <span>Word count: {editorRef.current?.textContent?.trim().split(/\s+/).length || 0}</span>
                    <span>Characters: {editorRef.current?.textContent?.length || 0}</span>
                </div>
            </div>
        </div>
    );
};

export default NotepadView;
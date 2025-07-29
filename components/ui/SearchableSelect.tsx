
import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({ options, value, onChange, placeholder = 'Select...', disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);

  const selectedOption = useMemo(() => options.find(opt => opt.value === value), [options, value]);
  const filteredOptions = useMemo(() => options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  ), [options, searchTerm]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current && !wrapperRef.current.contains(event.target as Node) &&
        optionsRef.current && !optionsRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (!isOpen) return;
        switch(e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev => (prev + 1) % filteredOptions.length);
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => (prev - 1 + filteredOptions.length) % filteredOptions.length);
                break;
            case 'Enter':
                e.preventDefault();
                if (highlightedIndex >= 0 && highlightedIndex < filteredOptions.length) {
                    handleSelect(filteredOptions[highlightedIndex].value);
                }
                break;
            case 'Escape':
                setIsOpen(false);
                break;
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, highlightedIndex, filteredOptions]);
  
  // Scroll to highlighted item
  useEffect(() => {
    if (highlightedIndex >= 0 && optionsRef.current) {
      const optionElement = optionsRef.current.querySelector(`[data-index="${highlightedIndex}"]`) as HTMLElement;
      if(optionElement) {
        optionElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      setHighlightedIndex(filteredOptions.findIndex(opt => opt.value === value));
    }
  }, [isOpen, filteredOptions, value]);

  const handleSelect = (optionValue: string) => {
      onChange(optionValue);
      setIsOpen(false);
      setSearchTerm('');
  };
  
  const portalRoot = document.getElementById('portal-root');
  if (!portalRoot) return null;

  const getDropdownPosition = () => {
    if (!wrapperRef.current) return {};
    const rect = wrapperRef.current.getBoundingClientRect();
    return {
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width,
    };
  }

  const DropdownList = () => (
      <div 
        style={{ ...getDropdownPosition(), position: 'absolute', zIndex: 1000 }}
        className="max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-slate-800 py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm"
        ref={optionsRef}
      >
        <div className="p-2 sticky top-0 bg-white dark:bg-slate-800">
          <input
            ref={inputRef}
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        {filteredOptions.length > 0 ? filteredOptions.map((option, index) => (
          <div
            key={option.value}
            data-index={index}
            onClick={() => handleSelect(option.value)}
            onMouseEnter={() => setHighlightedIndex(index)}
            className={`relative cursor-pointer select-none py-2 pl-10 pr-4 ${
              highlightedIndex === index ? 'bg-primary-light text-primary dark:text-white dark:bg-slate-700' : 'text-slate-900 dark:text-slate-200'
            }`}
          >
            <span className={`block truncate ${value === option.value ? 'font-medium' : 'font-normal'}`}>
              {option.label}
            </span>
            {value === option.value && (
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-primary">
                <Check className="h-5 w-5" aria-hidden="true" />
              </span>
            )}
          </div>
        )) : (
          <div className="relative cursor-default select-none py-2 px-4 text-gray-700 dark:text-gray-400">
              Nothing found.
          </div>
        )}
      </div>
  );

  return (
    <div ref={wrapperRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-full cursor-default rounded-md bg-white dark:bg-slate-700 py-2 pl-3 pr-10 text-left text-sm border border-slate-300 dark:border-slate-600 focus:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-white/75 focus-visible:ring-offset-2 focus-visible:ring-offset-primary disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="block truncate">{selectedOption?.label || <span className="text-slate-400 dark:text-slate-500">{placeholder}</span>}</span>
        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
          <ChevronDown className="h-5 w-5 text-gray-400" aria-hidden="true" />
        </span>
      </button>
      {isOpen && !disabled && ReactDOM.createPortal(<DropdownList />, portalRoot)}
    </div>
  );
};

export default SearchableSelect;

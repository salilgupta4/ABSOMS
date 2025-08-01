import React from 'react';
import { Search } from 'lucide-react';

interface SearchableInputProps<T> {
  searchInputRef: React.RefObject<HTMLInputElement>;
  searchTerm: string;
  placeholder: string;
  filteredItems: T[];
  selectedIndex: number;
  showResults: boolean;
  onInputChange: (value: string) => void;
  onInputFocus: () => void;
  onItemSelect: (item: T, index: number) => void;
  renderItem: (item: T, index: number, isSelected: boolean) => React.ReactNode;
  className?: string;
  maxResults?: number;
}

const SearchableInput = <T,>({
  searchInputRef,
  searchTerm,
  placeholder,
  filteredItems,
  selectedIndex,
  showResults,
  onInputChange,
  onInputFocus,
  onItemSelect,
  renderItem,
  className = '',
  maxResults = 10
}: SearchableInputProps<T>) => {
  const displayItems = filteredItems.slice(0, maxResults);

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search 
          size={16} 
          className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" 
        />
        <input
          ref={searchInputRef}
          type="text"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => onInputChange(e.target.value)}
          onFocus={onInputFocus}
          className={`w-full pl-10 pr-3 py-1.5 text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-2 focus:ring-primary focus:border-primary ${className}`}
        />
      </div>
      
      {showResults && displayItems.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {displayItems.map((item, index) => (
            <div
              key={index}
              className={`px-3 py-2 cursor-pointer text-sm border-b border-slate-100 dark:border-slate-700 last:border-b-0 ${
                index === selectedIndex 
                  ? 'bg-primary text-white' 
                  : 'hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
              }`}
              onClick={() => onItemSelect(item, index)}
              onMouseEnter={() => {
                // Optional: update selectedIndex on hover
              }}
            >
              {renderItem(item, index, index === selectedIndex)}
            </div>
          ))}
          
          {filteredItems.length > maxResults && (
            <div className="px-3 py-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 border-t border-slate-200 dark:border-slate-600">
              Showing {maxResults} of {filteredItems.length} results. Keep typing to narrow down...
            </div>
          )}
        </div>
      )}
      
      {showResults && displayItems.length === 0 && searchTerm.trim().length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md shadow-lg">
          <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
            No results found for "{searchTerm}"
          </div>
        </div>
      )}
      
      {showResults && (
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-slate-400 pointer-events-none">
          ↑↓ navigate • ↵ select • esc close
        </div>
      )}
    </div>
  );
};

export default SearchableInput;
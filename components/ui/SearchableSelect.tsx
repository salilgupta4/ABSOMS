import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search, Check } from 'lucide-react';

interface Option {
  value: string;
  label: string;
  subtitle?: string;
  data?: any;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string, option?: Option) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
  error?: boolean;
  name?: string;
  required?: boolean;
}

const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Select an option...",
  searchPlaceholder = "Search...",
  className = '',
  disabled = false,
  error = false,
  name,
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const optionsListRef = useRef<HTMLDivElement>(null);

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (option.subtitle && option.subtitle.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Get selected option
  const selectedOption = options.find(opt => opt.value === value);

  // Scroll selected item into view
  const scrollToSelectedItem = (index: number) => {
    if (optionsListRef.current && index >= 0) {
      const optionElements = optionsListRef.current.querySelectorAll('button');
      const selectedElement = optionElements[index];
      
      if (selectedElement) {
        const container = optionsListRef.current;
        const containerHeight = container.clientHeight;
        const elementTop = selectedElement.offsetTop;
        const elementHeight = selectedElement.offsetHeight;
        const currentScrollTop = container.scrollTop;
        
        // Calculate if element is outside visible area
        const elementBottom = elementTop + elementHeight;
        const visibleTop = currentScrollTop;
        const visibleBottom = currentScrollTop + containerHeight;
        
        // Element is above visible area
        if (elementTop < visibleTop) {
          container.scrollTo({
            top: elementTop - 8,
            behavior: 'smooth'
          });
        }
        // Element is below visible area
        else if (elementBottom > visibleBottom) {
          container.scrollTo({
            top: elementBottom - containerHeight + 8,
            behavior: 'smooth'
          });
        }
      }
    }
  };

  // Reset search and selection when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setSelectedIndex(-1);
      // Remove body scroll lock
      document.body.classList.remove('dropdown-open');
    } else {
      // Add body scroll lock when dropdown opens in modals
      const isInModal = containerRef.current?.closest('[role="dialog"]');
      if (isInModal) {
        document.body.classList.add('dropdown-open');
      }
    }
  }, [isOpen]);

  // Auto-focus search input when dropdown opens and scroll to selected item
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
      
      // Scroll to currently selected item if it exists
      if (value) {
        const currentIndex = filteredOptions.findIndex(opt => opt.value === value);
        if (currentIndex >= 0) {
          setSelectedIndex(currentIndex);
          setTimeout(() => scrollToSelectedItem(currentIndex), 100);
        }
      }
    }
  }, [isOpen, value, filteredOptions]);

  // Calculate dropdown position
  const updateDropdownPosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const dropdownHeight = 300; // Approximate max height
      const dropdownWidth = rect.width;
      
      let top = rect.bottom + window.scrollY + 2; // Add small gap
      let left = rect.left + window.scrollX;
      
      // If dropdown would go below viewport, show it above the input
      if (rect.bottom + dropdownHeight > viewportHeight && rect.top > dropdownHeight) {
        top = rect.top + window.scrollY - dropdownHeight - 2;
      }
      
      // If dropdown would go beyond right edge, align to right
      if (left + dropdownWidth > viewportWidth) {
        left = viewportWidth - dropdownWidth - 10;
      }
      
      // Ensure it's not cut off at the left
      if (left < 10) {
        left = 10;
      }
      
      setDropdownPosition({
        top: Math.max(10, top),
        left: Math.max(10, left),
        width: Math.min(dropdownWidth, viewportWidth - 20)
      });
    }
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current && !containerRef.current.contains(event.target as Node) &&
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update position when dropdown opens or window resizes
  useEffect(() => {
    if (isOpen) {
      updateDropdownPosition();
      
      const handleResize = () => updateDropdownPosition();
      const handleScroll = () => updateDropdownPosition();
      
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleScroll);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleScroll);
      };
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => {
          const newIndex = prev < filteredOptions.length - 1 ? prev + 1 : 0;
          // Scroll to new selection after state update
          setTimeout(() => scrollToSelectedItem(newIndex), 0);
          return newIndex;
        });
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => {
          const newIndex = prev > 0 ? prev - 1 : filteredOptions.length - 1;
          // Scroll to new selection after state update
          setTimeout(() => scrollToSelectedItem(newIndex), 0);
          return newIndex;
        });
        break;
        
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredOptions.length) {
          const selectedOption = filteredOptions[selectedIndex];
          onChange(selectedOption.value, selectedOption);
          setIsOpen(false);
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
        
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  const handleOptionClick = (option: Option) => {
    onChange(option.value, option);
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (!disabled) {
      if (!isOpen) {
        updateDropdownPosition();
      }
      setIsOpen(!isOpen);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.body.classList.remove('dropdown-open');
    };
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Main trigger button */}
      <button
        type="button"
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        name={name}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-describedby={isOpen ? 'dropdown-options' : undefined}
        className={`
          w-full px-3 py-2 text-left bg-white dark:bg-slate-700 border rounded-md shadow-sm
          focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary
          disabled:opacity-50 disabled:cursor-not-allowed
          ${error ? 'border-red-300 dark:border-red-600' : 'border-slate-300 dark:border-slate-600'}
          ${isOpen ? 'ring-2 ring-primary border-primary' : ''}
        `}
      >
        <div className="flex items-center justify-between">
          <span className={`block truncate text-sm ${selectedOption ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown 
            size={16} 
            className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          />
        </div>
      </button>

      {/* Required indicator */}
      {required && (
        <span className="absolute top-2 right-8 text-red-500">*</span>
      )}

      {/* Portal-rendered dropdown */}
      {isOpen && createPortal(
        <div 
          ref={dropdownRef}
          className="searchable-dropdown bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md shadow-xl"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            maxHeight: '300px'
          }}
        >
          {/* Search input */}
          <div className="p-2 border-b border-slate-200 dark:border-slate-600">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                role="searchbox"
                aria-label="Search options"
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary"
              />
            </div>
          </div>

          {/* Options list */}
          <div 
            ref={optionsListRef} 
            className="max-h-60 overflow-y-auto scroll-smooth"
            role="listbox"
            id="dropdown-options"
            aria-activedescendant={selectedIndex >= 0 ? `option-${selectedIndex}` : undefined}
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleOptionClick(option)}
                  className={`
                    w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700
                    focus:outline-none focus:bg-slate-50 dark:focus:bg-slate-700
                    ${index === selectedIndex ? 'bg-primary text-white' : 'text-slate-700 dark:text-slate-200'}
                    ${option.value === value ? 'font-medium' : ''}
                  `}
                  onMouseEnter={() => setSelectedIndex(index)}
                  id={`option-${index}`}
                  role="option"
                  aria-selected={index === selectedIndex}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{option.label}</div>
                      {option.subtitle && (
                        <div className={`text-xs truncate ${index === selectedIndex ? 'text-white/75' : 'text-slate-500 dark:text-slate-400'}`}>
                          {option.subtitle}
                        </div>
                      )}
                    </div>
                    {option.value === value && (
                      <Check size={16} className={index === selectedIndex ? 'text-white' : 'text-primary'} />
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-slate-500 dark:text-slate-400">
                No results found for "{searchTerm}"
              </div>
            )}
          </div>

          {/* Keyboard hints */}
          <div className="px-3 py-1 border-t border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700">
            <div className="text-xs text-slate-500 dark:text-slate-400">
              ↑↓ navigate • ↵ select • esc close
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default SearchableSelect;
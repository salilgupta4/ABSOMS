import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface UseSearchableListOptions<T> {
  items: T[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  getItemId: (item: T) => string;
  getItemUrl?: (item: T) => string;
  onItemSelect?: (item: T) => void;
  searchFields: (keyof T)[];
}

export const useSearchableList = <T>({
  items,
  searchTerm,
  setSearchTerm,
  getItemId,
  getItemUrl,
  onItemSelect,
  searchFields
}: UseSearchableListOptions<T>) => {
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showResults, setShowResults] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Filter items based on search term
  const filteredItems = items.filter(item => {
    if (!searchTerm.trim()) return false;
    
    return searchFields.some(field => {
      const value = item[field];
      if (typeof value === 'string') {
        return value.toLowerCase().includes(searchTerm.toLowerCase());
      }
      return false;
    });
  });

  // Reset selection when search term changes
  useEffect(() => {
    setSelectedIndex(-1);
    setShowResults(searchTerm.trim().length > 0);
  }, [searchTerm]);

  // Hide results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowResults(false);
        setSelectedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!showResults || filteredItems.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredItems.length - 1 ? prev + 1 : 0
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredItems.length - 1
        );
        break;
        
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredItems.length) {
          const selectedItem = filteredItems[selectedIndex];
          
          if (onItemSelect) {
            onItemSelect(selectedItem);
          } else if (getItemUrl) {
            navigate(getItemUrl(selectedItem));
          }
          
          setShowResults(false);
          setSelectedIndex(-1);
          setSearchTerm('');
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        setShowResults(false);
        setSelectedIndex(-1);
        if (searchInputRef.current) {
          searchInputRef.current.blur();
        }
        break;
    }
  }, [showResults, filteredItems, selectedIndex, onItemSelect, getItemUrl, navigate, setSearchTerm]);

  // Add keyboard event listener
  useEffect(() => {
    if (showResults) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [showResults, handleKeyDown]);

  const handleInputFocus = () => {
    if (searchTerm.trim().length > 0) {
      setShowResults(true);
    }
  };

  const handleInputChange = (value: string) => {
    setSearchTerm(value);
    setShowResults(value.trim().length > 0);
  };

  const selectItem = (item: T, index: number) => {
    setSelectedIndex(index);
    
    if (onItemSelect) {
      onItemSelect(item);
    } else if (getItemUrl) {
      navigate(getItemUrl(item));
    }
    
    setShowResults(false);
    setSearchTerm('');
  };

  return {
    searchInputRef,
    filteredItems,
    selectedIndex,
    showResults,
    handleInputFocus,
    handleInputChange,
    selectItem,
    setShowResults
  };
};

export default useSearchableList;
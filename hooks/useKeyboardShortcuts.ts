import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface UseKeyboardShortcutsOptions {
  newItemPath?: string;
  canCreate?: boolean;
  searchTerm?: string;
  setSearchTerm?: (term: string) => void;
  onEscape?: () => void;
}

export const useKeyboardShortcuts = ({
  newItemPath,
  canCreate = false,
  searchTerm = '',
  setSearchTerm,
  onEscape
}: UseKeyboardShortcutsOptions = {}) => {
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus search input
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with input fields (except search)
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
      
      // Ctrl/Cmd + N for new item
      if ((e.ctrlKey || e.metaKey) && e.key === 'n' && canCreate && newItemPath) {
        e.preventDefault();
        navigate(newItemPath);
      }
      
      // Forward slash (/) to focus search
      if (e.key === '/' && !isInputField) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      
      // Escape key handling
      if (e.key === 'Escape') {
        if (target === searchInputRef.current && searchTerm && setSearchTerm) {
          // Clear search if in search input
          setSearchTerm('');
        } else if (onEscape) {
          // Custom escape handler
          onEscape();
        } else if (isInputField) {
          // Blur input fields
          (target as HTMLInputElement).blur();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate, canCreate, newItemPath, searchTerm, setSearchTerm, onEscape]);

  return { searchInputRef };
};

export default useKeyboardShortcuts;
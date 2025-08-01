import { useEffect } from 'react';

interface UseFormKeyboardNavigationOptions {
  onSave?: () => void;
  onCancel?: () => void;
  canSave?: boolean;
  formRef?: React.RefObject<HTMLFormElement>;
}

export const useFormKeyboardNavigation = ({
  onSave,
  onCancel,
  canSave = true,
  formRef
}: UseFormKeyboardNavigationOptions = {}) => {
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't interfere with input focus or text selection
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';
      
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's' && onSave && canSave) {
        e.preventDefault();
        onSave();
      }
      
      // Escape to cancel/close
      if (e.key === 'Escape') {
        if (isInputField) {
          // Just blur the input field
          (target as HTMLInputElement).blur();
        } else if (onCancel) {
          // Cancel/close form
          onCancel();
        }
      }
      
      // Tab navigation enhancement for forms
      if (e.key === 'Tab' && formRef?.current) {
        const formElements = formRef.current.querySelectorAll(
          'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
        ) as NodeListOf<HTMLElement>;
        
        const currentIndex = Array.from(formElements).indexOf(target as HTMLElement);
        
        if (currentIndex !== -1) {
          // Optional: Add custom tab behavior here if needed
          // For now, let default tab behavior work
        }
      }
      
      // Enter key handling in forms
      if (e.key === 'Enter' && isInputField) {
        const form = (target as HTMLElement).closest('form');
        if (form) {
          const formElements = form.querySelectorAll(
            'input:not([disabled]), select:not([disabled]), textarea:not([disabled])'
          ) as NodeListOf<HTMLElement>;
          
          const currentIndex = Array.from(formElements).indexOf(target as HTMLElement);
          const nextElement = formElements[currentIndex + 1];
          
          // If it's not a textarea and there's a next element, focus it
          if (target.tagName !== 'TEXTAREA' && nextElement) {
            e.preventDefault();
            nextElement.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onSave, onCancel, canSave, formRef]);

  // Helper function to set up proper tab order
  const setupTabOrder = (formElement: HTMLFormElement) => {
    const elements = formElement.querySelectorAll(
      'input, select, textarea, button'
    ) as NodeListOf<HTMLElement>;
    
    elements.forEach((element, index) => {
      if (!element.hasAttribute('tabindex')) {
        element.setAttribute('tabindex', (index + 1).toString());
      }
    });
  };

  return { setupTabOrder };
};

export default useFormKeyboardNavigation;
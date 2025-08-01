import { useEffect, useRef } from 'react';

export const useTableKeyboardNavigation = () => {
  const tableRef = useRef<HTMLTableElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!tableRef.current) return;
      
      const target = e.target as HTMLElement;
      const isInTable = tableRef.current.contains(target);
      
      if (!isInTable) return;
      
      // Only handle arrow keys on table cells or buttons within table
      const cell = target.closest('td, th');
      if (!cell) return;

      const table = tableRef.current;
      const rows = table.querySelectorAll('tbody tr') as NodeListOf<HTMLTableRowElement>;
      const currentRow = cell.closest('tr') as HTMLTableRowElement;
      const currentRowIndex = Array.from(rows).indexOf(currentRow);
      const currentCellIndex = Array.from(currentRow.cells).indexOf(cell as HTMLTableCellElement);

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          if (currentRowIndex > 0) {
            const prevRow = rows[currentRowIndex - 1];
            const targetCell = prevRow.cells[currentCellIndex];
            if (targetCell) {
              const focusableElement = targetCell.querySelector('button, a, input, select') as HTMLElement;
              if (focusableElement) {
                focusableElement.focus();
              } else {
                targetCell.focus();
              }
            }
          }
          break;
          
        case 'ArrowDown':
          e.preventDefault();
          if (currentRowIndex < rows.length - 1) {
            const nextRow = rows[currentRowIndex + 1];
            const targetCell = nextRow.cells[currentCellIndex];
            if (targetCell) {
              const focusableElement = targetCell.querySelector('button, a, input, select') as HTMLElement;
              if (focusableElement) {
                focusableElement.focus();
              } else {
                targetCell.focus();
              }
            }
          }
          break;
          
        case 'ArrowLeft':
          if (target.tagName !== 'INPUT' && target.tagName !== 'SELECT') {
            e.preventDefault();
            if (currentCellIndex > 0) {
              const targetCell = currentRow.cells[currentCellIndex - 1];
              const focusableElement = targetCell.querySelector('button, a, input, select') as HTMLElement;
              if (focusableElement) {
                focusableElement.focus();
              } else {
                targetCell.focus();
              }
            }
          }
          break;
          
        case 'ArrowRight':
          if (target.tagName !== 'INPUT' && target.tagName !== 'SELECT') {
            e.preventDefault();
            if (currentCellIndex < currentRow.cells.length - 1) {
              const targetCell = currentRow.cells[currentCellIndex + 1];
              const focusableElement = targetCell.querySelector('button, a, input, select') as HTMLElement;
              if (focusableElement) {
                focusableElement.focus();
              } else {
                targetCell.focus();
              }
            }
          }
          break;
          
        case 'Enter':
          // Enter key on table cell - try to click first button or link
          if (target === cell) {
            e.preventDefault();
            const clickableElement = cell.querySelector('button, a') as HTMLElement;
            if (clickableElement) {
              clickableElement.click();
            }
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Helper to make table cells focusable
  const makeTableFocusable = () => {
    if (tableRef.current) {
      const cells = tableRef.current.querySelectorAll('td, th');
      cells.forEach(cell => {
        if (!cell.querySelector('button, a, input, select')) {
          cell.setAttribute('tabindex', '0');
        }
      });
    }
  };

  return { tableRef, makeTableFocusable };
};

export default useTableKeyboardNavigation;
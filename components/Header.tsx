

import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Bell, UserCircle, ChevronDown, Sun, Moon, LogOut, Settings, Menu, ChevronRight, Home, Keyboard } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';

function capitalizeFirstLetter(string: string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pathnames = location.pathname.split('/').filter(x => x);
  
  // Map common paths to readable labels
  const getLabelForPath = (path: string): string => {
    const labelMap: { [key: string]: string } = {
      'dashboard': 'Dashboard',
      'sales': 'Sales',
      'quotes': 'Quotes',
      'orders': 'Orders',
      'deliveries': 'Deliveries',
      'purchase': 'Purchase',
      'customers': 'Customers',
      'products': 'Products',
      'inventory': 'Inventory',
      'payroll': 'Payroll',
      'settings': 'Settings',
      'users': 'Users',
      'new': 'New',
      'edit': 'Edit',
      'view': 'View',
      'scratchpad': 'Scratchpad',
      'projects': 'Projects',
      'vendors': 'Vendors'
    };
    return labelMap[path] || capitalizeFirstLetter(path);
  };
  
  const buildBreadcrumbs = () => {
    if (pathnames.length === 0) return null;
    
    let currentPath = '';
    return pathnames.map((path, index) => {
      currentPath += `/${path}`;
      const isLast = index === pathnames.length - 1;
      const isId = /^[a-zA-Z0-9]{20,}$/.test(path); // Skip display of document IDs
      
      if (isId) return null;
      
      return (
        <React.Fragment key={index}>
          <ChevronRight size={14} className="text-slate-400 mx-1" />
          {isLast ? (
            <span className="text-slate-700 dark:text-slate-200 font-medium">
              {getLabelForPath(path)}
            </span>
          ) : (
            <Link 
              to={currentPath} 
              className="text-slate-600 dark:text-slate-300 hover:text-primary transition-colors"
            >
              {getLabelForPath(path)}
            </Link>
          )}
        </React.Fragment>
      );
    }).filter(Boolean);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle keyboard shortcut to show help (? key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const target = e.target as HTMLElement;
        const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.contentEditable === 'true';
        if (!isInputField) {
          e.preventDefault();
          setShortcutsModalOpen(true);
        }
      }
      if (e.key === 'Escape' && shortcutsModalOpen) {
        setShortcutsModalOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcutsModalOpen]);

  return (
    <header className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center space-x-4">
         <button onClick={onMenuClick} className="md:hidden text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-white">
            <Menu size={24} />
         </button>
        <nav className="flex items-center text-sm">
          <Link 
            to="/dashboard" 
            className="flex items-center text-slate-600 dark:text-slate-300 hover:text-primary transition-colors"
          >
            <Home size={16} className="mr-1" />
            <span className="hidden sm:inline">Home</span>
          </Link>
          {buildBreadcrumbs()}
        </nav>
      </div>
      <div className="flex items-center space-x-6">
        <button 
          onClick={() => setShortcutsModalOpen(true)} 
          className="relative text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-white"
          title="Keyboard shortcuts (?)"
        >
          <Keyboard size={22} />
        </button>
        <button onClick={toggleTheme} className="relative text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-white">
          {theme === 'light' ? <Sun size={22} /> : <Moon size={22} />}
        </button>
        <button className="relative text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-white">
          <Bell size={22} />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        </button>
        <div className="relative" ref={dropdownRef}>
            <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center space-x-2 cursor-pointer">
              <UserCircle size={28} className="text-slate-500 dark:text-slate-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300 hidden md:inline">{user?.name || 'User'}</span>
              <ChevronDown size={16} className={`text-slate-500 dark:text-slate-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-md shadow-lg py-1 z-50 border border-slate-200 dark:border-slate-700">
                    <Link to="/settings" className="flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">
                        <Settings size={16} className="mr-2"/>
                        Settings
                    </Link>
                    <button onClick={logout} className="w-full text-left flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">
                        <LogOut size={16} className="mr-2"/>
                        Logout
                    </button>
                </div>
            )}
        </div>
      </div>

      {/* Keyboard Shortcuts Modal */}
      {shortcutsModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg p-4 max-w-xl w-full mx-4 max-h-[75vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Keyboard Shortcuts</h2>
              <button 
                onClick={() => setShortcutsModalOpen(false)}
                className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="font-medium text-slate-900 dark:text-white mb-2 text-sm">Module Navigation</h3>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Dashboard</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs">Alt+1</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Quotes</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs">Alt+2</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Sales Orders</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs">Alt+3</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Deliveries</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs">Alt+4</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Purchase Orders</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs">Alt+5</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Customers</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs">Alt+6</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Products</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs">Alt+7</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Settings</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs">Alt+8</kbd>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-slate-900 dark:text-white mb-2 text-sm">General</h3>
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Focus Search</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs">/</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">New Item</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs">Ctrl+N</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Show Help</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs">?</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600 dark:text-slate-300">Close Modal</span>
                    <kbd className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-xs">Esc</kbd>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
              <p><strong>Note:</strong> On Mac, use Cmd+Shift instead of Ctrl+Shift. Alternative: Ctrl+Shift+Q for Quotes, Ctrl+Shift+S for Sales Orders, etc.</p>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;

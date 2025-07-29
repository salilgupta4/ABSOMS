

import React, { useState, useRef, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Bell, UserCircle, ChevronDown, Sun, Moon, LogOut, Settings, Menu } from 'lucide-react';
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
  const dropdownRef = useRef<HTMLDivElement>(null);

  const pathnames = location.pathname.split('/').filter(x => x);
  const pageTitle = pathnames.length > 0 ? pathnames.map(capitalizeFirstLetter).join(' > ') : 'Dashboard';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-20 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center space-x-4">
         <button onClick={onMenuClick} className="md:hidden text-slate-500 hover:text-primary dark:text-slate-400 dark:hover:text-white">
            <Menu size={24} />
         </button>
        <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200">{pageTitle}</h2>
      </div>
      <div className="flex items-center space-x-6">
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
    </header>
  );
};

export default Header;

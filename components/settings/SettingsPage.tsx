

import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';
const { NavLink, Outlet } = ReactRouterDOM;
import { Building, Palette, ListOrdered, FileJson, FileText, Database, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessAdminFeatures } from '@/utils/permissions';

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const canSeeDataManagement = canAccessAdminFeatures(user);
  
  const navItems = [
    { name: 'Company Details', path: 'company', icon: <Building size={20} /> },
    { name: 'Point of Contact', path: 'contacts', icon: <Users size={20} /> },
    { name: 'Theme Colors', path: 'theme', icon: <Palette size={20} /> },
    { name: 'Document Numbering', path: 'numbering', icon: <ListOrdered size={20} /> },
    { name: 'PDF Templates', path: 'pdf', icon: <FileJson size={20} /> },
    { name: 'Terms & Conditions', path: 'terms', icon: <FileText size={20} /> },
    ...(canSeeDataManagement ? [{ name: 'Data Management', path: 'data', icon: <Database size={20} /> }] : []),
  ];

  return (
    <div>
      <h3 className="text-3xl font-bold text-slate-800 dark:text-slate-200 mb-6">Settings</h3>
      <div className="flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-8">
        <div className="lg:w-1/4">
          <nav className="flex flex-col space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center px-4 py-3 rounded-lg text-sm font-medium ${
                    isActive
                      ? 'bg-primary text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-primary-light hover:text-primary dark:hover:bg-slate-700 dark:hover:text-slate-200'
                  }`
                }
              >
                {item.icon}
                <span className="ml-3">{item.name}</span>
              </NavLink>
            ))}
          </nav>
        </div>
        <div className="lg:w-3/4">
           <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-8">
            <Outlet />
           </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;



import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Building, ShoppingCart, Truck, Settings, FileText, ChevronDown, ChevronRight, Package, Box, X, SquarePen, Landmark, FolderOpen, Clock, MapPin } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';
import { canAccessModule, canAccessAdminFeatures, canAccessSettings } from '@/utils/permissions';

interface SidebarProps {
    isSidebarOpen: boolean;
    setIsSidebarOpen: (isOpen: boolean) => void;
}

const SidebarLink: React.FC<{ to: string; icon: React.ReactNode; children: React.ReactNode, onClick: () => void }> = ({ to, icon, children, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) =>
      `flex items-center px-3 py-1.5 text-xs font-medium transition-colors duration-200 rounded-lg ${
        isActive
          ? 'bg-primary text-white'
          : 'text-slate-600 dark:text-slate-300 hover:bg-primary-light hover:text-primary dark:hover:text-white'
      }`
    }
  >
    {icon}
    <span className="ml-2">{children}</span>
  </NavLink>
);

const CollapsibleLink: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean, onLinkClick: () => void }> = ({ title, icon, children, defaultOpen = false, onLinkClick }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    // We need to inject the onClick into the children, which are SidebarLinks
    const childrenWithProps = React.Children.map(children, child => {
        if (React.isValidElement(child)) {
            return React.cloneElement(child, { onClick: onLinkClick } as any);
        }
        return child;
    });

    return (
        <div>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-left text-slate-600 dark:text-slate-300 hover:bg-primary-light hover:text-primary dark:hover:text-white rounded-lg transition-colors duration-200"
            >
                <div className="flex items-center">
                    {icon}
                    <span className="ml-2">{title}</span>
                </div>
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {isOpen && (
                <div className="mt-1 ml-2 pl-2 border-l border-slate-200 dark:border-slate-700">
                    {childrenWithProps}
                </div>
            )}
        </div>
    );
}

const Sidebar: React.FC<SidebarProps> = ({ isSidebarOpen, setIsSidebarOpen }) => {
  const { user } = useAuth();

  const handleLinkClick = () => {
    // Only close if on a mobile view (where the sidebar is a modal)
    if (window.innerWidth < 768) { 
        setIsSidebarOpen(false);
    }
  }

  const sidebarClasses = `
    w-48 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col
    fixed inset-y-0 left-0 z-40
    transform transition-transform duration-300 ease-in-out
    md:relative md:translate-x-0
    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
  `;
  
  const canSeeErp = canAccessModule(user, 'erp');
  const canSeePayroll = canAccessModule(user, 'payroll');
  const canSeeProjects = canAccessModule(user, 'projects');
  const canSeeAdmin = canAccessAdminFeatures(user);
  const canSeeSettings = canAccessSettings(user);


  return (
    <div className={sidebarClasses}>
      <div className="flex items-center justify-between h-16 border-b border-slate-200 dark:border-slate-700 px-3">
        <h1 className="text-lg font-bold text-primary">ABS OMS</h1>
         <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-1.5 text-slate-500 hover:text-primary">
            <X size={20}/>
        </button>
      </div>
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {canSeeErp && (
          <>
            <SidebarLink to="/dashboard" icon={<LayoutDashboard size={18} />} onClick={handleLinkClick}>Dashboard</SidebarLink>
            <SidebarLink to="/customers" icon={<Building size={18} />} onClick={handleLinkClick}>Customers</SidebarLink>
            <SidebarLink to="/products" icon={<Package size={18} />} onClick={handleLinkClick}>Products</SidebarLink>
            
            <CollapsibleLink title="Sales" icon={<ShoppingCart size={18} />} defaultOpen onLinkClick={handleLinkClick}>
                <div className="space-y-1 mt-1">
                    <SidebarLink to="/sales/quotes" icon={<FileText size={18} />} onClick={handleLinkClick}>Quotes</SidebarLink>
                    <SidebarLink to="/sales/orders" icon={<FileText size={18} />} onClick={handleLinkClick}>Sales Orders</SidebarLink>
                    <SidebarLink to="/sales/deliveries" icon={<Truck size={18} />} onClick={handleLinkClick}>Delivery Orders</SidebarLink>
                    <SidebarLink to="/sales/pending-items" icon={<Clock size={18} />} onClick={handleLinkClick}>Pending Items</SidebarLink>
                </div>
            </CollapsibleLink>

            <CollapsibleLink title="Purchase" icon={<ShoppingCart size={18} />} defaultOpen onLinkClick={handleLinkClick}>
              <div className="space-y-1 mt-1">
                    <SidebarLink to="/vendors" icon={<Building size={18} />} onClick={handleLinkClick}>Vendors</SidebarLink>
                    <SidebarLink to="/purchase/orders" icon={<FileText size={18} />} onClick={handleLinkClick}>Purchase Orders</SidebarLink>
                </div>
            </CollapsibleLink>

            <SidebarLink to="/inventory" icon={<Box size={18} />} onClick={handleLinkClick}>Inventory</SidebarLink>
            <SidebarLink to="/transport/list" icon={<MapPin size={18} />} onClick={handleLinkClick}>Transport</SidebarLink>
            <SidebarLink to="/scratchpad" icon={<SquarePen size={18} />} onClick={handleLinkClick}>Scratchpad</SidebarLink>
          </>
        )}

        {canSeeProjects && (
          <SidebarLink to="/projects" icon={<FolderOpen size={18} />} onClick={handleLinkClick}>Projects</SidebarLink>
        )}

        {canSeePayroll && (
          <SidebarLink to="/payroll/dashboard" icon={<Landmark size={18} />} onClick={handleLinkClick}>Payroll</SidebarLink>
        )}

        <hr className="my-2 border-slate-200 dark:border-slate-700" />

        {canSeeAdmin && (
          <SidebarLink to="/users" icon={<Users size={18} />} onClick={handleLinkClick}>User Management</SidebarLink>
        )}
        
        {canSeeSettings && (
          <SidebarLink to="/settings" icon={<Settings size={18} />} onClick={handleLinkClick}>Settings</SidebarLink>
        )}
      </nav>
      <div className="p-2 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">© 2025 ABSPL</p>
      </div>
    </div>
  );
};

export default Sidebar;
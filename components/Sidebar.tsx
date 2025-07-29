


import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Building, ShoppingCart, Truck, Settings, FileText, ChevronDown, ChevronRight, Package, Box, X, SquarePen, Landmark, FolderOpen } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';

interface SidebarProps {
    isSidebarOpen: boolean;
    setIsSidebarOpen: (isOpen: boolean) => void;
}

const SidebarLink: React.FC<{ to: string; icon: React.ReactNode; children: React.ReactNode, onClick: () => void }> = ({ to, icon, children, onClick }) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) =>
      `flex items-center px-4 py-2.5 text-sm font-medium transition-colors duration-200 rounded-lg ${
        isActive
          ? 'bg-primary text-white'
          : 'text-slate-600 dark:text-slate-300 hover:bg-primary-light hover:text-primary dark:hover:text-white'
      }`
    }
  >
    {icon}
    <span className="ml-3">{children}</span>
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
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-left text-slate-600 dark:text-slate-300 hover:bg-primary-light hover:text-primary dark:hover:text-white rounded-lg transition-colors duration-200"
            >
                <div className="flex items-center">
                    {icon}
                    <span className="ml-3">{title}</span>
                </div>
                {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
            {isOpen && (
                <div className="mt-1 ml-4 pl-4 border-l-2 border-slate-200 dark:border-slate-700">
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
    w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col
    fixed inset-y-0 left-0 z-40
    transform transition-transform duration-300 ease-in-out
    md:relative md:translate-x-0
    ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
  `;
  
  const canSeeErp = user?.role === UserRole.Admin || user?.hasErpAccess;
  const canSeePayroll = user?.hasPayrollAccess;


  return (
    <div className={sidebarClasses}>
      <div className="flex items-center justify-between h-20 border-b border-slate-200 dark:border-slate-700 px-4">
        <h1 className="text-2xl font-bold text-primary">ABS OMS</h1>
         <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 text-slate-500 hover:text-primary">
            <X size={24}/>
        </button>
      </div>
      <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto">
        {canSeeErp && (
          <>
            <SidebarLink to="/dashboard" icon={<LayoutDashboard size={20} />} onClick={handleLinkClick}>Dashboard</SidebarLink>
            <SidebarLink to="/customers" icon={<Building size={20} />} onClick={handleLinkClick}>Customers</SidebarLink>
            <SidebarLink to="/products" icon={<Package size={20} />} onClick={handleLinkClick}>Products</SidebarLink>
            
            <CollapsibleLink title="Sales" icon={<ShoppingCart size={20} />} defaultOpen onLinkClick={handleLinkClick}>
                <div className="space-y-2 mt-2">
                    <SidebarLink to="/sales/quotes" icon={<FileText size={18} />} onClick={handleLinkClick}>Quotes</SidebarLink>
                    <SidebarLink to="/sales/orders" icon={<FileText size={18} />} onClick={handleLinkClick}>Sales Orders</SidebarLink>
                    <SidebarLink to="/sales/deliveries" icon={<Truck size={18} />} onClick={handleLinkClick}>Delivery Orders</SidebarLink>
                </div>
            </CollapsibleLink>

            <CollapsibleLink title="Purchase" icon={<ShoppingCart size={20} />} defaultOpen onLinkClick={handleLinkClick}>
              <div className="space-y-2 mt-2">
                    <SidebarLink to="/vendors" icon={<Building size={18} />} onClick={handleLinkClick}>Vendors</SidebarLink>
                    <SidebarLink to="/purchase/orders" icon={<FileText size={18} />} onClick={handleLinkClick}>Purchase Orders</SidebarLink>
                </div>
            </CollapsibleLink>

            <SidebarLink to="/inventory" icon={<Box size={20} />} onClick={handleLinkClick}>Inventory</SidebarLink>
            <SidebarLink to="/scratchpad" icon={<SquarePen size={20} />} onClick={handleLinkClick}>Scratchpad</SidebarLink>
          </>
        )}

        <SidebarLink to="/projects" icon={<FolderOpen size={20} />} onClick={handleLinkClick}>Projects</SidebarLink>

        {canSeePayroll && (
          <SidebarLink to="/payroll/dashboard" icon={<Landmark size={20} />} onClick={handleLinkClick}>Payroll</SidebarLink>
        )}

        <hr className="my-4 border-slate-200 dark:border-slate-700" />

        <SidebarLink to="/users" icon={<Users size={20} />} onClick={handleLinkClick}>User Management</SidebarLink>
        <SidebarLink to="/settings" icon={<Settings size={20} />} onClick={handleLinkClick}>Settings</SidebarLink>
      </nav>
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500 dark:text-slate-400">© 2024 Your Company</p>
      </div>
    </div>
  );
};

export default Sidebar;
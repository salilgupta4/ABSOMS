
import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Users, PlayCircle, Calendar, DollarSign, BarChart, Settings } from 'lucide-react';

const PayrollLayout: React.FC = () => {
    
    const navItems = [
        { name: 'Dashboard', path: '/payroll/dashboard', icon: <LayoutDashboard size={18} /> },
        { name: 'Employees', path: '/payroll/employees', icon: <Users size={18} /> },
        { name: 'Run Payroll', path: '/payroll/run-payroll', icon: <PlayCircle size={18} /> },
        { name: 'Leave Management', path: '/payroll/leaves', icon: <Calendar size={18} /> },
        { name: 'Advances', path: '/payroll/advances', icon: <DollarSign size={18} /> },
        { name: 'Reports', path: '/payroll/reports', icon: <BarChart size={18} /> },
        { name: 'Settings', path: '/payroll/settings', icon: <Settings size={18} /> },
    ];

    return (
        <div className="space-y-6">
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-200 capitalize">
                Payroll Management
            </h2>
            
            <nav className="flex space-x-1 border-b border-slate-200 dark:border-slate-700 overflow-x-auto pb-px">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center px-4 py-2.5 rounded-t-lg text-sm font-medium whitespace-nowrap transition-colors ${
                                isActive
                                    ? 'border-b-2 border-primary text-primary'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200'
                            }`
                        }
                    >
                        {item.icon}
                        <span className="ml-2">{item.name}</span>
                    </NavLink>
                ))}
            </nav>
            
            <div className="mt-6">
                <Outlet />
            </div>
        </div>
    );
};

export default PayrollLayout;

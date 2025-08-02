

import React, { useEffect, useState } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
const { Outlet, useLocation, useNavigate } = ReactRouterDOM;
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import * as chatService from '@/services/chatService';
import ChatWidget from './chat/ChatWidget';

const Layout: React.FC = () => {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Close sidebar on route change on mobile
    setIsSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    let activityInterval: number;

    if (user) {
      // Update activity immediately on load
      chatService.updateUserActivity(user.id, user.name);
      
      // And then update periodically
      activityInterval = window.setInterval(() => {
        chatService.updateUserActivity(user.id, user.name);
      }, 30000); // every 30 seconds
    }

    return () => {
      if (activityInterval) {
        clearInterval(activityInterval);
      }
    };
  }, [user]);

  // Global keyboard shortcuts for module navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not in input fields
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.contentEditable === 'true';
      
      if (isInputField) return;

      // Module navigation shortcuts (Alt/Option + number for Mac/Windows compatibility)
      if (e.altKey && !e.ctrlKey && !e.metaKey) {
        const moduleShortcuts: { [key: string]: string } = {
          '1': '/dashboard',
          '2': '/sales/quotes',
          '3': '/sales/orders', 
          '4': '/sales/deliveries',
          '5': '/purchase/orders',
          '6': '/customers',
          '7': '/products',
          '8': '/settings',
        };

        if (moduleShortcuts[e.key]) {
          e.preventDefault();
          navigate(moduleShortcuts[e.key]);
        }
      }

      // Additional shortcuts for Mac (Cmd) and Windows (Ctrl)
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        const combinedShortcuts: { [key: string]: string } = {
          'D': '/dashboard',
          'Q': '/sales/quotes',
          'S': '/sales/orders',
          'L': '/sales/deliveries', // 'L' for delivery/logistics
          'P': '/purchase/orders',
          'C': '/customers',
          'R': '/products', // 'R' for products/resources
          'T': '/settings', // 'T' for settings/tools
        };

        if (combinedShortcuts[e.key.toUpperCase()]) {
          e.preventDefault();
          navigate(combinedShortcuts[e.key.toUpperCase()]);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-800">
      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 dark:bg-slate-900">
          <div className="container mx-auto px-4 py-6">
            <Outlet />
          </div>
        </main>
        {isSidebarOpen && (
            <div 
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 bg-black/50 z-30 md:hidden"
                aria-hidden="true"
            ></div>
        )}
      </div>
      <ChatWidget />
    </div>
  );
};

export default Layout;
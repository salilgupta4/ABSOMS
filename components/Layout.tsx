

import React, { useEffect, useState } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
const { Outlet, useLocation } = ReactRouterDOM;
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import * as chatService from '@/services/chatService';
import ChatWidget from './chat/ChatWidget';

const Layout: React.FC = () => {
  const { user } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

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

  return (
    <div className="flex h-screen bg-slate-100 dark:bg-slate-800">
      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Header onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)} />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50 dark:bg-slate-900">
          <div className="container mx-auto px-6 py-8">
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
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { canPerformAction } from '@/utils/permissions';
import { AlertTriangle } from 'lucide-react';

interface PermissionGuardProps {
  action: 'create' | 'edit' | 'delete' | 'view';
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showAccessDenied?: boolean;
}

const PermissionGuard: React.FC<PermissionGuardProps> = ({ 
  action, 
  children, 
  fallback,
  showAccessDenied = false 
}) => {
  const { user } = useAuth();

  const hasPermission = canPerformAction(user, action);

  if (!hasPermission) {
    if (fallback) {
      return <>{fallback}</>;
    }
    
    if (showAccessDenied) {
      return (
        <div className="flex items-center justify-center p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <AlertTriangle className="text-red-500 mr-2" size={20} />
          <span className="text-red-600 dark:text-red-400 text-sm">
            You don't have permission to {action} this resource.
          </span>
        </div>
      );
    }
    
    return null;
  }

  return <>{children}</>;
};

export default PermissionGuard;
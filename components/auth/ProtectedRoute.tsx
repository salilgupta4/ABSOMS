
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader } from 'lucide-react';
import { canAccessModule } from '@/utils/permissions';

interface ProtectedRouteProps {
  children: React.ReactElement;
  permissionKey?: 'hasErpAccess' | 'hasPayrollAccess' | 'hasProjectsAccess';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, permissionKey }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
        <div className="flex items-center justify-center h-screen bg-slate-100 dark:bg-slate-900">
            <Loader className="animate-spin text-primary" size={48} />
        </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check for module-specific permissions if a permissionKey is provided
  if (permissionKey) {
    let hasPermission = false;
    
    // Map permission keys to module names for our canAccessModule function
    switch (permissionKey) {
      case 'hasErpAccess':
        hasPermission = canAccessModule(user, 'erp');
        break;
      case 'hasPayrollAccess':
        hasPermission = canAccessModule(user, 'payroll');
        break;
      case 'hasProjectsAccess':
        hasPermission = canAccessModule(user, 'projects');
        break;
      default:
        hasPermission = false;
    }

    if (!hasPermission) {
      // User is logged in but doesn't have the required permission.
      // Redirect them to the dashboard with an error message.
      return <Navigate to="/dashboard?error=access_denied" replace />;
    }
  }


  return children;
};

export default ProtectedRoute;
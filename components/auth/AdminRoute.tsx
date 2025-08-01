import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessAdminFeatures } from '@/utils/permissions';
import { Loader } from 'lucide-react';

interface AdminRouteProps {
  children: React.ReactElement;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100 dark:bg-slate-900">
        <Loader className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!canAccessAdminFeatures(user)) {
    // Redirect to dashboard with access denied message
    return <Navigate to="/dashboard?error=admin_access_denied" replace />;
  }

  return children;
};

export default AdminRoute;
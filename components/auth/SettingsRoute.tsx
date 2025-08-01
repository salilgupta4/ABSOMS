import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { canAccessSettings } from '@/utils/permissions';

interface SettingsRouteProps {
  children: React.ReactNode;
}

const SettingsRoute: React.FC<SettingsRouteProps> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!canAccessSettings(user)) {
    return <Navigate to="/dashboard?error=settings_access_denied" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

export default SettingsRoute;
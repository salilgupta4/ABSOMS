import { User, UserRole } from '@/types';
import { Project } from '@/services/projectsService';

export interface PermissionConfig {
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canView: boolean;
}

/**
 * Role-based permissions:
 * - Viewer: Can only view, no create/edit/delete
 * - Maker: Can create and edit, but not delete
 * - Approver: Can create, edit, and delete, but not access data management or user management
 * - Admin: Full access to everything
 */
export const getRolePermissions = (userRole: UserRole): PermissionConfig => {
  switch (userRole) {
    case UserRole.Viewer:
      return {
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canView: true,
      };
    case UserRole.Maker:
      return {
        canCreate: true,
        canEdit: true,
        canDelete: false,
        canView: true,
      };
    case UserRole.Approver:
      return {
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canView: true,
      };
    case UserRole.Admin:
      return {
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canView: true,
      };
    default:
      return {
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canView: true,
      };
  }
};

/**
 * Check if user can access admin-only features (Data Management, User Management)
 */
export const canAccessAdminFeatures = (user: User | null): boolean => {
  return user?.role === UserRole.Admin;
};

/**
 * Check if user can access Settings (Makers, Approvers, and Admins can access Settings)
 */
export const canAccessSettings = (user: User | null): boolean => {
  if (!user) return false;
  return user.role === UserRole.Maker || user.role === UserRole.Approver || user.role === UserRole.Admin;
};

/**
 * Check if user can perform a specific action
 */
export const canPerformAction = (user: User | null, action: 'create' | 'edit' | 'delete' | 'view'): boolean => {
  if (!user) return false;
  
  const permissions = getRolePermissions(user.role);
  
  switch (action) {
    case 'create':
      return permissions.canCreate;
    case 'edit':
      return permissions.canEdit;
    case 'delete':
      return permissions.canDelete;
    case 'view':
      return permissions.canView;
    default:
      return false;
  }
};

/**
 * Check if user can access a specific module based on role and permissions
 */
export const canAccessModule = (user: User | null, module: 'erp' | 'payroll' | 'projects' | 'admin'): boolean => {
  if (!user) return false;
  
  console.log(`Checking access for module: ${module}`, {
    userRole: user.role,
    hasErpAccess: user.hasErpAccess,
    hasPayrollAccess: user.hasPayrollAccess,
    hasProjectsAccess: user.hasProjectsAccess,
    userId: user.id
  });
  
  switch (module) {
    case 'erp':
      return user.role === UserRole.Admin || user.hasErpAccess;
    case 'payroll':
      return user.hasPayrollAccess;
    case 'projects':
      const hasProjectsAccess = user.role === UserRole.Admin || user.hasProjectsAccess;
      console.log(`Projects access result: ${hasProjectsAccess} (Admin: ${user.role === UserRole.Admin}, hasProjectsAccess: ${user.hasProjectsAccess})`);
      return hasProjectsAccess;
    case 'admin':
      return canAccessAdminFeatures(user);
    default:
      return false;
  }
};

/**
 * Check if user can access a specific project based on their role vs project's required access level
 */
export const canAccessProject = (user: User | null, project: Project): boolean => {
  if (!user) return false;
  
  // Admin can access all projects
  if (user.role === UserRole.Admin) return true;
  
  // Role hierarchy: Admin > Approver > Maker > Viewer
  const roleHierarchy = {
    [UserRole.Viewer]: 1,
    [UserRole.Maker]: 2,
    [UserRole.Approver]: 3,
    [UserRole.Admin]: 4
  };
  
  const userLevel = roleHierarchy[user.role];
  const requiredLevel = roleHierarchy[project.requiredAccessLevel];
  
  // User can access project if their role level is >= required level
  return userLevel >= requiredLevel;
};
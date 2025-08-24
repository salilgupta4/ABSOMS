# ABS OMS - User Access Control Documentation

## Overview

The ABS OMS (Order Management System) implements a comprehensive role-based access control system with module-specific permissions to ensure data security and proper authorization across the application.

## User Roles Hierarchy

### 1. Admin (Highest Level)
- **Full system access** including user management and system settings
- Can perform all CRUD operations across all modules
- Access to sensitive financial and administrative functions
- Can manage other users and their permissions

### 2. Approver 
- Can create, edit, and delete records in assigned modules
- Cannot access user management or system administration
- Can approve transactions and workflows where implemented
- Higher privileges than Maker role

### 3. Maker
- Can create and edit records but cannot delete
- Cannot access administrative functions
- Can access settings for configuration purposes
- Limited approval capabilities

### 4. Viewer (Lowest Level)
- **Read-only access** to assigned modules
- Cannot create, edit, or delete any records
- Cannot access settings or administrative functions
- Suitable for stakeholders who need visibility without modification rights

## Module-Specific Access Controls

### ERP Module (`hasErpAccess: boolean`)
**Includes:** Sales, Purchase, Inventory, Transport, Customers, Products, Vendors

**Access Requirements:**
- Must have `hasErpAccess: true` OR be an Admin
- Role-based permissions apply within the module

**Components Protected:**
- Dashboard
- Sales Operations (Quotes, Orders, Deliveries)
- Purchase Operations 
- Inventory Management
- Transport Management
- Customer & Vendor Management
- Product Management

### Payroll Module (`hasPayrollAccess: boolean`)
**Includes:** Employee management, payroll processing, leave management

**Access Requirements:**
- Must have `hasPayrollAccess: true` (Admin role alone is not sufficient)
- Contains sensitive financial and personal data

**Components Protected:**
- Payroll Dashboard
- Employee Management
- Payroll Processing
- Leave Management
- Advance Payments
- Payroll Reports

### Projects Module (`hasProjectsAccess: boolean`)
**Includes:** Project management, task tracking, resource allocation

**Access Requirements:**
- Must have `hasProjectsAccess: true` OR be an Admin
- Projects have individual access level requirements

**Components Protected:**
- Projects Dashboard
- Project Creation/Management
- Task Management
- Resource Allocation

## Route-Level Protection

### ProtectedRoute Component
```tsx
// Basic authentication check
<ProtectedRoute>
  <Component />
</ProtectedRoute>

// Module-specific permission check
<ProtectedRoute permissionKey="hasErpAccess">
  <ERPComponent />
</ProtectedRoute>
```

### AdminRoute Component
```tsx
// Admin-only features
<AdminRoute>
  <UserManagement />
</AdminRoute>
```

### SettingsRoute Component
```tsx
// Maker, Approver, and Admin access
<SettingsRoute>
  <SettingsPage />
</SettingsRoute>
```

## Component-Level Permission Checks

### Recommended Implementation Pattern
```tsx
import { useAuth } from '@/contexts/AuthContext';
import { canPerformAction, UserRole } from '@/utils/permissions';

const MyComponent: React.FC = () => {
  const { user } = useAuth();
  
  // Role-based checks
  const isViewer = user?.role === UserRole.Viewer;
  const isAdmin = user?.role === UserRole.Admin;
  
  // Action-based checks
  const canCreate = canPerformAction(user, 'create');
  const canEdit = canPerformAction(user, 'edit');
  const canDelete = canPerformAction(user, 'delete');
  
  // Conditional rendering
  return (
    <div>
      {canCreate && <CreateButton />}
      {canEdit && <EditButton />}
      {canDelete && <DeleteButton />}
    </div>
  );
};
```

## Current Security Issues & Fixes Required

### 🚨 Critical Issues Identified

#### 1. Transport Module - No Access Control
**Issue:** Complete lack of permission checks
**Risk:** High - Financial transaction management unprotected
**Fix Required:** Add proper route and component-level protection

#### 2. Sales Forms - Missing Permission Validation  
**Issue:** Any authenticated user can create/modify quotes and orders
**Risk:** High - Unauthorized financial operations
**Fix Required:** Add role-based form validation

#### 3. Payroll Components - Insufficient Granular Controls
**Issue:** Basic route protection but no component-level validation
**Risk:** High - Sensitive HR/financial data exposure
**Fix Required:** Enhanced permission checking within components

#### 4. Purchase Operations - No Component-Level Checks
**Issue:** Forms lack permission validation
**Risk:** High - Financial operations unprotected
**Fix Required:** Add permission checks to all form components

### ✅ Well-Protected Areas

1. **User Management** - Properly restricted to Admin only
2. **Settings Pages** - Good role-based access controls
3. **Quote/Order Lists** - Proper viewer restrictions implemented
4. **Admin Features** - Well-protected with AdminRoute

## Permission Utility Functions

### Available Functions (`/utils/permissions.ts`)

```tsx
// Get role-based permissions
getRolePermissions(userRole: UserRole): PermissionConfig

// Check admin access
canAccessAdminFeatures(user: User): boolean

// Check settings access (Maker, Approver, Admin)
canAccessSettings(user: User): boolean  

// Check specific action permissions
canPerformAction(user: User, action: 'create'|'edit'|'delete'|'view'): boolean

// Check module access
canAccessModule(user: User, module: 'erp'|'payroll'|'projects'|'admin'): boolean

// Check project-specific access
canAccessProject(user: User, project: Project): boolean
```

## Error Handling

### Access Denied Scenarios
- **No Authentication:** Redirect to `/login`
- **Insufficient Module Permission:** Redirect to `/dashboard?error=access_denied`
- **Admin Required:** Redirect to `/dashboard?error=admin_required`
- **Settings Access Denied:** Redirect to `/dashboard?error=settings_access_denied`

### Dashboard Error Display
The Dashboard component handles access denied errors by showing appropriate messages:
- Module access denied
- Admin privileges required
- Settings access restricted

## Best Practices for Developers

### 1. Always Check Permissions
```tsx
// ❌ Bad - No permission check
const handleDelete = async () => {
  await deleteRecord(id);
};

// ✅ Good - Check permission first
const handleDelete = async () => {
  if (!canPerformAction(user, 'delete')) {
    alert('Access denied');
    return;
  }
  await deleteRecord(id);
};
```

### 2. Hide UI Elements Based on Permissions
```tsx
// ❌ Bad - Show button regardless of permission
<button onClick={handleDelete}>Delete</button>

// ✅ Good - Conditionally show button
{canPerformAction(user, 'delete') && (
  <button onClick={handleDelete}>Delete</button>
)}
```

### 3. Use Permission Guards
```tsx
// ✅ Good - Use a reusable permission guard
<PermissionGuard action="delete" fallback={<div>Access Denied</div>}>
  <DeleteButton />
</PermissionGuard>
```

## Testing Access Controls

### Manual Testing Checklist

1. **Role-Based Testing**
   - [ ] Test each role (Admin, Approver, Maker, Viewer) across all modules
   - [ ] Verify create/edit/delete restrictions per role
   - [ ] Confirm UI elements are properly hidden/shown

2. **Module Access Testing**  
   - [ ] Test hasErpAccess flag combinations
   - [ ] Test hasPayrollAccess restrictions
   - [ ] Test hasProjectsAccess limitations

3. **Route Protection Testing**
   - [ ] Direct URL access attempts for restricted routes
   - [ ] Module-specific route protection
   - [ ] Admin-only route protection

4. **Component-Level Testing**
   - [ ] Form submission with insufficient permissions
   - [ ] Button interactions based on role
   - [ ] Data modification attempts

## Security Recommendations

### Immediate Actions Required

1. **Fix Transport Module** - Add comprehensive access controls
2. **Enhance Form Validation** - Add permission checks to all forms
3. **Implement Permission Guard** - Create reusable permission checking component
4. **Add Audit Logging** - Log sensitive operations for compliance

### Future Enhancements

1. **Session Management** - Implement session timeout for sensitive operations
2. **IP-Based Restrictions** - Add location-based security for admin operations
3. **Two-Factor Authentication** - Enhanced security for admin accounts
4. **Permission Caching** - Optimize permission checking performance

## Conclusion

The ABS OMS has a solid foundation for access control with a clear role hierarchy and module-specific permissions. However, implementation consistency across components needs improvement, particularly in form validation and component-level permission checking. Priority should be given to fixing the identified critical security vulnerabilities while maintaining the existing well-protected areas.
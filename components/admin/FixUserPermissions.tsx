import React, { useState } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { Wrench, CheckCircle, AlertCircle } from 'lucide-react';

const FixUserPermissions: React.FC = () => {
  const { user } = useAuth();
  const [fixing, setFixing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fixCurrentUserPermissions = async () => {
    if (!user?.id) {
      setError('No user is currently logged in');
      return;
    }

    setFixing(true);
    setError(null);
    setResult(null);

    try {
      console.log('🔧 Fixing permissions for user:', user.email);
      
      // Get current user document
      const userDocRef = doc(db, 'users', user.id);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        throw new Error('User document not found in Firestore');
      }
      
      const userData = userDoc.data();
      console.log('📄 Current user data:', userData);
      
      // Check if permissions already exist
      const hasPermissions = (
        userData.hasErpAccess !== undefined &&
        userData.hasPayrollAccess !== undefined &&
        userData.hasProjectsAccess !== undefined
      );
      
      if (hasPermissions) {
        setResult(`✅ Permissions already exist:
- ERP Access: ${userData.hasErpAccess}
- Payroll Access: ${userData.hasPayrollAccess}
- Projects Access: ${userData.hasProjectsAccess}`);
        return;
      }
      
      // Set default permissions for Admin users
      const isAdmin = userData.role === 'Admin';
      const updates = {
        hasErpAccess: userData.hasErpAccess ?? (isAdmin ? true : true), // Default new users to ERP access
        hasPayrollAccess: userData.hasPayrollAccess ?? (isAdmin ? true : false),
        hasProjectsAccess: userData.hasProjectsAccess ?? (isAdmin ? true : false),
        updatedAt: new Date().toISOString(),
        permissionsFixed: true
      };
      
      console.log('🔄 Updating user with permissions:', updates);
      
      await updateDoc(userDocRef, updates);
      
      setResult(`✅ Permissions updated successfully!
- ERP Access: ${updates.hasErpAccess}
- Payroll Access: ${updates.hasPayrollAccess}
- Projects Access: ${updates.hasProjectsAccess}

Please refresh the page to see the changes.`);
      
      // Optionally refresh the page after a delay
      setTimeout(() => {
        window.location.reload();
      }, 3000);
      
    } catch (error) {
      console.error('❌ Error fixing user permissions:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    } finally {
      setFixing(false);
    }
  };

  return (
    <Card 
      title="Fix User Permissions" 
      bodyClassName="p-6"
    >
      <div className="space-y-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="text-amber-500 mt-1" size={20} />
          <div className="text-sm text-slate-600">
            <p className="font-medium mb-2">If you're seeing "Missing or insufficient permissions" errors:</p>
            <p>This tool will add the required permission fields to your user profile. 
            This is needed for users created before the permission system was implemented.</p>
          </div>
        </div>
        
        <div className="bg-slate-50 p-3 rounded-md text-sm">
          <p><strong>Current User:</strong> {user?.email}</p>
          <p><strong>Role:</strong> {user?.role}</p>
          <p><strong>Current Permissions:</strong></p>
          <ul className="ml-4 mt-1">
            <li>• ERP Access: {user?.hasErpAccess?.toString() ?? 'undefined'}</li>
            <li>• Payroll Access: {user?.hasPayrollAccess?.toString() ?? 'undefined'}</li>
            <li>• Projects Access: {user?.hasProjectsAccess?.toString() ?? 'undefined'}</li>
          </ul>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="flex items-center space-x-2">
              <AlertCircle className="text-red-500" size={16} />
              <span className="text-red-700 text-sm font-medium">Error</span>
            </div>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        )}
        
        {result && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className="text-green-500" size={16} />
              <span className="text-green-700 text-sm font-medium">Success</span>
            </div>
            <pre className="text-green-600 text-sm whitespace-pre-wrap">{result}</pre>
          </div>
        )}
        
        <Button 
          onClick={fixCurrentUserPermissions}
          disabled={fixing}
          icon={<Wrench size={16} />}
          className="w-full"
        >
          {fixing ? 'Fixing Permissions...' : 'Fix My User Permissions'}
        </Button>
      </div>
    </Card>
  );
};

export default FixUserPermissions;
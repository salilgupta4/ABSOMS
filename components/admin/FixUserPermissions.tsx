import React, { useState, useEffect } from 'react';
import { doc, updateDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/services/firebase';
import { useAuth } from '@/contexts/AuthContext';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { Wrench, CheckCircle, AlertCircle, RefreshCw, Database, User, Eye } from 'lucide-react';

const FixUserPermissions: React.FC = () => {
  const { user } = useAuth();
  const [fixing, setFixing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [diagnosing, setDiagnosing] = useState(false);
  const [diagnostics, setDiagnostics] = useState<any>(null);
  const [testingQuotes, setTestingQuotes] = useState(false);
  const [quotesTest, setQuotesTest] = useState<string | null>(null);

  // Run comprehensive diagnostics
  const runDiagnostics = async () => {
    if (!user?.id) return;
    
    setDiagnosing(true);
    setError(null);
    
    try {
      const diagnosis: any = {
        authUser: {
          uid: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          hasErpAccess: user.hasErpAccess,
          hasPayrollAccess: user.hasPayrollAccess,
          hasProjectsAccess: user.hasProjectsAccess
        }
      };

      // Check Firestore user document
      const userDocRef = doc(db, 'users', user.id);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        diagnosis.firestoreUser = userDoc.data();
      } else {
        diagnosis.firestoreUser = null;
        diagnosis.error = 'User document not found in Firestore';
      }

      // Test quotes collection access
      try {
        const quotesRef = collection(db, 'quotes');
        const quotesSnapshot = await getDocs(quotesRef);
        diagnosis.quotesAccess = {
          success: true,
          count: quotesSnapshot.size,
          message: `Successfully accessed quotes collection with ${quotesSnapshot.size} documents`
        };
      } catch (quotesError: any) {
        diagnosis.quotesAccess = {
          success: false,
          error: quotesError.message,
          code: quotesError.code
        };
      }

      // Check Firebase Auth current user
      diagnosis.firebaseAuth = {
        currentUser: !!user,
        uid: user?.id,
        email: user?.email
      };

      setDiagnostics(diagnosis);
      
    } catch (error: any) {
      setError(`Diagnostic error: ${error.message}`);
    } finally {
      setDiagnosing(false);
    }
  };

  // Test quotes collection access specifically
  const testQuotesAccess = async () => {
    setTestingQuotes(true);
    setQuotesTest(null);
    
    try {
      console.log('🧪 Testing quotes collection access...');
      const quotesRef = collection(db, 'quotes');
      const quotesSnapshot = await getDocs(quotesRef);
      
      setQuotesTest(`✅ SUCCESS: Accessed quotes collection with ${quotesSnapshot.size} documents`);
      console.log('✅ Quotes test successful:', quotesSnapshot.size, 'documents');
      
    } catch (error: any) {
      const errorMsg = `❌ FAILED: ${error.message} (Code: ${error.code})`;
      setQuotesTest(errorMsg);
      console.error('❌ Quotes test failed:', error);
    } finally {
      setTestingQuotes(false);
    }
  };

  // Auto-run diagnostics on component mount
  useEffect(() => {
    if (user?.id) {
      runDiagnostics();
    }
  }, [user?.id]);

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
    <div className="space-y-6">
      {/* Diagnostics Section */}
      <Card 
        title="Permissions Diagnostics" 
        bodyClassName="p-6"
      >
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database className="text-blue-500" size={20} />
              <span className="font-medium">System Status</span>
            </div>
            <Button 
              onClick={runDiagnostics}
              disabled={diagnosing}
              icon={<RefreshCw size={16} className={diagnosing ? 'animate-spin' : ''} />}
              variant="secondary"
              size="sm"
            >
              {diagnosing ? 'Scanning...' : 'Refresh'}
            </Button>
          </div>

          {diagnostics && (
            <div className="space-y-4">
              {/* Auth Context User */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <User className="text-blue-500" size={16} />
                  <span className="text-blue-700 text-sm font-medium">Auth Context User</span>
                </div>
                <div className="text-sm space-y-1">
                  <p>Email: {diagnostics.authUser.email}</p>
                  <p>Role: {diagnostics.authUser.role}</p>
                  <p>ERP Access: <span className={diagnostics.authUser.hasErpAccess ? 'text-green-600' : 'text-red-600'}>{diagnostics.authUser.hasErpAccess?.toString() ?? 'undefined'}</span></p>
                  <p>Payroll Access: <span className={diagnostics.authUser.hasPayrollAccess ? 'text-green-600' : 'text-red-600'}>{diagnostics.authUser.hasPayrollAccess?.toString() ?? 'undefined'}</span></p>
                  <p>Projects Access: <span className={diagnostics.authUser.hasProjectsAccess ? 'text-green-600' : 'text-red-600'}>{diagnostics.authUser.hasProjectsAccess?.toString() ?? 'undefined'}</span></p>
                </div>
              </div>

              {/* Firestore Document */}
              <div className="bg-purple-50 border border-purple-200 rounded-md p-3">
                <div className="flex items-center space-x-2 mb-2">
                  <Database className="text-purple-500" size={16} />
                  <span className="text-purple-700 text-sm font-medium">Firestore User Document</span>
                </div>
                {diagnostics.firestoreUser ? (
                  <div className="text-sm space-y-1">
                    <p>Email: {diagnostics.firestoreUser.email}</p>
                    <p>Role: {diagnostics.firestoreUser.role}</p>
                    <p>ERP Access: <span className={diagnostics.firestoreUser.hasErpAccess ? 'text-green-600' : 'text-red-600'}>{diagnostics.firestoreUser.hasErpAccess?.toString() ?? 'undefined'}</span></p>
                    <p>Payroll Access: <span className={diagnostics.firestoreUser.hasPayrollAccess ? 'text-green-600' : 'text-red-600'}>{diagnostics.firestoreUser.hasPayrollAccess?.toString() ?? 'undefined'}</span></p>
                    <p>Projects Access: <span className={diagnostics.firestoreUser.hasProjectsAccess ? 'text-green-600' : 'text-red-600'}>{diagnostics.firestoreUser.hasProjectsAccess?.toString() ?? 'undefined'}</span></p>
                  </div>
                ) : (
                  <p className="text-red-600 text-sm">❌ User document not found in Firestore!</p>
                )}
              </div>

              {/* Quotes Collection Test */}
              <div className={`border rounded-md p-3 ${diagnostics.quotesAccess?.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center space-x-2 mb-2">
                  <Eye className={diagnostics.quotesAccess?.success ? 'text-green-500' : 'text-red-500'} size={16} />
                  <span className={`text-sm font-medium ${diagnostics.quotesAccess?.success ? 'text-green-700' : 'text-red-700'}`}>
                    Quotes Collection Access
                  </span>
                </div>
                <p className={`text-sm ${diagnostics.quotesAccess?.success ? 'text-green-600' : 'text-red-600'}`}>
                  {diagnostics.quotesAccess?.success 
                    ? `✅ ${diagnostics.quotesAccess.message}` 
                    : `❌ ${diagnostics.quotesAccess?.error} (${diagnostics.quotesAccess?.code})`
                  }
                </p>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Quick Test Section */}
      <Card 
        title="Quick Tests" 
        bodyClassName="p-6"
      >
        <div className="space-y-4">
          <Button 
            onClick={testQuotesAccess}
            disabled={testingQuotes}
            icon={<Eye size={16} />}
            className="w-full"
          >
            {testingQuotes ? 'Testing Quotes Access...' : 'Test Quotes Collection Access'}
          </Button>

          {quotesTest && (
            <div className={`border rounded-md p-3 ${quotesTest.includes('SUCCESS') ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <p className={`text-sm ${quotesTest.includes('SUCCESS') ? 'text-green-600' : 'text-red-600'}`}>
                {quotesTest}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Fix Permissions Section */}
      <Card 
        title="Fix User Permissions" 
        bodyClassName="p-6"
      >
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <AlertCircle className="text-amber-500 mt-1" size={20} />
            <div className="text-sm text-slate-600">
              <p className="font-medium mb-2">If diagnostics show permission issues:</p>
              <p>This tool will add the required permission fields to your user profile.</p>
            </div>
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
    </div>
  );
};

export default FixUserPermissions;
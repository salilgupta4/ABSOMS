// Script to fix existing user permissions
// Run this in the browser console while logged into your app

const fixUserPermissions = async () => {
  try {
    console.log('🔧 Starting user permissions fix...');
    
    // Get current user
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) {
      console.error('❌ No user is currently logged in');
      return;
    }
    
    console.log('👤 Current user:', currentUser.email);
    
    // Get user document
    const db = firebase.firestore();
    const userDoc = await db.collection('users').doc(currentUser.uid).get();
    
    if (!userDoc.exists) {
      console.error('❌ User document not found in Firestore');
      return;
    }
    
    const userData = userDoc.data();
    console.log('📄 Current user data:', userData);
    
    // Check if permissions exist
    const needsUpdate = (
      userData.hasErpAccess === undefined ||
      userData.hasPayrollAccess === undefined ||
      userData.hasProjectsAccess === undefined
    );
    
    if (!needsUpdate) {
      console.log('✅ User permissions are already set correctly');
      console.log('Current permissions:', {
        hasErpAccess: userData.hasErpAccess,
        hasPayrollAccess: userData.hasPayrollAccess,
        hasProjectsAccess: userData.hasProjectsAccess
      });
      return;
    }
    
    // Update user permissions
    const updates = {
      hasErpAccess: userData.hasErpAccess ?? true,  // Default Admin to true
      hasPayrollAccess: userData.hasPayrollAccess ?? true,  // Default Admin to true
      hasProjectsAccess: userData.hasProjectsAccess ?? true,  // Default Admin to true
      updatedAt: new Date().toISOString(),
      permissionsFixed: true
    };
    
    console.log('🔄 Updating user with permissions:', updates);
    
    await db.collection('users').doc(currentUser.uid).update(updates);
    
    console.log('✅ User permissions updated successfully!');
    console.log('🔄 Please refresh the page to see the changes');
    
    return updates;
    
  } catch (error) {
    console.error('❌ Error fixing user permissions:', error);
  }
};

// Run the fix
fixUserPermissions();
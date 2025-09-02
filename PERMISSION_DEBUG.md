# 🔍 User Permission Debug Guide

## The Problem
**Maker/Approver users can see lists but cannot view/edit individual documents (Quote/SO/DO/PO)**

## Root Cause Analysis

### 1. **Firebase Security Rules** ✅ FIXED
The rules have been updated with explicit role-based permissions:

- **Viewer**: Can only READ documents
- **Maker**: Can READ and WRITE (create/update) documents  
- **Approver**: Can READ, WRITE, and DELETE documents
- **Admin**: Full access to everything

### 2. **User Configuration Requirements**

For a **Maker** user to access ERP documents, they need:

```javascript
{
  "role": "Maker",           // ✅ Role must be exactly "Maker"
  "hasErpAccess": true,      // ✅ ERP module access flag
  "hasPayrollAccess": false, // Optional
  "hasProjectsAccess": false // Optional
}
```

For an **Approver** user:

```javascript
{
  "role": "Approver",        // ✅ Role must be exactly "Approver"  
  "hasErpAccess": true,      // ✅ ERP module access flag
  "hasPayrollAccess": false, // Optional
  "hasProjectsAccess": false // Optional
}
```

## 🛠️ Debugging Steps

### Step 1: Check User Document Structure

1. **Go to Firebase Console** → Firestore Database
2. **Navigate to** `users` collection
3. **Find the user** having issues
4. **Verify the document contains:**

```json
{
  "id": "user-uid-here",
  "name": "User Name",
  "email": "user@email.com", 
  "role": "Maker",           // ⚠️ Check: Must be exact string
  "hasErpAccess": true,      // ⚠️ Check: Must be boolean true
  "hasPayrollAccess": false,
  "hasProjectsAccess": false
}
```

### Step 2: Common Issues & Solutions

#### Issue A: Role Case Sensitivity
❌ **Wrong**: `"role": "maker"` (lowercase)
❌ **Wrong**: `"role": "MAKER"` (uppercase)  
✅ **Correct**: `"role": "Maker"` (proper case)

#### Issue B: Access Flag Type
❌ **Wrong**: `"hasErpAccess": "true"` (string)
❌ **Wrong**: `"hasErpAccess": 1` (number)
✅ **Correct**: `"hasErpAccess": true` (boolean)

#### Issue C: Missing Fields
❌ **Wrong**: User document missing `role` or `hasErpAccess`
✅ **Correct**: All required fields present

### Step 3: Test Individual User

1. **Login as the problematic user**
2. **Open browser console** (F12)
3. **Check for errors** when trying to view a Quote/SO/DO/PO
4. **Look for Firebase permission errors**

Common error messages:
```
FirebaseError: Missing or insufficient permissions
FirebaseError: Permission denied 
```

### Step 4: Test Firebase Rules

You can test the rules directly in Firebase Console:

1. **Go to** Firebase Console → Firestore → Rules
2. **Click** "Rules playground"  
3. **Test with:**
   - **Collection**: `quotes`
   - **Document**: `any-quote-id`
   - **Operation**: `get`
   - **Authenticated**: Yes
   - **User UID**: The problematic user's UID

## 🔧 Quick Fixes

### Fix 1: Update User Document
```javascript
// In Firebase Console, update the user document:
{
  "role": "Maker",        // Ensure proper case
  "hasErpAccess": true,   // Ensure boolean true
  // ... other fields
}
```

### Fix 2: Re-deploy Firebase Rules
```bash
firebase deploy --only firestore:rules
```

### Fix 3: Clear Browser Cache
- User should logout and login again
- Clear browser cache/cookies for the domain

## 📋 User Creation Checklist

When creating new Maker/Approver users:

- [ ] Set `role` to exactly `"Maker"` or `"Approver"`
- [ ] Set `hasErpAccess` to boolean `true` (not string)
- [ ] Ensure user document exists in `users` collection
- [ ] User UID matches their Firebase Auth UID
- [ ] Test login and document access immediately

## 🚀 Deployment Notes

**Updated Firebase Rules** - Deploy with:
```bash
firebase deploy --only firestore:rules
```

**The new rules provide:**
- ✅ Explicit role-based permissions
- ✅ Separate read/write/delete controls  
- ✅ Better error handling and validation
- ✅ Consistent access patterns across all ERP collections

## 🎯 Expected Behavior After Fix

- **Viewer**: Can see lists and view documents (read-only)
- **Maker**: Can see lists, view documents, create new, edit existing  
- **Approver**: Can see lists, view documents, create, edit, and delete
- **Admin**: Full access to everything (unchanged)

---

**Next Steps**: 
1. Deploy updated Firebase rules
2. Verify user documents have correct structure
3. Test with Maker/Approver users
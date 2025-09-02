# 🧪 Test User Permissions Checklist

## Quick Test for Maker/Approver Access Issues

### Step 1: Verify User Document Structure

**Check in Firebase Console → Firestore → users collection:**

✅ **Correct Maker User Document:**
```json
{
  "id": "abc123def456",
  "name": "John Maker",
  "email": "john@company.com",
  "role": "Maker",           // ⚠️ Exact case-sensitive string
  "hasErpAccess": true,      // ⚠️ Boolean, not string
  "hasPayrollAccess": false,
  "hasProjectsAccess": false
}
```

✅ **Correct Approver User Document:**
```json
{
  "id": "xyz789uvw012", 
  "name": "Jane Approver",
  "email": "jane@company.com",
  "role": "Approver",        // ⚠️ Exact case-sensitive string
  "hasErpAccess": true,      // ⚠️ Boolean, not string
  "hasPayrollAccess": false,
  "hasProjectsAccess": false
}
```

### Step 2: Deploy Updated Firebase Rules

**Command to run:**
```bash
firebase deploy --only firestore:rules
```

**Expected output:**
```
✔  firestore: rules file compiled successfully
✔  firestore: released rules
✔  Deploy complete!
```

### Step 3: Test User Access

**Login as Maker/Approver user and try:**

1. **Navigate to Quotes List** → ✅ Should work (can see list)
2. **Click on a Quote** → ⚠️ Should work NOW (with updated rules)
3. **Try to edit a Quote** → ✅ Should work (Maker can edit)
4. **Try to delete a Quote** → 
   - Maker: ❌ Should be blocked (no delete permission)
   - Approver: ✅ Should work (has delete permission)

### Step 4: Browser Console Check

**Open browser console (F12) and look for:**

❌ **Before fix - Expected errors:**
```
FirebaseError: Missing or insufficient permissions
Permission denied at /quotes/document-id
```

✅ **After fix - Should be clean:**
```
No Firebase permission errors
Documents load successfully
```

### Step 5: Role-Based Feature Test

| Action | Viewer | Maker | Approver | Admin |
|--------|--------|-------|----------|-------|
| View Quote List | ✅ | ✅ | ✅ | ✅ |
| View Individual Quote | ✅ | ✅ | ✅ | ✅ |
| Create New Quote | ❌ | ✅ | ✅ | ✅ |
| Edit Existing Quote | ❌ | ✅ | ✅ | ✅ |
| Delete Quote | ❌ | ❌ | ✅ | ✅ |
| Access User Management | ❌ | ❌ | ❌ | ✅ |

### Step 6: Debug Common Issues

#### Issue A: Still Getting Permission Denied?

**Check:**
1. User document `role` field is exactly `"Maker"` or `"Approver"`
2. User document `hasErpAccess` is boolean `true`
3. Firebase rules are deployed
4. User has logged out and back in

#### Issue B: Can See Lists But Not Individual Documents?

**This was the original problem - should be fixed with new rules**

**Verify:**
1. New Firebase rules are deployed
2. Browser cache is cleared
3. User document structure is correct

#### Issue C: User Can't Create/Edit?

**Check user role:**
- `"Viewer"` → Read-only (expected behavior)
- `"Maker"` → Should be able to create/edit
- `"Approver"` → Should be able to create/edit/delete

### Step 7: Firebase Rules Test Simulator

**Test directly in Firebase Console:**

1. **Go to:** Firebase Console → Firestore → Rules
2. **Click:** "Rules playground"
3. **Configure test:**
   - **Path:** `/quotes/test-quote-123`
   - **Operation:** `get`
   - **Authentication:** Signed in
   - **Provider:** Custom
   - **UID:** [Problematic user's UID]

4. **Expected result:** ✅ **Allow** (if rules are correct)

---

## 🎯 Quick Resolution Steps

If Maker/Approver users still can't access individual documents:

### Immediate Fix:
```bash
# 1. Deploy new Firebase rules
firebase deploy --only firestore:rules

# 2. Verify user has correct structure in Firebase Console
# 3. User logout/login
# 4. Clear browser cache
```

### User Document Quick Fix Template:
```javascript
// Copy this structure for Maker users:
{
  "role": "Maker",
  "hasErpAccess": true,
  "hasPayrollAccess": false, // or true if needed
  "hasProjectsAccess": false, // or true if needed
  // ...other user fields
}
```

**The updated Firebase rules now provide explicit role-based access control that should resolve the permission issues.**
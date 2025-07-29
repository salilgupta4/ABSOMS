# 🔥 Firebase Data Migration Guide

This guide will help you migrate all your data from your old Firebase project (`oms1-438fd`) to your current Firebase project.

## 🎯 **What Will Be Migrated**

✅ **All Collections:**
- System Users & Permissions
- Customer Master Data (with contacts & addresses)
- Product Catalog & Inventory
- Vendor Information
- Sales Documents (Quotes, Orders, Deliveries)
- Purchase Orders
- Stock Movement History
- Payroll Data (Employees, Advances, Records)
- Chat Messages & Communications
- Scratchpad Notes & Calculations
- System Settings & Configuration

## 🚀 **Migration Process**

### **Step 1: Access Migration Tool**
1. Open your application: `http://localhost:5177/`
2. Login as **Admin user**
3. Navigate to: **Settings → Data Management**
4. Click **"Open Migration Tool"** in the purple notification box
5. Or directly go to: `/#/settings/migrate`

### **Step 2: Review Data Statistics**
- The tool will automatically connect to your old Firebase project
- Review the document counts for each collection
- Collections with 0 documents will be shown but not selected by default

### **Step 3: Select Collections**
- **Select All**: Migrate everything
- **Select With Data**: Only collections that have documents (recommended)
- **Select None**: Clear all selections
- **Manual Selection**: Click individual collections to toggle

### **Step 4: Start Migration**
1. Click **"Start Migration"** button
2. Confirm the migration dialog
3. Monitor the real-time progress:
   - Collection progress bar
   - Document progress bar
   - Current status messages

### **Step 5: Validate Migration**
1. After migration completes, click **"Validate Migration"**
2. Review the validation results
3. Check that document counts match between old and new projects

## ⚡ **Important Notes**

### **Before Migration:**
- ⚠️ **Backup Current Data**: Create a backup of your current Firebase project
- ⚠️ **Test Environment**: Consider testing on a development project first
- ⚠️ **Admin Access**: Ensure you have admin access to both Firebase projects

### **During Migration:**
- 🕐 **Time Required**: Large datasets may take 10-30 minutes
- 🔄 **Progress Tracking**: Don't close the browser during migration
- 📊 **Real-time Updates**: Progress is shown in real-time
- 🛑 **Interruption**: If interrupted, you can restart the migration

### **After Migration:**
- ✅ **Validation**: Always run validation to ensure data integrity
- 🔍 **Spot Check**: Manually verify important data
- 🗑️ **Cleanup**: Consider cleaning up the old project after validation

## 🛡️ **Data Safety Features**

### **Overwrite Protection:**
- Documents with the same IDs will be **overwritten**
- This ensures the latest data from old project is preserved

### **Data Validation:**
- Firestore Timestamps are properly converted
- Nested objects and arrays are handled correctly
- Special data types are preserved

### **Error Handling:**
- Failed documents are reported with detailed errors
- Migration continues even if some documents fail
- Comprehensive error logging for troubleshooting

## 🔧 **Troubleshooting**

### **Connection Issues:**
```
Failed to connect to old Firebase project
```
**Solution:** Check that the old Firebase config is correct in the migration service

### **Permission Errors:**
```
Missing or insufficient permissions
```
**Solution:** Ensure your user has read access to the old Firebase project

### **Large Dataset Timeouts:**
```
Migration timeout or slow progress
```
**Solution:** Migrate collections in smaller batches using manual selection

### **Validation Mismatches:**
```
Document counts don't match
```
**Solution:** 
1. Check for documents that failed during migration
2. Re-run migration for specific collections
3. Manually verify important data

## 📊 **Migration Statistics**

The tool provides comprehensive statistics:

- **Total Documents**: Overall count across all collections
- **Successful**: Documents migrated successfully  
- **Failed**: Documents that couldn't be migrated
- **Collections**: Number of collections processed
- **Time Elapsed**: Duration of migration process

## 🎉 **Success Indicators**

### **Migration Completed Successfully:**
- ✅ Green success message
- ✅ All collections show matching document counts
- ✅ Validation passes without errors
- ✅ Spot checks confirm data integrity

### **Next Steps After Successful Migration:**
1. **Test Application**: Verify all features work with migrated data
2. **Update Configurations**: Ensure all settings are correct
3. **Inform Users**: Notify team about the migration completion
4. **Archive Old Project**: Consider archiving the old Firebase project

## 🔗 **Quick Access Links**

- **Migration Tool**: `/#/settings/migrate`
- **Data Management**: `/#/settings/data`
- **System Settings**: `/#/settings`

---

## 🆘 **Need Help?**

If you encounter any issues during migration:

1. **Check Browser Console**: Look for detailed error messages
2. **Review Migration Logs**: Check the console output during migration
3. **Validate Configuration**: Ensure Firebase configs are correct
4. **Test Network**: Check internet connectivity to both Firebase projects

The migration tool is designed to be robust and handle most common scenarios automatically. The comprehensive error reporting will help you troubleshoot any issues that arise.

**Remember**: Always validate your migration and perform spot checks of critical data before fully switching to the new project! 🚀
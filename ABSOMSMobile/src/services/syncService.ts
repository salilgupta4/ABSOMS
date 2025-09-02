import NetInfo from '@react-native-community/netinfo';
import { collections, db, timestamp } from './firebase';
import { getDatabase } from '../database/schema';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LocalOperation, SyncState } from '../types';

type CollectionName = 
  | 'users' | 'customers' | 'products' | 'vendors' | 'quotes' | 'sales_orders'
  | 'delivery_orders' | 'purchase_orders' | 'stock_movements' | 'payroll_employees'
  | 'payroll_records' | 'leave_requests' | 'payroll_advances' | 'chat_messages';

interface SyncResult {
  success: boolean;
  syncedCount: number;
  errors: string[];
}

interface SyncOptions {
  forceSync?: boolean;
  collections?: CollectionName[];
  batchSize?: number;
}

class SyncService {
  private isOnline: boolean = true;
  private isSyncing: boolean = false;
  private syncListeners: Array<(state: SyncState) => void> = [];
  private retryAttempts: Map<string, number> = new Map();
  private maxRetries = 3;

  constructor() {
    this.initializeNetworkListener();
  }

  private initializeNetworkListener() {
    NetInfo.addEventListener(state => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;
      
      // If we just came back online, trigger sync
      if (wasOffline && this.isOnline) {
        this.syncAll({ forceSync: true });
      }
      
      this.notifySyncListeners();
    });
  }

  private async getLastSyncTime(collection: CollectionName): Promise<string | null> {
    try {
      const database = getDatabase();
      const result = await database.executeSql(
        'SELECT last_sync_timestamp FROM sync_metadata WHERE collection_name = ?',
        [collection]
      );
      
      if (result[0].rows.length > 0) {
        return result[0].rows.item(0).last_sync_timestamp;
      }
      return null;
    } catch (error) {
      console.error('Error getting last sync time:', error);
      return null;
    }
  }

  private async setLastSyncTime(collection: CollectionName, timestamp: string) {
    try {
      const database = getDatabase();
      await database.executeSql(
        `INSERT OR REPLACE INTO sync_metadata 
         (collection_name, last_sync_timestamp, sync_count) 
         VALUES (?, ?, COALESCE((SELECT sync_count FROM sync_metadata WHERE collection_name = ?), 0) + 1)`,
        [collection, timestamp, collection]
      );
    } catch (error) {
      console.error('Error setting last sync time:', error);
    }
  }

  private async syncCollection(collectionName: CollectionName, options: SyncOptions = {}): Promise<SyncResult> {
    if (!this.isOnline) {
      return { success: false, syncedCount: 0, errors: ['Device is offline'] };
    }

    const result: SyncResult = { success: true, syncedCount: 0, errors: [] };
    
    try {
      const lastSyncTime = options.forceSync ? null : await this.getLastSyncTime(collectionName);
      const currentTime = new Date().toISOString();
      
      // Build query with timestamp filter for delta sync
      let query = collections[collectionName]().orderBy('updated_at', 'desc');
      
      if (lastSyncTime && !options.forceSync) {
        query = query.where('updated_at', '>', new Date(lastSyncTime));
      }

      // Apply batch size limit
      const batchSize = options.batchSize || 50;
      query = query.limit(batchSize);

      const snapshot = await query.get();
      
      if (snapshot.empty) {
        await this.setLastSyncTime(collectionName, currentTime);
        return result;
      }

      // Sync documents to local database
      const database = getDatabase();
      const tableName = this.getTableName(collectionName);
      
      for (const doc of snapshot.docs) {
        try {
          const data = { id: doc.id, ...doc.data() };
          await this.upsertLocalDocument(database, tableName, data);
          result.syncedCount++;
        } catch (error: any) {
          result.errors.push(`Error syncing document ${doc.id}: ${error.message}`);
        }
      }

      // Update last sync time
      await this.setLastSyncTime(collectionName, currentTime);
      
      if (result.errors.length > 0) {
        result.success = false;
      }

    } catch (error: any) {
      result.success = false;
      result.errors.push(`Collection sync error: ${error.message}`);
    }

    return result;
  }

  private getTableName(collectionName: CollectionName): string {
    const tableMap: Record<CollectionName, string> = {
      'users': 'users',
      'customers': 'customers',
      'products': 'products',
      'vendors': 'vendors',
      'quotes': 'quotes',
      'sales_orders': 'sales_orders',
      'delivery_orders': 'delivery_orders',
      'purchase_orders': 'purchase_orders',
      'stock_movements': 'stock_movements',
      'payroll_employees': 'payroll_employees',
      'payroll_records': 'payroll_records',
      'leave_requests': 'leave_requests',
      'payroll_advances': 'advance_payments',
      'chat_messages': 'chat_messages',
    };
    
    return tableMap[collectionName] || collectionName;
  }

  private async upsertLocalDocument(database: any, tableName: string, data: any) {
    const columns = this.getTableColumns(tableName);
    const values = columns.map(col => this.mapDocumentValue(data, col));
    const placeholders = columns.map(() => '?').join(', ');
    
    // Use INSERT OR REPLACE for upsert functionality
    const sql = `INSERT OR REPLACE INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
    
    await database.executeSql(sql, values);
  }

  private getTableColumns(tableName: string): string[] {
    // Define column mappings for each table
    const columnMappings: Record<string, string[]> = {
      'customers': ['id', 'name', 'gstin', 'contacts', 'billing_address', 'shipping_addresses', 'primary_contact_name', 'primary_contact_email', 'created_at', 'updated_at', 'synced'],
      'products': ['id', 'name', 'description', 'unit', 'rate', 'hsn_code', 'created_at', 'updated_at', 'synced'],
      'quotes': ['id', 'quote_number', 'customer_id', 'customer_name', 'contact_id', 'contact_name', 'contact_phone', 'contact_email', 'billing_address', 'shipping_address', 'customer_gstin', 'issue_date', 'expiry_date', 'line_items', 'sub_total', 'gst_total', 'total', 'terms', 'status', 'revision_number', 'original_quote_id', 'linked_sales_order_id', 'additional_description', 'point_of_contact_id', 'created_at', 'updated_at', 'synced'],
      // Add more mappings as needed
    };
    
    return columnMappings[tableName] || ['id', 'created_at', 'updated_at', 'synced'];
  }

  private mapDocumentValue(data: any, column: string): any {
    // Handle special mappings between Firestore and SQLite
    const value = data[column] || data[column.replace(/_/g, '')] || data[this.camelCase(column)];
    
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }
    
    return value;
  }

  private camelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  async syncAll(options: SyncOptions = {}): Promise<SyncResult> {
    if (this.isSyncing) {
      return { success: false, syncedCount: 0, errors: ['Sync already in progress'] };
    }

    this.isSyncing = true;
    this.notifySyncListeners();

    const collectionsToSync: CollectionName[] = options.collections || [
      'customers', 'products', 'vendors', 'quotes', 'sales_orders', 
      'delivery_orders', 'purchase_orders', 'stock_movements',
      'payroll_employees', 'payroll_records', 'leave_requests'
    ];

    const overallResult: SyncResult = {
      success: true,
      syncedCount: 0,
      errors: []
    };

    try {
      // First, sync pending operations (upload local changes)
      await this.syncPendingOperations();

      // Then sync collections (download remote changes)
      for (const collection of collectionsToSync) {
        const result = await this.syncCollection(collection, options);
        overallResult.syncedCount += result.syncedCount;
        overallResult.errors.push(...result.errors);
        
        if (!result.success) {
          overallResult.success = false;
        }
      }

    } catch (error: any) {
      overallResult.success = false;
      overallResult.errors.push(`Sync error: ${error.message}`);
    }

    this.isSyncing = false;
    this.notifySyncListeners();
    
    return overallResult;
  }

  private async syncPendingOperations(): Promise<void> {
    if (!this.isOnline) return;

    try {
      const database = getDatabase();
      const result = await database.executeSql(
        'SELECT * FROM pending_operations WHERE synced = 0 ORDER BY timestamp ASC'
      );

      for (let i = 0; i < result[0].rows.length; i++) {
        const operation = result[0].rows.item(i) as LocalOperation;
        
        try {
          await this.executePendingOperation(operation);
          
          // Mark as synced
          await database.executeSql(
            'UPDATE pending_operations SET synced = 1 WHERE id = ?',
            [operation.id]
          );
          
        } catch (error: any) {
          console.error('Error syncing pending operation:', error);
          
          // Increment retry count
          const retries = this.retryAttempts.get(operation.id) || 0;
          if (retries < this.maxRetries) {
            this.retryAttempts.set(operation.id, retries + 1);
          } else {
            // Max retries reached, mark as failed
            await database.executeSql(
              'DELETE FROM pending_operations WHERE id = ?',
              [operation.id]
            );
          }
        }
      }
    } catch (error) {
      console.error('Error syncing pending operations:', error);
    }
  }

  private async executePendingOperation(operation: LocalOperation): Promise<void> {
    const collectionRef = collections[operation.collection as CollectionName]();
    const data = JSON.parse(operation.data);
    
    switch (operation.operation) {
      case 'create':
        await collectionRef.doc(operation.id).set(data);
        break;
      case 'update':
        await collectionRef.doc(operation.id).update(data);
        break;
      case 'delete':
        await collectionRef.doc(operation.id).delete();
        break;
    }
  }

  async addPendingOperation(operation: Omit<LocalOperation, 'id' | 'timestamp' | 'synced'>): Promise<void> {
    const database = getDatabase();
    const operationId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await database.executeSql(
      `INSERT INTO pending_operations 
       (id, collection_name, operation_type, document_id, data, timestamp, synced)
       VALUES (?, ?, ?, ?, ?, ?, 0)`,
      [
        operationId,
        operation.collection,
        operation.operation,
        operation.data.id || '',
        JSON.stringify(operation.data),
        new Date().toISOString()
      ]
    );
  }

  async getSyncState(): Promise<SyncState> {
    const database = getDatabase();
    const pendingResult = await database.executeSql(
      'SELECT COUNT(*) as count FROM pending_operations WHERE synced = 0'
    );
    
    const pendingOperations = pendingResult[0].rows.item(0).count;
    
    // Get last sync time across all collections
    const lastSyncResult = await database.executeSql(
      'SELECT MAX(last_sync_timestamp) as lastSync FROM sync_metadata'
    );
    
    const lastSyncTime = lastSyncResult[0].rows.length > 0 
      ? lastSyncResult[0].rows.item(0).lastSync || new Date(0).toISOString()
      : new Date(0).toISOString();

    return {
      lastSyncTime,
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      pendingOperations
    };
  }

  onSyncStateChange(callback: (state: SyncState) => void): () => void {
    this.syncListeners.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.syncListeners.indexOf(callback);
      if (index > -1) {
        this.syncListeners.splice(index, 1);
      }
    };
  }

  private async notifySyncListeners() {
    const state = await this.getSyncState();
    this.syncListeners.forEach(callback => callback(state));
  }

  async clearSyncData(): Promise<void> {
    const database = getDatabase();
    await database.executeSql('DELETE FROM sync_metadata');
    await database.executeSql('DELETE FROM pending_operations');
  }
}

export const syncService = new SyncService();
export default syncService;
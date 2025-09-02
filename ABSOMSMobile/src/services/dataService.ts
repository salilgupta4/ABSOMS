import { getDatabase } from '../database/schema';
import { collections } from './firebase';
import { syncService } from './syncService';
import NetInfo from '@react-native-community/netinfo';
import {
  Customer, Product, Quote, SalesOrder, DeliveryOrder, PurchaseOrder,
  PayrollEmployee, InventoryItem, StockMovement, User
} from '../types';

interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  where?: Array<{
    column: string;
    operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'LIKE';
    value: any;
  }>;
}

interface DataResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface ListResult<T> {
  success: boolean;
  data: T[];
  total: number;
  hasMore: boolean;
  error?: string;
}

class DataService {
  private async isOnline(): Promise<boolean> {
    const netInfo = await NetInfo.fetch();
    return netInfo.isConnected ?? false;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Generic CRUD operations
  async create<T extends { id?: string }>(
    collection: string,
    data: T,
    options: { syncImmediately?: boolean } = {}
  ): Promise<DataResult<T>> {
    try {
      const id = data.id || this.generateId();
      const timestamp = new Date().toISOString();
      const documentData = {
        ...data,
        id,
        created_at: timestamp,
        updated_at: timestamp,
      };

      // Store locally first
      await this.storeLocally(collection, documentData);

      // If online and syncImmediately is true, try to sync immediately
      if (options.syncImmediately && await this.isOnline()) {
        try {
          const collectionRef = collections[collection as keyof typeof collections]();
          await collectionRef.doc(id).set(documentData);
        } catch (error) {
          // If immediate sync fails, add to pending operations
          await syncService.addPendingOperation({
            collection,
            operation: 'create',
            data: documentData,
          });
        }
      } else {
        // Add to pending operations for later sync
        await syncService.addPendingOperation({
          collection,
          operation: 'create',
          data: documentData,
        });
      }

      return { success: true, data: documentData as T };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async update<T extends { id: string }>(
    collection: string,
    id: string,
    data: Partial<T>,
    options: { syncImmediately?: boolean } = {}
  ): Promise<DataResult<T>> {
    try {
      const timestamp = new Date().toISOString();
      const updateData = {
        ...data,
        updated_at: timestamp,
      };

      // Update locally first
      await this.updateLocally(collection, id, updateData);

      // Get the updated document for return
      const updatedDoc = await this.getById<T>(collection, id);
      
      if (!updatedDoc.success || !updatedDoc.data) {
        throw new Error('Failed to retrieve updated document');
      }

      // Handle remote sync
      if (options.syncImmediately && await this.isOnline()) {
        try {
          const collectionRef = collections[collection as keyof typeof collections]();
          await collectionRef.doc(id).update(updateData);
        } catch (error) {
          await syncService.addPendingOperation({
            collection,
            operation: 'update',
            data: { id, ...updateData },
          });
        }
      } else {
        await syncService.addPendingOperation({
          collection,
          operation: 'update',
          data: { id, ...updateData },
        });
      }

      return { success: true, data: updatedDoc.data };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async delete(
    collection: string,
    id: string,
    options: { syncImmediately?: boolean } = {}
  ): Promise<DataResult<void>> {
    try {
      // Delete locally first
      await this.deleteLocally(collection, id);

      // Handle remote sync
      if (options.syncImmediately && await this.isOnline()) {
        try {
          const collectionRef = collections[collection as keyof typeof collections]();
          await collectionRef.doc(id).delete();
        } catch (error) {
          await syncService.addPendingOperation({
            collection,
            operation: 'delete',
            data: { id },
          });
        }
      } else {
        await syncService.addPendingOperation({
          collection,
          operation: 'delete',
          data: { id },
        });
      }

      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getById<T>(collection: string, id: string): Promise<DataResult<T>> {
    try {
      const database = getDatabase();
      const tableName = this.getTableName(collection);
      
      const result = await database.executeSql(
        `SELECT * FROM ${tableName} WHERE id = ?`,
        [id]
      );

      if (result[0].rows.length === 0) {
        return { success: false, error: 'Document not found' };
      }

      const row = result[0].rows.item(0);
      const document = this.parseDocument<T>(row);

      return { success: true, data: document };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async list<T>(
    collection: string,
    options: QueryOptions = {}
  ): Promise<ListResult<T>> {
    try {
      const database = getDatabase();
      const tableName = this.getTableName(collection);
      
      // Build query
      let sql = `SELECT * FROM ${tableName}`;
      const params: any[] = [];

      // Add WHERE conditions
      if (options.where && options.where.length > 0) {
        sql += ' WHERE ';
        const conditions = options.where.map(condition => {
          params.push(condition.value);
          return `${condition.column} ${condition.operator} ?`;
        });
        sql += conditions.join(' AND ');
      }

      // Add ORDER BY
      if (options.orderBy) {
        sql += ` ORDER BY ${options.orderBy} ${options.orderDirection || 'ASC'}`;
      }

      // Add pagination
      if (options.limit) {
        sql += ` LIMIT ${options.limit}`;
        if (options.offset) {
          sql += ` OFFSET ${options.offset}`;
        }
      }

      const result = await database.executeSql(sql, params);
      
      // Get total count for pagination
      let countSql = `SELECT COUNT(*) as total FROM ${tableName}`;
      if (options.where && options.where.length > 0) {
        countSql += ' WHERE ';
        const conditions = options.where.map(condition => 
          `${condition.column} ${condition.operator} ?`
        );
        countSql += conditions.join(' AND ');
      }
      
      const countResult = await database.executeSql(countSql, 
        options.where?.map(w => w.value) || []
      );
      const total = countResult[0].rows.item(0).total;

      // Parse documents
      const documents: T[] = [];
      for (let i = 0; i < result[0].rows.length; i++) {
        const row = result[0].rows.item(i);
        documents.push(this.parseDocument<T>(row));
      }

      const hasMore = options.limit ? 
        (options.offset || 0) + documents.length < total : 
        false;

      return {
        success: true,
        data: documents,
        total,
        hasMore
      };
    } catch (error: any) {
      return {
        success: false,
        data: [],
        total: 0,
        hasMore: false,
        error: error.message
      };
    }
  }

  // Specific entity methods
  async createCustomer(customer: Omit<Customer, 'id'>): Promise<DataResult<Customer>> {
    return this.create('customers', customer);
  }

  async getCustomers(options?: QueryOptions): Promise<ListResult<Customer>> {
    return this.list<Customer>('customers', options);
  }

  async updateCustomer(id: string, customer: Partial<Customer>): Promise<DataResult<Customer>> {
    return this.update('customers', id, customer);
  }

  async createProduct(product: Omit<Product, 'id'>): Promise<DataResult<Product>> {
    return this.create('products', product);
  }

  async getProducts(options?: QueryOptions): Promise<ListResult<Product>> {
    return this.list<Product>('products', options);
  }

  async createQuote(quote: Omit<Quote, 'id'>): Promise<DataResult<Quote>> {
    return this.create('quotes', quote);
  }

  async getQuotes(options?: QueryOptions): Promise<ListResult<Quote>> {
    return this.list<Quote>('quotes', options);
  }

  async createSalesOrder(order: Omit<SalesOrder, 'id'>): Promise<DataResult<SalesOrder>> {
    return this.create('sales_orders', order);
  }

  async getSalesOrders(options?: QueryOptions): Promise<ListResult<SalesOrder>> {
    return this.list<SalesOrder>('sales_orders', options);
  }

  async getInventoryItems(options?: QueryOptions): Promise<ListResult<InventoryItem>> {
    return this.list<InventoryItem>('inventory_items', options);
  }

  async addStockMovement(movement: Omit<StockMovement, 'id'>): Promise<DataResult<StockMovement>> {
    // Also update inventory levels
    const result = await this.create('stock_movements', movement);
    
    if (result.success) {
      await this.updateInventoryLevel(
        movement.productId,
        movement.type === 'in' ? movement.quantity : -movement.quantity
      );
    }

    return result;
  }

  private async updateInventoryLevel(productId: string, quantityChange: number): Promise<void> {
    const database = getDatabase();
    
    // Update or insert inventory item
    await database.executeSql(`
      INSERT INTO inventory_items (product_id, product_name, current_stock, unit, last_updated, synced)
      SELECT ?, p.name, COALESCE(i.current_stock, 0) + ?, p.unit, ?, 0
      FROM products p
      LEFT JOIN inventory_items i ON i.product_id = p.id
      WHERE p.id = ?
      ON CONFLICT(product_id) DO UPDATE SET
        current_stock = current_stock + ?,
        last_updated = ?
    `, [productId, quantityChange, new Date().toISOString(), productId, quantityChange, new Date().toISOString()]);
  }

  // Helper methods
  private getTableName(collection: string): string {
    const tableMap: Record<string, string> = {
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
      'inventory_items': 'inventory_items',
    };
    
    return tableMap[collection] || collection;
  }

  private parseDocument<T>(row: any): T {
    const document: any = { ...row };
    
    // Parse JSON fields
    const jsonFields = [
      'contacts', 'billing_address', 'shipping_addresses', 'line_items', 
      'terms', 'delivered_quantities', 'bank_accounts', 'transactions',
      'theme_preferences'
    ];
    
    for (const field of jsonFields) {
      if (document[field] && typeof document[field] === 'string') {
        try {
          document[field] = JSON.parse(document[field]);
        } catch (error) {
          // If parsing fails, keep as string
        }
      }
    }

    // Convert synced flag to boolean
    document.synced = Boolean(document.synced);

    return document;
  }

  private async storeLocally(collection: string, data: any): Promise<void> {
    const database = getDatabase();
    const tableName = this.getTableName(collection);
    const columns = this.getTableColumns(tableName);
    
    const values = columns.map(col => {
      const value = data[col] || data[this.camelCase(col)];
      return typeof value === 'object' && value !== null ? JSON.stringify(value) : value;
    });
    
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT OR REPLACE INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
    
    await database.executeSql(sql, values);
  }

  private async updateLocally(collection: string, id: string, data: any): Promise<void> {
    const database = getDatabase();
    const tableName = this.getTableName(collection);
    
    const setClause = Object.keys(data)
      .filter(key => key !== 'id')
      .map(key => `${this.snakeCase(key)} = ?`)
      .join(', ');
    
    const values = Object.keys(data)
      .filter(key => key !== 'id')
      .map(key => {
        const value = data[key];
        return typeof value === 'object' && value !== null ? JSON.stringify(value) : value;
      });
    
    values.push(id);
    
    const sql = `UPDATE ${tableName} SET ${setClause} WHERE id = ?`;
    await database.executeSql(sql, values);
  }

  private async deleteLocally(collection: string, id: string): Promise<void> {
    const database = getDatabase();
    const tableName = this.getTableName(collection);
    
    await database.executeSql(`DELETE FROM ${tableName} WHERE id = ?`, [id]);
  }

  private getTableColumns(tableName: string): string[] {
    // This should match the schema defined in schema.ts
    const columnMappings: Record<string, string[]> = {
      'customers': ['id', 'name', 'gstin', 'contacts', 'billing_address', 'shipping_addresses', 'primary_contact_name', 'primary_contact_email', 'created_at', 'updated_at', 'synced'],
      'products': ['id', 'name', 'description', 'unit', 'rate', 'hsn_code', 'created_at', 'updated_at', 'synced'],
      'quotes': ['id', 'quote_number', 'customer_id', 'customer_name', 'contact_id', 'contact_name', 'contact_phone', 'contact_email', 'billing_address', 'shipping_address', 'customer_gstin', 'issue_date', 'expiry_date', 'line_items', 'sub_total', 'gst_total', 'total', 'terms', 'status', 'revision_number', 'original_quote_id', 'linked_sales_order_id', 'additional_description', 'point_of_contact_id', 'created_at', 'updated_at', 'synced'],
      // Add more as needed
    };
    
    return columnMappings[tableName] || ['id', 'created_at', 'updated_at', 'synced'];
  }

  private camelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  private snakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
}

export const dataService = new DataService();
export default dataService;
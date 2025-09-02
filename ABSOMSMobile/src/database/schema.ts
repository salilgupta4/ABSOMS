import SQLite from 'react-native-sqlite-storage';

SQLite.DEBUG(true);
SQLite.enablePromise(true);

const DATABASE_NAME = 'ABSOmsDatabase.db';
const DATABASE_VERSION = '1.0';
const DATABASE_DISPLAYNAME = 'ABS OMS Mobile Database';
const DATABASE_SIZE = 200000;

// Database instance
let database: SQLite.SQLiteDatabase;

export const initDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  try {
    database = await SQLite.openDatabase({
      name: DATABASE_NAME,
      version: DATABASE_VERSION,
      displayName: DATABASE_DISPLAYNAME,
      size: DATABASE_SIZE,
    });

    console.log('Database opened successfully');
    await createTables();
    return database;
  } catch (error) {
    console.error('Database initialization error:', error);
    throw error;
  }
};

export const getDatabase = (): SQLite.SQLiteDatabase => {
  if (!database) {
    throw new Error('Database not initialized');
  }
  return database;
};

const createTables = async () => {
  const db = getDatabase();

  // Sync metadata table
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS sync_metadata (
      collection_name TEXT PRIMARY KEY,
      last_sync_timestamp TEXT NOT NULL,
      sync_count INTEGER DEFAULT 0
    )
  `);

  // Pending operations table for offline support
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS pending_operations (
      id TEXT PRIMARY KEY,
      collection_name TEXT NOT NULL,
      operation_type TEXT NOT NULL,
      document_id TEXT,
      data TEXT,
      timestamp TEXT NOT NULL,
      synced INTEGER DEFAULT 0
    )
  `);

  // Users table
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      has_erp_access INTEGER DEFAULT 0,
      has_payroll_access INTEGER DEFAULT 0,
      has_projects_access INTEGER DEFAULT 0,
      theme_preferences TEXT,
      created_at TEXT,
      updated_at TEXT,
      synced INTEGER DEFAULT 0
    )
  `);

  // Customers table  
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      gstin TEXT,
      contacts TEXT,
      billing_address TEXT,
      shipping_addresses TEXT,
      primary_contact_name TEXT,
      primary_contact_email TEXT,
      created_at TEXT,
      updated_at TEXT,
      synced INTEGER DEFAULT 0
    )
  `);

  // Products table
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      unit TEXT NOT NULL,
      rate REAL NOT NULL,
      hsn_code TEXT,
      created_at TEXT,
      updated_at TEXT,
      synced INTEGER DEFAULT 0
    )
  `);

  // Vendors table
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS vendors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      gstin TEXT,
      address TEXT,
      created_at TEXT,
      updated_at TEXT,
      synced INTEGER DEFAULT 0
    )
  `);

  // Quotes table
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS quotes (
      id TEXT PRIMARY KEY,
      quote_number TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      contact_id TEXT,
      contact_name TEXT,
      contact_phone TEXT,
      contact_email TEXT,
      billing_address TEXT,
      shipping_address TEXT,
      customer_gstin TEXT,
      issue_date TEXT NOT NULL,
      expiry_date TEXT,
      line_items TEXT,
      sub_total REAL NOT NULL,
      gst_total REAL NOT NULL,
      total REAL NOT NULL,
      terms TEXT,
      status TEXT NOT NULL,
      revision_number INTEGER,
      original_quote_id TEXT,
      linked_sales_order_id TEXT,
      additional_description TEXT,
      point_of_contact_id TEXT,
      created_at TEXT,
      updated_at TEXT,
      synced INTEGER DEFAULT 0
    )
  `);

  // Sales Orders table
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS sales_orders (
      id TEXT PRIMARY KEY,
      order_number TEXT NOT NULL,
      linked_quote_id TEXT,
      quote_number TEXT,
      client_po_number TEXT,
      customer_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      contact_id TEXT,
      contact_name TEXT,
      contact_phone TEXT,
      contact_email TEXT,
      billing_address TEXT,
      shipping_address TEXT,
      customer_gstin TEXT,
      order_date TEXT NOT NULL,
      line_items TEXT,
      sub_total REAL NOT NULL,
      gst_total REAL NOT NULL,
      total REAL NOT NULL,
      terms TEXT,
      status TEXT NOT NULL,
      point_of_contact_id TEXT,
      delivered_quantities TEXT,
      additional_description TEXT,
      created_at TEXT,
      updated_at TEXT,
      synced INTEGER DEFAULT 0
    )
  `);

  // Delivery Orders table
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS delivery_orders (
      id TEXT PRIMARY KEY,
      delivery_number TEXT NOT NULL,
      sales_order_id TEXT NOT NULL,
      sales_order_number TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      contact_id TEXT,
      contact_name TEXT,
      contact_phone TEXT,
      contact_email TEXT,
      delivery_date TEXT NOT NULL,
      billing_address TEXT,
      shipping_address TEXT,
      customer_gstin TEXT,
      line_items TEXT,
      status TEXT NOT NULL,
      vehicle_number TEXT,
      additional_description TEXT,
      point_of_contact_id TEXT,
      created_at TEXT,
      updated_at TEXT,
      synced INTEGER DEFAULT 0
    )
  `);

  // Purchase Orders table
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY,
      po_number TEXT NOT NULL,
      vendor_id TEXT NOT NULL,
      vendor_name TEXT NOT NULL,
      vendor_gstin TEXT,
      vendor_address TEXT,
      order_date TEXT NOT NULL,
      delivery_address TEXT,
      line_items TEXT,
      sub_total REAL NOT NULL,
      gst_total REAL NOT NULL,
      total REAL NOT NULL,
      status TEXT NOT NULL,
      additional_description TEXT,
      point_of_contact_id TEXT,
      created_at TEXT,
      updated_at TEXT,
      synced INTEGER DEFAULT 0
    )
  `);

  // Inventory table
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS inventory_items (
      product_id TEXT PRIMARY KEY,
      product_name TEXT NOT NULL,
      current_stock REAL NOT NULL,
      unit TEXT NOT NULL,
      last_updated TEXT,
      synced INTEGER DEFAULT 0
    )
  `);

  // Stock Movements table
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      type TEXT NOT NULL,
      quantity REAL NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT,
      updated_at TEXT,
      synced INTEGER DEFAULT 0
    )
  `);

  // Payroll Employees table
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS payroll_employees (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      department TEXT NOT NULL,
      category TEXT NOT NULL,
      monthly_ctc REAL NOT NULL,
      annual_ctc REAL NOT NULL,
      status TEXT NOT NULL,
      bank_accounts TEXT,
      created_at TEXT,
      updated_at TEXT,
      synced INTEGER DEFAULT 0
    )
  `);

  // Payroll Records table
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS payroll_records (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      payroll_month TEXT NOT NULL,
      status TEXT NOT NULL,
      days_present INTEGER NOT NULL,
      overtime_hours REAL,
      overtime_days REAL,
      overtime_details TEXT,
      basic_pay REAL NOT NULL,
      hra REAL NOT NULL,
      special_allowance REAL NOT NULL,
      overtime REAL NOT NULL,
      gross_pay REAL NOT NULL,
      pf REAL NOT NULL,
      esi REAL NOT NULL,
      pt REAL NOT NULL,
      tds REAL NOT NULL,
      advance_deduction REAL NOT NULL,
      advance_payment_id TEXT,
      total_deductions REAL NOT NULL,
      net_pay REAL NOT NULL,
      employee_name TEXT NOT NULL,
      employee_code TEXT NOT NULL,
      category TEXT NOT NULL,
      remittance_account TEXT,
      created_at TEXT,
      updated_at TEXT,
      synced INTEGER DEFAULT 0
    )
  `);

  // Leave Requests table
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS leave_requests (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      leave_type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      total_days INTEGER NOT NULL,
      reason TEXT NOT NULL,
      status TEXT NOT NULL,
      approved_by TEXT,
      approved_at TEXT,
      rejection_reason TEXT,
      created_at TEXT,
      updated_at TEXT,
      synced INTEGER DEFAULT 0
    )
  `);

  // Advance Payments table
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS advance_payments (
      id TEXT PRIMARY KEY,
      employee_id TEXT NOT NULL,
      amount REAL NOT NULL,
      balance_amount REAL NOT NULL,
      date_given TEXT NOT NULL,
      status TEXT NOT NULL,
      notes TEXT,
      transactions TEXT,
      created_at TEXT,
      updated_at TEXT,
      synced INTEGER DEFAULT 0
    )
  `);

  // Chat Messages table (limited storage for recent messages)
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      text TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      synced INTEGER DEFAULT 0
    )
  `);

  // App Settings table
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT
    )
  `);

  console.log('All tables created successfully');
};

export const closeDatabase = async () => {
  if (database) {
    console.log('Closing database');
    await database.close();
  }
};

export const clearAllData = async () => {
  const db = getDatabase();
  
  const tables = [
    'users', 'customers', 'products', 'vendors', 'quotes', 'sales_orders',
    'delivery_orders', 'purchase_orders', 'inventory_items', 'stock_movements',
    'payroll_employees', 'payroll_records', 'leave_requests', 'advance_payments',
    'chat_messages', 'sync_metadata', 'pending_operations'
  ];

  for (const table of tables) {
    await db.executeSql(`DELETE FROM ${table}`);
  }
  
  console.log('All data cleared from local database');
};
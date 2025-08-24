// MySQL Database Configuration for ABS OMS
import mysql from 'mysql2/promise';

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
  acquireTimeout: number;
  timeout: number;
  reconnect: boolean;
  timezone: string;
}

// Database configuration - can be overridden by environment variables
export const dbConfig: DatabaseConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'abs_oms',
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '20'),
  acquireTimeout: parseInt(process.env.DB_ACQUIRE_TIMEOUT || '60000'),
  timeout: parseInt(process.env.DB_TIMEOUT || '60000'),
  reconnect: true,
  timezone: '+00:00' // UTC timezone
};

// Connection pool
let pool: mysql.Pool | null = null;

/**
 * Initialize database connection pool
 */
export const initializeDatabase = async (): Promise<void> => {
  try {
    pool = mysql.createPool({
      ...dbConfig,
      dateStrings: true, // Return dates as strings instead of Date objects
      supportBigNumbers: true,
      bigNumberStrings: true,
      multipleStatements: false, // Security: prevent multiple statements
      namedPlaceholders: true // Enable named placeholders
    });

    // Test the connection
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    
    console.log('✅ MySQL database connected successfully');
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
};

/**
 * Get database connection from pool
 */
export const getDbConnection = (): mysql.Pool => {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializeDatabase() first.');
  }
  return pool;
};

/**
 * Close database connection pool
 */
export const closeDatabase = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('✅ Database connection pool closed');
  }
};

/**
 * Execute a query with proper error handling and logging
 */
export const executeQuery = async <T = any>(
  query: string, 
  params: any[] | Record<string, any> = [],
  logQuery: boolean = process.env.NODE_ENV === 'development'
): Promise<T[]> => {
  const connection = getDbConnection();
  
  try {
    if (logQuery) {
      console.log('🔍 SQL Query:', query);
      console.log('📋 Parameters:', params);
    }
    
    const [rows] = await connection.execute(query, params);
    return rows as T[];
  } catch (error) {
    console.error('❌ Database query error:', error);
    console.error('🔍 Failed query:', query);
    console.error('📋 Parameters:', params);
    throw error;
  }
};

/**
 * Execute a transaction with rollback support
 */
export const executeTransaction = async <T>(
  operations: (connection: mysql.PoolConnection) => Promise<T>
): Promise<T> => {
  const pool = getDbConnection();
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    const result = await operations(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    console.error('❌ Transaction failed, rolled back:', error);
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Check if database exists and create if not
 */
export const ensureDatabaseExists = async (): Promise<void> => {
  try {
    // Connect without specifying database
    const tempPool = mysql.createPool({
      ...dbConfig,
      database: undefined
    });

    const connection = await tempPool.getConnection();
    
    // Check if database exists
    const [rows] = await connection.execute(
      'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
      [dbConfig.database]
    );

    if (Array.isArray(rows) && rows.length === 0) {
      // Create database if it doesn't exist
      await connection.execute(
        `CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
      );
      console.log(`✅ Database '${dbConfig.database}' created successfully`);
    }

    connection.release();
    await tempPool.end();
  } catch (error) {
    console.error('❌ Error ensuring database exists:', error);
    throw error;
  }
};

/**
 * Generate UUID for use as primary keys
 */
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

/**
 * Convert Firestore timestamp to MySQL datetime
 */
export const timestampToDateTime = (timestamp: any): string => {
  if (!timestamp) return new Date().toISOString().slice(0, 19).replace('T', ' ');
  
  if (typeof timestamp === 'string') {
    return new Date(timestamp).toISOString().slice(0, 19).replace('T', ' ');
  }
  
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toISOString().slice(0, 19).replace('T', ' ');
  }
  
  return new Date(timestamp).toISOString().slice(0, 19).replace('T', ' ');
};

/**
 * Convert MySQL datetime to ISO string
 */
export const dateTimeToISO = (datetime: string | Date): string => {
  if (!datetime) return new Date().toISOString();
  return new Date(datetime).toISOString();
};

/**
 * Paginate query results
 */
export interface PaginationOptions {
  page: number;
  limit: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export const executePaginatedQuery = async <T = any>(
  baseQuery: string,
  countQuery: string,
  params: any[] | Record<string, any> = [],
  options: PaginationOptions
): Promise<PaginatedResult<T>> => {
  const { page, limit, orderBy = 'created_at', orderDirection = 'DESC' } = options;
  const offset = (page - 1) * limit;

  // Get total count
  const [countResult] = await executeQuery<{ total: number }>(countQuery, params);
  const total = countResult?.total || 0;

  // Build paginated query
  const paginatedQuery = `
    ${baseQuery}
    ORDER BY ${orderBy} ${orderDirection}
    LIMIT ${limit} OFFSET ${offset}
  `;

  const data = await executeQuery<T>(paginatedQuery, params);

  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
};
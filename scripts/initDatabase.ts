#!/usr/bin/env ts-node

// Database initialization script for ABS OMS MySQL setup
import { initializeDatabase, ensureDatabaseExists, executeQuery, generateUUID, closeDatabase } from '../database/config';
import { authService } from '../services/mysqlService';
import * as readline from 'readline';
import * as path from 'path';
import * as fs from 'fs';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
};

async function checkEnvironmentVariables() {
  const requiredVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'JWT_SECRET'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.log('❌ Missing required environment variables:');
    missing.forEach(varName => console.log(`   - ${varName}`));
    console.log('\nPlease create a .env file based on .env.example');
    process.exit(1);
  }
  
  console.log('✅ Environment variables checked');
}

async function testDatabaseConnection() {
  try {
    console.log('🔍 Testing database connection...');
    await ensureDatabaseExists();
    await initializeDatabase();
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

async function runDatabaseSchema() {
  try {
    console.log('📋 Setting up database schema...');
    const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
      console.error('❌ Schema file not found at:', schemaPath);
      return false;
    }

    const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
    
    // Split by statements and execute one by one
    const statements = schemaSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    for (const statement of statements) {
      if (statement.includes('CREATE TABLE') || statement.includes('CREATE DATABASE') || statement.includes('INSERT INTO')) {
        try {
          await executeQuery(statement);
        } catch (error: any) {
          // Ignore "table already exists" errors
          if (!error.message.includes('already exists')) {
            console.warn('⚠️  SQL Warning:', error.message);
          }
        }
      }
    }
    
    console.log('✅ Database schema setup complete');
    return true;
  } catch (error) {
    console.error('❌ Schema setup failed:', error);
    return false;
  }
}

async function createAdminUser() {
  try {
    console.log('\n👤 Admin User Setup');
    console.log('==================');
    
    // Check if admin user already exists
    const existingAdmins = await executeQuery(
      'SELECT id FROM users WHERE role = ? LIMIT 1',
      ['Admin']
    );

    if (existingAdmins.length > 0) {
      const recreate = await question('Admin user already exists. Create another admin? (y/N): ');
      if (recreate.toLowerCase() !== 'y') {
        console.log('✅ Using existing admin user');
        return true;
      }
    }

    const name = await question('Enter admin name: ');
    if (!name.trim()) {
      console.error('❌ Name is required');
      return false;
    }

    const email = await question('Enter admin email: ');
    if (!email.trim() || !email.includes('@')) {
      console.error('❌ Valid email is required');
      return false;
    }

    const password = await question('Enter admin password: ');
    if (!password || password.length < 6) {
      console.error('❌ Password must be at least 6 characters');
      return false;
    }

    // Create admin user
    const result = await authService.createUser({
      name: name.trim(),
      email: email.trim(),
      password: password,
      role: 'Admin',
      hasErpAccess: true,
      hasPayrollAccess: true,
      hasProjectsAccess: true
    });

    if (result.success) {
      console.log('✅ Admin user created successfully');
      console.log(`   Name: ${name}`);
      console.log(`   Email: ${email}`);
      console.log(`   Role: Admin`);
      return true;
    } else {
      console.error('❌ Failed to create admin user:', result.message);
      return false;
    }
  } catch (error) {
    console.error('❌ Admin user creation failed:', error);
    return false;
  }
}

async function setupCompanyDefaults() {
  try {
    console.log('🏢 Setting up company defaults...');
    
    // Check if company details exist
    const existingCompany = await executeQuery('SELECT id FROM company_details LIMIT 1');
    
    if (existingCompany.length === 0) {
      await executeQuery(
        'INSERT INTO company_details (name) VALUES (?)',
        ['ABS Order Management System']
      );
    }

    // Check if document numbering is set up
    const existingNumbering = await executeQuery('SELECT id FROM document_numbering LIMIT 1');
    
    if (existingNumbering.length === 0) {
      const documentTypes = [
        ['quote', 'QT-', 1],
        ['sales_order', 'SO-', 1],
        ['delivery_order', 'DO-', 1],
        ['purchase_order', 'PO-', 1]
      ];

      for (const [docType, prefix, startNum] of documentTypes) {
        await executeQuery(
          'INSERT INTO document_numbering (document_type, prefix, current_number) VALUES (?, ?, ?)',
          [docType, prefix, startNum]
        );
      }
    }

    console.log('✅ Company defaults configured');
    return true;
  } catch (error) {
    console.error('❌ Company defaults setup failed:', error);
    return false;
  }
}

async function verifyInstallation() {
  try {
    console.log('\n🔍 Verifying installation...');
    
    // Check tables exist
    const tables = await executeQuery('SHOW TABLES');
    const tableCount = Array.isArray(tables) ? tables.length : 0;
    console.log(`✅ Database tables: ${tableCount} tables created`);
    
    // Check admin user
    const adminUsers = await executeQuery('SELECT COUNT(*) as count FROM users WHERE role = ?', ['Admin']);
    const adminCount = adminUsers[0]?.count || 0;
    console.log(`✅ Admin users: ${adminCount} admin user(s) available`);
    
    // Check company details
    const companies = await executeQuery('SELECT COUNT(*) as count FROM company_details');
    const companyCount = companies[0]?.count || 0;
    console.log(`✅ Company setup: ${companyCount} company record(s)`);
    
    // Check document numbering
    const numbering = await executeQuery('SELECT COUNT(*) as count FROM document_numbering');
    const numberingCount = numbering[0]?.count || 0;
    console.log(`✅ Document numbering: ${numberingCount} numbering scheme(s)`);
    
    return tableCount > 0 && adminCount > 0;
  } catch (error) {
    console.error('❌ Installation verification failed:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 ABS OMS MySQL Database Initialization');
  console.log('=========================================\n');

  try {
    // Check environment
    await checkEnvironmentVariables();
    
    // Test database connection
    const connectionOk = await testDatabaseConnection();
    if (!connectionOk) {
      console.log('\n❌ Database initialization failed - connection error');
      process.exit(1);
    }

    // Run database schema
    const schemaOk = await runDatabaseSchema();
    if (!schemaOk) {
      console.log('\n❌ Database initialization failed - schema error');
      process.exit(1);
    }

    // Create admin user
    const adminOk = await createAdminUser();
    if (!adminOk) {
      console.log('\n❌ Database initialization failed - admin user error');
      process.exit(1);
    }

    // Setup company defaults
    const defaultsOk = await setupCompanyDefaults();
    if (!defaultsOk) {
      console.log('\n❌ Database initialization failed - company defaults error');
      process.exit(1);
    }

    // Verify installation
    const verifyOk = await verifyInstallation();
    if (!verifyOk) {
      console.log('\n⚠️  Installation verification had issues');
    }

    console.log('\n🎉 Database initialization completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Start the application: npm run dev');
    console.log('2. Log in with the admin credentials you created');
    console.log('3. Configure company details in Settings');
    console.log('4. Start using the system!');

  } catch (error) {
    console.error('\n❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    rl.close();
    await closeDatabase();
  }
}

// Handle script termination
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Initialization cancelled by user');
  rl.close();
  await closeDatabase();
  process.exit(0);
});

// Run the initialization
if (require.main === module) {
  main().catch((error) => {
    console.error('💥 Initialization failed:', error);
    process.exit(1);
  });
}
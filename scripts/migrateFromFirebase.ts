#!/usr/bin/env ts-node

// Firebase to MySQL Migration Script for ABS OMS
import { initializeDatabase, executeQuery, executeTransaction, generateUUID } from '../database/config';
import * as fs from 'fs';
import * as path from 'path';

interface FirebaseDocument {
  id: string;
  [key: string]: any;
}

interface MigrationStats {
  collections: number;
  documents: number;
  success: number;
  errors: number;
}

const stats: MigrationStats = {
  collections: 0,
  documents: 0,
  success: 0,
  errors: 0
};

// Collection mapping: Firebase collection -> MySQL table
const COLLECTION_MAPPINGS = {
  users: 'users',
  customers: 'customers',
  vendors: 'vendors', 
  products: 'products',
  quotes: 'quotes',
  salesOrders: 'sales_orders',
  deliveryOrders: 'delivery_orders',
  purchaseOrders: 'purchase_orders',
  transporters: 'transporters',
  payrollEmployees: 'payroll_employees',
  projects: 'projects',
  scratchpads: 'scratchpads'
};

async function loadFirebaseExport(exportPath: string): Promise<Record<string, FirebaseDocument[]>> {
  const collections: Record<string, FirebaseDocument[]> = {};
  
  try {
    if (fs.existsSync(exportPath) && fs.statSync(exportPath).isDirectory()) {
      // Load from directory structure (Firestore export format)
      const files = fs.readdirSync(exportPath);
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const collectionName = file.replace('.json', '');
          const filePath = path.join(exportPath, file);
          const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          collections[collectionName] = Array.isArray(data) ? data : [data];
        }
      }
    } else if (fs.existsSync(exportPath) && exportPath.endsWith('.json')) {
      // Load from single JSON file
      const data = JSON.parse(fs.readFileSync(exportPath, 'utf8'));
      Object.assign(collections, data);
    } else {
      throw new Error(`Export path not found: ${exportPath}`);
    }
    
    console.log('✅ Firebase export loaded successfully');
    return collections;
  } catch (error) {
    console.error('❌ Failed to load Firebase export:', error);
    throw error;
  }
}

async function migrateUsers(users: FirebaseDocument[]): Promise<void> {
  console.log(`📋 Migrating ${users.length} users...`);
  
  for (const user of users) {
    try {
      await executeQuery(
        `INSERT INTO users (
          id, name, email, role, has_erp_access, has_payroll_access, 
          has_projects_access, email_verified, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         name = VALUES(name), role = VALUES(role), 
         has_erp_access = VALUES(has_erp_access),
         has_payroll_access = VALUES(has_payroll_access),
         has_projects_access = VALUES(has_projects_access)`,
        [
          user.id,
          user.name || 'Unknown',
          user.email,
          user.role || 'Viewer',
          user.hasErpAccess ?? true,
          user.hasPayrollAccess ?? false,
          user.hasProjectsAccess ?? false,
          true, // email_verified
          user.createdAt || new Date().toISOString(),
          new Date().toISOString()
        ]
      );
      stats.success++;
    } catch (error) {
      console.error(`❌ Failed to migrate user ${user.id}:`, error);
      stats.errors++;
    }
  }
}

async function migrateCustomers(customers: FirebaseDocument[]): Promise<void> {
  console.log(`📋 Migrating ${customers.length} customers...`);
  
  for (const customer of customers) {
    try {
      await executeTransaction(async (connection) => {
        // Insert customer
        await connection.execute(
          `INSERT INTO customers (
            id, name, gstin, primary_contact_name, primary_contact_email,
            created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
           name = VALUES(name), gstin = VALUES(gstin)`,
          [
            customer.id,
            customer.name,
            customer.gstin || null,
            customer.primaryContactName || null,
            customer.primaryContactEmail || null,
            customer.createdAt || new Date().toISOString(),
            new Date().toISOString()
          ]
        );

        // Insert contacts
        if (customer.contacts && Array.isArray(customer.contacts)) {
          for (const contact of customer.contacts) {
            await connection.execute(
              `INSERT INTO customer_contacts (
                id, customer_id, name, email, phone, is_primary, created_at
               ) VALUES (?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE
               name = VALUES(name), email = VALUES(email), phone = VALUES(phone)`,
              [
                contact.id || generateUUID(),
                customer.id,
                contact.name,
                contact.email || null,
                contact.phone || null,
                contact.isPrimary || false,
                new Date().toISOString()
              ]
            );
          }
        }

        // Insert addresses
        if (customer.billingAddress) {
          await connection.execute(
            `INSERT INTO customer_addresses (
              id, customer_id, type, line1, line2, city, state, pincode,
              is_default, created_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE
             line1 = VALUES(line1), line2 = VALUES(line2), city = VALUES(city)`,
            [
              customer.billingAddress.id || generateUUID(),
              customer.id,
              'billing',
              customer.billingAddress.line1,
              customer.billingAddress.line2 || null,
              customer.billingAddress.city,
              customer.billingAddress.state,
              customer.billingAddress.pincode,
              customer.billingAddress.isDefault || true,
              new Date().toISOString()
            ]
          );
        }

        if (customer.shippingAddresses && Array.isArray(customer.shippingAddresses)) {
          for (const address of customer.shippingAddresses) {
            await connection.execute(
              `INSERT INTO customer_addresses (
                id, customer_id, type, line1, line2, city, state, pincode,
                is_default, created_at
               ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
               ON DUPLICATE KEY UPDATE
               line1 = VALUES(line1), line2 = VALUES(line2), city = VALUES(city)`,
              [
                address.id || generateUUID(),
                customer.id,
                'shipping',
                address.line1,
                address.line2 || null,
                address.city,
                address.state,
                address.pincode,
                address.isDefault || false,
                new Date().toISOString()
              ]
            );
          }
        }
      });
      
      stats.success++;
    } catch (error) {
      console.error(`❌ Failed to migrate customer ${customer.id}:`, error);
      stats.errors++;
    }
  }
}

async function migrateQuotes(quotes: FirebaseDocument[]): Promise<void> {
  console.log(`📋 Migrating ${quotes.length} quotes...`);
  
  for (const quote of quotes) {
    try {
      await executeTransaction(async (connection) => {
        // Insert quote
        await connection.execute(
          `INSERT INTO quotes (
            id, quote_number, revision_number, customer_id, customer_name,
            issue_date, valid_until, status, subtotal, discount, tax_amount, total,
            terms, notes, point_of_contact_id, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
           status = VALUES(status), total = VALUES(total)`,
          [
            quote.id,
            quote.quoteNumber,
            quote.revisionNumber || 0,
            quote.customerId,
            quote.customerName,
            quote.issueDate,
            quote.validUntil || null,
            quote.status || 'Draft',
            quote.subtotal || 0,
            quote.discount || 0,
            quote.taxAmount || 0,
            quote.total || 0,
            quote.terms || null,
            quote.notes || null,
            quote.pointOfContactId || null,
            quote.createdAt || new Date().toISOString(),
            new Date().toISOString()
          ]
        );

        // Insert line items
        if (quote.lineItems && Array.isArray(quote.lineItems)) {
          // Clear existing line items
          await connection.execute(
            'DELETE FROM quote_line_items WHERE quote_id = ?',
            [quote.id]
          );

          for (let i = 0; i < quote.lineItems.length; i++) {
            const item = quote.lineItems[i];
            await connection.execute(
              `INSERT INTO quote_line_items (
                id, quote_id, product_id, product_name, description,
                quantity, unit, rate, amount, line_order
               ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                item.id || generateUUID(),
                quote.id,
                item.productId,
                item.productName,
                item.description || null,
                item.quantity,
                item.unit,
                item.rate,
                item.amount,
                i
              ]
            );
          }
        }
      });
      
      stats.success++;
    } catch (error) {
      console.error(`❌ Failed to migrate quote ${quote.id}:`, error);
      stats.errors++;
    }
  }
}

async function migrateProducts(products: FirebaseDocument[]): Promise<void> {
  console.log(`📋 Migrating ${products.length} products...`);
  
  for (const product of products) {
    try {
      await executeQuery(
        `INSERT INTO products (
          id, name, description, unit, rate, hsn_code, created_at, updated_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         name = VALUES(name), description = VALUES(description), 
         rate = VALUES(rate), hsn_code = VALUES(hsn_code)`,
        [
          product.id,
          product.name,
          product.description || null,
          product.unit,
          product.rate || 0,
          product.hsnCode || null,
          product.createdAt || new Date().toISOString(),
          new Date().toISOString()
        ]
      );
      stats.success++;
    } catch (error) {
      console.error(`❌ Failed to migrate product ${product.id}:`, error);
      stats.errors++;
    }
  }
}

async function runMigration(exportPath: string): Promise<void> {
  try {
    console.log('🚀 Starting Firebase to MySQL migration...\n');
    
    // Initialize database
    await initializeDatabase();
    
    // Load Firebase export
    const collections = await loadFirebaseExport(exportPath);
    stats.collections = Object.keys(collections).length;
    stats.documents = Object.values(collections).reduce((sum, docs) => sum + docs.length, 0);
    
    console.log(`📊 Migration overview:`);
    console.log(`   Collections: ${stats.collections}`);
    console.log(`   Documents: ${stats.documents}\n`);
    
    // Migrate each collection
    for (const [collectionName, documents] of Object.entries(collections)) {
      if (!documents || !Array.isArray(documents) || documents.length === 0) {
        console.log(`⏭️  Skipping empty collection: ${collectionName}`);
        continue;
      }

      console.log(`\n📂 Processing collection: ${collectionName}`);
      
      switch (collectionName) {
        case 'users':
          await migrateUsers(documents);
          break;
        case 'customers':
          await migrateCustomers(documents);
          break;
        case 'quotes':
          await migrateQuotes(documents);
          break;
        case 'products':
          await migrateProducts(documents);
          break;
        default:
          console.log(`⚠️  No migration handler for collection: ${collectionName}`);
          break;
      }
    }
    
    // Print final statistics
    console.log('\n📈 Migration completed!');
    console.log('========================');
    console.log(`Collections processed: ${stats.collections}`);
    console.log(`Total documents: ${stats.documents}`);
    console.log(`Successful migrations: ${stats.success}`);
    console.log(`Errors: ${stats.errors}`);
    console.log(`Success rate: ${((stats.success / Math.max(stats.documents, 1)) * 100).toFixed(1)}%`);
    
    if (stats.errors > 0) {
      console.log('\n⚠️  Some documents failed to migrate. Check the error messages above.');
    } else {
      console.log('\n🎉 All documents migrated successfully!');
    }
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    throw error;
  }
}

async function main() {
  const exportPath = process.argv[2];
  
  if (!exportPath) {
    console.error('❌ Usage: npm run migrate:firebase <export-path>');
    console.error('   export-path: Path to Firebase export JSON file or directory');
    process.exit(1);
  }
  
  if (!fs.existsSync(exportPath)) {
    console.error(`❌ Export path does not exist: ${exportPath}`);
    process.exit(1);
  }
  
  try {
    await runMigration(exportPath);
    process.exit(0);
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  }
}

// Run migration if called directly
if (require.main === module) {
  main();
}

export { runMigration, stats };
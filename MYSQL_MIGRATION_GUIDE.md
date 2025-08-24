# MySQL Migration Guide - ABS OMS

This guide covers the complete migration from Firebase to MySQL for the ABS Order Management System.

## Overview

The OMSSQL branch contains a complete MySQL-based version of the ABS OMS system, replacing Firebase Firestore with MySQL database and Firebase Authentication with JWT-based authentication.

## Prerequisites

### System Requirements
- Node.js 18+ 
- MySQL 8.0+
- npm or yarn package manager

### MySQL Installation

#### Windows
1. Download MySQL Community Server from [MySQL Downloads](https://dev.mysql.com/downloads/mysql/)
2. Run the installer and follow the setup wizard
3. Remember the root password you set during installation

#### macOS
```bash
# Using Homebrew
brew install mysql
brew services start mysql

# Secure installation
mysql_secure_installation
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install mysql-server
sudo systemctl start mysql
sudo mysql_secure_installation
```

## Database Setup

### 1. Create Database and User

Connect to MySQL as root:
```bash
mysql -u root -p
```

Create database and user:
```sql
-- Create database
CREATE DATABASE abs_oms CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create dedicated user (recommended for production)
CREATE USER 'abs_oms_user'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON abs_oms.* TO 'abs_oms_user'@'localhost';
FLUSH PRIVILEGES;

-- Exit MySQL
EXIT;
```

### 2. Import Database Schema

Run the schema creation script:
```bash
mysql -u abs_oms_user -p abs_oms < database/schema.sql
```

Or connect to MySQL and source the file:
```sql
mysql -u abs_oms_user -p
USE abs_oms;
SOURCE /path/to/your/project/database/schema.sql;
```

## Environment Configuration

Create a `.env` file in your project root:

```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=abs_oms_user
DB_PASSWORD=your_secure_password
DB_NAME=abs_oms
DB_CONNECTION_LIMIT=20
DB_ACQUIRE_TIMEOUT=60000
DB_TIMEOUT=60000

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key-minimum-32-characters
JWT_EXPIRES_IN=24h

# Application Configuration
NODE_ENV=development
PORT=3000

# API Configuration
API_BASE_URL=http://localhost:3000/api
```

**⚠️ Security Warning**: Never commit the `.env` file to version control. Use strong, unique passwords and JWT secrets in production.

## Installation and Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Initialize Database Connection
The application will automatically:
- Check if the database exists and create it if needed
- Initialize the connection pool
- Run any pending migrations

### 3. Create Admin User
Run the user creation script:
```bash
npm run create-admin
```

Or manually create through the application interface.

## Key Changes from Firebase

### Authentication
- **Firebase Auth** → **JWT-based authentication with bcrypt password hashing**
- **Firestore Users** → **MySQL users table with sessions**
- **Firebase Rules** → **Server-side permission validation**

### Database Structure
- **Firestore Collections** → **MySQL Tables with foreign keys**
- **Subcollections** → **Related tables with foreign key relationships**
- **Document IDs** → **UUID primary keys**
- **Timestamps** → **MySQL TIMESTAMP columns**

### Services Migration

| Firebase Service | MySQL Service | File |
|------------------|---------------|------|
| `firebase/auth` | `mysqlService.authService` | `services/mysqlService.ts` |
| `firebase/firestore` | `mysql2` with connection pooling | `database/config.ts` |
| `services/salesService` | `mysqlSalesService` | `services/mysqlSalesService.ts` |
| `services/userService` | `mysqlService.userService` | `services/mysqlService.ts` |
| `contexts/AuthContext` | `MySQLAuthContext` | `contexts/MySQLAuthContext.tsx` |

## Database Schema Overview

### Core Tables
- `users` - User accounts and authentication
- `user_sessions` - JWT session management
- `company_details` - Company configuration
- `customers` / `vendors` - Business relationships
- `products` / `inventory` - Product catalog and stock
- `quotes` / `sales_orders` / `delivery_orders` - Sales workflow
- `purchase_orders` - Procurement management
- `transporters` / `transport_transactions` - Transport management
- `payroll_employees` / `payroll_runs` - HR and payroll
- `projects` / `project_tasks` - Project management

### Key Features
- **Foreign Key Constraints** ensure data integrity
- **Indexes** optimize query performance
- **Generated Columns** automatically calculate derived values
- **JSON Columns** store flexible data structures
- **Audit Logs** track all system changes
- **Session Management** handles user authentication

## API Endpoints

The MySQL version includes REST API endpoints for all operations:

```
Authentication:
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/verify

Users:
GET    /api/users
POST   /api/users
PUT    /api/users/:id
DELETE /api/users/:id

Sales:
GET    /api/quotes
POST   /api/quotes
PUT    /api/quotes/:id
DELETE /api/quotes/:id

... (additional endpoints for all modules)
```

## Performance Optimizations

### Database
- **Connection Pooling**: Configured for 20 concurrent connections
- **Query Optimization**: Proper indexing on all foreign keys and search columns
- **Transaction Support**: ACID compliance for data consistency
- **Prepared Statements**: Protection against SQL injection

### Caching
- **Session Caching**: JWT tokens reduce database auth queries
- **Query Result Caching**: Frequently accessed data cached in memory
- **Connection Persistence**: Reuse database connections

## Security Features

### Authentication
- **Password Hashing**: bcrypt with 12 rounds
- **JWT Tokens**: Signed with strong secret keys
- **Session Management**: Automatic cleanup of expired sessions
- **IP Tracking**: Monitor login locations

### Database Security
- **Prepared Statements**: Prevent SQL injection
- **Role-Based Access**: Database users with minimal privileges
- **Audit Logging**: Track all data modifications
- **Input Validation**: Server-side validation for all inputs

## Migration from Firebase

### Data Export from Firebase
1. Export Firestore data:
```bash
gcloud firestore export gs://your-bucket/backup
```

2. Download exported data
3. Use provided migration scripts to convert to MySQL format

### Migration Scripts
Run the migration tools:
```bash
npm run migrate:firebase
```

This will:
- Export all Firestore collections
- Transform data to MySQL format
- Import into MySQL database
- Verify data integrity

## Development Workflow

### Running the Application
```bash
# Development mode with hot reload
npm run dev

# Production build
npm run build
npm start
```

### Database Operations
```bash
# Reset database (development only)
npm run db:reset

# Run migrations
npm run db:migrate

# Seed test data
npm run db:seed

# Backup database
npm run db:backup
```

## Monitoring and Maintenance

### Health Checks
The application includes built-in health monitoring:
- Database connection status
- Query performance metrics
- Memory usage tracking
- Error rate monitoring

### Backup Strategy
1. **Daily Backups**: Automated mysqldump with rotation
2. **Point-in-time Recovery**: Binary log enabled
3. **Replication**: Master-slave setup for production

### Performance Monitoring
- **Slow Query Log**: Identify performance bottlenecks
- **Connection Monitoring**: Track pool utilization
- **Index Usage**: Optimize query performance

## Production Deployment

### Environment Setup
1. **Database Server**: Dedicated MySQL server with appropriate resources
2. **Application Server**: Node.js with PM2 process management
3. **Reverse Proxy**: Nginx for load balancing and SSL termination
4. **SSL Certificates**: Let's Encrypt or commercial certificates

### Security Hardening
- **Database Firewall**: Restrict access to application servers only
- **Regular Updates**: Keep MySQL and dependencies updated
- **Backup Encryption**: Encrypt all backup files
- **Access Logging**: Monitor all database access

## Troubleshooting

### Common Issues

#### Connection Issues
```bash
# Check MySQL service
sudo systemctl status mysql

# Test connection
mysql -u abs_oms_user -p -h localhost abs_oms
```

#### Performance Issues
```sql
-- Check slow queries
SHOW PROCESSLIST;

-- Analyze query performance
EXPLAIN SELECT * FROM your_query;
```

#### Memory Issues
```sql
-- Check MySQL memory usage
SHOW VARIABLES LIKE 'innodb_buffer_pool_size';

-- Monitor connections
SHOW STATUS LIKE 'Connections';
```

### Log Analysis
- **Application Logs**: Check console output for errors
- **MySQL Error Log**: Usually in `/var/log/mysql/error.log`
- **Query Log**: Enable general log for debugging

## Support and Documentation

- **Database Schema**: See `database/schema.sql` for complete table definitions
- **API Documentation**: Auto-generated from code comments
- **Performance Tuning**: MySQL configuration guides
- **Security Best Practices**: Follow OWASP guidelines

## Next Steps

After successful migration:
1. **Data Validation**: Verify all data migrated correctly
2. **Performance Testing**: Load test the new system
3. **User Training**: Train users on any interface changes
4. **Monitoring Setup**: Configure production monitoring
5. **Backup Verification**: Test backup and restore procedures

---

**Note**: This migration represents a significant architectural change. Test thoroughly in a development environment before deploying to production.
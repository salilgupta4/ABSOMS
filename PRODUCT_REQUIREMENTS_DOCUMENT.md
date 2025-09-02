
# Product Requirements Document: ABS OMS with Payroll

## 1. Introduction

### 1.1. Project Overview

This document outlines the product requirements for the ABS OMS (Order Management System) with Payroll, a comprehensive Enterprise Resource Planning (ERP) system designed for businesses in India. The application is a web-based, single-page application (SPA) that provides a suite of tools for managing core business processes, including sales, purchasing, inventory, customer relationships, payroll, and project management.

The system is built on a modern technology stack, with a React frontend and a MySQL backend with Node.js services. It is designed to be a scalable, multi-user application with role-based access control and can be deployed on-premises or on a VPS.

### 1.2. Goals and Objectives

*   **Centralize Business Operations:** To provide a single platform for managing all core business functions, reducing the need for multiple, disparate systems.
*   **Improve Efficiency:** To streamline and automate business processes, saving time and reducing manual errors.
*   **Enhance Data-Driven Decision Making:** To provide real-time data and reporting to help businesses make informed decisions.
*   **Ensure Scalability and Reliability:** To build a system that is scalable, reliable, and can grow with the business.
*   **Provide a Modern User Experience:** To offer a clean, intuitive, and user-friendly interface that is easy to use.

### 1.3. Target Audience

The primary target audience for this application is small to medium-sized enterprises (SMEs) in India. The system is designed to be used by various roles within a company, including:

*   **Administrators:** Responsible for managing users, settings, and overall system configuration.
*   **Sales Team:** Responsible for managing quotes, sales orders, and customer relationships.
*   **Purchase Team:** Responsible for managing purchase orders and vendor relationships.
*   **Inventory Managers:** Responsible for managing stock levels and product information.
*   **HR/Payroll Managers:** Responsible for managing employees, payroll, and leave requests.
*   **Project Managers:** Responsible for tracking project financials and progress.
*   **General Staff:** Can have view-only access or specific permissions based on their role.

## 2. System Architecture

### 2.1. Frontend Architecture

**Web Application:**
*   **Framework:** React 18 with TypeScript
*   **Build Tool:** Vite
*   **Styling:** Tailwind CSS with Radix UI for unstyled, accessible components
*   **Routing:** `react-router-dom` with hash-based routing (`HashRouter`)
*   **State Management:** Zustand for global state management, React Context (`MySQLAuthContext`, `ThemeContext`) for authentication and theme state
*   **Key Libraries:**
    *   `@emailjs/browser` for client-side email notifications
    *   `html2canvas`, `jspdf`, `jspdf-autotable` for PDF generation
    *   `lucide-react` for icons
    *   `use-debounce` for debouncing user input

**Mobile Application:**
*   **Framework:** React Native with TypeScript
*   **Platform Support:** iOS and Android
*   **Navigation:** React Navigation for mobile screen navigation
*   **State Management:** React Context with local state synchronization
*   **Offline Support:** Local SQLite database with sync capabilities
*   **Authentication:** JWT token-based authentication synced with web app

### 2.2. Backend Architecture

*   **Platform:** Node.js with Express.js
*   **Database:** MySQL relational database with structured tables and relationships
*   **Authentication:** JWT-based authentication with bcryptjs for password hashing
*   **Storage:** Local filesystem for storing generated PDF documents and uploads
*   **API Layer:** RESTful API services built with TypeScript
*   **Connection Pool:** MySQL2 with connection pooling for optimal database performance
*   **Session Management:** JWT tokens with configurable expiration and refresh capabilities

### 2.3. Key Dependencies

**Backend Dependencies:**
*   `mysql2`: MySQL client for Node.js with connection pooling
*   `bcryptjs`: For secure password hashing
*   `jsonwebtoken`: For JWT token generation and validation
*   `ts-node`: TypeScript execution environment for Node.js

**Frontend Dependencies:**
*   `react` & `react-dom`: The core React libraries for building the user interface
*   `react-router-dom`: For client-side routing
*   `tailwindcss`: For utility-first CSS styling
*   `@radix-ui/react-*`: For accessible, unstyled UI components
*   `vite`: As the frontend build tool
*   `typescript`: For static typing
*   `zustand`: For state management

## 3. User Roles and Permissions

The system has a role-based access control (RBAC) system to manage user permissions.

### 3.1. User Roles

*   **Admin:** Has full access to all modules and settings, including user management.
*   **Maker:** Can create and edit documents (e.g., quotes, orders).
*   **Approver:** Can approve documents created by Makers.
*   **Viewer:** Has read-only access to most of the application.
*   **Payroll Admin:** Has access to the payroll module.
*   **Projects Admin:** Has access to the projects module.

### 3.2. Permissions Matrix

| Feature/Module        | Admin | Maker | Approver | Viewer | Payroll Admin | Projects Admin |
| --------------------- | :---: | :---: | :------: | :----: | :-----------: | :------------: |
| **Sales**             |  ✔️   |  ✔️   |    ✔️    |   ✔️   |       ❌       |       ❌       |
| **Purchase**          |  ✔️   |  ✔️   |    ✔️    |   ✔️   |       ❌       |       ❌       |
| **Inventory**         |  ✔️   |  ✔️   |    ✔️    |   ✔️   |       ❌       |       ❌       |
| **Customers**         |  ✔️   |  ✔️   |    ✔️    |   ✔️   |       ❌       |       ❌       |
| **Vendors**           |  ✔️   |  ✔️   |    ✔️    |   ✔️   |       ❌       |       ❌       |
| **Products**          |  ✔️   |  ✔️   |    ✔️    |   ✔️   |       ❌       |       ❌       |
| **Payroll**           |  ✔️   |  ❌   |    ❌    |   ❌   |       ✔️       |       ❌       |
| **Projects**          |  ✔️   |  ❌   |    ❌    |   ❌   |       ❌       |       ✔️       |
| **User Management**   |  ✔️   |  ❌   |    ❌    |   ❌   |       ❌       |       ❌       |
| **Settings**          |  ✔️   |  ❌   |    ❌    |   ❌   |       ❌       |       ❌       |
| **Data Management**   |  ✔️   |  ❌   |    ❌    |   ❌   |       ❌       |       ❌       |

## 4. Core Modules & Features

### 4.1. Dashboard

*   Provides a high-level overview of the business with key metrics and quick links to common actions.

### 4.2. Sales Module

*   **Quotes:** Create, view, edit, and manage customer quotations.
*   **Sales Orders:** Create sales orders from quotes or from scratch. Track the status of sales orders.
*   **Delivery Orders:** Create delivery orders from sales orders to manage the dispatch of goods.
*   **Pending Items:** View a list of items that are yet to be delivered from sales orders.

### 4.3. Purchase Module

*   **Purchase Orders:** Create, view, edit, and manage purchase orders for vendors.

### 4.4. Inventory Module

*   **Inventory List:** View the current stock levels of all products.
*   **Stock History:** View a detailed history of stock movements for each product.
*   **Stock Adjustments:** Manually adjust stock levels with reasons.

### 4.5. Customer Management

*   **Customer List:** View and manage a list of all customers.
*   **Customer Form:** Create and edit customer details, including multiple contacts and addresses.

### 4.6. Vendor Management

*   **Vendor List:** View and manage a list of all vendors.
*   **Vendor Form:** Create and edit vendor details.

### 4.7. Product Management

*   **Product List:** View and manage a list of all products.
*   **Product Form:** Create and edit product details, including name, description, unit, rate, and HSN code.

### 4.8. Payroll Module

*   **Employee Management:** Manage employee profiles, including personal details, salary information, and bank accounts.
*   **Advance Payments:** Manage advance payments to employees and track their balances.
*   **Leave Management:** Manage employee leave requests.
*   **Run Payroll:** Process monthly payroll for all employees, calculating salaries, deductions, and net pay.
*   **Payroll Reports:** Generate various payroll reports.
*   **Payroll Settings:** Configure payroll settings like PF, ESI, and TDS.

### 4.9. Projects Module

*   **Project Management:** Create and manage projects, tracking their financial performance and/or measurements.
*   **Financial Projects:** Track revenue and costs for financial projects.
*   **Measurement Projects:** Track measurements for projects where billing is based on area or volume.

### 4.10. User Management

*   **User List:** View and manage all users of the system.
*   **User Form:** Create and edit users, assign roles, and manage permissions.

### 4.11. Settings

*   **Company Details:** Configure the company's name, address, GSTIN, and other details.
*   **Theme Settings:** Customize the look and feel of the application.
*   **Document Numbering:** Configure the numbering format for quotes, orders, and other documents.
*   **PDF Customizer:** Customize the layout of generated PDF documents.
*   **Terms & Conditions:** Manage the terms and conditions that appear on documents.
*   **Point of Contact:** Manage the company's points of contact for different purposes.

### 4.12. Chat

*   A real-time chat widget that allows users to communicate with each other within the application.

### 4.13. Data Management

*   **Import/Export:** Import and export data for various modules in CSV format.
*   **Backup/Restore:** Create full system backups and restore from them.
*   **Data Integrity:** A suite of tools for checking and fixing data integrity issues, such as duplicate records and broken references.
*   **Firebase Migration:** Tools for migrating data from another Firebase project.

## 5. Data Model

### 5.1. Database Schema Overview

The system uses a MySQL relational database with the following key table categories:

**Core Business Tables:**
*   `users` - User authentication and role management
*   `customers` - Customer information and contacts
*   `products` - Product catalog with pricing and HSN codes
*   `vendors` - Vendor/supplier information
*   `quotes` - Customer quotations with line items
*   `sales_orders` - Confirmed sales orders from quotes
*   `delivery_orders` - Delivery/dispatch records
*   `purchase_orders` - Purchase orders to vendors
*   `stock_movements` - Inventory transaction history

**Payroll Tables:**
*   `payroll_employees` - Employee master data
*   `payroll_advances` - Employee advance payments
*   `payroll_records` - Monthly payroll processing records
*   `payroll_settings` - System payroll configuration

**System Tables:**
*   `user_sessions` - JWT session management
*   `user_theme_preferences` - User customization settings
*   `chat_messages` - Real-time chat system
*   `scratchpads` - User notes and scratchpad data
*   `company_settings` - Global system configuration
*   `projects_module` - Project management data

### 5.2. Entity Relationships

**Sales Flow:**
*   `customers` → `quotes` (one-to-many)
*   `quotes` → `sales_orders` (one-to-one conversion)
*   `sales_orders` → `delivery_orders` (one-to-many for partial deliveries)

**Inventory Management:**
*   `products` → `stock_movements` (one-to-many)
*   `sales_orders` → `stock_movements` (creates stock reduction)
*   `purchase_orders` → `stock_movements` (creates stock addition)

**Payroll System:**
*   `payroll_employees` → `payroll_advances` (one-to-many)
*   `payroll_employees` → `payroll_records` (one-to-many monthly records)

**User Management:**
*   `users` → `user_sessions` (one-to-many active sessions)
*   `users` → `user_theme_preferences` (one-to-one)

## 6. Non-Functional Requirements

### 6.1. Performance and Scalability

*   **Database Connection Pooling:** MySQL2 connection pooling optimizes database performance
*   **Caching:** Local state caching reduces API calls and improves response times
*   **Pagination:** Large data sets are paginated to improve loading performance
*   **Debounced Search:** User input is debounced to prevent excessive API calls

### 6.2. Security

*   **Authentication:** JWT-based authentication with bcryptjs password hashing
*   **Session Management:** Configurable session timeouts and token refresh capabilities
*   **Authorization:** Role-based access control (RBAC) with granular permissions
*   **Password Security:** Bcrypt hashing with salt rounds for secure password storage
*   **SQL Injection Prevention:** Parameterized queries prevent SQL injection attacks
*   **Data Validation:** Server-side and client-side input validation and sanitization
*   **CORS Protection:** Configured CORS policies for secure cross-origin requests
*   **Environment Variables:** Sensitive configuration stored in environment variables

## 7. Deployment and Infrastructure

### 7.1. Deployment Options

**VPS Deployment (Recommended):**
*   Ubuntu/CentOS Linux server with minimum 2GB RAM, 20GB storage
*   MySQL 8.0+ server installation
*   Node.js 18+ runtime environment
*   PM2 process manager for production deployment
*   Nginx reverse proxy for load balancing and SSL termination

**Local Development:**
*   Local MySQL server installation
*   Node.js development environment
*   Vite development server for frontend
*   Environment-based configuration management

### 7.2. Database Setup

*   **Schema Initialization:** Automated database schema creation using SQL scripts
*   **Migration Scripts:** Version-controlled database migration scripts
*   **Backup Strategy:** Automated daily MySQL backups with retention policies
*   **Connection Pooling:** Optimized connection pool settings for production load

### 7.3. Environment Configuration

The system requires the following environment variables:

```
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_USER=abs_oms_user
DB_PASSWORD=[secure_password]
DB_NAME=abs_oms
DB_CONNECTION_LIMIT=20

# JWT Authentication
JWT_SECRET=[secure_32_char_secret]
JWT_EXPIRES_IN=24h

# Application Configuration
NODE_ENV=production
PORT=3000
API_BASE_URL=https://yourdomain.com/api
FRONTEND_URL=https://yourdomain.com

# Optional Features
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=[email]
SMTP_PASS=[app_password]
```

### 7.4. Mobile Application Deployment

**Android:**
*   APK generation for direct installation
*   Google Play Store distribution (future consideration)
*   Automated build pipeline using React Native CLI

**iOS:**
*   IPA generation for enterprise distribution
*   App Store distribution (future consideration)
*   Xcode project configuration for deployment

### 7.5. Monitoring and Maintenance

*   **Health Checks:** API endpoint monitoring for system status
*   **Log Management:** Structured logging for error tracking and debugging
*   **Performance Monitoring:** Database query optimization and response time tracking
*   **Security Updates:** Regular dependency updates and security patches

## 8. Potential Areas for Improvement

### 8.1. State Management

The application currently uses Zustand for global state management along with React Context for authentication and theme state. The state management is well-structured, but could be further optimized by:

*   Implementing state persistence for offline capabilities
*   Adding more granular state slicing for better performance
*   Implementing optimistic updates for better user experience

### 8.2. Testing

The current testing strategy is not clear from the codebase. Adding a comprehensive test suite with unit tests, integration tests, and end-to-end tests would improve the quality and reliability of the application.

### 8.3. Component Reusability

While the application uses Radix UI components and has a well-structured UI component library, there are opportunities to:

*   Expand the component library with more business-specific components
*   Implement a design system with consistent theming
*   Add component documentation and storybook integration
*   Create reusable form patterns for faster feature development
